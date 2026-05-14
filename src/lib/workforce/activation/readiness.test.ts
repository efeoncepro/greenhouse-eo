import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()
const listPaymentProfilesMock = vi.fn()
const assessPersonLegalReadinessMock = vi.fn()
const resolveRoleTitleMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/finance/beneficiary-payment-profiles/list-profiles', () => ({
  listPaymentProfiles: (...args: unknown[]) => listPaymentProfilesMock(...args)
}))

vi.mock('@/lib/person-legal-profile/readiness', () => ({
  assessPersonLegalReadiness: (...args: unknown[]) => assessPersonLegalReadinessMock(...args)
}))

vi.mock('@/lib/workforce/role-title', () => ({
  resolveRoleTitle: (...args: unknown[]) => resolveRoleTitleMock(...args)
}))

const { resolveWorkforceActivationReadiness } = await import('./readiness')

const baseRow = {
  member_id: 'mem-1',
  display_name: 'Maria Camila Hoyos',
  primary_email: 'maria@example.com',
  workforce_intake_status: 'pending_intake',
  identity_profile_id: 'ip-1',
  active: true,
  created_at: new Date('2026-05-01T00:00:00Z'),
  hire_date: new Date('2026-05-13T00:00:00Z'),
  employment_type: 'employee',
  contract_type: 'indefinido',
  pay_regime: 'chile',
  payroll_via: 'internal',
  role_title: 'Operations Lead',
  role_title_source: 'hr_manual',
  compensation_currency: 'CLP',
  compensation_amount: '3000000',
  compensation_contract_type: 'indefinido',
  compensation_pay_regime: 'chile',
  has_login: true,
  has_active_relationship: true
}

describe('TASK-874 resolveWorkforceActivationReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveRoleTitleMock.mockResolvedValue({
      value: 'Operations Lead',
      source: 'hr_manual',
      sourceLabel: 'HR Greenhouse',
      hasDriftWithEntra: false
    })
    assessPersonLegalReadinessMock.mockResolvedValue({ ready: true, useCase: 'payroll_chile_dependent', blockers: [], warnings: [] })
    listPaymentProfilesMock.mockResolvedValue({ items: [{ profileId: 'pay-1', status: 'active' }], total: 1 })
  })

  it('marks a complete internal payroll member as ready_to_complete', async () => {
    queryMock.mockResolvedValueOnce([baseRow])

    const result = await resolveWorkforceActivationReadiness('mem-1')

    expect(result.ready).toBe(true)
    expect(result.status).toBe('ready_to_complete')
    expect(result.blockerCount).toBe(0)
    expect(result.topBlockerLane).toBeNull()
  })

  it('blocks when compensation is missing', async () => {
    queryMock.mockResolvedValueOnce([{ ...baseRow, compensation_currency: null, compensation_amount: null }])

    const result = await resolveWorkforceActivationReadiness('mem-1')

    expect(result.ready).toBe(false)
    expect(result.blockers.some(blocker => blocker.lane === 'compensation')).toBe(true)
    expect(result.topBlockerLane).toBe('compensation')
  })

  it('warns but does not block payment profile for Deel payroll', async () => {
    queryMock.mockResolvedValueOnce([{
      ...baseRow,
      pay_regime: 'international',
      payroll_via: 'deel',
      compensation_currency: 'USD',
      compensation_pay_regime: 'international'
    }])

    const result = await resolveWorkforceActivationReadiness('mem-1')

    expect(result.blockers.some(blocker => blocker.lane === 'payment_profile')).toBe(false)
    expect(result.warnings.some(warning => warning.code === 'payment_profile_managed_by_deel')).toBe(true)
  })

  it('returns blocked member_not_found when the member does not exist', async () => {
    queryMock.mockResolvedValueOnce([])

    const result = await resolveWorkforceActivationReadiness('missing')

    expect(result.ready).toBe(false)
    expect(result.blockers[0]?.code).toBe('member_not_found')
  })
})
