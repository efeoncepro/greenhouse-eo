import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

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
      categoryAtSent: 'contract',
      pricingModel: 'project',
      commercialModel: 'project',
      staffingModel: 'outcome_based'
    })
  })

  it('locks only the quotation row before reading sales context snapshot source', async () => {
    const { captureSalesContextAtSent } = await import('./sales-context')

    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ quotation_id: 'qt-1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              quotation_id: 'qt-1',
              organization_id: 'org-1',
              space_id: 'sp-1',
              client_id: 'cl-1',
              hubspot_deal_id: null,
              sales_context_at_sent: null,
              pricing_model: 'project',
              commercial_model: 'project',
              staffing_model: 'outcome_based',
              lifecyclestage: 'customer',
              deal_id: null,
              dealstage: null
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [] })
    }

    const snapshot = await captureSalesContextAtSent({
      quotationId: 'qt-1',
      organizationId: 'org-1',
      spaceId: 'sp-1',
      client
    })

    expect(snapshot.categoryAtSent).toBe('contract')
    expect(client.query).toHaveBeenCalledTimes(3)

    const firstSql = client.query.mock.calls[0]?.[0] as string
    const secondSql = client.query.mock.calls[1]?.[0] as string

    expect(firstSql).toContain('FROM greenhouse_commercial.quotations AS q')
    expect(firstSql).toContain('FOR UPDATE')
    expect(firstSql).not.toContain('LEFT JOIN')

    expect(secondSql).toContain('LEFT JOIN greenhouse_core.clients AS c')
    expect(secondSql).toContain('LEFT JOIN greenhouse_commercial.deals AS d')
    expect(secondSql).not.toContain('FOR UPDATE')
  })
})
