import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('sales-context', () => {
  it('derives deal, contract and pre-sales categories from local runtime context', async () => {
    const { deriveSalesContextCategory } = await import('./sales-context')

    expect(
      deriveSalesContextCategory({
        lifecyclestage: 'lead',
        dealId: 'dl-1',
        hubspotDealId: 'hs-1'
      })
    ).toBe('deal')

    expect(
      deriveSalesContextCategory({
        lifecyclestage: 'customer',
        dealId: null,
        hubspotDealId: null
      })
    ).toBe('contract')

    expect(
      deriveSalesContextCategory({
        lifecyclestage: 'salesqualifiedlead',
        dealId: null,
        hubspotDealId: null
      })
    ).toBe('pre-sales')
  })

  it('normalizes persisted sales context payloads from snake_case JSONB', async () => {
    const { normalizeQuoteSalesContext } = await import('./sales-context')

    expect(
      normalizeQuoteSalesContext({
        captured_at: '2026-04-18T23:59:00.000Z',
        lifecyclestage: 'Customer',
        dealstage: null,
        deal_id: null,
        hubspot_deal_id: null,
        hubspot_lead_id: null,
        is_standalone: true,
        category_at_sent: 'contract'
      })
    ).toEqual({
      capturedAt: '2026-04-18T23:59:00.000Z',
      lifecyclestage: 'customer',
      dealstage: null,
      dealId: null,
      hubspotDealId: null,
      hubspotLeadId: null,
      isStandalone: true,
      categoryAtSent: 'contract'
    })
  })
})
