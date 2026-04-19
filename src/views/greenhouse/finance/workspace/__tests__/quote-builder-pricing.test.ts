import { describe, expect, it } from 'vitest'

import type { PricingLineOutputV2 } from '@/lib/finance/pricing/contracts'

import type { QuoteLineItem } from '../QuoteLineItemsEditor'
import { buildPersistedQuoteLineItems } from '../quote-builder-pricing'

const roleLine = (): QuoteLineItem => ({
  label: 'Creative Operations Lead',
  description: null,
  lineType: 'role',
  unit: 'month',
  quantity: 1,
  unitPrice: null,
  subtotalPrice: null,
  subtotalAfterDiscount: null,
  roleCode: 'ECG-001',
  memberId: null,
  productId: null,
  discountType: null,
  discountValue: null,
  source: 'catalog',
  serviceSku: null,
  serviceLineOrder: null,
  metadata: {
    pricingV2LineType: 'role',
    sku: 'ECG-001',
    fteFraction: 1,
    periods: 1
  }
})

const roleSimulationLine = (): PricingLineOutputV2 => ({
  lineInput: {
    lineType: 'role',
    roleSku: 'ECG-001',
    hours: null,
    fteFraction: 1,
    periods: 1,
    quantity: 1,
    employmentTypeCode: null
  },
  costStack: {
    unitCostUsd: 1200,
    unitCostOutputCurrency: 1100000,
    totalCostUsd: 1200,
    totalCostOutputCurrency: 1100000,
    breakdown: { compensation: 1200 }
  },
  suggestedBillRate: {
    pricingBasis: 'month',
    unitPriceUsd: 1800,
    unitPriceOutputCurrency: 1750000,
    totalBillUsd: 1800,
    totalBillOutputCurrency: 1750000
  },
  effectiveMarginPct: 33.33,
  tierCompliance: { status: 'in_range' },
  resolutionNotes: []
})

describe('buildPersistedQuoteLineItems', () => {
  it('persists the suggested engine unit price for auto-priced lines', () => {
    const items = buildPersistedQuoteLineItems({
      lines: [roleLine()],
      currency: 'CLP',
      simulationLines: [roleSimulationLine()],
      missingPriceMessage: 'pricing missing'
    })

    expect(items[0]?.unitPrice).toBe(1750000)
    expect(items[0]?.manualUnitCost).toBeDefined()
    expect(items[0]?.manualUnitCost).toBeGreaterThan(0)
    expect(items[0]?.resolvedCostBreakdown?.snapshotSource).toBe('pricing_engine_v2')
  })

  it('preserves explicit manual prices for direct-cost lines', () => {
    const items = buildPersistedQuoteLineItems({
      lines: [
        {
          label: 'Discovery workshop',
          description: null,
          lineType: 'direct_cost',
          unit: 'project',
          quantity: 1,
          unitPrice: 320000,
          subtotalPrice: null,
          subtotalAfterDiscount: null,
          discountType: null,
          discountValue: null,
          source: 'manual',
          metadata: null
        }
      ],
      currency: 'CLP',
      simulationLines: null,
      missingPriceMessage: 'pricing missing'
    })

    expect(items[0]?.unitPrice).toBe(320000)
  })

  it('rejects stale simulation output that no longer matches the draft line', () => {
    const line = roleLine()
    const staleSimulation = roleSimulationLine()

    staleSimulation.lineInput.quantity = 2

    expect(() =>
      buildPersistedQuoteLineItems({
        lines: [line],
        currency: 'CLP',
        simulationLines: [staleSimulation],
        missingPriceMessage: 'pricing missing'
      })
    ).toThrow('pricing missing')
  })
})
