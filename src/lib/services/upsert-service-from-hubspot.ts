import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  type EngagementKind,
  resolveEngagementKindCascade
} from './engagement-kind-cascade'
import {
  type GreenhousePipelineStage,
  type GreenhouseServiceStatus,
  type LifecycleUnmappedReason,
  mapHubSpotStageToLifecycle
} from './service-lifecycle-mapper'

/**
 * TASK-813a — Canonical helper for HubSpot p_services (object 0-162) UPSERT.
 * TASK-836 — Consume canonical lifecycle mapper + engagement_kind cascade +
 * emite outbox event granular `commercial.service_engagement.lifecycle_changed v1`
 * cuando hay diff real.
 *
 * Single source of truth para el INSERT/UPDATE de `greenhouse_core.services`
 * desde HubSpot. Antes de TASK-813a, este SQL estaba duplicado en 3 callsites:
 *   - scripts/services/backfill-from-hubspot.ts
 *   - src/lib/webhooks/handlers/hubspot-services.ts
 *   - src/lib/services/service-sync.ts
 *
 * Garantías:
 *   - UPSERT idempotente por UNIQUE `hubspot_service_id`.
 *   - ON CONFLICT DO UPDATE refresca lifecycle (pipeline_stage, status, active),
 *     engagement_kind (con cascade canonica), unmapped_reason, space_id,
 *     organization_id, hubspot_company_id.
 *   - Outbox `commercial.service_engagement.materialized v1` (existing) en
 *     cada UPSERT no-skipped.
 *   - Outbox `commercial.service_engagement.lifecycle_changed v1` (NUEVO en
 *     TASK-836) SOLO cuando hay diff real en pipeline_stage|active|status|engagement_kind.
 *   - Returns action: 'created' | 'updated' para que el caller cuente.
 */

export interface UpsertServiceSpace {
  space_id: string
  client_id: string
  organization_id: string | null
}

export interface UpsertServiceProperties {
  hs_name?: string | null
  hs_pipeline_stage?: string | null
  hs_pipeline?: string | null
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
  /** TASK-836 — internal name canónico (regular|pilot|trial|poc|discovery). */
  ef_engagement_kind?: string | null
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
  pipelineStage: GreenhousePipelineStage
  status: GreenhouseServiceStatus
  active: boolean
  engagementKind: EngagementKind | null
  unmappedReason: LifecycleUnmappedReason | null
  /** True cuando se emitió `commercial.service_engagement.lifecycle_changed v1`. */
  lifecycleChanged: boolean
}

const toNumberOrZero = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

interface PreviousStateRow extends Record<string, unknown> {
  pipeline_stage: string
  status: string
  active: boolean
  engagement_kind: string
}

/**
 * SELECT pre-UPSERT del estado vigente (si existe). Permite que el outbox
 * `lifecycle_changed` sólo se emita en transiciones reales — no en refresh
 * idempotente sin diff.
 */
const SELECT_PREVIOUS_STATE_SQL = `
  SELECT pipeline_stage, status, active, engagement_kind
    FROM greenhouse_core.services
    WHERE hubspot_service_id = $1
    LIMIT 1
`

const UPSERT_SQL = `
  INSERT INTO greenhouse_core.services (
    service_id, hubspot_service_id, name, space_id, organization_id,
    hubspot_company_id, hubspot_deal_id,
    pipeline_stage, status, active,
    engagement_kind, unmapped_reason,
    start_date, target_end_date,
    total_cost, amount_paid, currency,
    linea_de_servicio, servicio_especifico, modalidad, billing_frequency, country,
    notion_project_id, hubspot_last_synced_at, hubspot_sync_status,
    created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10,
    $11, $12,
    $13::date, $14::date,
    $15, $16, $17,
    $18, $19, $20, $21, $22,
    $23, NOW(), $24,
    NOW(), NOW()
  )
  ON CONFLICT (hubspot_service_id) DO UPDATE SET
    name = EXCLUDED.name,
    space_id = EXCLUDED.space_id,
    organization_id = EXCLUDED.organization_id,
    hubspot_company_id = EXCLUDED.hubspot_company_id,
    pipeline_stage = EXCLUDED.pipeline_stage,
    status = EXCLUDED.status,
    active = EXCLUDED.active,
    engagement_kind = EXCLUDED.engagement_kind,
    unmapped_reason = EXCLUDED.unmapped_reason,
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
    return {
      action: 'skipped',
      serviceId: '',
      syncStatus: 'unmapped',
      pipelineStage: 'paused',
      status: 'paused',
      active: false,
      engagementKind: null,
      unmappedReason: 'unknown_pipeline_stage',
      lifecycleChanged: false
    }
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

  // ── TASK-836 Slice 4: lifecycle mapping canónico ──
  const lifecycleResult = mapHubSpotStageToLifecycle({
    hsPipelineStageId: properties.hs_pipeline_stage ?? null,
    hsPipelineStageLabel: null
  })

  const pipelineStage: GreenhousePipelineStage = lifecycleResult.resolved
    ? lifecycleResult.pipelineStage
    : lifecycleResult.fallbackPipelineStage

  const lifecycleStatus: GreenhouseServiceStatus = lifecycleResult.resolved
    ? lifecycleResult.status
    : lifecycleResult.fallbackStatus

  const active: boolean = lifecycleResult.resolved
    ? lifecycleResult.active
    : lifecycleResult.fallbackActive

  // ── TASK-836 Slice 4: engagement_kind cascade ──
  // SELECT pre-UPSERT del estado actual para alimentar la cascade y detectar diff.
  const previousRows = await runGreenhousePostgresQuery<PreviousStateRow>(
    SELECT_PREVIOUS_STATE_SQL,
    [hubspotServiceId]
  )

  const previous = previousRows[0] ?? null
  const existingPgEngagementKind = (previous?.engagement_kind ?? null) as EngagementKind | null

  const cascadeResult = resolveEngagementKindCascade({
    hubspotValue: properties.ef_engagement_kind,
    existingPgValue: existingPgEngagementKind,
    resolvedStage: pipelineStage
  })

  const engagementKind: EngagementKind = cascadeResult.kind ?? 'regular'
  // Nota: cuando cascade.kind === null (caso 5: validation sin clasificación),
  // el fila debe tener engagement_kind no-NULL en DB (column NOT NULL DEFAULT 'regular').
  // Sin embargo, marcamos unmapped_reason='missing_classification' para que
  // operador re-clasifique y reliability signal flag-ee.

  // ── unmapped_reason resolution (combina lifecycle + cascade + linea_de_servicio) ──
  let unmappedReason: LifecycleUnmappedReason | null = null

  if (!lifecycleResult.resolved) {
    unmappedReason = 'unknown_pipeline_stage'
  } else if (cascadeResult.rule === 'classification_required_in_validation') {
    unmappedReason = 'missing_classification'
  } else if (cascadeResult.rule === 'hubspot_value_outside_enum') {
    unmappedReason = 'missing_classification'
  } else if (!properties.ef_linea_de_servicio?.trim()) {
    // Honest degradation legacy (pre-TASK-836): linea_de_servicio faltante
    // sigue siendo `missing_classification`.
    unmappedReason = 'missing_classification'
  }

  const syncStatus: 'synced' | 'unmapped' = unmappedReason === null ? 'synced' : 'unmapped'

  const result = await runGreenhousePostgresQuery<{ action: string }>(UPSERT_SQL, [
    serviceId,                    // $1
    hubspotServiceId,             // $2
    name,                         // $3
    space.space_id,               // $4
    space.organization_id,        // $5
    hubspotCompanyId,             // $6
    hubspotDealId,                // $7
    pipelineStage,                // $8
    lifecycleStatus,              // $9
    active,                       // $10
    engagementKind,               // $11
    unmappedReason,               // $12
    startDate,                    // $13
    targetEndDate,                // $14
    totalCost,                    // $15
    amountPaid,                   // $16
    currency,                     // $17
    lineaDeServicio,              // $18
    servicioEspecifico,           // $19
    modalidad,                    // $20
    billingFrequency,             // $21
    country,                      // $22
    notionProjectId,              // $23
    syncStatus                    // $24
  ])

  const action = (result[0]?.action ?? 'skipped') as UpsertServiceAction

  // ── Outbox events ──
  let lifecycleChanged = false

  if (action === 'created' || action === 'updated') {
    // Event existing: materialized v1 (mantener compat con consumers actuales).
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

    // Event nuevo TASK-836: lifecycle_changed v1 — solo cuando hay diff real
    // en pipeline_stage|active|status|engagement_kind.
    const previousPipelineStage = previous?.pipeline_stage ?? null
    const previousActive = previous?.active ?? null
    const previousStatus = previous?.status ?? null
    const previousEngagementKind = previous?.engagement_kind ?? null

    const diff =
      previousPipelineStage !== pipelineStage
      || previousActive !== active
      || previousStatus !== lifecycleStatus
      || previousEngagementKind !== engagementKind

    if (diff) {
      lifecycleChanged = true

      await publishOutboxEvent({
        aggregateType: 'service_engagement',
        aggregateId: serviceId,
        eventType: 'commercial.service_engagement.lifecycle_changed',
        payload: {
          version: 1,
          serviceId,
          hubspotServiceId,
          previousPipelineStage,
          nextPipelineStage: pipelineStage,
          previousActive,
          nextActive: active,
          previousStatus,
          nextStatus: lifecycleStatus,
          previousEngagementKind,
          nextEngagementKind: engagementKind,
          triggeredBy: source,
          occurredAt: new Date().toISOString()
        }
      })
    }
  }

  return {
    action,
    serviceId,
    syncStatus,
    pipelineStage,
    status: lifecycleStatus,
    active,
    engagementKind: cascadeResult.kind,
    unmappedReason,
    lifecycleChanged
  }
}
