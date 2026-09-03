/**
 * TASK-1349 Slice 2 — lifecycle effects of an executed offboarding, both directions:
 *   - identity_only (access-only) → NOTHING labor-related moves;
 *   - real termination → compensation closes at LWD, relationship ends with the
 *     real date, member deactivated + `member.deactivated` (flag ON);
 *   - flag OFF → only the pre-existing compensation close;
 *   - a compensation version after the LWD → 409, nothing written.
 */
import type { PoolClient } from 'pg'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryCalls: Array<{ text: string; values: unknown[] }> = []
const publishMock = vi.fn()
const endRelationshipMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishMock(...args)
}))

vi.mock('@/lib/person-legal-entity-relationships/store', () => ({
  endPersonLegalEntityRelationship: (...args: unknown[]) => endRelationshipMock(...args)
}))

import { applyOffboardingLifecycleEffects } from './member-lifecycle'
import type { OffboardingCase } from './types'

let futureVersions: Array<{ version_id: string; effective_from: string }> = []
let activeRelationship = true
let reentryRelationship: Array<{ relationship_id: string; effective_from: string }> = []
let reentryEngagement: Array<{ contractor_engagement_id: string; start_date: string }> = []

const client = {
  query: vi.fn(async (text: string, values: unknown[] = []) => {
    queryCalls.push({ text, values })

    if (text.includes('greenhouse_payroll.compensation_versions') && text.includes('effective_from > $2::date')) return { rows: futureVersions }
    if (text.includes('person_legal_entity_relationships') && text.includes('effective_from > $2::date')) return { rows: reentryRelationship }
    if (text.includes('greenhouse_hr.contractor_engagements')) return { rows: reentryEngagement }
    if (text.includes('UPDATE greenhouse_payroll.compensation_versions')) return { rows: [{ version_id: 'v1' }] }

    if (text.includes('FROM greenhouse_core.person_legal_entity_relationships') && text.includes('FOR UPDATE')) {
      return { rows: activeRelationship ? [{ relationship_id: 'pler-1' }] : [] }
    }

    if (text.includes('UPDATE greenhouse_core.members')) return { rows: [{ member_id: 'member-1' }] }
    if (text.includes('UPDATE greenhouse_core.client_team_assignments')) return { rows: [{ assignment_id: 'a1' }, { assignment_id: 'a2' }] }

    return { rows: [] }
  })
} as unknown as PoolClient

const realExit: OffboardingCase = {
  offboardingCaseId: 'offboarding-case-1',
  publicId: 'EO-OFF-2026-SYNTH',
  profileId: 'profile-1',
  memberId: 'member-1',
  userId: 'user-1',
  personLegalEntityRelationshipId: 'pler-1',
  legalEntityOrganizationId: 'org-1',
  organizationId: 'org-1',
  spaceId: 'space-1',
  relationshipType: 'contractor',
  employmentType: 'contractor',
  contractTypeSnapshot: 'honorarios',
  payRegimeSnapshot: 'chile',
  payrollViaSnapshot: 'internal',
  deelContractIdSnapshot: null,
  countryCode: 'CL',
  contractEndDateSnapshot: null,
  separationType: 'contract_end',
  source: 'scim',
  status: 'scheduled',
  ruleLane: 'non_payroll',
  requiresPayrollClosure: false,
  requiresLeaveReconciliation: false,
  requiresHrDocuments: true,
  requiresAccessRevocation: true,
  requiresAssetRecovery: true,
  requiresAssignmentHandoff: true,
  requiresApprovalReassignment: true,
  greenhouseExecutionMode: 'partial',
  effectiveDate: '2026-06-02',
  lastWorkingDay: '2026-06-02',
  lastWorkingDayAfterEffectiveReason: null,
  submittedAt: null,
  approvedAt: null,
  scheduledAt: null,
  executedAt: null,
  cancelledAt: null,
  blockedReason: null,
  reasonCode: null,
  notes: null,
  legacyChecklistRef: {},
  sourceRef: {},
  metadata: {},
  createdByUserId: 'u',
  updatedByUserId: 'u',
  createdAt: '2026-06-10T00:00:00.000Z',
  updatedAt: '2026-06-10T00:00:00.000Z',
  review: null
}

const accessOnly: OffboardingCase = { ...realExit, separationType: 'identity_only', ruleLane: 'identity_only', greenhouseExecutionMode: 'informational' }

const sql = (fragment: string) => queryCalls.filter(call => call.text.includes(fragment))

beforeEach(() => {
  queryCalls.length = 0
  publishMock.mockReset()
  endRelationshipMock.mockReset().mockResolvedValue({ relationshipId: 'pler-1' })
  futureVersions = []
  activeRelationship = true
  reentryRelationship = []
  reentryEngagement = []
  delete process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED
})

afterEach(() => {
  delete process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED
})

describe('applyOffboardingLifecycleEffects', () => {
  it('access-only (identity_only) execution touches neither compensation, relationship nor member — even with the flag ON', async () => {
    process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED = 'true'

    const effects = await applyOffboardingLifecycleEffects(client, { current: accessOnly, lastWorkingDay: '2026-06-10', actorUserId: 'hr-1', reason: 'baja de acceso' })

    expect(effects).toEqual({ updatedCompensationVersions: 0, relationshipEnded: null, memberDeactivated: false, assignmentsClosed: 0, skippedReason: 'identity_only' })
    expect(queryCalls).toHaveLength(0)
    expect(endRelationshipMock).not.toHaveBeenCalled()
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('real termination with the flag OFF only closes compensation vigencia at the last working day (pre-existing behaviour)', async () => {
    const effects = await applyOffboardingLifecycleEffects(client, { current: realExit, lastWorkingDay: '2026-06-02', actorUserId: 'hr-1', reason: 'término' })

    expect(effects.updatedCompensationVersions).toBe(1)
    expect(effects.skippedReason).toBe('flag_off')
    expect(effects.memberDeactivated).toBe(false)
    expect(sql('UPDATE greenhouse_payroll.compensation_versions')[0]?.values).toEqual(['member-1', '2026-06-02'])
    expect(sql('UPDATE greenhouse_core.members')).toHaveLength(0)
    expect(endRelationshipMock).not.toHaveBeenCalled()
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('real termination with the flag ON ends the relationship with the REAL date before deactivating the member, and publishes member.deactivated', async () => {
    process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED = 'true'

    const effects = await applyOffboardingLifecycleEffects(client, { current: realExit, lastWorkingDay: '2026-06-02', actorUserId: 'hr-1', reason: 'término' })

    expect(effects).toEqual({ updatedCompensationVersions: 1, relationshipEnded: 'pler-1', memberDeactivated: true, assignmentsClosed: 2, skippedReason: null })
    expect(endRelationshipMock).toHaveBeenCalledWith(client, expect.objectContaining({ relationshipId: 'pler-1', effectiveTo: '2026-06-02', actorUserId: 'hr-1' }))

    const memberUpdate = sql('UPDATE greenhouse_core.members')[0]

    expect(memberUpdate?.text).toContain('active = FALSE')
    expect(memberUpdate?.text).toContain("status = 'inactive'")
    expect(memberUpdate?.values).toEqual(['member-1', '2026-06-02'])

    // ordering: relationship ended (mock called) BEFORE the member row is deactivated
    const relationshipLockIndex = queryCalls.findIndex(call => call.text.includes('FOR UPDATE'))
    const memberUpdateIndex = queryCalls.findIndex(call => call.text.includes('UPDATE greenhouse_core.members'))

    expect(relationshipLockIndex).toBeGreaterThan(-1)
    expect(relationshipLockIndex).toBeLessThan(memberUpdateIndex)

    expect(publishMock).toHaveBeenCalledTimes(1)
    expect(publishMock.mock.calls[0][0]).toMatchObject({
      aggregateType: 'member',
      aggregateId: 'member-1',
      eventType: 'member.deactivated',
      payload: expect.objectContaining({ deactivationKind: 'offboarding_executed', lastWorkingDay: '2026-06-02' })
    })
    expect(publishMock.mock.calls[0][1]).toBe(client)
  })

  it('is idempotent over an already-ended relationship (no second end, member still deactivated)', async () => {
    process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED = 'true'
    activeRelationship = false

    const effects = await applyOffboardingLifecycleEffects(client, { current: realExit, lastWorkingDay: '2026-06-02', actorUserId: 'hr-1', reason: null })

    expect(effects.relationshipEnded).toBeNull()
    expect(endRelationshipMock).not.toHaveBeenCalled()
    expect(effects.memberDeactivated).toBe(true)
  })

  it('refuses (409) when a compensation version starts after the last working day, writing nothing', async () => {
    process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED = 'true'
    futureVersions = [{ version_id: 'member-1_v2', effective_from: '2026-07-01' }]

    await expect(
      applyOffboardingLifecycleEffects(client, { current: realExit, lastWorkingDay: '2026-06-02', actorUserId: 'hr-1', reason: null })
    ).rejects.toMatchObject({ statusCode: 409, code: 'compensation_future_version_conflict' })

    expect(sql('UPDATE ')).toHaveLength(0)
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('re-entry guard: a relationship that started AFTER the last working day keeps the member active (Valentina case, 2026-09-03)', async () => {
    process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED = 'true'
    reentryRelationship = [{ relationship_id: 'pler-contractor-new', effective_from: '2026-08-20' }]

    const effects = await applyOffboardingLifecycleEffects(client, { current: realExit, lastWorkingDay: '2026-06-02', actorUserId: 'hr-1', reason: null })

    expect(effects.skippedReason).toBe('reentry_detected')
    expect(effects.memberDeactivated).toBe(false)
    expect(effects.relationshipEnded).toBeNull()
    expect(sql('UPDATE greenhouse_core.members')).toHaveLength(0)
    expect(endRelationshipMock).not.toHaveBeenCalled()
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('preserves a returning contractor when only the profile anchors the engagement', async () => {
    process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED = 'true'
    reentryEngagement = [{ contractor_engagement_id: 'profile-only-engagement', start_date: '2026-08-20' }]

    const effects = await applyOffboardingLifecycleEffects(client, { current: realExit, lastWorkingDay: '2026-06-02', actorUserId: 'hr-1', reason: null })

    expect(effects.skippedReason).toBe('reentry_detected')
    expect(effects.memberDeactivated).toBe(false)
    expect(endRelationshipMock).not.toHaveBeenCalled()
    expect(publishMock).not.toHaveBeenCalled()
    // Predicate behavior is exercised on PostgreSQL in reentry-predicates.live.test.ts.
    // Here we verify the command supplies both identity anchors to that predicate.
    expect(sql('greenhouse_hr.contractor_engagements')[0]?.values).toEqual(['member-1', '2026-06-02', 'profile-1'])
  })

  it('without a member or a last working day it skips declaratively', async () => {
    const effects = await applyOffboardingLifecycleEffects(client, { current: { ...realExit, memberId: null }, lastWorkingDay: '2026-06-02', actorUserId: 'hr-1', reason: null })

    expect(effects.skippedReason).toBe('no_member')
    expect(queryCalls).toHaveLength(0)
  })
})
