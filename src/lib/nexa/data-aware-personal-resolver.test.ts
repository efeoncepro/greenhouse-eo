import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { GH_NEXA } from '@/lib/copy/nexa'

// Mocks de los readers canónicos para testear el resolver sin DB/BigQuery.
const listLeaveMock = vi.fn()
const readMemberMetricsMock = vi.fn()

vi.mock('@/lib/hr-core/postgres-leave-store', () => ({
  listLeaveRequestsFromPostgres: (input: unknown) => listLeaveMock(input)
}))

vi.mock('@/lib/ico-engine/read-metrics', () => ({
  readMemberMetrics: (...args: unknown[]) => readMemberMetricsMock(...args)
}))

import { buildPersonalPrompts, resolvePersonalPrompts } from './data-aware-personal-resolver'

const COPY = GH_NEXA.floating.data_aware_prompts

const facts = (overrides: Partial<Parameters<typeof buildPersonalPrompts>[0]> = {}) => ({
  ownPendingLeave: 0,
  approvalsPending: 0,
  overdueTasks: 0,
  hasIcoActivity: false,
  ...overrides
})

describe('buildPersonalPrompts (TASK-1141/1144, mapper puro)', () => {
  it('sin nada → []', () => {
    expect(buildPersonalPrompts(facts())).toEqual([])
  })

  it('entregables atrasados → anomalía con el count real', () => {
    const result = buildPersonalPrompts(facts({ overdueTasks: 3 }))

    expect(result[0]).toEqual({ text: COPY.personal_overdue_tasks.replace('{count}', '3'), hint: 'anomaly' })
  })

  it('actividad ICO sin atrasos → starter de desempeño', () => {
    const result = buildPersonalPrompts(facts({ hasIcoActivity: true }))

    expect(result[0].text).toBe(COPY.personal_performance_review)
  })

  it('con atrasos NO muestra el starter neutral de desempeño', () => {
    const result = buildPersonalPrompts(facts({ overdueTasks: 1, hasIcoActivity: true }))

    expect(result.some(p => p.text === COPY.personal_performance_review)).toBe(false)
  })

  it('orden por valor: atrasos > aprobaciones > vacaciones; cap 4', () => {
    const result = buildPersonalPrompts(facts({ overdueTasks: 2, hasIcoActivity: true, approvalsPending: 1, ownPendingLeave: 1 }))

    expect(result.length).toBeLessThanOrEqual(4)
    expect(result[0].text).toContain('atrasado')
  })

  it('NUNCA echa montos crudos', () => {
    const result = buildPersonalPrompts(facts({ overdueTasks: 1, approvalsPending: 1, ownPendingLeave: 1 }))

    for (const prompt of result) expect(prompt.text).not.toContain('$')
  })
})

describe('resolvePersonalPrompts (TASK-1144, anti-oracle + degradación independiente)', () => {
  const tenant = { tenantType: 'efeonce_internal', memberId: 'member-self' } as unknown as TenantContext

  const makeInput = (overrides: Record<string, unknown> = {}) =>
    ({
      subject: { userId: 'user-1', memberId: 'member-self' } as unknown as TenantEntitlementSubject,
      context: 'personal' as const,
      tenant,
      ...overrides
    })

  beforeEach(() => {
    listLeaveMock.mockReset().mockResolvedValue({
      requests: [{ memberId: 'member-self', status: 'pending_supervisor' }],
      summary: { total: 1, pendingSupervisor: 0, pendingHr: 0, approved: 0 }
    })
    readMemberMetricsMock.mockReset().mockResolvedValue({ context: { overdueTasks: 2, totalTasks: 10 } })
  })

  afterEach(() => {
    listLeaveMock.mockReset()
    readMemberMetricsMock.mockReset()
  })

  it('sin tenant/memberId → [] (degrada, no lee nada)', async () => {
    expect(await resolvePersonalPrompts(makeInput({ tenant: null }))).toEqual([])
    expect(readMemberMetricsMock).not.toHaveBeenCalled()
  })

  it('compone ICO (atrasos) + vacaciones', async () => {
    const result = await resolvePersonalPrompts(makeInput())

    expect(result.some(p => p.text.includes('atrasado') && p.text.includes('2'))).toBe(true)
  })

  it('degradación independiente: si el ICO (BigQuery) falla, las vacaciones siguen', async () => {
    readMemberMetricsMock.mockRejectedValue(new Error('BigQuery down'))
    listLeaveMock.mockResolvedValue({
      requests: [{ memberId: 'member-self', status: 'pending_supervisor' }],
      summary: { total: 1, pendingSupervisor: 2, pendingHr: 0, approved: 0 }
    })

    const result = await resolvePersonalPrompts(makeInput())

    // El ICO cayó → sin prompt de atrasos, pero las aprobaciones siguen.
    expect(result.some(p => p.text.includes('atrasado'))).toBe(false)
    expect(result.some(p => p.text.includes('aprobación'))).toBe(true)
  })

  it('anti-oracle: lee SIEMPRE con el memberId de sesión, no el entityId del cliente', async () => {
    await resolvePersonalPrompts(makeInput({ entityId: 'member-victim' }))

    expect(readMemberMetricsMock).toHaveBeenCalledWith('member-self', expect.any(Number), expect.any(Number))
  })
})
