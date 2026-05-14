import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import { HrCoreValidationError, normalizeNullableString } from '@/lib/hr-core/shared'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { ContractType, PayRegime, PayrollVia } from '@/types/hr-contracts'

import { resolveOnboardingLane } from './lane'
import { assertOnboardingTransition } from './state-machine'
import type {
  CreateOnboardingCaseInput,
  EnsureOnboardingCaseForMemberInput,
  OnboardingCaseStatus,
  OnboardingRelationshipType,
  OnboardingSource,
  OnboardingStartType,
  TransitionOnboardingCaseInput,
  WorkRelationshipOnboardingCase
} from './types'

type OnboardingCaseRow = Record<string, any>

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
  hire_date: string | Date | null
  location_country: string | null
}

const OPEN_STATUSES: OnboardingCaseStatus[] = ['draft', 'needs_review', 'approved', 'scheduled', 'blocked']

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

export const isOnboardingCaseSchemaUnavailableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  const code = 'code' in error ? (error as { code?: unknown }).code : null

  return code === '42P01' || code === '42703'
}

const normalizeContractTypeOrUnknown = (value: string | null | undefined): ContractType | 'unknown' => {
  if (
    value === 'indefinido' ||
    value === 'plazo_fijo' ||
    value === 'honorarios' ||
    value === 'contractor' ||
    value === 'eor'
  ) {
    return value
  }

  return 'unknown'
}

const normalizePayRegimeOrUnknown = (value: string | null | undefined): PayRegime | 'unknown' => {
  if (value === 'chile' || value === 'international') return value

  return 'unknown'
}

const normalizePayrollViaOrUnknown = (value: string | null | undefined): PayrollVia | 'none' | 'unknown' => {
  if (value === 'internal' || value === 'deel') return value
  if (value === 'none') return value

  return 'unknown'
}

const normalizeRelationshipType = (
  value: string | null | undefined,
  contractType: ContractType | 'unknown'
): OnboardingRelationshipType => {
  if (value === 'employee' || value === 'contractor' || value === 'eor' || value === 'executive') return value
  if (contractType === 'contractor' || contractType === 'honorarios') return 'contractor'
  if (contractType === 'eor') return 'eor'

  return 'employee'
}

const inferStartType = (
  explicit: OnboardingStartType | undefined,
  relationshipType: OnboardingRelationshipType,
  contractType: ContractType | 'unknown'
): OnboardingStartType => {
  if (explicit) return explicit
  if (relationshipType === 'eor' || contractType === 'eor') return 'eor_start'
  if (relationshipType === 'contractor' || contractType === 'contractor' || contractType === 'honorarios') return 'contractor_start'

  return 'new_hire'
}

const mapCaseRow = (row: OnboardingCaseRow): WorkRelationshipOnboardingCase => ({
  onboardingCaseId: row.onboarding_case_id,
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
  startType: row.start_type,
  source: row.source,
  status: row.status,
  ruleLane: row.rule_lane,
  requiresIdentityProvisioning: row.requires_identity_provisioning,
  requiresApplicationAccess: row.requires_application_access,
  requiresPayrollReadiness: row.requires_payroll_readiness,
  requiresLeavePolicyBootstrap: row.requires_leave_policy_bootstrap,
  requiresHrDocuments: row.requires_hr_documents,
  requiresAssignmentBootstrap: row.requires_assignment_bootstrap,
  requiresManagerAssignment: row.requires_manager_assignment,
  requiresEquipmentOrAccessSetup: row.requires_equipment_or_access_setup,
  greenhouseExecutionMode: row.greenhouse_execution_mode,
  startDate: toDateString(row.start_date),
  firstWorkingDay: toDateString(row.first_working_day),
  submittedAt: toTimestampString(row.submitted_at),
  approvedAt: toTimestampString(row.approved_at),
  scheduledAt: toTimestampString(row.scheduled_at),
  activatedAt: toTimestampString(row.activated_at),
  cancelledAt: toTimestampString(row.cancelled_at),
  blockedReason: row.blocked_reason,
  managerMemberId: row.manager_member_id,
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
      m.hire_date,
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

  if (!row) throw new HrCoreValidationError('Member not found.', 404)

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
      INSERT INTO greenhouse_hr.work_relationship_onboarding_case_events (
        event_id,
        onboarding_case_id,
        event_type,
        from_status,
        to_status,
        actor_user_id,
        source,
        reason,
        payload_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    `,
    [
      `onboarding-case-event-${randomUUID()}`,
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
  onboardingCase: WorkRelationshipOnboardingCase,
  payload: Record<string, unknown> = {}
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.workRelationshipOnboardingCase,
      aggregateId: onboardingCase.onboardingCaseId,
      eventType,
      payload: {
        schemaVersion: 1,
        onboardingCaseId: onboardingCase.onboardingCaseId,
        publicId: onboardingCase.publicId,
        memberId: onboardingCase.memberId,
        profileId: onboardingCase.profileId,
        relationshipId: onboardingCase.personLegalEntityRelationshipId,
        status: onboardingCase.status,
        ruleLane: onboardingCase.ruleLane,
        startDate: onboardingCase.startDate,
        firstWorkingDay: onboardingCase.firstWorkingDay,
        ...payload
      }
    },
    client
  )
}

const createOnboardingCaseInTransaction = async (
  client: PoolClient,
  input: CreateOnboardingCaseInput,
  actorUserId?: string | null
) => {
  const existing = await client.query<{ onboarding_case_id: string }>(
    `
      SELECT onboarding_case_id
      FROM greenhouse_hr.work_relationship_onboarding_cases
      WHERE member_id = $1
        AND status = ANY($2::text[])
      ORDER BY updated_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [input.memberId, OPEN_STATUSES]
  )

  if (existing.rows[0]) {
    throw new HrCoreValidationError('Member already has an open onboarding case.', 409, {
      onboardingCaseId: existing.rows[0].onboarding_case_id
    })
  }

  const member = await getMemberContext(input.memberId, client)
  const contractType = normalizeContractTypeOrUnknown(member.contract_type)
  const payRegime = normalizePayRegimeOrUnknown(member.pay_regime)
  const payrollVia = normalizePayrollViaOrUnknown(member.payroll_via)
  const relationshipType = normalizeRelationshipType(member.relationship_type, contractType)
  const startType = inferStartType(input.startType, relationshipType, contractType)

  const lane = resolveOnboardingLane({
    relationshipType,
    contractType,
    payRegime,
    payrollVia,
    startType
  })

  const caseId = `onboarding-case-${randomUUID()}`
  const publicId = `EO-ON-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`
  const status = input.status ?? (input.source === 'scim' || input.source === 'admin' ? 'needs_review' : 'draft')
  const startDate = input.startDate ?? toDateString(member.hire_date)

  const result = await client.query<OnboardingCaseRow>(
    `
      INSERT INTO greenhouse_hr.work_relationship_onboarding_cases (
        onboarding_case_id,
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
        start_type,
        source,
        status,
        rule_lane,
        requires_identity_provisioning,
        requires_application_access,
        requires_payroll_readiness,
        requires_leave_policy_bootstrap,
        requires_hr_documents,
        requires_assignment_bootstrap,
        requires_manager_assignment,
        requires_equipment_or_access_setup,
        greenhouse_execution_mode,
        start_date,
        first_working_day,
        manager_member_id,
        reason_code,
        notes,
        legacy_checklist_ref,
        source_ref,
        metadata_json,
        created_by_user_id,
        updated_by_user_id,
        submitted_at,
        approved_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30, $31, $32, $33,
        $34, $35::jsonb, $36::jsonb, $37::jsonb, $38, $38,
        now(), CASE WHEN $19 = 'approved' THEN now() ELSE NULL END
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
      startType,
      input.source ?? 'manual_hr',
      status,
      lane.ruleLane,
      lane.requiresIdentityProvisioning,
      lane.requiresApplicationAccess,
      lane.requiresPayrollReadiness,
      lane.requiresLeavePolicyBootstrap,
      lane.requiresHrDocuments,
      lane.requiresAssignmentBootstrap,
      lane.requiresManagerAssignment,
      lane.requiresEquipmentOrAccessSetup,
      lane.greenhouseExecutionMode,
      startDate,
      input.firstWorkingDay ?? startDate,
      normalizeNullableString(input.managerMemberId),
      normalizeNullableString(input.reasonCode),
      normalizeNullableString(input.notes),
      JSON.stringify(input.legacyChecklistRef ?? {}),
      JSON.stringify(input.sourceRef ?? {}),
      JSON.stringify({
        memberDisplayName: member.display_name,
        createdFrom: input.source ?? 'manual_hr',
        ...(input.metadata ?? {})
      }),
      actorUserId ?? null
    ]
  )

  const created = mapCaseRow(result.rows[0])

  await insertCaseEvent(client, {
    caseId: created.onboardingCaseId,
    eventType: EVENT_TYPES.workRelationshipOnboardingCaseCreated,
    toStatus: created.status,
    actorUserId,
    source: input.source ?? 'manual_hr',
    payload: { publicId: created.publicId, memberId: created.memberId }
  })

  await publishCaseEvent(client, EVENT_TYPES.workRelationshipOnboardingCaseCreated, created)

  return created
}

export const createOnboardingCase = async (
  input: CreateOnboardingCaseInput,
  actorUserId?: string | null
) => withTransaction(client => createOnboardingCaseInTransaction(client, input, actorUserId))

export const getLatestOnboardingCaseForMember = async (
  memberId: string,
  client?: PoolClient
): Promise<WorkRelationshipOnboardingCase | null> => {
  const sql = `
    SELECT *
    FROM greenhouse_hr.work_relationship_onboarding_cases
    WHERE member_id = $1
    ORDER BY
      CASE WHEN status = ANY($2::text[]) THEN 0 ELSE 1 END,
      updated_at DESC,
      created_at DESC
    LIMIT 1
  `

  const rows = client
    ? (await client.query<OnboardingCaseRow>(sql, [memberId, OPEN_STATUSES])).rows
    : await query<OnboardingCaseRow>(sql, [memberId, OPEN_STATUSES])

  return rows[0] ? mapCaseRow(rows[0]) : null
}

const getLatestOnboardingCaseForMemberForUpdate = async (
  client: PoolClient,
  memberId: string
): Promise<WorkRelationshipOnboardingCase | null> => {
  const result = await client.query<OnboardingCaseRow>(
    `
      SELECT *
      FROM greenhouse_hr.work_relationship_onboarding_cases
      WHERE member_id = $1
      ORDER BY
        CASE WHEN status = ANY($2::text[]) THEN 0 ELSE 1 END,
        updated_at DESC,
        created_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [memberId, OPEN_STATUSES]
  )

  return result.rows[0] ? mapCaseRow(result.rows[0]) : null
}

export const transitionOnboardingCaseInTransaction = async (
  client: PoolClient,
  current: WorkRelationshipOnboardingCase,
  input: TransitionOnboardingCaseInput,
  actorUserId?: string | null,
  source: OnboardingSource = 'manual_hr'
) => {
  assertOnboardingTransition(current, input)

  const startDate = input.startDate !== undefined ? input.startDate : current.startDate
  const firstWorkingDay = input.firstWorkingDay !== undefined ? input.firstWorkingDay : current.firstWorkingDay

  const result = await client.query<OnboardingCaseRow>(
    `
      UPDATE greenhouse_hr.work_relationship_onboarding_cases
      SET
        status = $2,
        start_date = $3::date,
        first_working_day = $4::date,
        blocked_reason = CASE WHEN $2 = 'blocked' THEN $5 ELSE NULL END,
        notes = COALESCE($6, notes),
        metadata_json = metadata_json || $7::jsonb,
        approved_at = CASE WHEN $2 = 'approved' AND approved_at IS NULL THEN now() ELSE approved_at END,
        scheduled_at = CASE WHEN $2 = 'scheduled' AND scheduled_at IS NULL THEN now() ELSE scheduled_at END,
        activated_at = CASE WHEN $2 = 'active' AND activated_at IS NULL THEN now() ELSE activated_at END,
        cancelled_at = CASE WHEN $2 = 'cancelled' AND cancelled_at IS NULL THEN now() ELSE cancelled_at END,
        updated_by_user_id = $8,
        updated_at = now()
      WHERE onboarding_case_id = $1
      RETURNING *
    `,
    [
      current.onboardingCaseId,
      input.status,
      startDate,
      firstWorkingDay,
      normalizeNullableString(input.blockedReason),
      normalizeNullableString(input.notes),
      JSON.stringify(input.metadata ?? {}),
      actorUserId ?? null
    ]
  )

  const updated = mapCaseRow(result.rows[0])

  const eventType =
    input.status === 'approved'
      ? EVENT_TYPES.workRelationshipOnboardingCaseApproved
      : input.status === 'scheduled'
        ? EVENT_TYPES.workRelationshipOnboardingCaseScheduled
        : input.status === 'active'
          ? EVENT_TYPES.workRelationshipOnboardingCaseActivated
          : input.status === 'cancelled'
            ? EVENT_TYPES.workRelationshipOnboardingCaseCancelled
            : EVENT_TYPES.workRelationshipOnboardingCaseUpdated

  await insertCaseEvent(client, {
    caseId: updated.onboardingCaseId,
    eventType,
    fromStatus: current.status,
    toStatus: updated.status,
    actorUserId,
    source,
    reason: input.reason,
    payload: {
      publicId: updated.publicId,
      startDate: updated.startDate,
      firstWorkingDay: updated.firstWorkingDay
    }
  })

  await publishCaseEvent(client, eventType, updated, {
    previousStatus: current.status,
    reason: input.reason ?? null
  })

  return updated
}

export const ensureActivatedOnboardingCaseForMember = async (
  input: EnsureOnboardingCaseForMemberInput,
  client: PoolClient
) => {
  let current = await getLatestOnboardingCaseForMemberForUpdate(client, input.memberId)

  if (current?.status === 'active') {
    return { onboardingCase: current, created: false, transitioned: false }
  }

  if (current?.status === 'blocked') {
    throw new HrCoreValidationError('Onboarding case is blocked.', 409, {
      onboardingCaseId: current.onboardingCaseId,
      publicId: current.publicId,
      blockedReason: current.blockedReason
    }, 'onboarding_case_blocked')
  }

  const source = input.source ?? 'system'
  let created = false

  if (!current || current.status === 'cancelled') {
    current = await createOnboardingCaseInTransaction(
      client,
      {
        memberId: input.memberId,
        source,
        status: 'approved',
        sourceRef: input.sourceRef,
        metadata: input.metadata
      },
      input.actorUserId
    )
    created = true
  }

  if (current.status !== 'approved' && current.status !== 'scheduled') {
    current = await transitionOnboardingCaseInTransaction(
      client,
      current,
      {
        status: 'approved',
        startDate: current.startDate ?? new Date().toISOString().slice(0, 10),
        firstWorkingDay: current.firstWorkingDay ?? current.startDate ?? new Date().toISOString().slice(0, 10),
        reason: input.reason,
        metadata: input.metadata
      },
      input.actorUserId,
      source
    )
  }

  const activated = await transitionOnboardingCaseInTransaction(
    client,
    current,
    {
      status: 'active',
      startDate: current.startDate ?? new Date().toISOString().slice(0, 10),
      firstWorkingDay: current.firstWorkingDay ?? current.startDate ?? new Date().toISOString().slice(0, 10),
      reason: input.reason,
      metadata: input.metadata
    },
    input.actorUserId,
    source
  )

  return { onboardingCase: activated, created, transitioned: true }
}
