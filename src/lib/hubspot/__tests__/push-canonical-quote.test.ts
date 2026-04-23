import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  runGreenhousePostgresQueryMock,
  createHubSpotQuoteMock,
  updateHubSpotQuoteMock,
  resolveHubSpotQuoteSenderMock,
  publishQuotationPushedToHubSpotMock,
  publishQuotationHubSpotSyncFailedMock
} = vi.hoisted(() => ({
  runGreenhousePostgresQueryMock: vi.fn(),
  createHubSpotQuoteMock: vi.fn(),
  updateHubSpotQuoteMock: vi.fn(),
  resolveHubSpotQuoteSenderMock: vi.fn(),
  publishQuotationPushedToHubSpotMock: vi.fn(),
  publishQuotationHubSpotSyncFailedMock: vi.fn()
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runGreenhousePostgresQueryMock(...args)
}))

vi.mock('@/lib/hubspot/create-hubspot-quote', () => ({
  createHubSpotQuote: (...args: unknown[]) => createHubSpotQuoteMock(...args)
}))

vi.mock('@/lib/hubspot/update-hubspot-quote', () => ({
  updateHubSpotQuote: (...args: unknown[]) => updateHubSpotQuoteMock(...args)
}))

vi.mock('@/lib/hubspot/hubspot-quote-publish-contract', () => ({
  resolveHubSpotQuoteSender: (...args: unknown[]) => resolveHubSpotQuoteSenderMock(...args)
}))

vi.mock('@/lib/commercial/quotation-events', () => ({
  publishQuotationPushedToHubSpot: (...args: unknown[]) => publishQuotationPushedToHubSpotMock(...args),
  publishQuotationHubSpotSyncFailed: (...args: unknown[]) => publishQuotationHubSpotSyncFailedMock(...args)
}))

// Helper — build a canonical quote row shape. Only the fields the SUT reads matter.
const buildQuoteRow = (overrides: Record<string, unknown> = {}) => ({
  quotation_id: 'qt-1',
  quotation_number: 'QT-2026-0001',
  organization_id: 'org-1',
  contact_identity_profile_id: 'identity-contact-1',
  hubspot_deal_id: 'hs-deal-1',
  hubspot_quote_id: null,
  description: 'Test quote',
  valid_until: '2026-06-30',
  currency: 'CLP',
  billing_frequency: 'monthly',
  billing_start_date: '2026-05-01',
  tax_rate_snapshot: 19,
  created_by: 'user-created',
  issued_by: null,
  ...overrides
})

describe('pushCanonicalQuoteToHubSpot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveHubSpotQuoteSenderMock.mockResolvedValue({
      firstName: 'Oscar',
      lastName: 'Carrasco',
      email: 'oscar@efeonce.org',
      companyName: 'Efeonce Group SpA'
    })
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
    // Mock sequence of SQL calls:
    //   1. SELECT canonical quote
    //   2. SELECT line items
    //   3. UPDATE quotations SET hubspot_quote_id
    runGreenhousePostgresQueryMock
      .mockResolvedValueOnce([buildQuoteRow({ hubspot_quote_id: null })])
      .mockResolvedValueOnce([
        {
          line_item_id: 'li-1',
          label: 'Consultoría',
          description: 'Horas',
          quantity: 10,
          unit_price: 100,
          product_id: 'prd-1',
          hubspot_product_id: 'hs-prod-1',
          product_code: 'ECG-SVC-001',
          legacy_sku: 'LEG-001',
          recurrence_type: 'recurring',
          tax_rate_snapshot: 19,
          tax_amount_snapshot: 190
        }
      ])
      .mockResolvedValueOnce([])

    createHubSpotQuoteMock.mockResolvedValueOnce({
      success: true,
      quoteId: 'qt-1',
      hubspotQuoteId: 'hs-quote-99',
      hubspotQuoteNumber: 'HS-99',
      hubspotQuoteLink: 'https://example.com/hs-quote-99',
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
        persistFinanceMirror: false,
        sender: {
          firstName: 'Oscar',
          lastName: 'Carrasco',
          email: 'oscar@efeonce.org',
          companyName: 'Efeonce Group SpA'
        },
        lineItems: [
          expect.objectContaining({
            name: 'Consultoría',
            quantity: 10,
            unitPrice: 100,
            hubspotProductId: 'hs-prod-1',
            productCode: 'ECG-SVC-001',
            billingFrequency: 'monthly',
            billingStartDate: '2026-05-01',
            taxRate: 19,
            taxAmount: 190
          })
        ]
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

    // Persist call — the 3rd postgres call should UPDATE quotations with the new hubspot_quote_id
    const persistCall = runGreenhousePostgresQueryMock.mock.calls[2]

    expect(persistCall[0]).toContain('UPDATE greenhouse_commercial.quotations')
    expect(persistCall[1]).toEqual(['hs-quote-99', 'qt-1'])
  })

  it('updates the HubSpot quote when hubspot_quote_id already exists and emits result=updated', async () => {
    // Mock sequence:
    //   1. SELECT canonical quote (with existing hubspot_quote_id)
    //   2. SELECT line items
    //   3. UPDATE quotations SET hubspot_last_synced_at
    runGreenhousePostgresQueryMock
      .mockResolvedValueOnce([buildQuoteRow({ hubspot_quote_id: 'hs-quote-existing' })])
      .mockResolvedValueOnce([
        {
          line_item_id: 'li-1',
          label: 'Horas',
          description: null,
          quantity: 5,
          unit_price: 50,
          product_id: 'prd-1',
          hubspot_product_id: 'hs-prod-1',
          product_code: 'ECG-SVC-001',
          legacy_sku: 'LEG-001',
          recurrence_type: 'recurring',
          tax_rate_snapshot: 19,
          tax_amount_snapshot: 95
        }
      ])
      .mockResolvedValueOnce([])

    updateHubSpotQuoteMock.mockResolvedValueOnce({ success: true })

    const { pushCanonicalQuoteToHubSpot } = await import('../push-canonical-quote')

    const result = await pushCanonicalQuoteToHubSpot({ quotationId: 'qt-1', actorId: 'actor-2' })

    expect(result).toEqual({ result: 'updated', hubspotQuoteId: 'hs-quote-existing' })

    // updateHubSpotQuote called once, createHubSpotQuote NOT called
    expect(updateHubSpotQuoteMock).toHaveBeenCalledTimes(1)
    expect(updateHubSpotQuoteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hubspotQuoteId: 'hs-quote-existing',
        sender: {
          firstName: 'Oscar',
          lastName: 'Carrasco',
          email: 'oscar@efeonce.org',
          companyName: 'Efeonce Group SpA'
        },
        lineItems: [
          expect.objectContaining({
            name: 'Horas',
            quantity: 5,
            unitPrice: 50,
            hubspotProductId: 'hs-prod-1',
            productCode: 'ECG-SVC-001',
            billingFrequency: 'monthly',
            billingStartDate: '2026-05-01',
            taxRate: 19,
            taxAmount: 95
          })
        ]
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
  })
})
