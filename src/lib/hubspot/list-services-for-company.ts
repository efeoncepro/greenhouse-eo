import 'server-only'

import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

/**
 * TASK-813 — Direct HubSpot API helper para listar p_services (object 0-162)
 * asociados a una company. Bypass del bridge Cloud Run (que tiene un bug
 * conocido al usar `p_services` en URLs en lugar de `0-162`).
 *
 * El bridge fix queda como follow-up task. Este helper desbloquea TASK-813
 * sin requerir deploy del bridge, manteniendo el blast radius local.
 *
 * Token: secret `hubspot-access-token` (GCP Secret Manager) o env var
 * `HUBSPOT_ACCESS_TOKEN` para casos locales/CLI.
 */

const HUBSPOT_API = 'https://api.hubapi.com'
const TOKEN_ENV_VAR = 'HUBSPOT_ACCESS_TOKEN'
const TOKEN_GCP_SECRET = 'gcp:hubspot-access-token'

interface AssociationResult {
  results: Array<{ toObjectId: number | string }>
}

interface ServiceObject {
  id: string
  properties: {
    hs_name?: string
    hs_pipeline_stage?: string
    hs_pipeline?: string
    ef_organization_id?: string
    ef_space_id?: string
    ef_linea_de_servicio?: string
    ef_servicio_especifico?: string
    ef_modalidad?: string
    ef_total_cost?: string
    ef_amount_paid?: string
    ef_currency?: string
    ef_start_date?: string
    ef_target_end_date?: string
    ef_billing_frequency?: string
    ef_country?: string
    ef_notion_project_id?: string
    ef_deal_id?: string
    [key: string]: string | undefined
  }
}

interface BatchReadResult {
  results: ServiceObject[]
}

const SERVICE_PROPERTIES = [
  'hs_name',
  'hs_pipeline_stage',
  'hs_pipeline',
  'ef_organization_id',
  'ef_space_id',
  'ef_linea_de_servicio',
  'ef_servicio_especifico',
  'ef_modalidad',
  'ef_total_cost',
  'ef_amount_paid',
  'ef_currency',
  'ef_start_date',
  'ef_target_end_date',
  'ef_billing_frequency',
  'ef_country',
  'ef_notion_project_id',
  'ef_deal_id'
]

const fetchToken = async (): Promise<string> => {
  // Prefer env var (CLI / local). Fallback a GCP Secret Manager.
  const envValue = process.env[TOKEN_ENV_VAR]?.trim()

  if (envValue) return envValue

  const token = await resolveSecretByRef(TOKEN_GCP_SECRET)

  if (!token) {
    throw new Error(`HubSpot access token not found (env ${TOKEN_ENV_VAR} ni ${TOKEN_GCP_SECRET})`)
  }

  return token
}

/**
 * Lista los IDs de p_services asociados a una company HubSpot.
 * Retorna [] si no hay asociaciones o la company no existe.
 */
export const listServiceIdsForCompany = async (hubspotCompanyId: string): Promise<string[]> => {
  const token = await fetchToken()

  const url = `${HUBSPOT_API}/crm/v4/objects/companies/${hubspotCompanyId}/associations/0-162?limit=100`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  })

  if (response.status === 404) return []

  if (!response.ok) {
    const text = await response.text()

    throw new Error(`HubSpot listAssociations failed: ${response.status} ${text.slice(0, 200)}`)
  }

  const json = (await response.json()) as AssociationResult

  return json.results.map(r => String(r.toObjectId))
}

/**
 * Batch read de p_services con properties canónicas. Idempotente.
 */
export const batchReadServices = async (serviceIds: string[]): Promise<ServiceObject[]> => {
  if (serviceIds.length === 0) return []

  const token = await fetchToken()
  const url = `${HUBSPOT_API}/crm/v3/objects/0-162/batch/read`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: SERVICE_PROPERTIES,
      inputs: serviceIds.map(id => ({ id }))
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30000)
  })

  if (!response.ok) {
    const text = await response.text()

    throw new Error(`HubSpot batchReadServices failed: ${response.status} ${text.slice(0, 200)}`)
  }

  const json = (await response.json()) as BatchReadResult

  return json.results
}

/**
 * Helper combinado: lista IDs + batch read en una llamada lógica.
 * Retorna [] si la company no tiene services.
 */
export const fetchServicesForCompany = async (hubspotCompanyId: string): Promise<ServiceObject[]> => {
  const ids = await listServiceIdsForCompany(hubspotCompanyId)

  if (ids.length === 0) return []

  return batchReadServices(ids)
}

export type HubSpotServiceObject = ServiceObject
