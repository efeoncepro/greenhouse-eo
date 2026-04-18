import { describe, expect, it, vi } from 'vitest'

import { resolvePricingAddonsFromCatalog } from '../addon-resolver'
import { buildPricingEngineOutputV2 } from '../pricing-engine-v2'

const buildAddon = (sku: string, overrides: Record<string, unknown> = {}) => ({
  addonId: `${sku.toLowerCase()}-id`,
  addonSku: sku,
  category: 'Fees',
  addonName: sku,
  addonType: 'fee_percentage',
  unit: 'month',
  costInternalUsd: 0,
  marginPct: 0.15,
  finalPriceUsd: null,
  finalPricePct: 0.1,
  pctMin: null,
  pctMax: null,
  minimumAmountUsd: null,
  applicableTo: ['all_projects'],
  description: null,
  conditions: null,
  visibleToClient: true,
  active: true,
  effectiveFrom: '2026-04-18',
  notes: null,
  createdAt: '2026-04-18T00:00:00.000Z',
  updatedAt: '2026-04-18T00:00:00.000Z',
  ...overrides
})

describe('buildPricingEngineOutputV2', () => {
  it('prices canonical role lines and resolves auto addons without touching the legacy contract', async () => {
    const addonCatalog = [
      buildAddon('EFO-003'),
      buildAddon('EFO-004'),
      buildAddon('EFO-005', { finalPricePct: 0.05 }),
      buildAddon('EFO-006', { pctMin: 0.04, finalPricePct: null }),
      buildAddon('EFO-007', { finalPricePct: 0.03, minimumAmountUsd: 30 })
    ]

    const result = await buildPricingEngineOutputV2(
      {
        businessLineCode: 'wave',
        commercialModel: 'on_demand',
        countryFactorCode: 'international_usd',
        outputCurrency: 'MXN',
        quoteDate: '2026-04-18',
        lines: [
          {
            lineType: 'role',
            roleSku: 'ECG-001',
            fteFraction: 0.5,
            periods: 2
          }
        ]
      },
      {
        getSellableRoleBySku: vi.fn().mockResolvedValue({
          roleId: 'role-1',
          roleSku: 'ECG-001',
          roleCode: 'strategist',
          roleLabelEs: 'Estratega',
          roleLabelEn: null,
          category: 'strategy',
          tier: '3',
          tierLabel: 'Estrategico',
          canSellAsStaff: true,
          canSellAsServiceComponent: true,
          active: true,
          notes: null,
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        listCompatibleEmploymentTypes: vi.fn().mockResolvedValue([
          {
            roleId: 'role-1',
            employmentTypeCode: 'contractor',
            isDefault: true,
            allowed: true,
            notes: null,
            createdAt: '2026-04-18T00:00:00.000Z',
            employmentType: null
          }
        ]),
        getCurrentCost: vi.fn().mockResolvedValue({
          roleId: 'role-1',
          employmentTypeCode: 'contractor',
          effectiveFrom: '2026-04-18',
          baseSalaryUsd: 700,
          bonusJitUsd: 0,
          bonusRpaUsd: 0,
          bonusArUsd: 0,
          bonusSobrecumplimientoUsd: 0,
          gastosPrevisionalesUsd: 0,
          feeDeelUsd: 0,
          feeEorUsd: 0,
          hoursPerFteMonth: 100,
          totalMonthlyCostUsd: 1000,
          hourlyCostUsd: 10,
          notes: null,
          createdAt: '2026-04-18T00:00:00.000Z'
        }),
        getCurrentPricing: vi.fn().mockResolvedValue({
          roleId: 'role-1',
          currencyCode: 'MXN',
          effectiveFrom: '2026-04-18',
          marginPct: 0.5,
          hourlyPrice: 400,
          fteMonthlyPrice: 40000,
          notes: null,
          createdAt: '2026-04-18T00:00:00.000Z'
        }),
        getRoleTierMargins: vi.fn().mockResolvedValue({
          tier: '3',
          tierLabel: 'Estrategico',
          marginMin: 0.4,
          marginOpt: 0.5,
          marginMax: 0.6,
          effectiveFrom: '2026-04-18',
          notes: null,
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        getCommercialModelMultiplier: vi.fn().mockResolvedValue({
          modelCode: 'on_demand',
          modelLabel: 'On-Demand',
          multiplierPct: 0.1,
          description: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        getCountryPricingFactor: vi.fn().mockResolvedValue({
          factorCode: 'international_usd',
          factorLabel: 'International',
          factorMin: 0.85,
          factorOpt: 0.9,
          factorMax: 1,
          appliesWhen: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        convertFteToHours: vi.fn().mockResolvedValue({
          fteFraction: 0.5,
          fteLabel: '0.5',
          monthlyHours: 50,
          recommendedDescription: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        resolvePricingAddons: vi.fn().mockImplementation(input =>
          Promise.resolve(resolvePricingAddonsFromCatalog(input, addonCatalog as never))
        ),
        resolvePricingOutputExchangeRate: vi.fn().mockResolvedValue(20),
        convertUsdToPricingCurrency: vi.fn().mockImplementation(({ amountUsd }) => Promise.resolve(amountUsd * 20)),
        convertCurrencyAmount: vi.fn().mockImplementation(({ amount }) => Promise.resolve(amount)),
        getToolBySku: vi.fn(),
        getOverheadAddonBySku: vi.fn(),
        listOverheadAddons: vi.fn().mockResolvedValue(addonCatalog),
        readLatestMemberCapacityEconomicsSnapshot: vi.fn(),
        readMemberCapacityEconomicsSnapshot: vi.fn()
      }
    )

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0]?.suggestedBillRate.totalBillUsd).toBe(1980)
    expect(result.lines[0]?.effectiveMarginPct).toBeCloseTo(0.4949, 3)
    expect(result.lines[0]?.tierCompliance.status).toBe('in_range')
    expect(result.totals.subtotalUsd).toBe(1980)
    expect(result.addons.map(addon => addon.sku)).toEqual([
      'EFO-003',
      'EFO-004',
      'EFO-005',
      'EFO-006',
      'EFO-007'
    ])
    expect(result.aggregateMargin.classification).toBe('healthy')
  })
})
