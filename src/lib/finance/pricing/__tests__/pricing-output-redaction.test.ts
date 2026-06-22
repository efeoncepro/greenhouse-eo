import { describe, expect, it } from 'vitest'

import type { PricingEngineOutputV2 } from '../contracts'
import { redactPricingOutputForProfile } from '../pricing-output-redaction'

const buildOutput = (): PricingEngineOutputV2 => ({
  lines: [
    {
      lineInput: { lineType: 'role', roleSku: 'DESIGNER', hours: 40, quantity: 1, periods: 1 },
      costStack: {
        unitCostUsd: 12,
        unitCostOutputCurrency: 12,
        totalCostUsd: 480,
        totalCostOutputCurrency: 480,
        breakdown: { blendedLaborCost: 400, directOverhead: 80 },
        costBasisKind: 'role_blended',
        costBasisConfidenceLabel: 'high'
      },
      suggestedBillRate: {
        pricingBasis: 'hour',
        unitPriceUsd: 30,
        unitPriceOutputCurrency: 30,
        totalBillUsd: 1200,
        totalBillOutputCurrency: 1200
      },
      effectiveMarginPct: 60,
      tierCompliance: { tier: 'standard', status: 'in_range', marginMin: 40, marginOpt: 55, marginMax: 70 },
      resolutionNotes: ['Costo base desde role_blended (DESIGNER)']
    }
  ],
  addons: [],
  totals: {
    subtotalUsd: 1200,
    overheadUsd: 0,
    totalUsd: 1200,
    totalOutputCurrency: 1200,
    commercialMultiplierApplied: 1.15,
    countryFactorApplied: 1.05,
    exchangeRateUsed: 1
  },
  aggregateMargin: { marginPct: 60, classification: 'healthy' },
  warnings: ['Tool sin precio: aplicado markup default 30% sobre costo 100 USD'],
  structuredWarnings: [
    {
      code: 'tool_price_default_margin',
      severity: 'warning',
      message: 'Tool sin precio',
      context: { unitCostUsd: 100, fallbackMarkupPct: 30 }
    }
  ]
})

describe('redactPricingOutputForProfile', () => {
  it('internal + costStackVisible: passes everything through (full)', () => {
    const out = redactPricingOutputForProfile(buildOutput(), { audience: 'internal', costStackVisible: true })

    expect(out.lines[0].costStack).toBeDefined()
    expect(out.lines[0].effectiveMarginPct).toBe(60)
    expect(out.lines[0].tierCompliance).toBeDefined()
    expect(out.totals.commercialMultiplierApplied).toBe(1.15)
    expect(out.aggregateMargin).toEqual({ marginPct: 60, classification: 'healthy' })
    expect(out.warnings).toHaveLength(1)
    expect(out.structuredWarnings).toHaveLength(1)
  })

  it('internal + !costStackVisible: strips ONLY cost stack, preserves margin (no regression)', () => {
    const out = redactPricingOutputForProfile(buildOutput(), { audience: 'internal', costStackVisible: false })

    // cost stack removed
    expect(out.lines[0].costStack).toBeUndefined()
    // margin + tier + multipliers + aggregate + warnings + notes PRESERVED (current behavior)
    expect(out.lines[0].effectiveMarginPct).toBe(60)
    expect(out.lines[0].tierCompliance).toBeDefined()
    expect(out.lines[0].resolutionNotes).toHaveLength(1)
    expect(out.totals.commercialMultiplierApplied).toBe(1.15)
    expect(out.aggregateMargin).toBeDefined()
    expect(out.warnings).toHaveLength(1)
    expect(out.structuredWarnings).toHaveLength(1)
    // bill rate always visible
    expect(out.lines[0].suggestedBillRate.totalBillOutputCurrency).toBe(1200)
  })

  for (const audience of ['client', 'public'] as const) {
    it(`${audience}: redacts ALL five sensitive surfaces, keeps bill rate + totals`, () => {
      const out = redactPricingOutputForProfile(buildOutput(), { audience, costStackVisible: true })

      // 1. per-line cost stack
      expect(out.lines[0].costStack).toBeUndefined()
      // 2. per-line margin + tier + cost-leaking notes
      expect(out.lines[0].effectiveMarginPct).toBeUndefined()
      expect(out.lines[0].tierCompliance).toBeUndefined()
      expect(out.lines[0].resolutionNotes).toEqual([])
      // 3. aggregate margin
      expect(out.aggregateMargin).toBeUndefined()
      // 4. markup multipliers
      expect(out.totals.commercialMultiplierApplied).toBeUndefined()
      expect(out.totals.countryFactorApplied).toBeUndefined()
      // 5. warnings (prose + context carry cost/markup)
      expect(out.warnings).toEqual([])
      expect(out.structuredWarnings).toEqual([])

      // bill-side data preserved
      expect(out.lines[0].suggestedBillRate.totalBillOutputCurrency).toBe(1200)
      expect(out.totals.totalOutputCurrency).toBe(1200)
      expect(out.totals.exchangeRateUsed).toBe(1)
    })

    it(`${audience}: serialized payload contains NO sensitive token`, () => {
      const out = redactPricingOutputForProfile(buildOutput(), { audience, costStackVisible: true })
      const serialized = JSON.stringify(out)

      for (const forbidden of [
        'costStack',
        'unitCostUsd',
        'totalCostUsd',
        'blendedLaborCost',
        'effectiveMarginPct',
        'tierCompliance',
        'marginPct',
        'commercialMultiplierApplied',
        'countryFactorApplied',
        'role_blended'
      ]) {
        expect(serialized).not.toContain(forbidden)
      }
    })
  }
})
