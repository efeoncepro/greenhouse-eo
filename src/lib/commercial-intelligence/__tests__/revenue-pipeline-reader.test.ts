import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DealPipelineSnapshotRow } from '@/lib/commercial-intelligence/contracts'

// ─────────────────────────────────────────────────────────────
// Hoisted mocks — must be declared before importing the unit
// under test, because vi.mock factories execute before module
// evaluation.
// ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  listDealPipelineSnapshots: vi.fn(),
  query: vi.fn()
}))

vi.mock('@/lib/commercial-intelligence/intelligence-store', () => ({
  listDealPipelineSnapshots: (...args: unknown[]) => mocks.listDealPipelineSnapshots(...args)
}))

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mocks.query(...args)
}))

import { listRevenuePipelineUnified } from '@/lib/commercial-intelligence/revenue-pipeline-reader'

// ─────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────

const nowIso = '2026-04-18T12:00:00.000Z'

const makeDealSnapshot = (overrides: Partial<DealPipelineSnapshotRow> = {}): DealPipelineSnapshotRow => ({
  dealId: 'dl-1',
  hubspotDealId: 'hs-1',
  clientId: 'client-1',
  organizationId: null,
  spaceId: 'space-1',
  dealName: 'Open Deal',
  dealstage: 'proposal',
  dealstageLabel: 'Proposal',
  pipelineName: 'sales',
  dealType: 'new_business',
  amount: 1_500_000,
  amountClp: 1_500_000,
  currency: 'CLP',
  probabilityPct: 40,
  closeDate: '2026-05-30',
  daysUntilClose: 42,
  isOpen: true,
  isWon: false,
  dealOwnerEmail: 'owner@efeonce.com',
  latestQuoteId: null,
  latestQuoteStatus: null,
  latestQuotePricingModel: null,
  latestQuoteCommercialModel: null,
  latestQuoteStaffingModel: null,
  quoteCount: 0,
  approvedQuoteCount: 0,
  totalQuotesAmountClp: null,
  snapshotSourceEvent: null,
  materializedAt: nowIso,
  ...overrides
})

type StandaloneDbRow = {
  quotation_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  pipeline_stage: string
  probability_pct: number | null
  total_amount_clp: number | null
  business_line_code: string | null
  expiry_date: string | null
  days_until_expiry: number | null
  materialized_at: string
  quotation_number: string | null
  hubspot_deal_id: string | null
  commercial_model: string | null
  staffing_model: string | null
  deal_is_open: boolean | null
  deal_is_won: boolean | null
  client_name: string | null
  lifecyclestage: string | null
}

const makeQuoteRow = (overrides: Partial<StandaloneDbRow> = {}): StandaloneDbRow => ({
  quotation_id: 'quo-1',
  client_id: 'client-2',
  organization_id: null,
  space_id: 'space-1',
  pipeline_stage: 'sent',
  probability_pct: 40,
  total_amount_clp: 2_500_000,
  business_line_code: 'globe',
  expiry_date: '2026-06-15',
  days_until_expiry: 58,
  materialized_at: nowIso,
  quotation_number: 'Q-2026-0001',
  hubspot_deal_id: null,
  commercial_model: 'project',
  staffing_model: 'outcome_based',
  deal_is_open: null,
  deal_is_won: null,
  client_name: 'Acme Corp',
  lifecyclestage: 'customer',
  ...overrides
})

// Mock the two SQL queries issued by the reader:
//   1. fetchStandaloneQuotes → SELECT qps.* FROM quotation_pipeline_snapshots…
//   2. fetchMtdTotals        → SELECT SUM(...) FROM deal_pipeline_snapshots…
const wireQueryMock = (standaloneRows: StandaloneDbRow[]) => {
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes('quotation_pipeline_snapshots')) return standaloneRows
    if (sql.includes('mtd_won_clp')) return [{ mtd_won_clp: 0, mtd_lost_clp: 0 }]

    return []
  })
}

beforeEach(() => {
  mocks.listDealPipelineSnapshots.mockReset()
  mocks.query.mockReset()
})

// ─────────────────────────────────────────────────────────────
// Cases
// ─────────────────────────────────────────────────────────────

describe('listRevenuePipelineUnified', () => {
  it('maps an open deal snapshot to a deal-category row', async () => {
    mocks.listDealPipelineSnapshots.mockResolvedValue([makeDealSnapshot()])
    wireQueryMock([])

    const result = await listRevenuePipelineUnified({ spaceId: 'space-1' })

    expect(result.count).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: 'dl-1',
      grain: 'deal',
      category: 'deal',
      stage: 'proposal',
      isOpen: true
    })
    expect(result.totals.dealCount).toBe(1)
    expect(result.totals.standaloneCount).toBe(0)
    expect(result.totals.byCategory.deal.count).toBe(1)
  })

  it('excludes standalone quote linked to a closed-lost deal', async () => {
    mocks.listDealPipelineSnapshots.mockResolvedValue([])
    wireQueryMock([
      makeQuoteRow({
        quotation_id: 'quo-lost',
        hubspot_deal_id: 'hs-lost',
        deal_is_open: false,
        deal_is_won: false,
        lifecyclestage: 'customer'
      })
    ])

    const result = await listRevenuePipelineUnified({ spaceId: 'space-1' })

    expect(result.count).toBe(0)
    expect(result.items).toHaveLength(0)
    expect(result.totals.standaloneCount).toBe(0)
  })

  it('classifies a quote linked to a closed-won deal as contract', async () => {
    mocks.listDealPipelineSnapshots.mockResolvedValue([])
    wireQueryMock([
      makeQuoteRow({
        quotation_id: 'quo-won',
        hubspot_deal_id: 'hs-won',
        deal_is_open: false,
        deal_is_won: true,
        pipeline_stage: 'approved',
        lifecyclestage: 'customer'
      })
    ])

    const result = await listRevenuePipelineUnified({ spaceId: 'space-1' })

    expect(result.count).toBe(1)
    expect(result.items[0]).toMatchObject({
      id: 'quo-won',
      grain: 'quote',
      category: 'contract',
      stage: 'approved'
    })
    expect(result.totals.byCategory.contract.count).toBe(1)
  })

  it('classifies a standalone quote with customer lifecyclestage as contract', async () => {
    mocks.listDealPipelineSnapshots.mockResolvedValue([])
    wireQueryMock([
      makeQuoteRow({
        quotation_id: 'quo-customer',
        hubspot_deal_id: null,
        lifecyclestage: 'customer'
      })
    ])

    const result = await listRevenuePipelineUnified({ spaceId: 'space-1' })

    expect(result.count).toBe(1)
    expect(result.items[0]).toMatchObject({
      id: 'quo-customer',
      grain: 'quote',
      category: 'contract',
      lifecyclestage: 'customer'
    })
  })

  it('classifies a standalone quote with lead lifecyclestage as pre-sales', async () => {
    mocks.listDealPipelineSnapshots.mockResolvedValue([])
    wireQueryMock([
      makeQuoteRow({
        quotation_id: 'quo-lead',
        hubspot_deal_id: null,
        lifecyclestage: 'lead'
      })
    ])

    const result = await listRevenuePipelineUnified({ spaceId: 'space-1' })

    expect(result.count).toBe(1)
    expect(result.items[0]).toMatchObject({
      id: 'quo-lead',
      grain: 'quote',
      category: 'pre-sales',
      lifecyclestage: 'lead'
    })
    expect(result.totals.byCategory['pre-sales'].count).toBe(1)
  })
})
