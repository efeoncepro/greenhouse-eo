import 'server-only'

import {
  getHubSpotGreenhouseCompanyServices,
  type HubSpotGreenhouseServiceProfile
} from '@/lib/integrations/hubspot-greenhouse-service'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

interface SpaceRow extends Record<string, unknown> {
  space_id: string
  client_id: string
  organization_id: string | null
}

interface SyncResult {
  hubspotCompanyId: string
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const resolveSpaceForCompany = async (hubspotCompanyId: string): Promise<SpaceRow | null> => {
  const rows = await runGreenhousePostgresQuery<SpaceRow>(
    `SELECT s.space_id, s.client_id, s.organization_id
     FROM greenhouse_core.spaces s
     JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
     WHERE o.hubspot_company_id = $1
     LIMIT 1`,
    [hubspotCompanyId]
  )

  return rows[0] ?? null
}

const upsertServiceFromHubSpot = async (
  svc: HubSpotGreenhouseServiceProfile,
  space: SpaceRow
): Promise<'created' | 'updated' | 'skipped'> => {
  const hubspotServiceId = svc.identity.hubspotServiceId

  if (!hubspotServiceId) return 'skipped'

  const serviceId = `SVC-HS-${hubspotServiceId}`
  const name = svc.identity.name || `Service ${hubspotServiceId}`
  const lineaDeServicio = svc.classification.lineaDeServicio || 'efeonce_digital'
  const servicioEspecifico = svc.classification.servicioEspecifico || 'consulting'
  const modalidad = svc.classification.modalidad || 'continua'
  const billingFrequency = svc.classification.billingFrequency || 'monthly'
  const country = svc.classification.country || 'CL'
  const totalCost = svc.financial.totalCost ?? 0
  const amountPaid = svc.financial.amountPaid ?? 0
  const currency = svc.financial.currency || 'CLP'
  const startDate = svc.dates.startDate || null
  const targetEndDate = svc.dates.targetEndDate || null
  const notionProjectId = svc.references.notionProjectId || null
  const hubspotDealId = svc.references.hubspotDealId || null

  const result = await runGreenhousePostgresQuery<{ action: string }>(
    `INSERT INTO greenhouse_core.services (
      service_id, hubspot_service_id, name, space_id, organization_id,
      hubspot_company_id, hubspot_deal_id,
      pipeline_stage, start_date, target_end_date,
      total_cost, amount_paid, currency,
      linea_de_servicio, servicio_especifico, modalidad, billing_frequency, country,
      notion_project_id, hubspot_last_synced_at, hubspot_sync_status,
      active, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      'active', $8::date, $9::date,
      $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, NOW(), 'synced',
      TRUE, 'active', NOW(), NOW()
    )
    ON CONFLICT (hubspot_service_id) DO UPDATE SET
      name = EXCLUDED.name,
      total_cost = EXCLUDED.total_cost,
      amount_paid = EXCLUDED.amount_paid,
      currency = EXCLUDED.currency,
      start_date = EXCLUDED.start_date,
      target_end_date = EXCLUDED.target_end_date,
      notion_project_id = EXCLUDED.notion_project_id,
      hubspot_deal_id = EXCLUDED.hubspot_deal_id,
      hubspot_last_synced_at = NOW(),
      hubspot_sync_status = 'synced',
      updated_at = NOW()
    RETURNING CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END AS action`,
    [
      serviceId, hubspotServiceId, name, space.space_id, space.organization_id,
      space.client_id, hubspotDealId,
      startDate, targetEndDate,
      totalCost, amountPaid, currency,
      lineaDeServicio, servicioEspecifico, modalidad, billingFrequency, country,
      notionProjectId
    ]
  )

  const action = (result[0]?.action ?? 'skipped') as 'created' | 'updated' | 'skipped'

  if (action === 'created' || action === 'updated') {
    await publishOutboxEvent({
      aggregateType: 'service',
      aggregateId: serviceId,
      eventType: `service.${action}`,
      payload: { hubspotServiceId, name, lineaDeServicio, servicioEspecifico, spaceId: space.space_id }
    })
  }

  return action
}

export const syncServicesForCompany = async (hubspotCompanyId: string): Promise<SyncResult> => {
  const result: SyncResult = { hubspotCompanyId, created: 0, updated: 0, skipped: 0, errors: [] }

  const space = await resolveSpaceForCompany(hubspotCompanyId)

  if (!space) {
    result.errors.push(`No space found for HubSpot company ${hubspotCompanyId}`)

    return result
  }

  let services: HubSpotGreenhouseServiceProfile[]

  try {
    const response = await getHubSpotGreenhouseCompanyServices(hubspotCompanyId)

    services = response.services
  } catch (err) {
    result.errors.push(`HubSpot API error: ${err instanceof Error ? err.message : String(err)}`)

    return result
  }

  for (const svc of services) {
    try {
      const action = await upsertServiceFromHubSpot(svc, space)

      if (action === 'created') result.created++
      else if (action === 'updated') result.updated++
      else result.skipped++
    } catch (err) {
      result.errors.push(`Service ${svc.identity.serviceId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}

export const syncAllOrganizationServices = async (): Promise<{
  organizations: number
  results: SyncResult[]
}> => {
  const orgs = await runGreenhousePostgresQuery<{ hubspot_company_id: string }>(
    `SELECT DISTINCT hubspot_company_id
     FROM greenhouse_core.organizations
     WHERE hubspot_company_id IS NOT NULL AND hubspot_company_id != ''`
  )

  const results: SyncResult[] = []

  for (const org of orgs) {
    const result = await syncServicesForCompany(org.hubspot_company_id)

    results.push(result)
  }

  return { organizations: orgs.length, results }
}
