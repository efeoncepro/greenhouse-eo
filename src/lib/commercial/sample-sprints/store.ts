import 'server-only'

import type { PoolClient } from 'pg'

import { generateServiceId, nextPublicId } from '@/lib/account-360/id-generation'
import { getEligibleDealForRevalidation } from '@/lib/commercial/eligible-deals-reader'
import { query, withTransaction } from '@/lib/db'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { getApprovalForService, type EngagementApproval, type ProposedCapacityMember } from './approvals'
import { recordEngagementAuditEvent, type EngagementAuditEventKind } from './audit-log'
import { publishEngagementEvent } from './engagement-events'
import { buildEligibleServicePredicate } from './eligibility'
import { getOutcomeForService, type EngagementOutcome } from './outcomes'
import { listSnapshotsForService, type EngagementProgressSnapshot } from './progress-recorder'
import { toDateString, toTimestampString, trimRequired } from './shared'

export const SAMPLE_SPRINT_ENGAGEMENT_KINDS = ['pilot', 'trial', 'poc', 'discovery'] as const

export type SampleSprintEngagementKind = typeof SAMPLE_SPRINT_ENGAGEMENT_KINDS[number]

export interface SampleSprintTeamMemberInput extends ProposedCapacityMember {
  role?: string | null
}

export interface DeclareSampleSprintInput {
  name: string
  spaceId: string
  organizationId?: string | null
  engagementKind: SampleSprintEngagementKind
  startDate?: string | null
  decisionDeadline: string
  expectedDurationDays: number
  expectedInternalCostClp: number
  successCriteria: Record<string, unknown>
  proposedTeam?: SampleSprintTeamMemberInput[]
  requestedBy: string
  /**
   * TASK-837 Slice 3 — required HubSpot Deal anchor for the Sample Sprint.
   *
   * Server-side revalidation runs at declare-time (NEVER trust client) via
   * `getEligibleDealForRevalidation`. The deal must be:
   * - present in the local mirror (greenhouse_commercial.deals)
   * - not closed, not deleted
   * - have at least one company associated
   * - have at least one contact associated
   *
   * If any of these fail, declareSampleSprint throws SampleSprintValidationError
   * with a code-stable error name (operator-friendly via mapSampleSprintError).
   */
  hubspotDealId: string
}

export interface DeclareSampleSprintResult {
  serviceId: string
  publicId: string | null
  approvalId: string
  /**
   * TASK-837 Slice 3 — HubSpot outbound projection state at declare time.
   * Always 'outbound_pending' on success; the reactive consumer (Slice 4)
   * progresses it to 'ready' / 'partial_associations' / 'outbound_dead_letter'.
   */
  hubspotSyncStatus: 'outbound_pending'
  /**
   * TASK-837 Slice 3 — idempotency key persisted in services.idempotency_key
   * (= service_id by construction). Reactive consumer (Slice 4) uses this as
   * the value of `ef_greenhouse_service_id` when calling HubSpot.
   */
  idempotencyKey: string
}

export interface SampleSprintListItem {
  serviceId: string
  publicId: string | null
  name: string
  engagementKind: SampleSprintEngagementKind
  status: string
  pipelineStage: string
  spaceId: string
  spaceName: string
  clientId: string | null
  clientName: string | null
  organizationId: string | null
  organizationName: string | null
  startDate: string | null
  targetEndDate: string | null
  expectedInternalCostClp: number
  decisionDeadline: string | null
  approvalStatus: string | null
  latestSnapshotDate: string | null
  outcomeKind: string | null
  createdAt: string | null
}

export interface SampleSprintDetail extends SampleSprintListItem {
  successCriteria: Record<string, unknown>
  proposedTeam: SampleSprintTeamMemberInput[]
  approval: EngagementApproval | null
  latestSnapshots: EngagementProgressSnapshot[]
  outcome: EngagementOutcome | null
  auditEvents: SampleSprintAuditEvent[]
}

export interface SampleSprintOptions {
  spaces: Array<{
    spaceId: string
    spaceName: string
    clientId: string | null
    clientName: string | null
    organizationId: string | null
    organizationName: string | null
  }>
  members: Array<{
    memberId: string
    displayName: string
    roleTitle: string | null
  }>
  conversionTargets: Array<{
    serviceId: string
    publicId: string | null
    name: string
    spaceName: string | null
  }>
  quotations: Array<{
    quotationId: string
    quotationNumber: string
    clientName: string | null
    status: string
    totalAmountClp: number | null
  }>
}

export interface SampleSprintAuditEvent {
  auditId: string
  eventKind: EngagementAuditEventKind
  actorUserId: string | null
  reason: string | null
  payload: Record<string, unknown>
  createdAt: string | null
}

interface SampleSprintRow extends Record<string, unknown> {
  service_id: string
  public_id: string | null
  name: string
  engagement_kind: SampleSprintEngagementKind
  status: string
  pipeline_stage: string
  space_id: string
  space_name: string
  client_id: string | null
  client_name: string | null
  organization_id: string | null
  organization_name: string | null
  start_date: Date | string | null
  target_end_date: Date | string | null
  total_cost: string | number | null
  commitment_terms_json: Record<string, unknown> | null
  approval_status: string | null
  latest_snapshot_date: Date | string | null
  outcome_kind: string | null
  created_at: Date | string | null
}

interface AuditEventRow extends Record<string, unknown> {
  audit_id: string
  event_kind: EngagementAuditEventKind
  actor_user_id: string | null
  reason: string | null
  payload_json: Record<string, unknown> | null
  created_at: Date | string | null
}

interface SpaceContextRow extends Record<string, unknown> {
  space_id: string
  space_name: string
  client_id: string | null
  client_name: string | null
  organization_id: string | null
  organization_name: string | null
}

export class SampleSprintValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SampleSprintValidationError'
  }
}

const NON_REGULAR_KIND_LIST = SAMPLE_SPRINT_ENGAGEMENT_KINDS.map(kind => `'${kind}'`).join(',')

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isEngagementKind = (value: string): value is SampleSprintEngagementKind =>
  (SAMPLE_SPRINT_ENGAGEMENT_KINDS as readonly string[]).includes(value)

const normalizeProposedTeam = (value: unknown): SampleSprintTeamMemberInput[] => {
  if (!Array.isArray(value)) return []

  return value.flatMap(item => {
    if (!isPlainObject(item)) return []

    const memberId = typeof item.memberId === 'string' ? item.memberId.trim() : ''
    const proposedFte = Number(item.proposedFte)

    if (!memberId || !Number.isFinite(proposedFte) || proposedFte <= 0) return []

    return [{
      memberId,
      proposedFte,
      role: typeof item.role === 'string' && item.role.trim() ? item.role.trim() : null
    }]
  })
}

const normalizeTerms = (terms: Record<string, unknown> | null) => (isPlainObject(terms) ? terms : {})

const normalizeListItem = (row: SampleSprintRow): SampleSprintListItem => {
  const terms = normalizeTerms(row.commitment_terms_json)

  return {
    serviceId: row.service_id,
    publicId: row.public_id,
    name: row.name,
    engagementKind: row.engagement_kind,
    status: row.status,
    pipelineStage: row.pipeline_stage,
    spaceId: row.space_id,
    spaceName: row.space_name,
    clientId: row.client_id,
    clientName: row.client_name,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    startDate: toDateString(row.start_date),
    targetEndDate: toDateString(row.target_end_date),
    expectedInternalCostClp: toNumber(row.total_cost),
    decisionDeadline: typeof terms.decisionDeadline === 'string' ? terms.decisionDeadline : toDateString(row.target_end_date),
    approvalStatus: row.approval_status,
    latestSnapshotDate: toDateString(row.latest_snapshot_date),
    outcomeKind: row.outcome_kind,
    createdAt: toTimestampString(row.created_at)
  }
}

const normalizeAuditEvent = (row: AuditEventRow): SampleSprintAuditEvent => ({
  auditId: row.audit_id,
  eventKind: row.event_kind,
  actorUserId: row.actor_user_id,
  reason: row.reason,
  payload: isPlainObject(row.payload_json) ? row.payload_json : {},
  createdAt: toTimestampString(row.created_at)
})

const assertDeclareInput = (input: DeclareSampleSprintInput) => {
  const name = trimRequired(input.name, 'name')
  const spaceId = trimRequired(input.spaceId, 'spaceId')
  const requestedBy = trimRequired(input.requestedBy, 'requestedBy')
  const decisionDeadline = trimRequired(input.decisionDeadline, 'decisionDeadline')
  const hubspotDealId = trimRequired(input.hubspotDealId, 'hubspotDealId')
  const startDate = input.startDate?.trim() || null
  const organizationId = input.organizationId?.trim() || null
  const proposedTeam = normalizeProposedTeam(input.proposedTeam)

  if (!isEngagementKind(input.engagementKind)) {
    throw new SampleSprintValidationError('engagementKind is not supported.')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(decisionDeadline)) {
    throw new SampleSprintValidationError('decisionDeadline must use YYYY-MM-DD format.')
  }

  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new SampleSprintValidationError('startDate must use YYYY-MM-DD format.')
  }

  if (!Number.isInteger(input.expectedDurationDays) || input.expectedDurationDays < 7 || input.expectedDurationDays > 120) {
    throw new SampleSprintValidationError('expectedDurationDays must be an integer between 7 and 120.')
  }

  if (!Number.isFinite(input.expectedInternalCostClp) || input.expectedInternalCostClp < 0) {
    throw new SampleSprintValidationError('expectedInternalCostClp must be a non-negative number.')
  }

  if (!isPlainObject(input.successCriteria) || Object.keys(input.successCriteria).length === 0) {
    throw new SampleSprintValidationError('successCriteria must be a non-empty object.')
  }

  return {
    name,
    spaceId,
    organizationId,
    engagementKind: input.engagementKind,
    startDate,
    decisionDeadline,
    expectedDurationDays: input.expectedDurationDays,
    expectedInternalCostClp: input.expectedInternalCostClp,
    successCriteria: input.successCriteria,
    proposedTeam,
    requestedBy,
    hubspotDealId
  }
}

const tenantScopePredicate = (tenant: TenantContext, startIndex: number) => {
  const clauses: string[] = []
  const values: unknown[] = []

  if (tenant.spaceId) {
    values.push(tenant.spaceId)
    clauses.push(`s.space_id = $${startIndex + values.length - 1}`)
  }

  if (tenant.clientId) {
    values.push(tenant.clientId)
    clauses.push(`sp.client_id = $${startIndex + values.length - 1}`)
  }

  if (clauses.length === 0) {
    return { sql: '', values }
  }

  return {
    sql: `AND ${clauses.join(' AND ')}`,
    values
  }
}

const findSpaceContextForUpdate = async (client: PoolClient, spaceId: string): Promise<SpaceContextRow> => {
  const result = await client.query<SpaceContextRow>(
    `SELECT
       sp.space_id,
       sp.space_name,
       sp.client_id,
       c.client_name,
       sp.organization_id,
       o.organization_name
     FROM greenhouse_core.spaces sp
     LEFT JOIN greenhouse_core.clients c ON c.client_id = sp.client_id
     LEFT JOIN greenhouse_core.organizations o ON o.organization_id = sp.organization_id
     WHERE sp.space_id = $1
       AND sp.active = TRUE
     LIMIT 1
     FOR UPDATE OF sp`,
    [spaceId]
  )

  const space = result.rows[0]

  if (!space) {
    throw new SampleSprintValidationError(`Space ${spaceId} is not active or does not exist.`)
  }

  return space
}

export const declareSampleSprint = async (
  input: DeclareSampleSprintInput
): Promise<DeclareSampleSprintResult> => {
  const normalized = assertDeclareInput(input)

  // TASK-837 Slice 3 — server-side Deal eligibility revalidation.
  // NEVER trust client-supplied hubspotDealId; always read fresh from PG mirror.
  // Cache in eligible-deals-reader is bypassed by getEligibleDealForRevalidation.
  //
  // Pre-fetch the selected space's client_id as hint for company resolution.
  // Live audit 2026-05-09: deal.client_id is NULL in 73% of synced deals; the
  // canonical anchor is space → client_id → companies.client_id.
  const spaceClientHint = await query<{ client_id: string | null }>(
    `SELECT client_id FROM greenhouse_core.spaces WHERE space_id = $1 LIMIT 1`,
    [normalized.spaceId]
  )

  const clientIdHint = spaceClientHint[0]?.client_id ?? undefined

  const eligibleDeal = await getEligibleDealForRevalidation(normalized.hubspotDealId, {
    clientIdHint
  })

  if (!eligibleDeal) {
    throw new SampleSprintValidationError(
      `HubSpot Deal ${normalized.hubspotDealId} no está sincronizado en Greenhouse o no existe.`
    )
  }

  if (!eligibleDeal.isEligible) {
    const reasonsLabel = eligibleDeal.ineligibilityReasons.join(', ')

    throw new SampleSprintValidationError(
      `HubSpot Deal ${normalized.hubspotDealId} no es elegible para Sample Sprint (${reasonsLabel}).`
    )
  }

  const serviceId = generateServiceId()
  const publicId = await nextPublicId('EO-SVC')
  // TASK-837 Slice 3 — idempotency_key = service_id (UUID Greenhouse).
  // Slice 4 reactive consumer escribe esto a HubSpot como ef_greenhouse_service_id
  // para idempotency search-before-create. Pre-Checkpoint A había alternativa
  // hs_unique_creation_key, pero esa property es READ-ONLY en 0-162.
  const idempotencyKey = serviceId

  return withTransaction(async client => {
    const space = await findSpaceContextForUpdate(client, normalized.spaceId)
    const organizationId = normalized.organizationId ?? space.organization_id

    const targetEndDate = normalized.decisionDeadline

    const terms = {
      successCriteria: normalized.successCriteria,
      decisionDeadline: normalized.decisionDeadline,
      expectedInternalCostClp: normalized.expectedInternalCostClp,
      expectedDurationDays: normalized.expectedDurationDays,
      proposedTeam: normalized.proposedTeam,
      // TASK-837 Slice 3 — preserve Deal context for projection consumer + audit.
      hubspotDealContext: {
        hubspotDealId: eligibleDeal.hubspotDealId,
        hubspotCompanyId: eligibleDeal.company?.hubspotCompanyId ?? null,
        contactHubspotIds: eligibleDeal.contacts.map(c => c.hubspotContactId),
        dealNameSnapshotAtDeclare: eligibleDeal.dealName
      }
    }

    await client.query(
      `INSERT INTO greenhouse_core.services (
         service_id, public_id, name, space_id, organization_id,
         pipeline_stage, start_date, target_end_date, total_cost, currency,
         linea_de_servicio, servicio_especifico, modalidad, billing_frequency,
         active, status, engagement_kind, commitment_terms_json,
         hubspot_deal_id, idempotency_key, hubspot_sync_status,
         created_by, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         'onboarding', $6::date, $7::date, $8, 'CLP',
         'crm_solutions', 'sample_sprint', 'sprint', 'project',
         TRUE, 'pending_approval', $9, $10::jsonb,
         $11, $12, 'outbound_pending',
         $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )`,
      [
        serviceId,
        publicId,
        normalized.name,
        normalized.spaceId,
        organizationId,
        normalized.startDate,
        targetEndDate,
        normalized.expectedInternalCostClp,
        normalized.engagementKind,
        JSON.stringify(terms),
        eligibleDeal.hubspotDealId,
        idempotencyKey,
        normalized.requestedBy
      ]
    )

    const approvalResult = await client.query<{ approval_id: string }>(
      `INSERT INTO greenhouse_commercial.engagement_approvals (
         service_id,
         requested_by,
         expected_internal_cost_clp,
         expected_duration_days,
         decision_deadline,
         success_criteria_json
       ) VALUES (
         $1, $2, $3, $4, $5::date, $6::jsonb
       )
       RETURNING approval_id`,
      [
        serviceId,
        normalized.requestedBy,
        normalized.expectedInternalCostClp,
        normalized.expectedDurationDays,
        normalized.decisionDeadline,
        JSON.stringify(normalized.successCriteria)
      ]
    )

    const approvalId = approvalResult.rows[0]?.approval_id

    if (!approvalId) {
      throw new Error('Failed to create Sample Sprint approval request.')
    }

    await recordEngagementAuditEvent(
      {
        serviceId,
        eventKind: 'declared',
        actorUserId: normalized.requestedBy,
        payload: {
          approvalId,
          engagementKind: normalized.engagementKind,
          publicId,
          spaceId: normalized.spaceId,
          organizationId,
          clientId: space.client_id,
          expectedInternalCostClp: normalized.expectedInternalCostClp,
          decisionDeadline: normalized.decisionDeadline,
          proposedTeamCount: normalized.proposedTeam.length,
          // TASK-837 Slice 3 — Deal anchor for audit trail.
          hubspotDealId: eligibleDeal.hubspotDealId,
          hubspotCompanyId: eligibleDeal.company?.hubspotCompanyId ?? null,
          contactCount: eligibleDeal.contacts.length,
          idempotencyKey
        }
      },
      client
    )

    await publishEngagementEvent(
      {
        serviceId,
        eventType: EVENT_TYPES.serviceEngagementDeclared,
        actorUserId: normalized.requestedBy,
        payload: {
          approvalId,
          engagementKind: normalized.engagementKind,
          publicId,
          spaceId: normalized.spaceId,
          organizationId,
          clientId: space.client_id,
          decisionDeadline: normalized.decisionDeadline
        }
      },
      client
    )

    // TASK-837 Slice 3 — second outbox event: trigger Slice 4 reactive consumer
    // to project this Sample Sprint to HubSpot p_services. Separate from
    // service.engagement.declared (which has TASK-835 cache invalidation
    // consumer) by design — keeps separation of concerns: declare is local,
    // outbound_requested is HubSpot projection trigger.
    await publishEngagementEvent(
      {
        serviceId,
        eventType: EVENT_TYPES.serviceEngagementOutboundRequested,
        actorUserId: normalized.requestedBy,
        payload: {
          hubspotDealId: eligibleDeal.hubspotDealId,
          hubspotCompanyId: eligibleDeal.company?.hubspotCompanyId ?? null,
          contactHubspotIds: eligibleDeal.contacts.map(c => c.hubspotContactId),
          idempotencyKey,
          engagementKind: normalized.engagementKind,
          requestedAt: new Date().toISOString()
        }
      },
      client
    )

    return {
      serviceId,
      publicId,
      approvalId,
      hubspotSyncStatus: 'outbound_pending' as const,
      idempotencyKey
    }
  })
}

export const listSampleSprints = async ({
  tenant,
  status
}: {
  tenant: TenantContext
  status?: string | null
}) => {
  const statusFilter = status?.trim() ? 'AND s.status = $1' : ''
  const values: unknown[] = statusFilter ? [status?.trim()] : []
  const scope = tenantScopePredicate(tenant, values.length + 1)
  const scopedValues = scope.values

  const rows = await query<SampleSprintRow>(
    `SELECT
       s.service_id,
       s.public_id,
       s.name,
       s.engagement_kind,
       s.status,
       s.pipeline_stage,
       s.space_id,
       sp.space_name,
       sp.client_id,
       c.client_name,
       s.organization_id,
       o.organization_name,
       s.start_date,
       s.target_end_date,
       s.total_cost,
       s.commitment_terms_json,
       a.status AS approval_status,
       ps.snapshot_date AS latest_snapshot_date,
       oc.outcome_kind,
       s.created_at
     FROM greenhouse_core.services s
     JOIN greenhouse_core.spaces sp ON sp.space_id = s.space_id
     LEFT JOIN greenhouse_core.clients c ON c.client_id = sp.client_id
     LEFT JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
     LEFT JOIN LATERAL (
       SELECT status
       FROM greenhouse_commercial.engagement_approvals
       WHERE service_id = s.service_id
       ORDER BY created_at DESC
       LIMIT 1
     ) a ON TRUE
     LEFT JOIN LATERAL (
       SELECT snapshot_date
       FROM greenhouse_commercial.engagement_progress_snapshots
       WHERE service_id = s.service_id
       ORDER BY snapshot_date DESC, recorded_at DESC
       LIMIT 1
     ) ps ON TRUE
     LEFT JOIN LATERAL (
       SELECT outcome_kind
       FROM greenhouse_commercial.engagement_outcomes
       WHERE service_id = s.service_id
       ORDER BY decided_at DESC
       LIMIT 1
     ) oc ON TRUE
     WHERE s.engagement_kind IN (${NON_REGULAR_KIND_LIST})
       AND ${buildEligibleServicePredicate('s')}
       ${statusFilter}
       ${scope.sql}
     ORDER BY s.created_at DESC
     LIMIT 100`,
    [...values, ...scopedValues]
  )

  return rows.map(normalizeListItem)
}

export const getSampleSprintDetail = async ({
  tenant,
  serviceId
}: {
  tenant: TenantContext
  serviceId: string
}): Promise<SampleSprintDetail | null> => {
  const normalizedServiceId = trimRequired(serviceId, 'serviceId')
  const scope = tenantScopePredicate(tenant, 2)

  const rows = await query<SampleSprintRow>(
    `SELECT
       s.service_id,
       s.public_id,
       s.name,
       s.engagement_kind,
       s.status,
       s.pipeline_stage,
       s.space_id,
       sp.space_name,
       sp.client_id,
       c.client_name,
       s.organization_id,
       o.organization_name,
       s.start_date,
       s.target_end_date,
       s.total_cost,
       s.commitment_terms_json,
       a.status AS approval_status,
       ps.snapshot_date AS latest_snapshot_date,
       oc.outcome_kind,
       s.created_at
     FROM greenhouse_core.services s
     JOIN greenhouse_core.spaces sp ON sp.space_id = s.space_id
     LEFT JOIN greenhouse_core.clients c ON c.client_id = sp.client_id
     LEFT JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
     LEFT JOIN LATERAL (
       SELECT status
       FROM greenhouse_commercial.engagement_approvals
       WHERE service_id = s.service_id
       ORDER BY created_at DESC
       LIMIT 1
     ) a ON TRUE
     LEFT JOIN LATERAL (
       SELECT snapshot_date
       FROM greenhouse_commercial.engagement_progress_snapshots
       WHERE service_id = s.service_id
       ORDER BY snapshot_date DESC, recorded_at DESC
       LIMIT 1
     ) ps ON TRUE
     LEFT JOIN LATERAL (
       SELECT outcome_kind
       FROM greenhouse_commercial.engagement_outcomes
       WHERE service_id = s.service_id
       ORDER BY decided_at DESC
       LIMIT 1
     ) oc ON TRUE
     WHERE s.service_id = $1
       AND s.engagement_kind IN (${NON_REGULAR_KIND_LIST})
       AND ${buildEligibleServicePredicate('s')}
       ${scope.sql}
     LIMIT 1`,
    [normalizedServiceId, ...scope.values]
  )

  const row = rows[0]

  if (!row) return null

  const terms = normalizeTerms(row.commitment_terms_json)

  const auditRows = await query<AuditEventRow>(
    `SELECT audit_id, event_kind, actor_user_id, reason, payload_json, created_at
     FROM greenhouse_commercial.engagement_audit_log
     WHERE service_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [normalizedServiceId]
  )

  return {
    ...normalizeListItem(row),
    successCriteria: isPlainObject(terms.successCriteria) ? terms.successCriteria : {},
    proposedTeam: normalizeProposedTeam(terms.proposedTeam),
    approval: await getApprovalForService(normalizedServiceId),
    latestSnapshots: await listSnapshotsForService(normalizedServiceId),
    outcome: await getOutcomeForService(normalizedServiceId),
    auditEvents: auditRows.map(normalizeAuditEvent)
  }
}

export const listSampleSprintOptions = async (tenant: TenantContext): Promise<SampleSprintOptions> => {
  const spaces = await query<SpaceContextRow>(
    `SELECT
       sp.space_id,
       sp.space_name,
       sp.client_id,
       c.client_name,
       sp.organization_id,
       o.organization_name
     FROM greenhouse_core.spaces sp
     LEFT JOIN greenhouse_core.clients c ON c.client_id = sp.client_id
     LEFT JOIN greenhouse_core.organizations o ON o.organization_id = sp.organization_id
     WHERE sp.active = TRUE
       AND ($1::text IS NULL OR sp.space_id = $1)
       AND ($2::text IS NULL OR sp.client_id = $2)
     ORDER BY sp.space_name ASC
     LIMIT 200`,
    [tenant.spaceId || null, tenant.clientId || null]
  )

  const members = await query<{ member_id: string; display_name: string; role_title: string | null }>(
    `SELECT member_id, display_name, role_title
     FROM greenhouse_core.members
     WHERE active = TRUE
       AND assignable = TRUE
     ORDER BY display_name ASC
     LIMIT 200`
  )

  const conversionTargets = await query<{ service_id: string; public_id: string | null; name: string; space_name: string | null }>(
    `SELECT s.service_id, s.public_id, s.name, sp.space_name
     FROM greenhouse_core.services s
     LEFT JOIN greenhouse_core.spaces sp ON sp.space_id = s.space_id
     WHERE s.engagement_kind = 'regular'
       AND ${buildEligibleServicePredicate('s')}
       AND ($1::text IS NULL OR s.space_id = $1)
     ORDER BY s.created_at DESC
     LIMIT 100`,
    [tenant.spaceId || null]
  )

  const quotations = await query<{
    quotation_id: string
    quotation_number: string
    client_name_cache: string | null
    status: string
    total_amount_clp: string | number | null
  }>(
    `SELECT quotation_id, quotation_number, client_name_cache, status, total_amount_clp
     FROM greenhouse_commercial.quotations
     WHERE legacy_excluded = FALSE
       AND ($1::text IS NULL OR space_id = $1)
     ORDER BY created_at DESC
     LIMIT 100`,
    [tenant.spaceId || null]
  )

  return {
    spaces: spaces.map(space => ({
      spaceId: space.space_id,
      spaceName: space.space_name,
      clientId: space.client_id,
      clientName: space.client_name,
      organizationId: space.organization_id,
      organizationName: space.organization_name
    })),
    members: members.map(member => ({
      memberId: member.member_id,
      displayName: member.display_name,
      roleTitle: member.role_title
    })),
    conversionTargets: conversionTargets.map(target => ({
      serviceId: target.service_id,
      publicId: target.public_id,
      name: target.name,
      spaceName: target.space_name
    })),
    quotations: quotations.map(item => ({
      quotationId: item.quotation_id,
      quotationNumber: item.quotation_number,
      clientName: item.client_name_cache,
      status: item.status,
      totalAmountClp: item.total_amount_clp == null ? null : toNumber(item.total_amount_clp)
    }))
  }
}
