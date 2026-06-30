import 'server-only'

/**
 * TASK-1230 — Growth Forms · HubSpot Forms secure-submit adapter.
 *
 * Entrega una submission ACEPTADA del motor a la HubSpot **Forms** API:
 *   POST https://api.hsforms.com/submissions/v3/integration/secure/submit/{portalId}/{formGuid}
 *
 * Server-side only. Corre en el reactive consumer (ops-worker dispatch), NUNCA inline
 * en el route handler de submit (CLAUDE.md §Integraciones). El browser nunca conoce
 * portalId/formGuid/property names — viven en `form_destination.mapping_json` (server).
 * Reusa el token canónico (`getHubSpotAccessToken`); NUNCA un cliente HubSpot paralelo.
 *
 * Idempotencia: secure-submit NO es idempotente (cada POST crea una submission). El
 * at-most-once exitoso lo garantiza el state machine de `form_destination_attempt`
 * (dispatch): solo se reintentan attempts `failed`/retryables, nunca una `delivered`.
 */
import { isFormsHubSpotSecureSubmitEnabled } from '@/lib/growth/forms/flags'
import type { FormConsentSnapshotRow, FormDestinationRow, FormSubmissionRow } from '@/lib/growth/forms/store'
import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'

export const HUBSPOT_FORMS_ADAPTER_KIND = 'hubspot_forms_secure_submit' as const
export const HUBSPOT_FORMS_ADAPTER_VERSION = 'hsforms-v3-secure-submit' as const

const HUBSPOT_SECURE_SUBMIT_BASE = 'https://api.hsforms.com/submissions/v3/integration/secure/submit'
const REQUEST_TIMEOUT_MS = 15_000

/** Resultado sanitizado del adapter (sin payloads/tokens/respuestas crudas). */
export interface HubSpotDeliveryResult {
  status: 'succeeded' | 'failed' | 'skipped'
  errorClass?: string
  httpStatus?: number | null
  externalId?: string | null
  /** El dispatch usa esto para decidir retry vs dead-letter. */
  retryable: boolean
}

interface HubSpotDestinationMapping {
  portalId?: string
  formGuid?: string
  /** greenhouse field key → HubSpot property name. */
  fieldMapping?: Record<string, string>
  /** Texto de consentimiento para legalConsentOptions (HubSpot lo exige). */
  consentText?: string
}

const asMapping = (raw: unknown): HubSpotDestinationMapping =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as HubSpotDestinationMapping) : {}

/** Clasifica el HTTP status en una clase de error sanitizada + si es retryable. */
const classify = (httpStatus: number): { errorClass: string; retryable: boolean } => {
  if (httpStatus === 400) return { errorClass: 'validation_error', retryable: false } // payload/mapping malo: reintentar no ayuda
  if (httpStatus === 401 || httpStatus === 403) return { errorClass: 'auth_error', retryable: false } // token/scope `forms`
  if (httpStatus === 404) return { errorClass: 'form_not_found', retryable: false } // portalId/formGuid inválido
  if (httpStatus === 429) return { errorClass: 'rate_limited', retryable: true }
  if (httpStatus >= 500) return { errorClass: 'hubspot_server_error', retryable: true }

  return { errorClass: 'hubspot_unexpected', retryable: false }
}

/**
 * Construye el body de secure-submit desde la submission + consent + mapping. El
 * mapping (server-side) define portalId/formGuid + los HubSpot property names; solo
 * se envían campos allowlisteados en `fieldMapping`.
 */
export const buildSecureSubmitBody = (
  submission: FormSubmissionRow,
  consent: FormConsentSnapshotRow | null,
  mapping: HubSpotDestinationMapping,
): Record<string, unknown> => {
  const values =
    submission.normalized_fields_json && typeof submission.normalized_fields_json === 'object'
      ? (submission.normalized_fields_json as Record<string, unknown>)
      : {}

  const fieldMapping = mapping.fieldMapping ?? {}

  const fields = Object.entries(fieldMapping)
    .filter(([ghKey]) => values[ghKey] !== undefined && values[ghKey] !== null)
    .map(([ghKey, hsName]) => ({ name: hsName, value: String(values[ghKey]) }))

  const body: Record<string, unknown> = {
    fields,
    context: {
      ...(submission.page_uri ? { pageUri: submission.page_uri } : {}),
      ...(submission.page_name ? { pageName: submission.page_name } : {}),
    },
  }

  if (consent) {
    body.legalConsentOptions = {
      consent: {
        consentToProcess: true,
        text: mapping.consentText ?? `Consentimiento otorgado (policy ${consent.consent_policy_version}).`,
        communications: [],
      },
    }
  }

  return body
}

export interface DeliverInput {
  submission: FormSubmissionRow
  consent: FormConsentSnapshotRow | null
  destination: FormDestinationRow
  env?: NodeJS.ProcessEnv
}

/**
 * Entrega la submission a HubSpot Forms. Gated por `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED`
 * (OFF → `skipped`, sin llamar a HubSpot). No lanza para errores esperados — los
 * devuelve clasificados; el dispatch decide retry/dead-letter.
 */
export const deliverToHubSpotForms = async (input: DeliverInput): Promise<HubSpotDeliveryResult> => {
  const env = input.env ?? process.env

  if (!isFormsHubSpotSecureSubmitEnabled(env)) {
    return { status: 'skipped', errorClass: 'hubspot_adapter_disabled', retryable: true }
  }

  const mapping = asMapping(input.destination.mapping_json)

  if (!mapping.portalId || !mapping.formGuid) {
    return { status: 'failed', errorClass: 'mapping_incomplete', retryable: false, httpStatus: null }
  }

  const body = buildSecureSubmitBody(input.submission, input.consent, mapping)

  if (!Array.isArray(body.fields) || (body.fields as unknown[]).length === 0) {
    return { status: 'failed', errorClass: 'empty_field_mapping', retryable: false, httpStatus: null }
  }

  let token: string

  try {
    token = await getHubSpotAccessToken(env)
  } catch {
    // Token no configurado: no es un fallo del payload — retryable (config/secret).
    return { status: 'failed', errorClass: 'token_unavailable', retryable: true, httpStatus: null }
  }

  const url = `${HUBSPOT_SECURE_SUBMIT_BASE}/${mapping.portalId}/${mapping.formGuid}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (response.ok) {
      return {
        status: 'succeeded',
        httpStatus: response.status,
        externalId: `hsforms-${input.submission.submission_id}`,
        retryable: false,
      }
    }

    const { errorClass, retryable } = classify(response.status)

    return { status: 'failed', errorClass, retryable, httpStatus: response.status }
  } catch (error) {
    // Timeout / red: retryable. NUNCA persistir el error crudo (puede traer payload).
    const isAbort = error instanceof Error && error.name === 'TimeoutError'

    return { status: 'failed', errorClass: isAbort ? 'timeout' : 'network_error', retryable: true, httpStatus: null }
  }
}
