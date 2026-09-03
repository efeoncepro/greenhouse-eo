/**
 * TASK-1349 — Live smoke of the review → approve → schedule → execute circuit
 * against the REAL shared PostgreSQL, with SYNTHETIC subjects only.
 *
 * Run: `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED=true pnpm test:live src/lib/workforce/offboarding`
 * (the flag is declared in the invocation, per LIVE_TESTS_AGENT_INVARIANTS; without it the
 * writeback assertions are skipped loudly, never silently green).
 *
 * Subjects are provisioned through the canonical SCIM primitive (unique email/OID per run) so
 * they carry identity profile + member + client_user + operating-entity relationship, exactly
 * like a real collaborator. Cleanup soft-disables them (audit rows are append-only by design).
 */
import { randomUUID } from 'node:crypto'

import { afterAll, describe, expect, it } from 'vitest'

import { syncOperatingEntityEmployeeLegalRelationshipForMember } from '@/lib/account-360/person-legal-entity-relationships'
import { query } from '@/lib/db'
import { createCompensationVersion } from '@/lib/payroll/get-compensation'
import { resolveExitEligibilityForMembers } from '@/lib/payroll/exit-eligibility'
import { provisionInternalCollaboratorFromScim } from '@/lib/scim/provisioning-internal-collaborator'

import { findExecutedRealExitForMember } from './exit-facts'
import { openOffboardingNeedsReviewFromMember, reviewOffboardingCase, transitionOffboardingCase } from './store'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

const writebackEnabled = process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED === 'true'

const RUN_ID = `t1349-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const ACTOR = 'user-agent-e2e-001'
const createdUserIds: string[] = []
const createdMemberIds: string[] = []

const provisionSubject = async (suffix: string) => {
  const externalId = randomUUID()

  const result = await provisionInternalCollaboratorFromScim({
    email: `${RUN_ID}-${suffix}@efeoncepro.com`,
    externalId,
    displayName: `TASK-1349 live ${suffix}`,
    microsoftTenantId: 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
    microsoftEmail: `${RUN_ID}-${suffix}@efeoncepro.com`,
    tenantMappingId: 'scim-tm-efeonce',
    defaultRoleCode: 'collaborator',
    active: true,
    entraJobTitle: 'Live fixture',
    eligibilityVerdict: { eligible: true, reason: 'human_collaborator' }
  })

  createdUserIds.push(result.userId)
  createdMemberIds.push(result.memberId)

  // honorarios, intake completed, compensation vigente desde mayo
  await query(
    `UPDATE greenhouse_core.members
        SET contract_type = 'honorarios', pay_regime = 'chile', payroll_via = 'internal',
            workforce_intake_status = 'completed', hire_date = '2026-05-13', updated_at = CURRENT_TIMESTAMP
      WHERE member_id = $1`,
    [result.memberId]
  )

  // The employee legal relationship is normally materialized by the reactive
  // projection on `member.created`; in-process we run the same canonical sync.
  await syncOperatingEntityEmployeeLegalRelationshipForMember(result.memberId)

  await createCompensationVersion({
    actorEmail: `${RUN_ID}@efeoncepro.com`,
    input: {
      memberId: result.memberId,
      payRegime: 'chile',
      currency: 'CLP',
      baseSalary: 100000,
      contractType: 'honorarios',
      effectiveFrom: '2026-05-13',
      changeReason: 'TASK-1349 live fixture'
    }
  })

  return { ...result, externalId }
}

const memberRow = async (memberId: string) =>
  (
    await query<{ active: boolean; status: string; contract_end_date: string | null }>(
      `SELECT active, status, contract_end_date::text AS contract_end_date FROM greenhouse_core.members WHERE member_id = $1`,
      [memberId]
    )
  )[0]

const activeRelationships = async (profileId: string) =>
  (
    await query<{ relationship_id: string; status: string; effective_to: string | null }>(
      `SELECT relationship_id, status, effective_to::text AS effective_to
         FROM greenhouse_core.person_legal_entity_relationships
        WHERE profile_id = $1 ORDER BY created_at`,
      [profileId]
    )
  )

const openCompensation = async (memberId: string) =>
  (
    await query<{ effective_to: string | null }>(
      `SELECT effective_to::text AS effective_to FROM greenhouse_payroll.compensation_versions WHERE member_id = $1 ORDER BY version DESC LIMIT 1`,
      [memberId]
    )
  )[0]

afterAll(async () => {
  for (const userId of createdUserIds) {
    await query(`UPDATE greenhouse_core.client_users SET active = FALSE, status = 'deactivated' WHERE user_id = $1`, [userId]).catch(() => undefined)
  }

  for (const memberId of createdMemberIds) {
    await query(`UPDATE greenhouse_core.members SET active = FALSE, status = 'inactive' WHERE member_id = $1`, [memberId]).catch(() => undefined)
  }
})

describe.skipIf(!hasPgConfig)('TASK-1349 — review → execute live circuit (synthetic subjects)', () => {
  it('relationship_ended: SCIM stub cannot be approved unreviewed; after review it closes compensation, relationship and member with the REAL date', async () => {
    const subject = await provisionSubject('exit')

    const stub = await openOffboardingNeedsReviewFromMember({
      memberId: subject.memberId,
      source: 'scim',
      separationType: 'identity_only',
      actorUserId: ACTOR,
      sourceRef: { trigger: 'task-1349-live' }
    })

    expect(stub.ruleLane).toBe('identity_only')

    // Guard: approving an unreviewed access-signal case is refused.
    await expect(
      transitionOffboardingCase({ caseId: stub.offboardingCaseId, actorUserId: ACTOR, input: { status: 'approved', effectiveDate: '2026-06-02' } })
    ).rejects.toMatchObject({ statusCode: 409, code: 'offboarding_case_review_required' })

    // Payroll gate before the decision: the stub was created TODAY with no dates, so
    // the current period demands review; a period that ended before the signal does not.
    const today = new Date().toISOString().slice(0, 10)
    const currentPeriodStart = `${today.slice(0, 7)}-01`
    const currentPeriodEnd = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).toISOString().slice(0, 10)
    const before = await resolveExitEligibilityForMembers([subject.memberId], currentPeriodStart, currentPeriodEnd)

    expect(before.get(subject.memberId)?.reviewRequired).toBe(true)
    expect((await resolveExitEligibilityForMembers([subject.memberId], '2026-05-01', '2026-05-31')).get(subject.memberId)?.reviewRequired).toBe(false)

    // Stale version is refused.
    await expect(
      reviewOffboardingCase({
        caseId: stub.offboardingCaseId,
        actorUserId: ACTOR,
        canApprove: true,
        input: { decision: 'relationship_ended', reason: 'stale probe — must fail', expectedUpdatedAt: '2026-01-01T00:00:00.000Z', separationType: 'contract_end', effectiveDate: '2026-06-02', lastWorkingDay: '2026-06-02' }
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'offboarding_case_version_conflict' })

    const reviewed = await reviewOffboardingCase({
      caseId: stub.offboardingCaseId,
      actorUserId: ACTOR,
      canApprove: true,
      input: {
        decision: 'relationship_ended',
        reason: 'TASK-1349 live: término contractual confirmado (fixture sintético)',
        expectedUpdatedAt: stub.updatedAt,
        separationType: 'contract_end',
        effectiveDate: '2026-06-02',
        lastWorkingDay: '2026-06-02',
        approveNow: true
      }
    })

    expect(reviewed.case.status).toBe('approved')
    expect(reviewed.case.ruleLane).toBe('non_payroll')
    expect(reviewed.case.review?.decision).toBe('relationship_ended')

    const afterReview = await resolveExitEligibilityForMembers([subject.memberId], '2026-06-01', '2026-06-30')

    expect(afterReview.get(subject.memberId)?.projectionPolicy).toBe('exclude_from_cutoff')
    expect(afterReview.get(subject.memberId)?.reviewRequired).toBe(false)

    const scheduled = await transitionOffboardingCase({
      caseId: reviewed.case.offboardingCaseId,
      actorUserId: ACTOR,
      input: { status: 'scheduled', expectedUpdatedAt: reviewed.case.updatedAt }
    })

    const executed = await transitionOffboardingCase({
      caseId: scheduled.offboardingCaseId,
      actorUserId: ACTOR,
      input: { status: 'executed', expectedUpdatedAt: scheduled.updatedAt, reason: 'TASK-1349 live execute' }
    })

    expect(executed.status).toBe('executed')

    // Compensation vigencia always closes at the LWD (flag-independent).
    expect((await openCompensation(subject.memberId)).effective_to).toBe('2026-06-02')

    const member = await memberRow(subject.memberId)
    const relationships = await activeRelationships(subject.identityProfileId)

    if (!writebackEnabled) {
      console.warn('[TASK-1349 live] WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED not set in invocation: writeback assertions SKIPPED')
      expect(member.active).toBe(true)

      return
    }

    expect(member.active).toBe(false)
    expect(member.status).toBe('inactive')
    expect(member.contract_end_date).toBe('2026-06-02')
    expect(relationships.some(r => r.status === 'ended' && r.effective_to === '2026-06-02')).toBe(true)
    expect(relationships.some(r => r.status === 'active')).toBe(false)

    const outbox = await query<{ event_type: string; payload_json: Record<string, unknown> }>(
      `SELECT event_type, payload_json FROM greenhouse_sync.outbox_events
        WHERE aggregate_type = 'member' AND aggregate_id = $1 AND event_type = 'member.deactivated'
        ORDER BY occurred_at DESC LIMIT 1`,
      [subject.memberId]
    )

    expect(outbox[0]?.payload_json).toMatchObject({ deactivationKind: 'offboarding_executed', lastWorkingDay: '2026-06-02' })

    // Payroll history preserved: May full, June from cutoff, July excluded.
    expect((await resolveExitEligibilityForMembers([subject.memberId], '2026-05-01', '2026-05-31')).get(subject.memberId)?.projectionPolicy).toBe('full_period')
    expect((await resolveExitEligibilityForMembers([subject.memberId], '2026-07-01', '2026-07-31')).get(subject.memberId)?.projectionPolicy).toBe('exclude_entire_period')

    // Ownership: SCIM re-push of the same OID links but does NOT resurrect.
    const reprovision = await provisionInternalCollaboratorFromScim({
      email: `${RUN_ID}-exit@efeoncepro.com`,
      externalId: subject.externalId,
      displayName: 'TASK-1349 live exit',
      microsoftTenantId: 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
      microsoftEmail: `${RUN_ID}-exit@efeoncepro.com`,
      tenantMappingId: 'scim-tm-efeonce',
      defaultRoleCode: 'collaborator',
      active: true,
      entraJobTitle: 'Live fixture',
      eligibilityVerdict: { eligible: true, reason: 'human_collaborator' }
    })

    expect(await findExecutedRealExitForMember(subject.memberId)).not.toBeNull()
    expect((await memberRow(subject.memberId)).active).toBe(false)
    expect(['linked_inactive_prior_exit', 'reused_by_profile_id']).toContain(reprovision.cascadeOutcome)
  }, 120_000)

  it('access_only: review + informational execute touch neither compensation, relationship nor member (flag ON or OFF)', async () => {
    const subject = await provisionSubject('access')

    const stub = await openOffboardingNeedsReviewFromMember({
      memberId: subject.memberId,
      source: 'scim',
      separationType: 'identity_only',
      actorUserId: ACTOR
    })

    const reviewed = await reviewOffboardingCase({
      caseId: stub.offboardingCaseId,
      actorUserId: ACTOR,
      canApprove: true,
      input: { decision: 'access_only', reason: 'TASK-1349 live: baja de acceso, sigue prestando servicios', expectedUpdatedAt: stub.updatedAt, effectiveDate: '2026-06-10' }
    })

    expect(reviewed.case.ruleLane).toBe('identity_only')
    expect(reviewed.case.review?.decision).toBe('access_only')

    const closed = await transitionOffboardingCase({
      caseId: reviewed.case.offboardingCaseId,
      actorUserId: ACTOR,
      input: { status: 'executed', expectedUpdatedAt: reviewed.case.updatedAt }
    })

    expect(closed.status).toBe('executed')
    expect((await openCompensation(subject.memberId)).effective_to).toBeNull()
    expect((await memberRow(subject.memberId)).active).toBe(true)
    expect((await activeRelationships(subject.identityProfileId)).some(r => r.status === 'active')).toBe(true)
    expect(await findExecutedRealExitForMember(subject.memberId)).toBeNull()

    const window = (await resolveExitEligibilityForMembers([subject.memberId], '2026-06-01', '2026-06-30')).get(subject.memberId)

    expect(window?.projectionPolicy).toBe('full_period')
    expect(window?.reviewRequired).toBe(false)
  }, 120_000)
})
