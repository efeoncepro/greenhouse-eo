import 'server-only'

/**
 * TASK-1242 — Growth AI Visibility · HubSpot CRM v3 client (in-app directo).
 *
 * Upsert de contact (por email) + company (por dominio) + asociación, vía la HubSpot CRM
 * API directa (`api.hubapi.com/crm/v3`), reusando el token canónico `getHubSpotAccessToken`
 * (TASK-1230). NO usa el Cloud Run bridge (legacy, sin endpoint de upsert suelto). Server-only,
 * corre en el reactive consumer (ops-worker), NUNCA inline en un route. Resultado sanitizado
 * (sin tokens/payloads/respuestas crudas). El llamador decide retry vs dead-letter por `retryable`.
 */

import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'

import type { HubSpotCompanyUpsert, HubSpotContactUpsert, HubSpotLeadHandoffPayload } from './property-mapper'

const HUBSPOT_API = 'https://api.hubapi.com'
const REQUEST_TIMEOUT_MS = 15_000

export interface HubSpotUpsertResult {
  status: 'succeeded' | 'failed' | 'skipped'
  contactId?: string | null
  companyId?: string | null
  errorClass?: string
  httpStatus?: number | null
  retryable: boolean
}

interface HubSpotResponse {
  ok: boolean
  status: number
  json: unknown
}

const classify = (httpStatus: number): { errorClass: string; retryable: boolean } => {
  if (httpStatus === 400) return { errorClass: 'validation_error', retryable: false } // payload/property inexistente
  if (httpStatus === 401 || httpStatus === 403) return { errorClass: 'auth_error', retryable: false } // token/scope CRM
  if (httpStatus === 409) return { errorClass: 'conflict', retryable: true } // carrera de creación → reintentar resuelve por search
  if (httpStatus === 429) return { errorClass: 'rate_limited', retryable: true }
  if (httpStatus >= 500) return { errorClass: 'hubspot_server_error', retryable: true }

  return { errorClass: 'hubspot_unexpected', retryable: false }
}

const hubspotFetch = async (
  token: string,
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT',
  body?: unknown,
): Promise<HubSpotResponse> => {
  const response = await fetch(`${HUBSPOT_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const json = await response.json().catch(() => null)

  return { ok: response.ok, status: response.status, json }
}

/** Error tipado que transporta la clasificación de retry hasta el orquestador. */
class HubSpotApiError extends Error {
  readonly httpStatus: number
  readonly errorClass: string
  readonly retryable: boolean

  constructor(httpStatus: number) {
    super(`HubSpot CRM API error ${httpStatus}`)
    this.name = 'HubSpotApiError'
    this.httpStatus = httpStatus
    const { errorClass, retryable } = classify(httpStatus)

    this.errorClass = errorClass
    this.retryable = retryable
  }
}

const idFromSearch = (json: unknown): string | null => {
  const results = (json as { results?: { id?: unknown }[] } | null)?.results
  const id = Array.isArray(results) && results[0]?.id

  return id ? String(id) : null
}

const searchObjectByProperty = async (
  token: string,
  objectType: 'contacts' | 'companies',
  propertyName: string,
  value: string,
): Promise<string | null> => {
  const res = await hubspotFetch(token, `/crm/v3/objects/${objectType}/search`, 'POST', {
    filterGroups: [{ filters: [{ propertyName, operator: 'EQ', value }] }],
    properties: [propertyName],
    limit: 1,
  })

  if (!res.ok) throw new HubSpotApiError(res.status)

  return idFromSearch(res.json)
}

const idFromObject = (json: unknown): string => {
  const id = (json as { id?: unknown } | null)?.id

  if (!id) throw new HubSpotApiError(502)

  return String(id)
}

const upsertContact = async (token: string, contact: HubSpotContactUpsert): Promise<string> => {
  const properties: Record<string, string> = { email: contact.email, ...contact.properties }

  if (contact.firstName) properties.firstname = contact.firstName
  if (contact.lastName) properties.lastname = contact.lastName

  const existingId = await searchObjectByProperty(token, 'contacts', 'email', contact.email)

  const res = existingId
    ? await hubspotFetch(token, `/crm/v3/objects/contacts/${existingId}`, 'PATCH', { properties })
    : await hubspotFetch(token, '/crm/v3/objects/contacts', 'POST', { properties })

  if (!res.ok) throw new HubSpotApiError(res.status)

  return existingId ?? idFromObject(res.json)
}

const upsertCompany = async (token: string, company: HubSpotCompanyUpsert): Promise<string> => {
  const properties: Record<string, string> = { domain: company.domain, name: company.name, ...company.properties }

  const existingId = await searchObjectByProperty(token, 'companies', 'domain', company.domain)

  const res = existingId
    ? await hubspotFetch(token, `/crm/v3/objects/companies/${existingId}`, 'PATCH', { properties })
    : await hubspotFetch(token, '/crm/v3/objects/companies', 'POST', { properties })

  if (!res.ok) throw new HubSpotApiError(res.status)

  return existingId ?? idFromObject(res.json)
}

/** Asociación default contact↔company (v4). Idempotente: re-asociar no duplica. */
const associateContactToCompany = async (token: string, contactId: string, companyId: string): Promise<void> => {
  const res = await hubspotFetch(
    token,
    `/crm/v4/objects/contacts/${contactId}/associations/default/companies/${companyId}`,
    'PUT',
  )

  if (!res.ok) throw new HubSpotApiError(res.status)
}

/**
 * Orquesta el upsert del lead: company (si corporativo) → contact → asociación. Devuelve un
 * resultado sanitizado; los errores esperados se clasifican (retryable) en vez de propagar crudo.
 */
export const upsertLeadToHubSpot = async (payload: HubSpotLeadHandoffPayload): Promise<HubSpotUpsertResult> => {
  let token: string

  try {
    token = await getHubSpotAccessToken()
  } catch {
    return { status: 'failed', errorClass: 'token_unavailable', retryable: true, httpStatus: null }
  }

  try {
    const companyId = payload.company ? await upsertCompany(token, payload.company) : null
    const contactId = await upsertContact(token, payload.contact)

    if (companyId) {
      await associateContactToCompany(token, contactId, companyId)
    }

    return { status: 'succeeded', contactId, companyId, retryable: false, httpStatus: 200 }
  } catch (error) {
    if (error instanceof HubSpotApiError) {
      return { status: 'failed', errorClass: error.errorClass, retryable: error.retryable, httpStatus: error.httpStatus }
    }

    // Timeout / red: retryable. NUNCA persistir el error crudo (puede traer payload/PII).
    const isAbort = error instanceof Error && error.name === 'TimeoutError'

    return { status: 'failed', errorClass: isAbort ? 'timeout' : 'network_error', retryable: true, httpStatus: null }
  }
}
