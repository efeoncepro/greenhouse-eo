import { describe, expect, it } from 'vitest'

import { computeAddonChargeUsd, resolvePricingAddonsFromCatalog } from '../addon-resolver'

const buildAddon = (overrides: Partial<Parameters<typeof computeAddonChargeUsd>[0]['addon']>) => ({
  addonId: overrides.addonId ?? 'addon-1',
  addonSku: overrides.addonSku ?? 'EFO-003',
  category: overrides.category ?? 'Fees',
  addonName: overrides.addonName ?? 'Project Management Fee',
  addonType: overrides.addonType ?? 'fee_percentage',
  unit: overrides.unit ?? 'month',
  costInternalUsd: overrides.costInternalUsd ?? 0,
  marginPct: overrides.marginPct ?? 0.15,
  finalPriceUsd: overrides.finalPriceUsd ?? null,
  finalPricePct: overrides.finalPricePct ?? 0.1,
  pctMin: overrides.pctMin ?? null,
  pctMax: overrides.pctMax ?? null,
  minimumAmountUsd: overrides.minimumAmountUsd ?? null,
  applicableTo: overrides.applicableTo ?? ['all_projects'],
  description: overrides.description ?? null,
  conditions: overrides.conditions ?? null,
  visibleToClient: overrides.visibleToClient ?? true,
  active: overrides.active ?? true,
  effectiveFrom: overrides.effectiveFrom ?? '2026-04-18',
  notes: overrides.notes ?? null,
  createdAt: overrides.createdAt ?? '2026-04-18T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-04-18T00:00:00.000Z'
})

describe('resolvePricingAddonsFromCatalog', () => {
  it('selects contextual addons for on_demand wave quotes in foreign currency', () => {
    const catalog = [
      buildAddon({ addonSku: 'EFO-003' }),
      buildAddon({ addonSku: 'EFO-004', addonName: 'Recruiting & Onboarding Fee' }),
      buildAddon({ addonSku: 'EFO-005', addonName: 'Renewal Fee' }),
      buildAddon({ addonSku: 'EFO-006', addonName: 'Transactional Fees' }),
      buildAddon({ addonSku: 'EFO-007', addonName: 'AI Infra Fee' })
    ]

    const resolved = resolvePricingAddonsFromCatalog(
      {
        commercialModel: 'on_demand',
        businessLineCode: 'wave',
        outputCurrency: 'MXN',
        lines: [{ lineType: 'role', roleCanSellAsStaff: true }]
      },
      catalog
    )

    expect(resolved.map(entry => entry.addon.addonSku)).toEqual([
      'EFO-003',
      'EFO-004',
      'EFO-005',
      'EFO-006',
      'EFO-007'
    ])
  })
})

describe('computeAddonChargeUsd', () => {
  it('applies percentage addons over subtotal with minimum', () => {
    const result = computeAddonChargeUsd({
      addon: buildAddon({
        addonSku: 'EFO-007',
        finalPricePct: 0.03,
        minimumAmountUsd: 30
      }),
      basisSubtotalUsd: 500,
      resourceMonthlyCostUsd: 0
    })

    expect(result.amountUsd).toBe(30)
    expect(result.costUsd).toBe(0)
  })

  it('uses monthly resource cost for resource_month addons', () => {
    const result = computeAddonChargeUsd({
      addon: buildAddon({
        addonSku: 'EFO-004',
        addonType: 'resource_month',
        finalPricePct: null
      }),
      basisSubtotalUsd: 0,
      resourceMonthlyCostUsd: 1200
    })

    expect(result.amountUsd).toBe(1200)
    expect(result.costUsd).toBe(1200)
  })
})
