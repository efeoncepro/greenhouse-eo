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

interface ClientLookup extends Record<string, unknown> {
  client_id: string
  client_name: string
  organization_id: string | null
}

export interface ResolveSpaceOptions {
  /**
   * TASK-813 Slice 3 — opt-in para crear space automáticamente cuando el
   * client existe (con hubspot_company_id) pero no tiene space asignado.
   * Caso real: Aguas Andinas + Motogas SpA en dev. Default FALSE — requiere
   * autorización explícita del caller (typ. backfill scripts).
   */
  createMissingSpace?: boolean
  /** Source label para audit log del space creado. */
  createdBySource?: string
}

interface SyncResult {
  hubspotCompanyId: string
  created: number
  updated: number
  skipped: number
  errors: string[]
  /** TASK-813 Slice 3 — true si se creó space automático en esta corrida. */
  spaceAutoCreated?: boolean
}

const resolveOrgIdForClient = async (clientId: string): Promise<string | null> => {
  // greenhouse_core.clients NO tiene columna organization_id (verificado 2026-05-06).
  // El único path para asociar client → organization es via hubspot_company_id compartido.
  const rows = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT o.organization_id
     FROM greenhouse_core.organizations o
     JOIN greenhouse_core.clients c ON c.hubspot_company_id = o.hubspot_company_id
     WHERE c.client_id = $1
       AND c.hubspot_company_id IS NOT NULL
       AND c.hubspot_company_id != ''
     LIMIT 1`,
    [clientId]
  )

  return rows[0]?.organization_id ?? null
}

const allocateSpaceNumericCode = async (): Promise<string> => {
  // numeric_code es CHAR(2) UNIQUE con CHECK '^[0-9]{2}$'. Buscar próximo libre 01-99.
  const rows = await runGreenhousePostgresQuery<{ numeric_code: string }>(
    `SELECT numeric_code FROM greenhouse_core.spaces ORDER BY numeric_code DESC LIMIT 1`
  )

  const last = parseInt(rows[0]?.numeric_code ?? '00', 10)
  const next = last + 1

  if (next > 99) {
    throw new Error('Cannot allocate numeric_code: spaces table is at max (99). Schema needs widening.')
  }

  return String(next).padStart(2, '0')
}

const createSpaceForClient = async (
  client: ClientLookup,
  source: string
): Promise<SpaceRow> => {
  const spaceId = `space-${client.client_id}`
  const orgId = client.organization_id ?? (await resolveOrgIdForClient(client.client_id))
  const numericCode = await allocateSpaceNumericCode()

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.spaces (
      space_id, client_id, organization_id, space_name, space_type, status, active, numeric_code,
      notes, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, 'client_space', 'active', TRUE, $5,
      $6, NOW(), NOW()
    )
    ON CONFLICT (space_id) DO NOTHING`,
    [
      spaceId,
      client.client_id,
      orgId,
      client.client_name,
      numericCode,
      `Auto-created by ${source} (TASK-813 Slice 3) for HubSpot p_services materialization`
    ]
  )

  await publishOutboxEvent({
    aggregateType: 'space',
    aggregateId: spaceId,
    eventType: 'commercial.space.auto_created',
    payload: {
      version: 1,
      spaceId,
      clientId: client.client_id,
      organizationId: orgId,
      clientName: client.client_name,
      source,
      createdAt: new Date().toISOString()
    }
  })

  return { space_id: spaceId, client_id: client.client_id, organization_id: orgId }
}

const resolveSpaceForCompany = async (
  hubspotCompanyId: string,
  options: ResolveSpaceOptions = {}
): Promise<SpaceRow | null> => {
  // Path canónico: organization → space (modelo formal).
  const orgPath = await runGreenhousePostgresQuery<SpaceRow>(
    `SELECT s.space_id, s.client_id, s.organization_id
     FROM greenhouse_core.spaces s
     JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
     WHERE o.hubspot_company_id = $1
     LIMIT 1`,
    [hubspotCompanyId]
  )

  if (orgPath[0]) return orgPath[0]

  // Fallback TASK-813: client → space (cliente comercial sin org enriquecida pero con space ya creado).
  const clientPath = await runGreenhousePostgresQuery<SpaceRow>(
    `SELECT s.space_id, s.client_id, s.organization_id
     FROM greenhouse_core.spaces s
     JOIN greenhouse_core.clients c ON c.client_id = s.client_id
     WHERE c.hubspot_company_id = $1
     LIMIT 1`,
    [hubspotCompanyId]
  )

  if (clientPath[0]) return clientPath[0]

  // Último recurso TASK-813: client existe pero sin space. Auto-crear si caller autoriza.
  if (options.createMissingSpace) {
    // clients no tiene columna organization_id; resolver via hubspot_company_id si match.
    const clients = await runGreenhousePostgresQuery<ClientLookup>(
      `SELECT c.client_id, c.client_name,
              (SELECT o.organization_id FROM greenhouse_core.organizations o
               WHERE o.hubspot_company_id = c.hubspot_company_id
               LIMIT 1) AS organization_id
       FROM greenhouse_core.clients c
       WHERE c.hubspot_company_id = $1
       LIMIT 1`,
      [hubspotCompanyId]
    )

    if (clients[0]) {
      return createSpaceForClient(clients[0], options.createdBySource ?? 'service-sync')
    }
  }

  return null
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

export const syncServicesForCompany = async (
  hubspotCompanyId: string,
  options: ResolveSpaceOptions = {}
): Promise<SyncResult> => {
  const result: SyncResult = { hubspotCompanyId, created: 0, updated: 0, skipped: 0, errors: [] }

  // Snapshot pre-resolve para detectar si el resolver creó space auto.
  const preExistingSpace = await resolveSpaceForCompany(hubspotCompanyId, {})
  const space = preExistingSpace ?? (await resolveSpaceForCompany(hubspotCompanyId, options))

  if (!space) {
    result.errors.push(`No space found for HubSpot company ${hubspotCompanyId}`)

    return result
  }

  if (!preExistingSpace) {
    result.spaceAutoCreated = true
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

export const syncAllOrganizationServices = async (
  options: ResolveSpaceOptions = {}
): Promise<{
  organizations: number
  results: SyncResult[]
}> => {
  // TASK-813 Slice 3 — universo amplio: todos los clients con hubspot_company_id,
  // no solo organizations. Esto cubre Aguas Andinas + Motogas que estaban sin org.
  const targets = await runGreenhousePostgresQuery<{ hubspot_company_id: string }>(
    `SELECT DISTINCT hubspot_company_id
     FROM greenhouse_core.clients
     WHERE hubspot_company_id IS NOT NULL AND hubspot_company_id != ''`
  )

  const results: SyncResult[] = []

  for (const target of targets) {
    const result = await syncServicesForCompany(target.hubspot_company_id, options)

    results.push(result)
  }

  return { organizations: targets.length, results }
}
