import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction, query } from '@/lib/db'
import { HrCoreValidationError, assertDateString, normalizeNullableString } from '@/lib/hr-core/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { normalizeContractType, normalizePayRegime, normalizePayrollVia } from '@/types/hr-contracts'

import { resolveOffboardingLane } from './lane'
import { assertOffboardingTransition, isTerminalOffboardingStatus } from './state-machine'
import type {
  CreateOffboardingCaseInput,
  OffboardingCase,
  OffboardingCaseListFilters,
  OffboardingCaseStatus,
  OffboardingRelationshipType,
  OffboardingSource,
  OffboardingSeparationType,
  TransitionOffboardingCaseInput
} from './types'

type OffboardingCaseRow = Record<string, any>

type MemberContextRow = {
  member_id: string
  display_name: string
  active: boolean
  identity_profile_id: string | null
  primary_email: string | null
  user_id: string | null
  relationship_id: string | null
  legal_entity_organization_id: string | null
  relationship_type: string | null
  space_id: string | null
  organization_id: string | null
  employment_type: string | null
  contract_type: string | null
  pay_regime: string | null
  payroll_via: string | null
  deel_contract_id: string | null
  contract_end_date: string | Date | null
  location_country: string | null
}

type ContractExpiryCandidateRow = {
  member_id: string
  identity_profile_id: string | null
  display_name: string | null
  contract_end_date: string | Date | null
  contract_type: string | null
}

const ACTIVE_STATUSES: OffboardingCaseStatus[] = ['draft', 'needs_review', 'approved', 'scheduled', 'blocked']

const toDateString = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return null
}

const toTimestampString = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()

  return null
}

const toJsonRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const normalizeRelationshipType = (value: string | null | undefined, contractType: string): OffboardingRelationshipType => {
  if (value === 'employee' || value === 'contractor' || value === 'eor' || value === 'executive') return value
  if (contractType === 'contractor' || contractType === 'honorarios') return 'contractor'
  if (contractType === 'eor') return 'eor'

  return 'employee'
}

const mapCaseRow = (row: OffboardingCaseRow): OffboardingCase => ({
  offboardingCaseId: row.offboarding_case_id,
  publicId: row.public_id,
  profileId: row.profile_id,
  memberId: row.member_id,
  userId: row.user_id,
  personLegalEntityRelationshipId: row.person_legal_entity_relationship_id,
  legalEntityOrganizationId: row.legal_entity_organization_id,
  organizationId: row.organization_id,
  spaceId: row.space_id,
  relationshipType: row.relationship_type,
  employmentType: row.employment_type,
  contractTypeSnapshot: row.contract_type_snapshot,
  payRegimeSnapshot: row.pay_regime_snapshot,
  payrollViaSnapshot: row.payroll_via_snapshot,
  deelContractIdSnapshot: row.deel_contract_id_snapshot,
  countryCode: row.country_code,
  contractEndDateSnapshot: toDateString(row.contract_end_date_snapshot),
  separationType: row.separation_type,
  source: row.source,
  status: row.status,
  ruleLane: row.rule_lane,
  requiresPayrollClosure: row.requires_payroll_closure,
  requiresLeaveReconciliation: row.requires_leave_reconciliation,
  requiresHrDocuments: row.requires_hr_documents,
  requiresAccessRevocation: row.requires_access_revocation,
  requiresAssetRecovery: row.requires_asset_recovery,
  requiresAssignmentHandoff: row.requires_assignment_handoff,
  requiresApprovalReassignment: row.requires_approval_reassignment,
  greenhouseExecutionMode: row.greenhouse_execution_mode,
  effectiveDate: toDateString(row.effective_date),
  lastWorkingDay: toDateString(row.last_working_day),
  lastWorkingDayAfterEffectiveReason: row.last_working_day_after_effective_reason,
  submittedAt: toTimestampString(row.submitted_at),
  approvedAt: toTimestampString(row.approved_at),
  scheduledAt: toTimestampString(row.scheduled_at),
  executedAt: toTimestampString(row.executed_at),
  cancelledAt: toTimestampString(row.cancelled_at),
  blockedReason: row.blocked_reason,
  reasonCode: row.reason_code,
  notes: row.notes,
  legacyChecklistRef: toJsonRecord(row.legacy_checklist_ref),
  sourceRef: toJsonRecord(row.source_ref),
  metadata: toJsonRecord(row.metadata_json),
  createdByUserId: row.created_by_user_id,
  updatedByUserId: row.updated_by_user_id,
  createdAt: toTimestampString(row.created_at) ?? '',
  updatedAt: toTimestampString(row.updated_at) ?? ''
})

const getMemberContext = async (memberId: string, client?: PoolClient) => {
  const sql = `
    SELECT
      m.member_id,
      m.display_name,
      m.active,
      m.identity_profile_id,
      m.primary_email,
      u.user_id,
      rel.relationship_id,
      rel.legal_entity_organization_id,
      rel.relationship_type,
      COALESCE(rel.space_id, mrel.space_id) AS space_id,
      rel.legal_entity_organization_id AS organization_id,
      m.employment_type,
      m.contract_type,
      m.pay_regime,
      m.payroll_via,
      m.deel_contract_id,
      m.contract_end_date,
      m.location_country
    FROM greenhouse_core.members m
    LEFT JOIN LATERAL (
      SELECT cu.user_id
      FROM greenhouse_core.client_users cu
      WHERE cu.identity_profile_id = m.identity_profile_id
         OR lower(cu.email) = lower(m.primary_email)
         OR lower(cu.microsoft_email) = lower(m.primary_email)
      ORDER BY cu.active DESC, cu.created_at ASC
      LIMIT 1
    ) u ON TRUE
    LEFT JOIN LATERAL (
      SELECT pler.relationship_id, pler.legal_entity_organization_id, pler.relationship_type, pler.space_id
      FROM greenhouse_core.person_legal_entity_relationships pler
      WHERE pler.profile_id = m.identity_profile_id
        AND pler.status = 'active'
        AND pler.relationship_type IN ('employee', 'contractor', 'executive')
      ORDER BY pler.effective_from DESC, pler.created_at DESC
      LIMIT 1
    ) rel ON TRUE
    LEFT JOIN LATERAL (
      SELECT pm.space_id
      FROM greenhouse_core.person_memberships pm
      WHERE pm.profile_id = m.identity_profile_id
        AND pm.active = TRUE
      ORDER BY pm.is_primary DESC, pm.created_at ASC
      LIMIT 1
    ) mrel ON TRUE
    WHERE m.member_id = $1
    LIMIT 1
  `

  const rows = client
    ? (await client.query<MemberContextRow>(sql, [memberId])).rows
    : await query<MemberContextRow>(sql, [memberId])

  const row = (rows as MemberContextRow[])[0]

  if (!row) {
    throw new HrCoreValidationError('Member not found.', 404)
  }

  if (!row.identity_profile_id) {
    throw new HrCoreValidationError('Member does not have an identity profile linked.', 409, { memberId })
  }

  return row
}

const insertCaseEvent = async (
  client: PoolClient,
  {
    caseId,
    eventType,
    fromStatus,
    toStatus,
    actorUserId,
    source,
    reason,
    payload
  }: {
    caseId: string
    eventType: string
    fromStatus?: string | null
    toStatus?: string | null
    actorUserId?: string | null
    source: string
    reason?: string | null
    payload?: Record<string, unknown>
  }
) => {
  await client.query(
    `
      INSERT INTO greenhouse_hr.work_relationship_offboarding_case_events (
        event_id,
        offboarding_case_id,
        event_type,
        from_status,
        to_status,
        actor_user_id,
        source,
        reason,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    `,
    [
      `offboarding-case-event-${randomUUID()}`,
      caseId,
      eventType,
      fromStatus ?? null,
      toStatus ?? null,
      actorUserId ?? null,
      source,
      reason ?? null,
      JSON.stringify(payload ?? {})
    ]
  )
}

const publishCaseEvent = async (
  client: PoolClient,
  eventType: string,
  offboardingCase: OffboardingCase,
  payload: Record<string, unknown> = {}
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.workRelationshipOffboardingCase,
      aggregateId: offboardingCase.offboardingCaseId,
      eventType,
      payload: {
        schemaVersion: 1,
        offboardingCaseId: offboardingCase.offboardingCaseId,
        publicId: offboardingCase.publicId,
        memberId: offboardingCase.memberId,
        profileId: offboardingCase.profileId,
        relationshipId: offboardingCase.personLegalEntityRelationshipId,
        status: offboardingCase.status,
        ruleLane: offboardingCase.ruleLane,
        effectiveDate: offboardingCase.effectiveDate,
        lastWorkingDay: offboardingCase.lastWorkingDay,
        ...payload
      }
    },
    client
  )
}

const assertPayrollExecutionReadiness = async (client: PoolClient, current: OffboardingCase) => {
  if (current.status !== 'scheduled' || current.ruleLane !== 'internal_payroll') return

  if (current.requiresPayrollClosure) {
    const settlementRows = await client.query<{ calculation_status: string; readiness_has_blockers: boolean }>(
      `
        SELECT calculation_status, readiness_has_blockers
        FROM greenhouse_payroll.final_settlements
        WHERE offboarding_case_id = $1
        ORDER BY settlement_version DESC, created_at DESC
        LIMIT 1
      `,
      [current.offboardingCaseId]
    )

    const settlement = settlementRows.rows[0]

    if (!settlement || settlement.readiness_has_blockers || !['approved', 'issued'].includes(settlement.calculation_status)) {
      throw new HrCoreValidationError('Internal payroll offboarding requires an approved final settlement before execution.', 409, {
        offboardingCaseId: current.offboardingCaseId,
        publicId: current.publicId,
        required: 'final_settlement.approved',
        currentStatus: settlement?.calculation_status ?? null
      })
    }
  }

  if (current.requiresHrDocuments) {
    const documentRows = await client.query<{ document_status: string }>(
      `
        SELECT document_status
        FROM greenhouse_payroll.final_settlement_documents
        WHERE offboarding_case_id = $1
        ORDER BY document_version DESC, created_at DESC
        LIMIT 1
      `,
      [current.offboardingCaseId]
    )

    const document = documentRows.rows[0]

    if (!document || !['issued', 'signed_or_ratified'].includes(document.document_status)) {
      throw new HrCoreValidationError('Internal payroll offboarding requires an issued final settlement document before execution.', 409, {
        offboardingCaseId: current.offboardingCaseId,
        publicId: current.publicId,
        required: 'final_settlement_document.issued',
        currentStatus: document?.document_status ?? null
      })
    }
  }
}

const closeFuturePayrollEligibility = async (
  client: PoolClient,
  current: OffboardingCase,
  lastWorkingDay: string | null
) => {
  if (!current.memberId || !lastWorkingDay) {
    return { updatedCompensationVersions: 0 }
  }

  const result = await client.query<{ version_id: string }>(
    `
      UPDATE greenhouse_payroll.compensation_versions
      SET
        effective_to = $2::date,
        is_current = FALSE
      WHERE member_id = $1
        AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to > $2::date)
      RETURNING version_id
    `,
    [current.memberId, lastWorkingDay]
  )

  return { updatedCompensationVersions: result.rows.length }
}

export const listOffboardingCases = async (filters: OffboardingCaseListFilters = {}) => {
  const params: unknown[] = []
  const where: string[] = []

  if (filters.memberId) {
    params.push(filters.memberId)
    where.push(`member_id = $${params.length}`)
  }

  if (filters.status === 'active') {
    where.push(`status = ANY($${params.length + 1}::text[])`)
    params.push(ACTIVE_STATUSES)
  } else if (filters.status) {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  }

  params.push(Math.min(Math.max(filters.limit ?? 100, 1), 200))

  const rows = await query<OffboardingCaseRow>(
    `
      SELECT *
      FROM greenhouse_hr.work_relationship_offboarding_cases
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `,
    params
  )

  return rows.map(mapCaseRow)
}

export const getOffboardingCase = async (caseId: string) => {
  const rows = await query<OffboardingCaseRow>(
    `
      SELECT *
      FROM greenhouse_hr.work_relationship_offboarding_cases
      WHERE offboarding_case_id = $1
      LIMIT 1
    `,
    [caseId]
  )

  return rows[0] ? mapCaseRow(rows[0]) : null
}

export const getActiveOffboardingCaseForMember = async (memberId: string) => {
  const rows = await query<OffboardingCaseRow>(
    `
      SELECT *
      FROM greenhouse_hr.work_relationship_offboarding_cases
      WHERE member_id = $1
        AND status = ANY($2::text[])
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [memberId, ACTIVE_STATUSES]
  )

  return rows[0] ? mapCaseRow(rows[0]) : null
}

export const createOffboardingCase = async ({
  input,
  actorUserId
}: {
  input: CreateOffboardingCaseInput
  actorUserId: string
}) => {
  if (input.effectiveDate) assertDateString(input.effectiveDate, 'effectiveDate')
  if (input.lastWorkingDay) assertDateString(input.lastWorkingDay, 'lastWorkingDay')

  return withTransaction(async client => {
    const existing = await client.query<OffboardingCaseRow>(
      `
        SELECT *
        FROM greenhouse_hr.work_relationship_offboarding_cases
        WHERE member_id = $1
          AND status = ANY($2::text[])
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [input.memberId, ACTIVE_STATUSES]
    )

    if (existing.rows[0]) {
      throw new HrCoreValidationError('Member already has an active offboarding case.', 409, {
        offboardingCaseId: existing.rows[0].offboarding_case_id
      })
    }

    const member = await getMemberContext(input.memberId, client)
    const contractType = normalizeContractType(member.contract_type)
    const payRegime = normalizePayRegime(member.pay_regime, contractType)
    const payrollVia = normalizePayrollVia(member.payroll_via, contractType)
    const relationshipType = normalizeRelationshipType(member.relationship_type, contractType)
    const separationType = input.separationType

    const lane = resolveOffboardingLane({
      relationshipType,
      contractType,
      payRegime,
      payrollVia,
      separationType
    })

    const caseId = `offboarding-case-${randomUUID()}`
    const publicId = `EO-OFF-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`
    const status = input.status ?? (input.source === 'scim' || input.source === 'admin' || input.source === 'contract_expiry' ? 'needs_review' : 'draft')

    const result = await client.query<OffboardingCaseRow>(
      `
        INSERT INTO greenhouse_hr.work_relationship_offboarding_cases (
          offboarding_case_id,
          public_id,
          profile_id,
          member_id,
          user_id,
          person_legal_entity_relationship_id,
          legal_entity_organization_id,
          organization_id,
          space_id,
          relationship_type,
          employment_type,
          contract_type_snapshot,
          pay_regime_snapshot,
          payroll_via_snapshot,
          deel_contract_id_snapshot,
          country_code,
          contract_end_date_snapshot,
          separation_type,
          source,
          status,
          rule_lane,
          requires_payroll_closure,
          requires_leave_reconciliation,
          requires_hr_documents,
          requires_access_revocation,
          requires_asset_recovery,
          requires_assignment_handoff,
          requires_approval_reassignment,
          greenhouse_execution_mode,
          effective_date,
          last_working_day,
          last_working_day_after_effective_reason,
          reason_code,
          notes,
          legacy_checklist_ref,
          source_ref,
          metadata_json,
          created_by_user_id,
          updated_by_user_id,
          submitted_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25,
          $26, $27, $28, $29, $30, $31, $32, $33,
          $34, $35::jsonb, $36::jsonb, $37::jsonb, $38, $38, now()
        )
        RETURNING *
      `,
      [
        caseId,
        publicId,
        member.identity_profile_id,
        member.member_id,
        member.user_id,
        member.relationship_id,
        member.legal_entity_organization_id,
        member.organization_id,
        member.space_id,
        relationshipType,
        member.employment_type,
        contractType,
        payRegime,
        payrollVia,
        member.deel_contract_id,
        member.location_country,
        toDateString(member.contract_end_date),
        separationType,
        input.source ?? 'manual_hr',
        status,
        lane.ruleLane,
        lane.requiresPayrollClosure,
        lane.requiresLeaveReconciliation,
        lane.requiresHrDocuments,
        lane.requiresAccessRevocation,
        lane.requiresAssetRecovery,
        lane.requiresAssignmentHandoff,
        lane.requiresApprovalReassignment,
        lane.greenhouseExecutionMode,
        input.effectiveDate ?? null,
        input.lastWorkingDay ?? null,
        normalizeNullableString(input.lastWorkingDayAfterEffectiveReason),
        normalizeNullableString(input.reasonCode),
        normalizeNullableString(input.notes),
        JSON.stringify(input.legacyChecklistRef ?? {}),
        JSON.stringify(input.sourceRef ?? {}),
        JSON.stringify({ memberDisplayName: member.display_name, createdFrom: input.source ?? 'manual_hr' }),
        actorUserId
      ]
    )

    const created = mapCaseRow(result.rows[0])

    await insertCaseEvent(client, {
      caseId,
      eventType: 'offboarding_case.created',
      toStatus: created.status,
      actorUserId,
      source: created.source,
      payload: { sourceRef: created.sourceRef, ruleLane: created.ruleLane }
    })

    await publishCaseEvent(client, EVENT_TYPES.workRelationshipOffboardingCaseCreated, created)

    return created
  })
}

export const openOffboardingNeedsReviewFromMember = async ({
  memberId,
  source,
  separationType,
  actorUserId,
  sourceRef,
  notes
}: {
  memberId: string
  source: Extract<OffboardingSource, 'scim' | 'admin' | 'contract_expiry' | 'system'>
  separationType: OffboardingSeparationType
  actorUserId: string
  sourceRef?: Record<string, unknown>
  notes?: string | null
}) => {
  const existing = await getActiveOffboardingCaseForMember(memberId)

  if (existing) return existing

  return createOffboardingCase({
    actorUserId,
    input: {
      memberId,
      separationType,
      source,
      status: 'needs_review',
      sourceRef,
      notes
    }
  })
}

export const openContractExpiryReviewCases = async ({
  actorUserId,
  daysAhead = 30,
  limit = 100
}: {
  actorUserId: string
  daysAhead?: number
  limit?: number
}) => {
  const boundedDaysAhead = Math.min(Math.max(Math.trunc(daysAhead), 0), 365)
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 200)

  const candidates = await query<ContractExpiryCandidateRow>(
    `
      SELECT
        m.member_id,
        m.identity_profile_id,
        m.display_name,
        m.contract_end_date,
        m.contract_type
      FROM greenhouse_core.members m
      WHERE m.active = TRUE
        AND m.contract_end_date IS NOT NULL
        AND m.contract_end_date <= (CURRENT_DATE + ($1::int * INTERVAL '1 day'))
        AND NOT EXISTS (
          SELECT 1
          FROM greenhouse_hr.work_relationship_offboarding_cases oc
          WHERE oc.member_id = m.member_id
            AND oc.status = ANY($2::text[])
        )
      ORDER BY m.contract_end_date ASC, m.created_at ASC
      LIMIT $3
    `,
    [boundedDaysAhead, ACTIVE_STATUSES, boundedLimit]
  )

  const opened: OffboardingCase[] = []
  const skipped: Array<{ memberId: string; reason: string }> = []

  for (const candidate of candidates) {
    try {
      opened.push(
        await openOffboardingNeedsReviewFromMember({
          memberId: candidate.member_id,
          source: 'contract_expiry',
          separationType: candidate.contract_type === 'plazo_fijo' ? 'fixed_term_expiry' : 'contract_end',
          actorUserId,
          sourceRef: {
            contractEndDate: toDateString(candidate.contract_end_date),
            daysAhead: boundedDaysAhead,
            trigger: 'contract_expiry_scan'
          },
          notes: 'Revisión abierta por fin de contrato próximo o vencido. No ejecuta offboarding automáticamente.'
        })
      )
    } catch (error) {
      if (error instanceof HrCoreValidationError && error.statusCode === 409) {
        skipped.push({ memberId: candidate.member_id, reason: 'active_case_exists' })
      } else {
        throw error
      }
    }
  }

  return {
    opened,
    skipped,
    scanned: candidates.length,
    daysAhead: boundedDaysAhead,
    limit: boundedLimit
  }
}

export const transitionOffboardingCase = async ({
  caseId,
  input,
  actorUserId
}: {
  caseId: string
  input: TransitionOffboardingCaseInput
  actorUserId: string
}) => {
  return withTransaction(async client => {
    const currentRows = await client.query<OffboardingCaseRow>(
      `
        SELECT *
        FROM greenhouse_hr.work_relationship_offboarding_cases
        WHERE offboarding_case_id = $1
        FOR UPDATE
      `,
      [caseId]
    )

    if (!currentRows.rows[0]) {
      throw new HrCoreValidationError('Offboarding case not found.', 404)
    }

    const current = mapCaseRow(currentRows.rows[0])

    if (isTerminalOffboardingStatus(current.status)) {
      throw new HrCoreValidationError('Terminal offboarding cases cannot be transitioned.', 409, {
        currentStatus: current.status
      })
    }

    assertOffboardingTransition(current, input)

    const nextEffectiveDate = input.effectiveDate !== undefined ? input.effectiveDate : current.effectiveDate
    const nextLastWorkingDay = input.lastWorkingDay !== undefined ? input.lastWorkingDay : current.lastWorkingDay

    let payrollCutoff: { updatedCompensationVersions: number } | null = null

    if (input.status === 'executed') {
      await assertPayrollExecutionReadiness(client, current)
      payrollCutoff = await closeFuturePayrollEligibility(client, current, nextLastWorkingDay)
    }

    const nextExceptionReason =
      input.lastWorkingDayAfterEffectiveReason !== undefined
        ? normalizeNullableString(input.lastWorkingDayAfterEffectiveReason)
        : current.lastWorkingDayAfterEffectiveReason

    const result = await client.query<OffboardingCaseRow>(
      `
        UPDATE greenhouse_hr.work_relationship_offboarding_cases
        SET
          status = $2,
          effective_date = $3,
          last_working_day = $4,
          last_working_day_after_effective_reason = $5,
          blocked_reason = CASE WHEN $2 = 'blocked' THEN $6 ELSE NULL END,
          notes = COALESCE($7, notes),
          approved_at = CASE WHEN $2 = 'approved' THEN COALESCE(approved_at, now()) ELSE approved_at END,
          scheduled_at = CASE WHEN $2 = 'scheduled' THEN COALESCE(scheduled_at, now()) ELSE scheduled_at END,
          executed_at = CASE WHEN $2 = 'executed' THEN COALESCE(executed_at, now()) ELSE executed_at END,
          cancelled_at = CASE WHEN $2 = 'cancelled' THEN COALESCE(cancelled_at, now()) ELSE cancelled_at END,
          updated_by_user_id = $8
        WHERE offboarding_case_id = $1
        RETURNING *
      `,
      [
        caseId,
        input.status,
        nextEffectiveDate,
        nextLastWorkingDay,
        nextExceptionReason,
        normalizeNullableString(input.blockedReason),
        normalizeNullableString(input.notes),
        actorUserId
      ]
    )

    const updated = mapCaseRow(result.rows[0])

    await insertCaseEvent(client, {
      caseId,
      eventType: `offboarding_case.${input.status}`,
      fromStatus: current.status,
      toStatus: updated.status,
      actorUserId,
      source: 'manual_hr',
      reason: normalizeNullableString(input.reason),
      payload: {
        effectiveDate: updated.effectiveDate,
        lastWorkingDay: updated.lastWorkingDay,
        blockedReason: updated.blockedReason,
        payrollCutoff
      }
    })

    const eventTypeByStatus: Partial<Record<OffboardingCaseStatus, string>> = {
      approved: EVENT_TYPES.workRelationshipOffboardingCaseApproved,
      scheduled: EVENT_TYPES.workRelationshipOffboardingCaseScheduled,
      executed: EVENT_TYPES.workRelationshipOffboardingCaseExecuted,
      cancelled: EVENT_TYPES.workRelationshipOffboardingCaseCancelled,
      blocked: EVENT_TYPES.workRelationshipOffboardingCaseUpdated,
      needs_review: EVENT_TYPES.workRelationshipOffboardingCaseUpdated,
      draft: EVENT_TYPES.workRelationshipOffboardingCaseUpdated
    }

    await publishCaseEvent(client, eventTypeByStatus[updated.status] ?? EVENT_TYPES.workRelationshipOffboardingCaseUpdated, updated, {
      previousStatus: current.status
    })

    return updated
  })
}
