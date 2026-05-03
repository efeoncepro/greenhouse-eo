import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  runGreenhousePostgresQueryMock,
  createHubSpotQuoteMock,
  updateHubSpotQuoteMock,
  resolveHubSpotQuoteSyncPayloadMock,
  publishQuotationPushedToHubSpotMock,
  publishQuotationHubSpotSyncFailedMock
} = vi.hoisted(() => ({
  runGreenhousePostgresQueryMock: vi.fn(),
  createHubSpotQuoteMock: vi.fn(),
  updateHubSpotQuoteMock: vi.fn(),
  resolveHubSpotQuoteSyncPayloadMock: vi.fn(),
  publishQuotationPushedToHubSpotMock: vi.fn(),
  publishQuotationHubSpotSyncFailedMock: vi.fn()
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => runGreenhousePostgresQueryMock(...args)
}))

vi.mock('@/lib/hubspot/create-hubspot-quote', () => ({
  createHubSpotQuote: (...args: unknown[]) => createHubSpotQuoteMock(...args)
}))

vi.mock('@/lib/hubspot/update-hubspot-quote', () => ({
  updateHubSpotQuote: (...args: unknown[]) => updateHubSpotQuoteMock(...args)
}))

vi.mock('@/lib/hubspot/hubspot-quote-sync', () => ({
  resolveHubSpotQuoteSyncPayload: (...args: unknown[]) => resolveHubSpotQuoteSyncPayloadMock(...args)
}))

vi.mock('@/lib/commercial/quotation-events', () => ({
  publishQuotationPushedToHubSpot: (...args: unknown[]) => publishQuotationPushedToHubSpotMock(...args),
  publishQuotationHubSpotSyncFailed: (...args: unknown[]) => publishQuotationHubSpotSyncFailedMock(...args)
}))

// Helper — build a canonical quote row shape. Only the fields the SUT reads matter.
const buildQuoteRow = (overrides: Record<string, unknown> = {}) => ({
  quotation_id: 'qt-1',
  organization_id: 'org-1',
  hubspot_deal_id: 'hs-deal-1',
  hubspot_quote_id: null,
  ...overrides
})

const buildSyncPayload = (overrides: Record<string, unknown> = {}) => ({
  quotationId: 'qt-1',
  organizationId: 'org-1',
  contactIdentityProfileId: 'identity-contact-1',
  dealId: 'hs-deal-1',
  title: 'Test quote',
  expirationDate: '2026-06-30',
  currency: 'CLP',
  status: 'APPROVAL_NOT_NEEDED',
  sender: {
    firstName: 'Julio',
    lastName: 'Reyes',
    email: 'julio@example.com',
    companyName: 'Efeonce Group SpA'
  },
  lineItems: [
    {
      hubspotProductId: 'prod-77',
      name: 'Consultoría',
      quantity: 10,
      unitPrice: 100,
      productCode: 'GH-PRO-001',
      legacySku: 'LEG-001',
      billingFrequency: 'monthly',
      billingStartDate: '2026-05-01',
      taxRate: 19,
      taxRateGroupId: 'tax-group-1',
      taxAmount: 190
    }
  ],
  ...overrides
})

describe('pushCanonicalQuoteToHubSpot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips when canonical has no hubspot_deal_id and emits pushed event with result=skipped', async () => {
    // 1st call: SELECT quotation → row with null hubspot_deal_id
    runGreenhousePostgresQueryMock.mockResolvedValueOnce([
      buildQuoteRow({ hubspot_deal_id: null, hubspot_quote_id: null })
    ])

    const { pushCanonicalQuoteToHubSpot } = await import('../push-canonical-quote')

    const result = await pushCanonicalQuoteToHubSpot({ quotationId: 'qt-1', actorId: 'actor-1' })

    expect(result).toEqual({
      result: 'skipped',
      hubspotQuoteId: null,
      reason: 'no_hubspot_deal_id'
    })

    // Neither create nor update should be called
    expect(createHubSpotQuoteMock).not.toHaveBeenCalled()
    expect(updateHubSpotQuoteMock).not.toHaveBeenCalled()

    // pushed event emitted with result=skipped, reason=no_hubspot_deal_id
    expect(publishQuotationPushedToHubSpotMock).toHaveBeenCalledTimes(1)
    expect(publishQuotationPushedToHubSpotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quotationId: 'qt-1',
        hubspotQuoteId: null,
        hubspotDealId: null,
        direction: 'outbound',
        result: 'skipped',
        reason: 'no_hubspot_deal_id',
        actorId: 'actor-1'
      })
    )

    // No failure event
    expect(publishQuotationHubSpotSyncFailedMock).not.toHaveBeenCalled()
  })

  it('creates the HubSpot quote, persists hubspot_quote_id, and emits result=created', async () => {
    runGreenhousePostgresQueryMock
      .mockResolvedValueOnce([buildQuoteRow({ hubspot_quote_id: null })])
      .mockResolvedValueOnce([])

    resolveHubSpotQuoteSyncPayloadMock.mockResolvedValueOnce(buildSyncPayload())

    createHubSpotQuoteMock.mockResolvedValueOnce({
      success: true,
      quoteId: 'qt-1',
      hubspotQuoteId: 'hs-quote-99',
      hubspotQuoteNumber: 'HS-99',
      hubspotQuoteStatus: 'APPROVAL_NOT_NEEDED',
      hubspotQuoteLink: 'https://example.com/hs-quote-99',
      hubspotPdfDownloadLink: 'https://example.com/hs-quote-99.pdf',
      hubspotQuoteLocked: true,
      error: null
    })

    const { pushCanonicalQuoteToHubSpot } = await import('../push-canonical-quote')

    const result = await pushCanonicalQuoteToHubSpot({ quotationId: 'qt-1', actorId: 'actor-1' })

    expect(result).toEqual({ result: 'created', hubspotQuoteId: 'hs-quote-99' })

    // createHubSpotQuote called once with forwarded fields
    expect(createHubSpotQuoteMock).toHaveBeenCalledTimes(1)
    expect(createHubSpotQuoteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteId: 'qt-1',
        organizationId: 'org-1',
        contactIdentityProfileId: 'identity-contact-1',
        dealId: 'hs-deal-1',
        sender: expect.objectContaining({
          email: 'julio@example.com'
        }),
        status: 'APPROVAL_NOT_NEEDED',
        persistFinanceMirror: false,
        lineItems: expect.arrayContaining([
          expect.objectContaining({
            name: 'Consultoría',
            quantity: 10,
            unitPrice: 100,
            taxRateGroupId: 'tax-group-1'
          })
        ])
      })
    )

    // updateHubSpotQuote NOT called on create path
    expect(updateHubSpotQuoteMock).not.toHaveBeenCalled()

    // pushed event emitted with result=created
    expect(publishQuotationPushedToHubSpotMock).toHaveBeenCalledTimes(1)
    expect(publishQuotationPushedToHubSpotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quotationId: 'qt-1',
        hubspotQuoteId: 'hs-quote-99',
        hubspotDealId: 'hs-deal-1',
        direction: 'outbound',
        result: 'created',
        actorId: 'actor-1'
      })
    )

    // No failure event on success
    expect(publishQuotationHubSpotSyncFailedMock).not.toHaveBeenCalled()

    const persistCall = runGreenhousePostgresQueryMock.mock.calls[1]

    expect(persistCall[0]).toContain('UPDATE greenhouse_commercial.quotations')
    expect(persistCall[1]).toEqual([
      'hs-quote-99',
      'APPROVAL_NOT_NEEDED',
      'https://example.com/hs-quote-99',
      'https://example.com/hs-quote-99.pdf',
      true,
      'qt-1'
    ])
  })

  it('updates the HubSpot quote when hubspot_quote_id already exists and emits result=updated', async () => {
    runGreenhousePostgresQueryMock
      .mockResolvedValueOnce([buildQuoteRow({ hubspot_quote_id: 'hs-quote-existing' })])
      .mockResolvedValueOnce([])

    resolveHubSpotQuoteSyncPayloadMock.mockResolvedValueOnce(
      buildSyncPayload({
        lineItems: [
          {
            hubspotLineItemId: 'li-9',
            hubspotProductId: 'prod-77',
            name: 'Horas',
            quantity: 5,
            unitPrice: 50,
            taxRateGroupId: 'tax-group-1'
          }
        ]
      })
    )

    updateHubSpotQuoteMock.mockResolvedValueOnce({
      success: true,
      quoteStatus: 'APPROVAL_NOT_NEEDED',
      quoteLink: 'https://example.com/hs-quote-existing',
      pdfDownloadLink: 'https://example.com/hs-quote-existing.pdf',
      locked: true
    })

    const { pushCanonicalQuoteToHubSpot } = await import('../push-canonical-quote')

    const result = await pushCanonicalQuoteToHubSpot({ quotationId: 'qt-1', actorId: 'actor-2' })

    expect(result).toEqual({ result: 'updated', hubspotQuoteId: 'hs-quote-existing' })

    // updateHubSpotQuote called once, createHubSpotQuote NOT called
    expect(updateHubSpotQuoteMock).toHaveBeenCalledTimes(1)
    expect(updateHubSpotQuoteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hubspotQuoteId: 'hs-quote-existing',
        status: 'APPROVAL_NOT_NEEDED',
        sender: expect.objectContaining({
          email: 'julio@example.com'
        }),
        lineItems: expect.arrayContaining([
          expect.objectContaining({
            hubspotLineItemId: 'li-9',
            name: 'Horas',
            quantity: 5,
            unitPrice: 50,
            taxRateGroupId: 'tax-group-1'
          })
        ])
      })
    )
    expect(createHubSpotQuoteMock).not.toHaveBeenCalled()

    // pushed event emitted with result=updated
    expect(publishQuotationPushedToHubSpotMock).toHaveBeenCalledTimes(1)
    expect(publishQuotationPushedToHubSpotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quotationId: 'qt-1',
        hubspotQuoteId: 'hs-quote-existing',
        hubspotDealId: 'hs-deal-1',
        direction: 'outbound',
        result: 'updated',
        actorId: 'actor-2'
      })
    )

    // No failure event on success
    expect(publishQuotationHubSpotSyncFailedMock).not.toHaveBeenCalled()

    const persistCall = runGreenhousePostgresQueryMock.mock.calls[1]

    expect(persistCall[0]).toContain('UPDATE greenhouse_commercial.quotations')
    expect(persistCall[1]).toEqual([
      'hs-quote-existing',
      'APPROVAL_NOT_NEEDED',
      'https://example.com/hs-quote-existing',
      'https://example.com/hs-quote-existing.pdf',
      true,
      'qt-1'
    ])
  })
})
