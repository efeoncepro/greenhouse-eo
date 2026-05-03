import { describe, expect, it, vi, beforeEach } from 'vitest'

import { resolvePaymentRoute } from './resolve-route'

vi.mock('@/lib/finance/beneficiary-payment-profiles/list-profiles', () => ({
  getActivePaymentProfile: vi.fn(),
  listPaymentProfiles: vi.fn()
}))

const { getActivePaymentProfile, listPaymentProfiles } = await import(
  '@/lib/finance/beneficiary-payment-profiles/list-profiles'
)

const baseObligation = {
  spaceId: null,
  beneficiaryType: 'member' as const,
  beneficiaryId: 'mem-1',
  currency: 'CLP' as const,
  obligationKind: 'employee_net_pay' as const
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(listPaymentProfiles as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(
    { items: [], total: 0 }
  )
})

describe('resolvePaymentRoute', () => {
  it('resuelve con profile activo para CLP local (banco transfer)', async () => {
    ;(getActivePaymentProfile as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({
      profileId: 'bpp-1',
      providerSlug: 'bci',
      paymentMethod: 'bank_transfer',
      paymentInstrumentId: 'acc-1',
      beneficiaryType: 'member',
      countryCode: 'CL'
    })

    const result = await resolvePaymentRoute(baseObligation, { payRegime: 'chile' })

    expect(result.outcome).toBe('resolved')
    expect(result.providerSlug).toBe('bci')
    expect(result.paymentMethod).toBe('bank_transfer')
    expect(result.profileId).toBe('bpp-1')
    expect(result.reason).toContain('profile=bpp-1')
    expect(result.reason).toContain('pay_regime=chile')
  })

  it('resuelve con profile activo para Deel (international honorarios)', async () => {
    ;(getActivePaymentProfile as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({
      profileId: 'bpp-2',
      providerSlug: 'deel',
      paymentMethod: 'deel',
      paymentInstrumentId: null,
      beneficiaryType: 'member',
      countryCode: 'CO'
    })

    const result = await resolvePaymentRoute(
      { ...baseObligation, currency: 'USD' },
      { payRegime: 'international', payrollVia: 'deel' }
    )

    expect(result.outcome).toBe('resolved')
    expect(result.providerSlug).toBe('deel')
    expect(result.paymentMethod).toBe('deel')
    expect(result.reason).toContain('payroll_via=deel')
  })

  it('resuelve con Global66 para colaborador internacional sin Deel', async () => {
    ;(getActivePaymentProfile as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({
      profileId: 'bpp-3',
      providerSlug: 'global66',
      paymentMethod: 'global66',
      paymentInstrumentId: null,
      beneficiaryType: 'member',
      countryCode: 'CO'
    })

    const result = await resolvePaymentRoute(
      { ...baseObligation, currency: 'USD' },
      { payRegime: 'international' }
    )

    expect(result.outcome).toBe('resolved')
    expect(result.providerSlug).toBe('global66')
    expect(result.paymentMethod).toBe('global66')
  })

  it('retorna profile_missing cuando no hay activo ni pending', async () => {
    ;(getActivePaymentProfile as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(null)

    const result = await resolvePaymentRoute(baseObligation)

    expect(result.outcome).toBe('profile_missing')
    expect(result.providerSlug).toBeNull()
    expect(result.profileId).toBeNull()
  })

  it('retorna profile_pending_approval cuando hay perfil sin aprobar', async () => {
    ;(getActivePaymentProfile as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(null)
    ;(listPaymentProfiles as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({
      items: [
        {
          profileId: 'bpp-pending',
          providerSlug: 'wise',
          paymentMethod: 'wise',
          paymentInstrumentId: null,
          beneficiaryType: 'member',
          countryCode: 'AR'
        }
      ],
      total: 1
    })

    const result = await resolvePaymentRoute(baseObligation)

    expect(result.outcome).toBe('profile_pending_approval')
    expect(result.profileId).toBe('bpp-pending')
    expect(result.reason).toContain('pending_approval')
  })

  it('retorna unsupported_beneficiary_type para supplier en V1', async () => {
    const result = await resolvePaymentRoute({
      ...baseObligation,
      beneficiaryType: 'supplier'
    })

    expect(result.outcome).toBe('unsupported_beneficiary_type')
    expect(result.providerSlug).toBeNull()
    expect(result.reason).toContain('member/shareholder')
  })

  it('retorna unsupported_currency para currency invalida', async () => {
    const result = await resolvePaymentRoute({
      ...baseObligation,
      currency: 'EUR' as 'CLP'
    })

    expect(result.outcome).toBe('unsupported_currency')
  })
})
