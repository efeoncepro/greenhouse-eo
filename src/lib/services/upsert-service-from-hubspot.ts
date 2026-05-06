import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * TASK-813a — Canonical helper for HubSpot p_services (object 0-162) UPSERT.
 *
 * Single source of truth para el INSERT/UPDATE de `greenhouse_core.services`
 * desde HubSpot. Antes de TASK-813a, este SQL estaba duplicado en 3 callsites:
 *   - scripts/services/backfill-from-hubspot.ts
 *   - src/lib/webhooks/handlers/hubspot-services.ts
 *   - src/lib/services/service-sync.ts
 *
 * El bug del space_id que se detectó en runtime 2026-05-06 ocurrió porque
 * arreglé un callsite y olvidé los otros 2. Patrón canónico TASK-721
 * (canonical helper enforcement) lo prohibe.
 *
 * Garantías:
 *   - UPSERT idempotente por UNIQUE `hubspot_service_id`.
 *   - ON CONFLICT DO UPDATE refresca space_id, organization_id,
 *     hubspot_company_id (cuando company association cambia en HubSpot).
 *   - Outbox event v1 atomic con UPSERT (publishOutboxEvent dentro de la tx).
 *   - Returns action: 'created' | 'updated' para que el caller cuente.
 *
 * @example
 * ```ts
 * const action = await upsertServiceFromHubSpot({
 *   hubspotServiceId: '551519372424',
 *   hubspotCompanyId: '30825221458',
 *   space: { space_id: 'spc-...', client_id: 'hs-30825221458', organization_id: 'org-...' },
 *   properties: { hs_name: 'Sky Airline - Diseño digital', ef_linea_de_servicio: null },
 *   source: 'hubspot-services-webhook'
 * })
 * ```
 */

export interface UpsertServiceSpace {
  space_id: string
  client_id: string
  organization_id: string | null
}

export interface UpsertServiceProperties {
  hs_name?: string | null
  ef_linea_de_servicio?: string | null
  ef_servicio_especifico?: string | null
  ef_modalidad?: string | null
  ef_billing_frequency?: string | null
  ef_country?: string | null
  ef_currency?: string | null
  ef_total_cost?: string | number | null
  ef_amount_paid?: string | number | null
  ef_start_date?: string | null
  ef_target_end_date?: string | null
  ef_notion_project_id?: string | null
  ef_deal_id?: string | null
  [key: string]: string | number | null | undefined
}

export interface UpsertServiceFromHubSpotInput {
  hubspotServiceId: string
  hubspotCompanyId: string
  space: UpsertServiceSpace
  properties: UpsertServiceProperties
  /** Source label para outbox audit (e.g. 'hubspot-services-webhook', 'backfill-script', 'cron-safety-net'). */
  source: string
}

export type UpsertServiceAction = 'created' | 'updated' | 'skipped'

export interface UpsertServiceResult {
  action: UpsertServiceAction
  serviceId: string
  syncStatus: 'synced' | 'unmapped'
}

const toNumberOrZero = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const SQL = `
  INSERT INTO greenhouse_core.services (
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
    $18, NOW(), $19,
    TRUE, 'active', NOW(), NOW()
  )
  ON CONFLICT (hubspot_service_id) DO UPDATE SET
    name = EXCLUDED.name,
    space_id = EXCLUDED.space_id,
    organization_id = EXCLUDED.organization_id,
    hubspot_company_id = EXCLUDED.hubspot_company_id,
    total_cost = EXCLUDED.total_cost,
    amount_paid = EXCLUDED.amount_paid,
    currency = EXCLUDED.currency,
    start_date = EXCLUDED.start_date,
    target_end_date = EXCLUDED.target_end_date,
    linea_de_servicio = EXCLUDED.linea_de_servicio,
    servicio_especifico = EXCLUDED.servicio_especifico,
    modalidad = EXCLUDED.modalidad,
    billing_frequency = EXCLUDED.billing_frequency,
    country = EXCLUDED.country,
    notion_project_id = EXCLUDED.notion_project_id,
    hubspot_deal_id = EXCLUDED.hubspot_deal_id,
    hubspot_last_synced_at = NOW(),
    hubspot_sync_status = EXCLUDED.hubspot_sync_status,
    updated_at = NOW()
  RETURNING CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END AS action
`

export const upsertServiceFromHubSpot = async (
  input: UpsertServiceFromHubSpotInput
): Promise<UpsertServiceResult> => {
  const { hubspotServiceId, hubspotCompanyId, space, properties, source } = input

  if (!hubspotServiceId) {
    return { action: 'skipped', serviceId: '', syncStatus: 'unmapped' }
  }

  const serviceId = `SVC-HS-${hubspotServiceId}`
  const name = properties.hs_name?.trim() || `Service ${hubspotServiceId}`
  const lineaDeServicio = properties.ef_linea_de_servicio?.trim() || 'efeonce_digital'
  const servicioEspecifico = properties.ef_servicio_especifico?.trim() || 'consulting'
  const modalidad = properties.ef_modalidad?.trim() || 'continua'
  const billingFrequency = properties.ef_billing_frequency?.trim() || 'monthly'
  const country = properties.ef_country?.trim() || 'CL'
  const currency = properties.ef_currency?.trim() || 'CLP'
  const totalCost = toNumberOrZero(properties.ef_total_cost)
  const amountPaid = toNumberOrZero(properties.ef_amount_paid)
  const startDate = properties.ef_start_date || null
  const targetEndDate = properties.ef_target_end_date || null
  const notionProjectId = properties.ef_notion_project_id || null
  const hubspotDealId = properties.ef_deal_id || null

  // Honest degradation: si HubSpot no tiene linea_de_servicio poblada,
  // marcar la fila como 'unmapped' para que downstream filtre y excluya
  // de P&L hasta que el operador HubSpot clasifique. Pattern TASK-768.
  const syncStatus: 'synced' | 'unmapped' = properties.ef_linea_de_servicio
    ? 'synced'
    : 'unmapped'

  const result = await runGreenhousePostgresQuery<{ action: string }>(SQL, [
    serviceId,
    hubspotServiceId,
    name,
    space.space_id,
    space.organization_id,
    hubspotCompanyId,
    hubspotDealId,
    startDate,
    targetEndDate,
    totalCost,
    amountPaid,
    currency,
    lineaDeServicio,
    servicioEspecifico,
    modalidad,
    billingFrequency,
    country,
    notionProjectId,
    syncStatus
  ])

  const action = (result[0]?.action ?? 'skipped') as UpsertServiceAction

  if (action === 'created' || action === 'updated') {
    await publishOutboxEvent({
      aggregateType: 'service_engagement',
      aggregateId: serviceId,
      eventType: 'commercial.service_engagement.materialized',
      payload: {
        version: 1,
        action,
        serviceId,
        hubspotServiceId,
        hubspotCompanyId,
        name,
        spaceId: space.space_id,
        clientId: space.client_id,
        organizationId: space.organization_id,
        syncStatus,
        materializedAt: new Date().toISOString(),
        source
      }
    })
  }

  return { action, serviceId, syncStatus }
}
