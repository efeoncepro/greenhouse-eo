import 'server-only'

import {
  getHubSpotGreenhouseCompanyServices,
  type HubSpotGreenhouseServiceProfile
} from '@/lib/integrations/hubspot-greenhouse-service'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { allocateSpaceNumericCode } from '@/lib/services/allocate-space-numeric-code'
import { upsertServiceFromHubSpot } from '@/lib/services/upsert-service-from-hubspot'
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

// allocateSpaceNumericCode movido a src/lib/services/allocate-space-numeric-code.ts (TASK-813a)
// con pg_advisory_xact_lock para evitar race condition.

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

const upsertServiceFromHubSpotProfile = async (
  svc: HubSpotGreenhouseServiceProfile,
  space: SpaceRow
): Promise<'created' | 'updated' | 'skipped'> => {
  const hubspotServiceId = svc.identity.hubspotServiceId

  if (!hubspotServiceId) return 'skipped'

  // Adapt el shape del bridge profile al canonical helper TASK-813a.
  // El bridge ya entrega valores con defaults aplicados (legacy behavior:
  // syncStatus='synced' siempre porque viene del bridge enriquecido). El
  // helper canónico decide syncStatus por presencia de ef_linea_de_servicio.
  const result = await upsertServiceFromHubSpot({
    hubspotServiceId,
    hubspotCompanyId: space.client_id,
    space: { space_id: space.space_id, client_id: space.client_id, organization_id: space.organization_id },
    properties: {
      hs_name: svc.identity.name,
      ef_linea_de_servicio: svc.classification.lineaDeServicio,
      ef_servicio_especifico: svc.classification.servicioEspecifico,
      ef_modalidad: svc.classification.modalidad,
      ef_billing_frequency: svc.classification.billingFrequency,
      ef_country: svc.classification.country,
      ef_currency: svc.financial.currency,
      ef_total_cost: svc.financial.totalCost ?? 0,
      ef_amount_paid: svc.financial.amountPaid ?? 0,
      ef_start_date: svc.dates.startDate,
      ef_target_end_date: svc.dates.targetEndDate,
      ef_notion_project_id: svc.references.notionProjectId,
      ef_deal_id: svc.references.hubspotDealId
    },
    source: 'service-sync:syncServicesForCompany'
  })

  return result.action
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
      const action = await upsertServiceFromHubSpotProfile(svc, space)

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
