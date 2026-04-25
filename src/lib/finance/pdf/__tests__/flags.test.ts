import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { computePdfFlags, computeSectionPageMap, computeTotalPages } from '../flags'

import type { RenderQuotationPdfInput } from '../contracts'

const baseInput = (overrides: Partial<RenderQuotationPdfInput> = {}): RenderQuotationPdfInput => ({
  quotationId: 'quo-1',
  quotationNumber: 'EFG-1',
  versionNumber: 1,
  currency: 'CLP',
  quoteDate: '2026-04-24',
  validUntil: null,
  clientName: null,
  organizationName: null,
  description: null,
  lineItems: [],
  totals: { subtotal: 0, totalDiscount: 0, total: 0, tax: null },
  terms: [],
  ...overrides
})

describe('computePdfFlags', () => {
  const originalEnv = process.env.GREENHOUSE_PDF_ENTERPRISE_THRESHOLD_CLP

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.GREENHOUSE_PDF_ENTERPRISE_THRESHOLD_CLP
    } else {
      process.env.GREENHOUSE_PDF_ENTERPRISE_THRESHOLD_CLP = originalEnv
    }
  })

  it('hides all conditional sections for a small CLP quote with no description', () => {
    const flags = computePdfFlags(baseInput({ totals: { subtotal: 1_000_000, totalDiscount: 0, total: 1_000_000, tax: null } }))

    expect(flags).toEqual({
      showExecutiveSummary: false,
      showAboutEfeonce: false,
      showInvestmentTimeline: false
    })
  })

  it('shows ExecutiveSummary when description >= 200 chars', () => {
    const flags = computePdfFlags(baseInput({ description: 'a'.repeat(220) }))

    expect(flags.showExecutiveSummary).toBe(true)
    expect(flags.showAboutEfeonce).toBe(false)
  })

  it('shows ExecutiveSummary + AboutEfeonce when total exceeds threshold', () => {
    const flags = computePdfFlags(
      baseInput({ totalInClp: 60_000_000, totals: { subtotal: 60_000_000, totalDiscount: 0, total: 60_000_000, tax: null } })
    )

    expect(flags.showExecutiveSummary).toBe(true)
    expect(flags.showAboutEfeonce).toBe(true)
  })

  it('shows InvestmentTimeline when milestones are provided', () => {
    const flags = computePdfFlags(
      baseInput({
        milestones: [
          { dateLabel: 'M0', title: 'Kick-off', detail: null, amountLabel: 'CLP 1M' }
        ]
      })
    )

    expect(flags.showInvestmentTimeline).toBe(true)
  })

  it('respects custom enterprise threshold from env var', () => {
    process.env.GREENHOUSE_PDF_ENTERPRISE_THRESHOLD_CLP = '10000000'

    const flags = computePdfFlags(
      baseInput({ totalInClp: 12_000_000, totals: { subtotal: 12_000_000, totalDiscount: 0, total: 12_000_000, tax: null } })
    )

    expect(flags.showAboutEfeonce).toBe(true)
  })

  it('forces enterprise treatment via forceEnterpriseTemplate flag', () => {
    const flags = computePdfFlags(baseInput({ forceEnterpriseTemplate: true }))

    expect(flags.showExecutiveSummary).toBe(true)
    expect(flags.showAboutEfeonce).toBe(true)
  })
})

describe('computeTotalPages + computeSectionPageMap', () => {
  it('returns 5 pages when no conditional sections active', () => {
    const total = computeTotalPages({
      showExecutiveSummary: false,
      showAboutEfeonce: false,
      showInvestmentTimeline: false
    })

    expect(total).toBe(5)
  })

  it('returns 8 pages when all conditional sections active', () => {
    const total = computeTotalPages({
      showExecutiveSummary: true,
      showAboutEfeonce: true,
      showInvestmentTimeline: true
    })

    expect(total).toBe(8)
  })

  it('assigns sequential page numbers respecting active sections', () => {
    const map = computeSectionPageMap({
      showExecutiveSummary: false,
      showAboutEfeonce: false,
      showInvestmentTimeline: true
    })

    expect(map.cover).toBe(1)
    expect(map.executiveSummary).toBeNull()
    expect(map.aboutEfeonce).toBeNull()
    expect(map.scopeOfWork).toBe(2)
    expect(map.commercialProposal).toBe(3)
    expect(map.investmentTimeline).toBe(4)
    expect(map.terms).toBe(5)
    expect(map.signatures).toBe(6)
  })

  it('assigns page numbers correctly for full enterprise mode', () => {
    const map = computeSectionPageMap({
      showExecutiveSummary: true,
      showAboutEfeonce: true,
      showInvestmentTimeline: true
    })

    expect(map.cover).toBe(1)
    expect(map.executiveSummary).toBe(2)
    expect(map.aboutEfeonce).toBe(3)
    expect(map.scopeOfWork).toBe(4)
    expect(map.commercialProposal).toBe(5)
    expect(map.investmentTimeline).toBe(6)
    expect(map.terms).toBe(7)
    expect(map.signatures).toBe(8)
  })
})
