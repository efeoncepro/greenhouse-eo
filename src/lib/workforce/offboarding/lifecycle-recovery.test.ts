import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({ state: {} as any, failPublish: false }))

vi.mock('@/lib/db', () => ({
  withTransaction: async (work: (client: any) => Promise<unknown>) => {
    const before = structuredClone(harness.state)

    const client = { query: async (sql: string, values: any[] = []) => {
      const s = harness.state

      if (sql.includes('pg_advisory')) return { rows: [] }
      if (sql.includes('client_users')) return { rows: s.admin ? [{ user_id: 'admin', active: true, status: s.adminStatus ?? 'active' }] : [] }
      if (sql.startsWith('SELECT payload')) return { rows: s.events.map((payload: unknown) => ({ payload })) }
      if (sql.startsWith('SELECT offboarding_case_id')) return { rows: [s.case] }
      if (sql.startsWith('SELECT member_id')) return { rows: [s.member] }
      if (sql.startsWith('SELECT assignment_id')) return { rows: s.assignments.filter((a: any) => values[0].includes(a.assignment_id)) }
      if (sql.startsWith('SELECT relationship_id')) return { rows: s.reentry ? [{ relationship_id: 'new-episode', effective_from: '2026-08-20' }] : [] }

      if (sql.startsWith('UPDATE greenhouse_core.members')) {
        Object.assign(s.member, { active: values[1], status: values[2], assignable: values[3], contract_end_date: values[4] })

        return { rows: [], rowCount: 1 }
      }

      if (sql.startsWith('UPDATE greenhouse_core.client_team_assignments')) {
        Object.assign(s.assignments.find((a: any) => a.assignment_id === values[0]), { active: values[1], end_date: values[2] })

        return { rows: [], rowCount: 1 }
      }

      if (sql.startsWith('INSERT INTO greenhouse_hr.work_relationship_offboarding_case_events')) {
        s.events.push(JSON.parse(values[4]))

        return { rows: [] }
      }

      throw new Error(`Unexpected query ${sql}`)
    } }

    try { return await work(client) } catch (error) { harness.state = before; throw error }
  }
}))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: async (event: any) => {
  if (harness.failPublish && event.eventType === 'member.updated') throw new Error('outbox unavailable')
  harness.state.outbox.push(event)
} }))

import { hashLifecycleRecoverySnapshot, restoreOffboardingLifecycleAfterReentry, type RestoreOffboardingLifecycleInput } from './lifecycle-recovery'

const time = '2026-09-03T17:24:10.000Z'

const plan = (): RestoreOffboardingLifecycleInput => {
  const expectedSnapshot = { caseUpdatedAt: time, member: { active: true, status: 'inactive', assignable: false, contractEndDate: '2026-04-30', updatedAt: time }, assignments: [{ assignmentId: 'a1', active: false, endDate: '2026-04-30', updatedAt: time }] }

  return { actorUserId: 'admin', offboardingCaseId: 'case1', memberId: 'm1', profileId: 'p1', idempotencyKey: 'repair1', reason: 'Restore current availability after confirmed contractor reentry.', evidence: 'Observed state and operator authorized current target', expectedSnapshot, expectedSnapshotHash: hashLifecycleRecoverySnapshot(expectedSnapshot), desired: { member: { active: true, status: 'active', assignable: true, contractEndDate: null }, assignments: [{ assignmentId: 'a1', active: true, endDate: null }] } }
}

beforeEach(() => {
  harness.failPublish = false
  harness.state = { admin: true, reentry: true, case: { offboarding_case_id: 'case1', member_id: 'm1', profile_id: 'p1', legal_entity_organization_id: 'org1', status: 'executed', rule_lane: 'payroll', last_working_day: '2026-04-30', updated_at: time }, member: { member_id: 'm1', identity_profile_id: 'p1', active: true, status: 'inactive', assignable: false, contract_end_date: '2026-04-30', updated_at: time }, assignments: [{ assignment_id: 'a1', member_id: 'm1', client_id: 'client1', active: false, end_date: '2026-04-30', updated_at: time }], events: [], outbox: [], financialHistory: { may: 'unchanged' }, employeeHistory: { status: 'ended', effectiveTo: '2026-04-30' } }
  harness.state.assignments[0].start_date = '2026-03-01'
})

describe('restoreOffboardingLifecycleAfterReentry', () => {
  it('previews by default without changing state', async () => {
    const before = structuredClone(harness.state)

    expect((await restoreOffboardingLifecycleAfterReentry(plan())).outcome).toBe('preview')
    expect(harness.state).toEqual(before)
  })
  it('restores requested fields and emits both events atomically, preserving history', async () => {
    const input = { ...plan(), apply: true }

    expect((await restoreOffboardingLifecycleAfterReentry(input)).outcome).toBe('restored')
    expect(harness.state.member).toMatchObject({ active: true, status: 'active', assignable: true, contract_end_date: null })
    expect(harness.state.assignments[0]).toMatchObject({ active: true, end_date: null })
    expect(harness.state.events[0]).toMatchObject({ before: input.expectedSnapshot, desired: input.desired })
    expect(harness.state.outbox.map((e: any) => e.eventType)).toEqual(['assignment.updated', 'member.updated'])
    expect(harness.state.employeeHistory).toEqual({ status: 'ended', effectiveTo: '2026-04-30' })
    expect(harness.state.financialHistory).toEqual({ may: 'unchanged' })
    expect((await restoreOffboardingLifecycleAfterReentry(input)).outcome).toBe('already_applied')
    expect(harness.state.events).toHaveLength(1)
  })
  it('rolls back member, assignments and audit when publishing fails', async () => {
    const before = structuredClone(harness.state)

    harness.failPublish = true
    await expect(restoreOffboardingLifecycleAfterReentry({ ...plan(), apply: true })).rejects.toThrow('outbox unavailable')
    expect(harness.state).toEqual(before)
  })
  it('rejects a concurrent update without writes', async () => {
    harness.state.member.updated_at = '2026-09-03T18:00:00.000Z'
    const before = structuredClone(harness.state)

    await expect(restoreOffboardingLifecycleAfterReentry({ ...plan(), apply: true })).rejects.toMatchObject({ code: 'recovery_state_conflict' })
    expect(harness.state).toEqual(before)
  })
  it('rejects recovery with no qualifying later episode', async () => {
    harness.state.reentry = false
    await expect(restoreOffboardingLifecycleAfterReentry({ ...plan(), apply: true })).rejects.toMatchObject({ code: 'recovery_reentry_required' })
    expect(harness.state.member.status).toBe('inactive')
  })
  it('requires a live administrator grant', async () => {
    harness.state.admin = false
    await expect(restoreOffboardingLifecycleAfterReentry(plan())).rejects.toMatchObject({ code: 'recovery_forbidden' })
  })
  it('rejects discordant administrator active/status without writes', async () => {
    harness.state.adminStatus = 'inactive'
    const before = structuredClone(harness.state)

    await expect(restoreOffboardingLifecycleAfterReentry({ ...plan(), apply: true })).rejects.toMatchObject({ code: 'recovery_forbidden' })
    expect(harness.state).toEqual(before)
  })
  it('rejects assignment deactivation without any writes', async () => {
    const input = { ...plan(), apply: true }
    const before = structuredClone(harness.state)

    input.desired.assignments[0].active = false
    await expect(restoreOffboardingLifecycleAfterReentry(input)).rejects.toMatchObject({ code: 'invalid_recovery_target' })
    expect(harness.state).toEqual(before)
  })
  it.each(['2026-02-30', '2026-13-01', '2026-2-01'])('rejects non-calendar ISO date %s without writes', async value => {
    const input = { ...plan(), apply: true }
    const before = structuredClone(harness.state)

    input.desired.member.contractEndDate = value
    await expect(restoreOffboardingLifecycleAfterReentry(input)).rejects.toMatchObject({ code: 'invalid_recovery_target' })
    expect(harness.state).toEqual(before)
  })
  it('rejects assignment end before its actual start without writes', async () => {
    const input = { ...plan(), apply: true }
    const before = structuredClone(harness.state)

    input.desired.assignments[0].endDate = '2026-02-28'
    await expect(restoreOffboardingLifecycleAfterReentry(input)).rejects.toMatchObject({ code: 'invalid_recovery_assignment_dates' })
    expect(harness.state).toEqual(before)
  })
  it('rejects reuse of a receipt key with altered target', async () => {
    const input = { ...plan(), apply: true }

    await restoreOffboardingLifecycleAfterReentry(input)
    input.desired.member.assignable = false
    await expect(restoreOffboardingLifecycleAfterReentry(input)).rejects.toMatchObject({ code: 'recovery_idempotency_conflict' })
  })
})
