import 'server-only'

import {
  createHubSpotGreenhouseService,
  findHubSpotGreenhouseServiceByIdempotencyKey,
  type HubSpotGreenhouseServiceAssociationStatus
} from '@/lib/integrations/hubspot-greenhouse-service'
import { captureWithDomain } from '@/lib/observability/capture'
import { query } from '@/lib/db'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-837 Slice 4 — Reactive projection: Sample Sprint (PG) → HubSpot p_services (0-162).
 *
 * Subscribes to `service.engagement.outbound_requested v1` (emitted by
 * declareSampleSprint, Slice 3) and projects the service to HubSpot via the
 * canonical bridge (`hubspot-greenhouse-integration` Cloud Run, Slice 0.5b).
 *
 * Flow:
 *   1. Re-read service from PG by service_id (NEVER trust outbox payload).
 *   2. Skip if `idempotency_key` is missing (bug guard) or `hubspot_sync_status`
 *      is already terminal ('ready', 'outbound_dead_letter').
 *   3. Pre-create idempotency check: GET /services/by-idempotency-key/<key>
 *      via bridge. If match exists, skip POST and just UPDATE local with the
 *      hubspot_service_id we found.
 *   4. POST /services with properties + associations (Deal + Company + Contacts)
 *      — bridge orchestrates the 4 calls atomically.
 *   5. UPDATE local services row with hubspot_service_id, hubspot_last_synced_at,
 *      and hubspot_sync_status = 'ready' | 'partial_associations' depending on
 *      the bridge's associationStatus.
 *
 * Failure modes:
 *   - Bridge POST fails (5xx, 422, 429): throw — reactive consumer retries
 *     exponentially (maxRetries=3) then dead-letters.
 *   - Service deleted in PG between event emit and refresh: log + return no-op.
 *   - All associations succeed: hubspot_sync_status='ready'.
 *   - Some associations fail: hubspot_sync_status='partial_associations'.
 *     The next retry will idempotency-skip the create and just retry the
 *     missing associations (HubSpot tolerates duplicates).
 *
 * Hard rules:
 *   - NUNCA Sentry.captureException directo. Use captureWithDomain('integrations.hubspot').
 *   - NUNCA loggear bridge response body raw (puede contener PII de contactos).
 *   - NUNCA crear segunda fila services cuando el webhook eco entra: el handler
 *     hubspot-services aplica lookup cascade por idempotency_key (Slice 4 patch
 *     to webhooks/handlers/hubspot-services.ts).
 *
 * Pattern source: TASK-771 provider-bq-sync (single-event trigger + re-read PG +
 * idempotent downstream + maxRetries=3).
 */

interface ServiceOutboundRow extends Record<string, unknown> {
  service_id: string
  name: string
  hubspot_deal_id: string | null
  idempotency_key: string | null
  hubspot_sync_status: string | null
  hubspot_service_id: string | null
  engagement_kind: string
  organization_id: string | null
  space_id: string | null
  start_date: string | Date | null
  target_end_date: string | Date | null
  total_cost: string | null
  currency: string | null
  modalidad: string | null
  billing_frequency: string | null
  linea_de_servicio: string | null
  servicio_especifico: string | null
  commitment_terms_json: Record<string, unknown> | null
}

interface DealContext {
  hubspotDealId: string
  hubspotCompanyId: string | null
  contactHubspotIds: string[]
}

const VALIDATION_STAGE_ID = '1357763256'

const extractDealContextFromTerms = (
  terms: Record<string, unknown> | null
): DealContext | null => {
  if (!terms || typeof terms !== 'object') return null
  const ctx = terms.hubspotDealContext

  if (!ctx || typeof ctx !== 'object') return null

  const dealId = typeof (ctx as Record<string, unknown>).hubspotDealId === 'string'
    ? ((ctx as Record<string, unknown>).hubspotDealId as string)
    : null

  if (!dealId) return null

  const companyId = typeof (ctx as Record<string, unknown>).hubspotCompanyId === 'string'
    ? ((ctx as Record<string, unknown>).hubspotCompanyId as string)
    : null

  const contactIdsRaw = (ctx as Record<string, unknown>).contactHubspotIds

  const contactIds = Array.isArray(contactIdsRaw)
    ? contactIdsRaw.filter((v): v is string => typeof v === 'string' && Boolean(v))
    : []

  return { hubspotDealId: dealId, hubspotCompanyId: companyId, contactHubspotIds: contactIds }
}

const toIsoDateOrNull = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value.slice(0, 10)

  return null
}

const isAssociationStatusFullyOk = (
  status: HubSpotGreenhouseServiceAssociationStatus | undefined,
  hadDeal: boolean,
  hadCompany: boolean,
  hadContacts: number
): boolean => {
  if (!status) return false
  if (hadDeal && status.deal !== 'ok') return false
  if (hadCompany && status.company !== 'ok') return false

  const failedContacts = status.contacts.filter(c => c.status !== 'ok').length

  if (failedContacts > 0) return false
  if (hadContacts > status.contacts.length) return false

  return true
}

export const sampleSprintHubSpotOutboundProjection: ProjectionDefinition = {
  name: 'sample_sprint_hubspot_outbound',
  description:
    'Project Sample Sprint local services to HubSpot p_services (0-162) with idempotency via ef_greenhouse_service_id and Deal/Company/Contact associations',
  // TODO TASK-807 / Bow-tie: when 'commercial' projection domain is added,
  // migrate. For now uses 'finance' (same convention as hubspotServicesIntakeProjection
  // TASK-813b) — drained by ops-reactive-finance cron Cloud Scheduler.
  domain: 'finance',
  triggerEvents: ['service.engagement.outbound_requested'],
  extractScope: payload => {
    const serviceId = typeof payload.serviceId === 'string' ? payload.serviceId.trim() : ''

    if (!serviceId) return null

    return {
      entityType: 'sample_sprint_service',
      entityId: serviceId
    }
  },
  refresh: async scope => {
    const serviceId = scope.entityId

    let serviceRow: ServiceOutboundRow | null = null

    try {
      const rows = await query<ServiceOutboundRow>(
        `SELECT service_id, name, hubspot_deal_id, idempotency_key, hubspot_sync_status,
                hubspot_service_id, engagement_kind, organization_id, space_id,
                start_date, target_end_date, total_cost, currency,
                modalidad, billing_frequency, linea_de_servicio, servicio_especifico,
                commitment_terms_json
           FROM greenhouse_core.services
          WHERE service_id = $1
          LIMIT 1`,
        [serviceId]
      )

      serviceRow = rows[0] ?? null
    } catch (err) {
      captureWithDomain(err, 'integrations.hubspot', {
        tags: { source: 'sample_sprint_outbound', stage: 'pg_lookup' },
        extra: { serviceId }
      })

      throw err
    }

    if (!serviceRow) {
      return `sample_sprint_outbound skipped: service ${serviceId} not found in PG (deleted after event emitted)`
    }

    if (!serviceRow.idempotency_key) {
      // Bug guard: declareSampleSprint always sets idempotency_key. Missing
      // it means an upstream contract violation; signal + skip rather than
      // create a non-idempotent record in HubSpot.
      const err = new Error(
        `sample_sprint_outbound: service ${serviceId} missing idempotency_key — upstream contract violation`
      )

      captureWithDomain(err, 'integrations.hubspot', {
        tags: { source: 'sample_sprint_outbound', stage: 'idempotency_check' },
        extra: { serviceId }
      })

      throw err
    }

    if (
      serviceRow.hubspot_sync_status === 'ready' &&
      serviceRow.hubspot_service_id
    ) {
      return `sample_sprint_outbound no-op: service ${serviceId} already ready (hubspot_service_id=${serviceRow.hubspot_service_id})`
    }

    if (serviceRow.hubspot_sync_status === 'outbound_dead_letter') {
      return `sample_sprint_outbound no-op: service ${serviceId} is in outbound_dead_letter; requires operator recovery`
    }

    const dealContext = extractDealContextFromTerms(serviceRow.commitment_terms_json)

    if (!dealContext) {
      const err = new Error(
        `sample_sprint_outbound: service ${serviceId} missing hubspotDealContext in commitment_terms_json`
      )

      captureWithDomain(err, 'integrations.hubspot', {
        tags: { source: 'sample_sprint_outbound', stage: 'deal_context_missing' },
        extra: { serviceId }
      })

      throw err
    }

    // Move local state to outbound_in_progress so subsequent runs see the lock.
    await query(
      `UPDATE greenhouse_core.services
          SET hubspot_sync_status = 'outbound_in_progress',
              updated_at = CURRENT_TIMESTAMP
        WHERE service_id = $1
          AND hubspot_sync_status IN ('outbound_pending', 'partial_associations')`,
      [serviceId]
    )

    // Step 1 — pre-create idempotency check via bridge.
    let existingHubspotServiceId: string | null = null

    try {
      const existing = await findHubSpotGreenhouseServiceByIdempotencyKey(
        serviceRow.idempotency_key
      )

      if (existing.ok && existing.hubspotServiceId) {
        existingHubspotServiceId = existing.hubspotServiceId
      }
    } catch (err) {
      captureWithDomain(err, 'integrations.hubspot', {
        tags: { source: 'sample_sprint_outbound', stage: 'idempotency_search' },
        extra: { serviceId, idempotencyKey: serviceRow.idempotency_key }
      })

      throw err
    }

    if (existingHubspotServiceId) {
      // Match found via idempotency key — skip POST. Service was already created
      // in HubSpot (likely by a partially-failed previous run or the webhook
      // eco arrived first). Just write hubspot_service_id locally and mark ready.
      await query(
        `UPDATE greenhouse_core.services
            SET hubspot_service_id = $2,
                hubspot_last_synced_at = CURRENT_TIMESTAMP,
                hubspot_sync_status = 'ready',
                updated_at = CURRENT_TIMESTAMP
          WHERE service_id = $1`,
        [serviceId, existingHubspotServiceId]
      )

      return `sample_sprint_outbound idempotent-hit for ${serviceId}: hubspot_service_id=${existingHubspotServiceId}`
    }

    // Step 2 — create HubSpot p_services + associations atomically via bridge.
    const properties: Record<string, string | number | null | undefined> = {
      hs_name: serviceRow.name,
      hs_pipeline_stage: VALIDATION_STAGE_ID,
      ef_greenhouse_service_id: serviceRow.idempotency_key,
      ef_engagement_kind: serviceRow.engagement_kind,
      ef_deal_id: dealContext.hubspotDealId,
      ef_organization_id: serviceRow.organization_id,
      ef_space_id: serviceRow.space_id,
      ef_start_date: toIsoDateOrNull(serviceRow.start_date),
      ef_target_end_date: toIsoDateOrNull(serviceRow.target_end_date),
      ef_total_cost: serviceRow.total_cost,
      ef_currency: serviceRow.currency,
      ef_modalidad: serviceRow.modalidad,
      ef_billing_frequency: serviceRow.billing_frequency,
      ef_linea_de_servicio: serviceRow.linea_de_servicio,
      ef_servicio_especifico: serviceRow.servicio_especifico
    }

    let createResult: Awaited<ReturnType<typeof createHubSpotGreenhouseService>>

    try {
      createResult = await createHubSpotGreenhouseService({
        properties,
        associations: {
          dealId: dealContext.hubspotDealId,
          companyId: dealContext.hubspotCompanyId,
          contactIds: dealContext.contactHubspotIds
        }
      })
    } catch (err) {
      // Roll local state back to outbound_pending so retry picks it up clean.
      await query(
        `UPDATE greenhouse_core.services
            SET hubspot_sync_status = 'outbound_pending',
                updated_at = CURRENT_TIMESTAMP
          WHERE service_id = $1
            AND hubspot_sync_status = 'outbound_in_progress'`,
        [serviceId]
      )
      captureWithDomain(err, 'integrations.hubspot', {
        tags: { source: 'sample_sprint_outbound', stage: 'bridge_create' },
        extra: { serviceId, idempotencyKey: serviceRow.idempotency_key }
      })

      throw err
    }

    const hubspotServiceId = createResult.hubspotServiceId

    if (!hubspotServiceId) {
      throw new Error(
        `sample_sprint_outbound: bridge POST /services succeeded but returned no hubspotServiceId for ${serviceId}`
      )
    }

    const allAssociationsOk = isAssociationStatusFullyOk(
      createResult.associationStatus,
      Boolean(dealContext.hubspotDealId),
      Boolean(dealContext.hubspotCompanyId),
      dealContext.contactHubspotIds.length
    )

    const finalStatus = allAssociationsOk ? 'ready' : 'partial_associations'

    // Step 3 — atomic local UPDATE with HubSpot ID + final status.
    await query(
      `UPDATE greenhouse_core.services
          SET hubspot_service_id = $2,
              hubspot_last_synced_at = CURRENT_TIMESTAMP,
              hubspot_sync_status = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE service_id = $1`,
      [serviceId, hubspotServiceId, finalStatus]
    )

    return `sample_sprint_outbound ok for ${serviceId}: hubspot_service_id=${hubspotServiceId}, status=${finalStatus}`
  },
  maxRetries: 3
}
