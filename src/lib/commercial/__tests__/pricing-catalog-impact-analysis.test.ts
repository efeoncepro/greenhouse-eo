import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mocks.query(...args)
}))

import { previewPricingCatalogImpact } from '@/lib/commercial/pricing-catalog-impact-analysis'

type QuoteRow = Record<string, unknown>

const makeQuoteRow = (overrides: Partial<QuoteRow> = {}): QuoteRow => ({
  quotation_id: 'qt-1',
  quotation_number: 'Q-001',
  status: 'sent',
  total_amount_clp: 1_250_000,
  commercial_model: 'project',
  pricing_model: 'project',
  staffing_model: 'named_resources',
  business_line_code: 'wave',
  currency: 'CLP',
  quote_date: '2026-04-19',
  hubspot_deal_id: 'hs-deal-1',
  client_name: 'Acme SpA',
  line_item_id: 'qli-1',
  line_type: 'role',
  role_code: 'analista_ga4_gtm_looker',
  product_id: null,
  finance_product_id: null,
  label: 'Analista GA4',
  description: 'Senior role',
  subtotal_after_discount: 1_250_000,
  product_name: null,
  product_type: null,
  legacy_category: null,
  legacy_sku: null,
  suggested_role_code: null,
  ...overrides
})

beforeEach(() => {
  mocks.query.mockReset()
})

const wireQueryMock = ({
  quoteRows,
  sellableRoleRows = [],
  tierRows = [],
  toolRows = [],
  addonRows = [],
  multiplierRows = [],
  countryRows = [],
  roleTierMarginRows = [],
  dealRows = []
}: {
  quoteRows: QuoteRow[]
  sellableRoleRows?: QuoteRow[]
  tierRows?: QuoteRow[]
  toolRows?: QuoteRow[]
  addonRows?: QuoteRow[]
  multiplierRows?: QuoteRow[]
  countryRows?: QuoteRow[]
  roleTierMarginRows?: QuoteRow[]
  dealRows?: QuoteRow[]
}) => {
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM greenhouse_commercial.quotations')) return quoteRows
    if (sql.includes('FROM greenhouse_serving.deal_pipeline_snapshots')) return dealRows

    if (sql.includes('FROM greenhouse_commercial.sellable_roles') && sql.includes('WHERE tier = $1')) {
      return tierRows
    }

    if (sql.includes('FROM greenhouse_commercial.sellable_roles')) return sellableRoleRows
    if (sql.includes('FROM greenhouse_ai.tool_catalog')) return toolRows
    if (sql.includes('FROM greenhouse_commercial.overhead_addons')) return addonRows
    if (sql.includes('FROM greenhouse_commercial.commercial_model_multipliers')) return multiplierRows
    if (sql.includes('FROM greenhouse_commercial.country_pricing_factors')) return countryRows
    if (sql.includes('FROM greenhouse_commercial.role_tier_margins')) return roleTierMarginRows

    return []
  })
}

describe('previewPricingCatalogImpact', () => {
  it('finds exact sellable_role impact by role code and rolls pipeline totals', async () => {
    wireQueryMock({
      quoteRows: [
        makeQuoteRow({ quotation_id: 'qt-1', quotation_number: 'Q-001', role_code: 'analista_ga4_gtm_looker' })
      ],
      sellableRoleRows: [{ role_id: 'role-1', role_code: 'analista_ga4_gtm_looker', role_sku: 'ECG-001' }],
      dealRows: [{ deal_id: 'deal-1', hubspot_deal_id: 'hs-deal-1', latest_quote_id: 'qt-1', amount_clp: 2_000_000 }]
    })

    const result = await previewPricingCatalogImpact({
      spaceId: 'space-1',
      // TASK-486: quote filtering moved from space_id to organization_id.
      organizationIds: ['org-1'],
      entityType: 'sellable_role',
      entityCode: 'analista_ga4_gtm_looker'
    })

    expect(result.affectedQuotes.count).toBe(1)
    expect(result.affectedDeals.totalPipelineClp).toBe(2_000_000)
  })

  it('matches tool_catalog heuristically and emits a warning', async () => {
    wireQueryMock({
      quoteRows: [
        makeQuoteRow({
          quotation_id: 'qt-1',
          quotation_number: 'Q-030',
          line_type: 'deliverable',
          role_code: null,
          label: 'Figma subscription',
          description: 'Seat license',
          product_name: 'Figma'
        })
      ],
      toolRows: [{ tool_id: 'tool-1', tool_sku: 'ETG-001', tool_name: 'Figma', tool_category: 'design', vendor: 'Figma' }]
    })

    const result = await previewPricingCatalogImpact({
      spaceId: 'space-1',
      // TASK-486: quote filtering moved from space_id to organization_id.
      organizationIds: ['org-1'],
      entityType: 'tool_catalog',
      entitySku: 'ETG-001'
    })

    expect(result.affectedQuotes.count).toBe(1)
    expect(result.warnings).toContain(
      'Tool catalog preview uses explicit line-item text evidence only; quotation_line_items does not carry a canonical tool_sku bridge yet.'
    )
  })

  it('returns conservative warnings for country pricing factors', async () => {
    wireQueryMock({
      quoteRows: [makeQuoteRow()],
      countryRows: [{ factor_code: 'international_usd' }]
    })

    const result = await previewPricingCatalogImpact({
      spaceId: 'space-1',
      entityType: 'country_pricing_factor',
      entityCode: 'international_usd'
    })

    expect(result.affectedQuotes.count).toBe(0)
    expect(result.warnings).toContain(
      'Country pricing factor preview is intentionally conservative: this slice has no canonical country bridge on quotations, so no rows are matched until that linkage exists.'
    )
  })
})
