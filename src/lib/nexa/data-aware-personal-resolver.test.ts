import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { GH_NEXA } from '@/lib/copy/nexa'

// Mock del reader canónico de leave para testear el resolver sin DB.
const listLeaveMock = vi.fn()

vi.mock('@/lib/hr-core/postgres-leave-store', () => ({
  listLeaveRequestsFromPostgres: (input: unknown) => listLeaveMock(input)
}))

import { buildPersonalPrompts, resolvePersonalPrompts } from './data-aware-personal-resolver'

const COPY = GH_NEXA.floating.data_aware_prompts

describe('buildPersonalPrompts (TASK-1141, mapper puro)', () => {
  it('sin pendientes → []', () => {
    expect(buildPersonalPrompts({ ownPendingLeave: 0, approvalsPending: 0 })).toEqual([])
  })

  it('aprobaciones del equipo → gancho con el count real', () => {
    const result = buildPersonalPrompts({ ownPendingLeave: 0, approvalsPending: 3 })

    expect(result).toEqual([{ text: COPY.personal_approvals_pending.replace('{count}', '3'), hint: 'pending' }])
  })

  it('vacaciones propias → gancho con el count real', () => {
    const result = buildPersonalPrompts({ ownPendingLeave: 2, approvalsPending: 0 })

    expect(result[0].text).toBe(COPY.personal_leave_pending.replace('{count}', '2'))
  })

  it('aprobaciones primero (desbloquean a otros), luego lo propio', () => {
    const result = buildPersonalPrompts({ ownPendingLeave: 1, approvalsPending: 2 })

    expect(result).toHaveLength(2)
    expect(result[0].text).toContain('aprobación')
  })

  it('NUNCA echa montos crudos al texto', () => {
    const result = buildPersonalPrompts({ ownPendingLeave: 1, approvalsPending: 1 })

    for (const prompt of result) {
      expect(prompt.text).not.toContain('$')
    }
  })
})

describe('resolvePersonalPrompts (TASK-1141, anti-oracle)', () => {
  const tenant = { tenantType: 'efeonce_internal', memberId: 'member-self' } as unknown as TenantContext

  const makeInput = (overrides: Record<string, unknown> = {}) =>
    ({
      subject: { userId: 'user-1', memberId: 'member-self' } as unknown as TenantEntitlementSubject,
      context: 'personal' as const,
      tenant,
      ...overrides
    })

  beforeEach(() => {
    listLeaveMock.mockReset()
    listLeaveMock.mockResolvedValue({
      requests: [
        { memberId: 'member-self', status: 'pending_supervisor' },
        { memberId: 'member-other', status: 'pending_supervisor' }
      ],
      summary: { total: 2, pendingSupervisor: 1, pendingHr: 0, approved: 0 }
    })
  })

  afterEach(() => listLeaveMock.mockReset())

  it('sin tenant/memberId de sesión → [] (degrada)', async () => {
    expect(await resolvePersonalPrompts(makeInput({ tenant: null }))).toEqual([])
    expect(await resolvePersonalPrompts(makeInput({ subject: { userId: 'u' } }))).toEqual([])
    expect(listLeaveMock).not.toHaveBeenCalled()
  })

  it('cuenta SOLO las solicitudes propias (memberId de sesión), ignora las de otros', async () => {
    const result = await resolvePersonalPrompts(makeInput())

    // 1 propia (member-self) pending + 1 aprobación (summary.pendingSupervisor).
    expect(result.some(p => p.text.includes('1') && p.text.includes('vacaciones'))).toBe(true)
  })

  it('anti-oracle: ignora el entityId del cliente; usa SIEMPRE subject.memberId', async () => {
    // El cliente intenta pasar el id de otro miembro como entityId — debe ser ignorado.
    await resolvePersonalPrompts(makeInput({ entityId: 'member-victim' }))

    // El reader se llama con el tenant de sesión (que scoping al member propio), nunca con entityId.
    const callArg = listLeaveMock.mock.calls[0][0]

    expect(callArg).toEqual({ tenant })
    expect(JSON.stringify(callArg)).not.toContain('member-victim')
  })
})
