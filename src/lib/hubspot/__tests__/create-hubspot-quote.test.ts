import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createHubSpotGreenhouseQuoteMock,
  runGreenhousePostgresQueryMock,
  withGreenhousePostgresTransactionMock,
  resolveHubSpotContactByIdentityProfileIdMock,
  syncCanonicalFinanceQuoteMock,
  resolveQuotationIdentityMock,
  publishQuoteCreatedMock
} = vi.hoisted(() => ({
  createHubSpotGreenhouseQuoteMock: vi.fn(),
  runGreenhousePostgresQueryMock: vi.fn(),
  withGreenhousePostgresTransactionMock: vi.fn(),
  resolveHubSpotContactByIdentityProfileIdMock: vi.fn(),
  syncCanonicalFinanceQuoteMock: vi.fn(),
  resolveQuotationIdentityMock: vi.fn(),
  publishQuoteCreatedMock: vi.fn()
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({
  createHubSpotGreenhouseQuote: (...args: unknown[]) => createHubSpotGreenhouseQuoteMock(...args)
}))

vi.mock('@/lib/commercial/hubspot-contact-resolution', () => ({
  resolveHubSpotContactByIdentityProfileId: (...args: unknown[]) =>
    resolveHubSpotContactByIdentityProfileIdMock(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runGreenhousePostgresQueryMock(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) =>
    withGreenhousePostgresTransactionMock(...args)
}))

vi.mock('@/lib/finance/quotation-canonical-store', () => ({
  syncCanonicalFinanceQuote: (...args: unknown[]) => syncCanonicalFinanceQuoteMock(...args)
}))

vi.mock('@/lib/finance/pricing', () => ({
  resolveQuotationIdentity: (...args: unknown[]) => resolveQuotationIdentityMock(...args)
}))

vi.mock('@/lib/commercial/quotation-events', () => ({
  publishQuoteCreated: (...args: unknown[]) => publishQuoteCreatedMock(...args)
}))

describe('createHubSpotQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withGreenhousePostgresTransactionMock.mockImplementation(async callback =>
      callback({
        query: vi.fn()
      })
    )
  })

  it('creates a HubSpot quote for canonical commercial quotations without requiring a space mirror', async () => {
    runGreenhousePostgresQueryMock.mockResolvedValueOnce([
      {
        organization_id: 'org-1',
        organization_name: 'Bata',
        hubspot_company_id: '29666506565'
      }
    ])

    resolveHubSpotContactByIdentityProfileIdMock.mockResolvedValueOnce({
      identityProfileId: 'identity-contact-1',
      hubspotContactId: '87929193780',
      displayName: 'Oscar Carrasco'
    })

    createHubSpotGreenhouseQuoteMock.mockResolvedValueOnce({
      hubspotQuoteId: 'hs-quote-1',
      quoteNumber: 'HQ-1',
      quoteLink: 'https://app.hubspot.com/quotes/hs-quote-1'
    })

    const { createHubSpotQuote } = await import('../create-hubspot-quote')

    const result = await createHubSpotQuote({
      quoteId: 'qt-1',
      organizationId: 'org-1',
      title: 'Bata - TEST',
      expirationDate: '2026-04-27',
      sender: {
        firstName: 'Oscar',
        lastName: 'Carrasco',
        email: 'oscar@efeonce.org',
        companyName: 'Efeonce Group SpA'
      },
      contactIdentityProfileId: 'identity-contact-1',
      lineItems: [
        {
          name: 'Servicio',
          quantity: 1,
          unitPrice: 2923500,
          productId: 'prd-1',
          hubspotProductId: 'hs-prod-1',
          productCode: 'ECG-SVC-001',
          billingFrequency: 'monthly',
          billingStartDate: '2026-05-01',
          taxRate: 19,
          taxAmount: 554465
        }
      ],
      dealId: '59465365539',
      persistFinanceMirror: false
    })

    expect(result).toEqual({
      success: true,
      quoteId: 'qt-1',
      hubspotQuoteId: 'hs-quote-1',
      hubspotQuoteNumber: 'HQ-1',
      hubspotQuoteLink: 'https://app.hubspot.com/quotes/hs-quote-1',
      hubspotContactId: '87929193780',
      error: null
    })

    expect(createHubSpotGreenhouseQuoteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bata - TEST',
        sender: {
          firstName: 'Oscar',
          lastName: 'Carrasco',
          email: 'oscar@efeonce.org',
          companyName: 'Efeonce Group SpA'
        },
        associations: {
          companyId: '29666506565',
          dealId: '59465365539',
          contactIds: ['87929193780']
        }
      })
    )

    expect(withGreenhousePostgresTransactionMock).not.toHaveBeenCalled()
    expect(syncCanonicalFinanceQuoteMock).not.toHaveBeenCalled()
    expect(publishQuoteCreatedMock).not.toHaveBeenCalled()
  })

  it('fails clearly when the selected contact cannot be mapped to HubSpot', async () => {
    runGreenhousePostgresQueryMock.mockResolvedValueOnce([
      {
        organization_id: 'org-1',
        organization_name: 'Bata',
        hubspot_company_id: '29666506565'
      }
    ])

    resolveHubSpotContactByIdentityProfileIdMock.mockResolvedValueOnce({
      identityProfileId: 'identity-contact-1',
      hubspotContactId: null,
      displayName: 'Oscar Carrasco'
    })

    const { createHubSpotQuote } = await import('../create-hubspot-quote')

    const result = await createHubSpotQuote({
      quoteId: 'qt-1',
      organizationId: 'org-1',
      title: 'Bata - TEST',
      expirationDate: '2026-04-27',
      sender: {
        firstName: 'Oscar',
        lastName: 'Carrasco',
        email: 'oscar@efeonce.org',
        companyName: 'Efeonce Group SpA'
      },
      contactIdentityProfileId: 'identity-contact-1',
      lineItems: [],
      persistFinanceMirror: false
    })

    expect(result).toEqual({
      success: false,
      quoteId: 'qt-1',
      hubspotQuoteId: null,
      hubspotQuoteNumber: null,
      hubspotQuoteLink: null,
      hubspotContactId: null,
      error: 'Contact has no HubSpot contact linked'
    })

    expect(createHubSpotGreenhouseQuoteMock).not.toHaveBeenCalled()
  })
})
