import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()
const listPaymentProfilesMock = vi.fn()
const assessPersonLegalReadinessMock = vi.fn()
const resolveRoleTitleMock = vi.fn()
const getLatestOnboardingCaseForMemberMock = vi.fn()

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

vi.mock('@/lib/workforce/onboarding/store', () => ({
  getLatestOnboardingCaseForMember: (...args: unknown[]) => getLatestOnboardingCaseForMemberMock(...args),
  isOnboardingCaseSchemaUnavailableError: (error: unknown) =>
    Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === '42P01')
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
    getLatestOnboardingCaseForMemberMock.mockResolvedValue({
      onboardingCaseId: 'onboarding-case-1',
      publicId: 'EO-ON-2026-ABC12345',
      status: 'active',
      blockedReason: null
    })
  })

  it('marks a complete internal payroll member as ready_to_complete', async () => {
    queryMock.mockResolvedValueOnce([baseRow])

    const result = await resolveWorkforceActivationReadiness('mem-1')

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('greenhouse_sync.identity_reconciliation_proposals'),
      ['mem-1']
    )
    expect(queryMock).toHaveBeenCalledWith(
      expect.not.stringContaining('greenhouse_core.identity_reconciliation_proposals'),
      ['mem-1']
    )
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

  it('blocks but distinguishes draft payment profiles as activation-required', async () => {
    queryMock.mockResolvedValueOnce([baseRow])
    listPaymentProfilesMock.mockResolvedValueOnce({
      items: [{ profileId: 'pay-draft-1', status: 'draft' }],
      total: 1
    })

    const result = await resolveWorkforceActivationReadiness('mem-1')

    expect(result.ready).toBe(false)
    expect(result.blockers.some(blocker => blocker.code === 'payment_profile_missing_or_unapproved')).toBe(true)
    expect(result.warnings.some(warning => warning.code === 'payment_profile_draft_activation_required')).toBe(true)
    expect(result.lanes.find(lane => lane.key === 'payment_profile')?.detail).toBe(
      'La ruta de pago existe pero aun no esta activa.'
    )
  })

  it('returns blocked member_not_found when the member does not exist', async () => {
    queryMock.mockResolvedValueOnce([])

    const result = await resolveWorkforceActivationReadiness('missing')

    expect(result.ready).toBe(false)
    expect(result.blockers[0]?.code).toBe('member_not_found')
  })

  it('blocks activation when an onboarding case is explicitly blocked', async () => {
    queryMock.mockResolvedValueOnce([baseRow])
    getLatestOnboardingCaseForMemberMock.mockResolvedValueOnce({
      onboardingCaseId: 'onboarding-case-1',
      publicId: 'EO-ON-2026-ABC12345',
      status: 'blocked',
      blockedReason: 'Manager approval pending'
    })

    const result = await resolveWorkforceActivationReadiness('mem-1')

    expect(result.ready).toBe(false)
    expect(result.blockers.some(blocker => blocker.code === 'onboarding_case_blocked')).toBe(true)
    expect(result.topBlockerLane).toBe('operational_onboarding')
  })

  it('warns but does not block when onboarding case is missing', async () => {
    queryMock.mockResolvedValueOnce([baseRow])
    getLatestOnboardingCaseForMemberMock.mockResolvedValueOnce(null)

    const result = await resolveWorkforceActivationReadiness('mem-1')

    expect(result.ready).toBe(true)
    expect(result.warnings.some(warning => warning.code === 'onboarding_case_missing')).toBe(true)
  })

  it('does not block Chile honorarios on contractor engagement while TASK-790 foundation is pending', async () => {
    queryMock.mockResolvedValueOnce([
      {
        ...baseRow,
        employment_type: 'part_time',
        contract_type: 'honorarios',
        pay_regime: 'chile',
        payroll_via: 'internal',
        compensation_contract_type: 'honorarios',
        compensation_pay_regime: 'chile'
      }
    ])

    const result = await resolveWorkforceActivationReadiness('mem-1')

    expect(result.ready).toBe(true)
    expect(result.blockers.some(blocker => blocker.lane === 'contractor_engagement')).toBe(false)
    expect(result.warnings.some(warning => warning.code === 'contractor_engagement_pending_foundation')).toBe(true)
    expect(result.lanes.find(lane => lane.key === 'contractor_engagement')?.status).toBe('warning')
  })
})
