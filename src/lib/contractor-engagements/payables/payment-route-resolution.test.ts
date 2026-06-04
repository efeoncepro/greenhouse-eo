import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContractorEngagement } from '../types'

const queryMock = vi.fn()
const resolvePaymentRouteMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: queryMock,
  withGreenhousePostgresTransaction: vi.fn()
}))

vi.mock('@/lib/finance/payment-routing/resolve-route', () => ({
  resolvePaymentRoute: resolvePaymentRouteMock
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

const engagement = (overrides: Partial<ContractorEngagement> = {}) =>
  ({
    contractorEngagementId: 'ceng-1',
    profileId: 'identity-valentina',
    memberId: null,
    relationshipSubtype: 'honorarios_cl',
    payrollVia: 'internal',
    countryCode: 'CL',
    paymentCurrency: null,
    ...overrides
  }) as ContractorEngagement

describe('contractor payable payment route resolution', () => {
  beforeEach(() => {
    queryMock.mockReset()
    resolvePaymentRouteMock.mockReset()
  })

  it('resolves through an existing member linked to the engagement profile without creating a member', async () => {
    queryMock.mockResolvedValueOnce([{ member_id: 'valentina-hoyos' }])
    resolvePaymentRouteMock.mockResolvedValueOnce({
      outcome: 'resolved',
      profileId: 'bpp-valentina',
      resolvedAt: '2026-06-02T17:05:38.468Z'
    })

    const { resolveContractorPayablePaymentRoute } = await import('./store')

    const route = await resolveContractorPayablePaymentRoute(
      {
        beneficiaryType: 'other',
        beneficiaryId: 'identity-valentina',
        currency: 'CLP',
        paymentCurrency: null
      },
      engagement()
    )

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('FROM greenhouse_core.members'), [
      'identity-valentina'
    ])
    expect(queryMock.mock.calls[0][0]).toContain('SELECT member_id')
    expect(queryMock.mock.calls[0][0]).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bUPSERT\b/i)
    expect(resolvePaymentRouteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        beneficiaryType: 'member',
        beneficiaryId: 'valentina-hoyos',
        currency: 'CLP',
        obligationKind: 'provider_payroll'
      }),
      expect.objectContaining({
        payRegime: 'chile',
        payrollVia: null,
        memberCountryCode: 'CL'
      })
    )
    expect(route).toMatchObject({
      beneficiaryType: 'member',
      beneficiaryId: 'valentina-hoyos',
      profileId: 'bpp-valentina'
    })
  })

  it('does not synthesize a member when no profile-linked member exists', async () => {
    queryMock.mockResolvedValueOnce([])

    const { resolveContractorPayablePaymentRoute } = await import('./store')

    const route = await resolveContractorPayablePaymentRoute(
      {
        beneficiaryType: 'other',
        beneficiaryId: 'identity-valentina',
        currency: 'CLP',
        paymentCurrency: null
      },
      engagement()
    )

    expect(route).toBeNull()
    expect(resolvePaymentRouteMock).not.toHaveBeenCalled()
    expect(queryMock.mock.calls[0][0]).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bUPSERT\b/i)
  })
})
