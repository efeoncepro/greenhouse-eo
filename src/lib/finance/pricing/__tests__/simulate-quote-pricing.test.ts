import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PricingEngineInputV2 } from '../contracts'
import { simulateQuotePricing, simulateQuotePricingFromService } from '../simulate-quote-pricing'

vi.mock('../pricing-engine-v2', () => ({ buildPricingEngineOutputV2: vi.fn() }))
vi.mock('@/lib/commercial/service-catalog-expand', () => ({ expandServiceIntoQuoteLines: vi.fn() }))

import { expandServiceIntoQuoteLines } from '@/lib/commercial/service-catalog-expand'

import { buildPricingEngineOutputV2 } from '../pricing-engine-v2'

const engineOutput = () => ({
  lines: [
    {
      lineInput: { lineType: 'role' as const, roleSku: 'DESIGNER' },
      costStack: {
        unitCostUsd: 12,
        unitCostOutputCurrency: 12,
        totalCostUsd: 480,
        totalCostOutputCurrency: 480,
        breakdown: {}
      },
      suggestedBillRate: {
        pricingBasis: 'hour' as const,
        unitPriceUsd: 30,
        unitPriceOutputCurrency: 30,
        totalBillUsd: 1200,
        totalBillOutputCurrency: 1200
      },
      effectiveMarginPct: 60,
      tierCompliance: { status: 'in_range' as const },
      resolutionNotes: ['Costo base desde role_blended']
    }
  ],
  addons: [],
  totals: {
    subtotalUsd: 1200,
    overheadUsd: 0,
    totalUsd: 1200,
    totalOutputCurrency: 1200,
    commercialMultiplierApplied: 1.15,
    countryFactorApplied: 1,
    exchangeRateUsed: 1
  },
  aggregateMargin: { marginPct: 60, classification: 'healthy' as const },
  warnings: [],
  structuredWarnings: []
})

const input: PricingEngineInputV2 = {
  businessLineCode: null,
  commercialModel: 'on_demand',
  countryFactorCode: 'CL',
  outputCurrency: 'CLP',
  quoteDate: '2026-06-21',
  lines: [{ lineType: 'role', roleSku: 'DESIGNER' }]
}

describe('simulateQuotePricing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('client audience: redacts margin/cost and wraps with non-binding estimate meta', async () => {
    vi.mocked(buildPricingEngineOutputV2).mockResolvedValue(engineOutput())

    const result = await simulateQuotePricing(input, { audience: 'client', costStackVisible: false })

    expect(result.pricing.lines[0].costStack).toBeUndefined()
    expect(result.pricing.lines[0].effectiveMarginPct).toBeUndefined()
    expect(result.pricing.aggregateMargin).toBeUndefined()
    expect(result.estimate.binding).toBe(false)
    expect(result.estimate.currency).toBe('CLP')
    expect(result.estimate.calculatedAt).toBe('2026-06-21')
    expect(result.estimate.disclaimer).toContain('no constituye una oferta vinculante')
    // bill side preserved
    expect(result.pricing.lines[0].suggestedBillRate.totalBillOutputCurrency).toBe(1200)
  })

  it('internal + costStackVisible: passes cost + margin through', async () => {
    vi.mocked(buildPricingEngineOutputV2).mockResolvedValue(engineOutput())

    const result = await simulateQuotePricing(input, { audience: 'internal', costStackVisible: true })

    expect(result.pricing.lines[0].costStack).toBeDefined()
    expect(result.pricing.aggregateMargin).toBeDefined()
  })
})

describe('simulateQuotePricingFromService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the service summary + redacted pricing + estimate', async () => {
    vi.mocked(expandServiceIntoQuoteLines).mockResolvedValue({
      service: { serviceSku: 'EFG-9', displayName: 'Diseño Digital', moduleName: 'Diseño' },
      lines: [],
      pricing: engineOutput()
    } as unknown as Awaited<ReturnType<typeof expandServiceIntoQuoteLines>>)

    const result = await simulateQuotePricingFromService(
      { serviceSku: 'EFG-9', outputCurrency: 'CLP', quoteDate: '2026-06-21' },
      { audience: 'client', costStackVisible: false }
    )

    expect(result.service).toEqual({ serviceSku: 'EFG-9', name: 'Diseño Digital' })
    expect(result.pricing.aggregateMargin).toBeUndefined()
    expect(result.estimate.currency).toBe('CLP')
    expect(result.estimate.binding).toBe(false)
  })
})
