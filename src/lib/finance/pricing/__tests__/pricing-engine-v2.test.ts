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
        getPreferredRoleModeledCostBasisByRoleId: vi.fn().mockResolvedValue({
          snapshotId: 'EO-RMS-000001',
          snapshotKey: 'role_modeled:role-1:contractor:2026-04',
          roleId: 'role-1',
          roleSku: 'ECG-001',
          roleCode: 'strategist',
          roleLabel: 'Estratega',
          employmentTypeCode: 'contractor',
          periodYear: 2026,
          periodMonth: 4,
          periodId: '2026-04',
          snapshotDate: '2026-04-18',
          sourceCostComponentEffectiveFrom: '2026-04-18',
          sourceKind: 'admin_manual',
          sourceRef: 'pricing_catalog_admin',
          resolvedCurrency: 'USD',
          baseLaborCostAmount: 700,
          directOverheadPct: 0.2,
          sharedOverheadPct: 0.1,
          directOverheadAmount: 200,
          sharedOverheadAmount: 100,
          loadedCostAmount: 1000,
          costPerHourAmount: 10,
          hoursPerFteMonth: 100,
          confidenceScore: 0.75,
          confidenceLabel: 'medium',
          snapshotStatus: 'complete',
          detail: {},
          materializedAt: '2026-04-18T00:00:00.000Z',
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z'
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
        resolvePricingOutputFxReadiness: vi.fn().mockResolvedValue({
          fromCurrency: 'USD',
          toCurrency: 'CLP',
          rateDate: '2026-04-18',
          domain: 'pricing_output',
          state: 'supported',
          rate: 20,
          rateDateResolved: '2026-04-18',
          source: 'mindicador',
          ageDays: 0,
          stalenessThresholdDays: 7,
          composedViaUsd: false,
          message: 'Tasa USD→CLP disponible (hace 0 días).'
        }),
        convertUsdToPricingCurrency: vi.fn().mockImplementation(({ amountUsd }) => Promise.resolve(amountUsd * 20)),
        convertCurrencyAmount: vi.fn().mockImplementation(({ amount }) => Promise.resolve(amount)),
        getToolBySku: vi.fn(),
        getOverheadAddonBySku: vi.fn(),
        listOverheadAddons: vi.fn().mockResolvedValue(addonCatalog),
        getPreferredMemberActualCostBasis: vi.fn(),
        getPreferredRoleBlendedCostBasisByRoleId: vi.fn().mockResolvedValue(null)
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

  it('prefers tool provider cost basis snapshots before falling back to the raw catalog cost', async () => {
    const result = await buildPricingEngineOutputV2(
      {
        businessLineCode: 'wave',
        commercialModel: 'on_demand',
        countryFactorCode: 'international_usd',
        outputCurrency: 'USD',
        quoteDate: '2026-04-18',
        lines: [
          {
            lineType: 'tool',
            toolSku: 'EAI-OPENAI-001',
            quantity: 2,
            periods: 1
          }
        ]
      },
      {
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
          factorOpt: 1,
          factorMax: 1,
          appliesWhen: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        resolvePricingOutputExchangeRate: vi.fn().mockResolvedValue(1),
        resolvePricingOutputFxReadiness: vi.fn().mockResolvedValue({
          fromCurrency: 'USD',
          toCurrency: 'USD',
          rateDate: '2026-04-18',
          domain: 'pricing_output',
          state: 'supported',
          rate: 1,
          rateDateResolved: '2026-04-18',
          source: 'identity',
          ageDays: 0,
          stalenessThresholdDays: 7,
          composedViaUsd: false,
          message: 'USD baseline.'
        }),
        convertUsdToPricingCurrency: vi.fn().mockImplementation(({ amountUsd }) => Promise.resolve(amountUsd)),
        convertCurrencyAmount: vi.fn().mockImplementation(({ amount, fromCurrency, toCurrency }) => {
          if (fromCurrency === 'CLP' && toCurrency === 'USD') {
            return Promise.resolve(amount / 1000)
          }

          if (fromCurrency === 'USD' && toCurrency === 'USD') {
            return Promise.resolve(amount)
          }

          return Promise.resolve(amount)
        }),
        getToolBySku: vi.fn().mockResolvedValue({
          toolId: 'tool-openai-001',
          toolSku: 'EAI-OPENAI-001',
          toolName: 'OpenAI Platform',
          providerId: 'provider-openai',
          vendor: 'OpenAI',
          toolCategory: 'ai_platform',
          toolSubcategory: null,
          costModel: 'hybrid',
          subscriptionAmount: 30,
          subscriptionCurrency: 'USD',
          subscriptionBillingCycle: 'monthly',
          subscriptionSeats: 1,
          proratingQty: 1,
          proratingUnit: 'seat',
          proratedCostUsd: 30,
          proratedPriceUsd: null,
          applicableBusinessLines: ['wave'],
          applicabilityTags: [],
          includesInAddon: false,
          notesForQuoting: null,
          description: null,
          websiteUrl: null,
          iconUrl: null,
          isActive: true,
          sortOrder: 1,
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        getPreferredToolProviderCostBasisByToolSku: vi.fn().mockResolvedValue({
          snapshotId: 'EO-TPB-000001',
          snapshotKey: 'tpb:tool-openai-001:provider-openai:2026-04:global',
          toolId: 'tool-openai-001',
          toolSku: 'EAI-OPENAI-001',
          toolName: 'OpenAI Platform',
          providerId: 'provider-openai',
          providerName: 'OpenAI',
          supplierId: 'supplier-openai',
          organizationId: null,
          clientId: null,
          spaceId: null,
          tenantScopeKey: 'global',
          periodYear: 2026,
          periodMonth: 4,
          periodId: '2026-04',
          snapshotDate: '2026-04-18',
          sourceKind: 'hybrid_modeled',
          sourceRef: 'tool-openai-001',
          sourceCurrency: 'CLP',
          sourceAmount: 20000,
          resolvedCurrency: 'CLP',
          resolvedAmount: 20000,
          resolvedAmountClp: 20000,
          observedCostClp: 0,
          modeledSubscriptionCostClp: 12000,
          modeledUsageCostClp: 8000,
          fallbackCatalogCostUsd: 30,
          fxRateToClp: 1000,
          fxRateDate: '2026-04-18',
          freshnessDays: 0,
          freshnessStatus: 'fresh',
          confidenceScore: 0.82,
          confidenceLabel: 'high',
          activeLicenseCount: 3,
          activeMemberCount: 2,
          walletCount: 1,
          activeWalletCount: 1,
          financeExpenseCount: 0,
          providerSnapshotId: 'snapshot-openai-2026-04',
          latestObservedExpenseDate: null,
          latestToolingActivityAt: '2026-04-18T00:00:00.000Z',
          snapshotStatus: 'complete',
          refreshReason: 'test',
          detail: {},
          materializedAt: '2026-04-18T00:00:00.000Z',
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        resolvePricingAddons: vi.fn().mockResolvedValue([]),
        listOverheadAddons: vi.fn().mockResolvedValue([]),
        getOverheadAddonBySku: vi.fn(),
        getPreferredMemberActualCostBasis: vi.fn(),
        getPreferredRoleBlendedCostBasisByRoleId: vi.fn()
      }
    )

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0]?.costStack.totalCostUsd).toBe(40)
    expect(result.lines[0]?.suggestedBillRate.totalBillUsd).toBe(46)
    expect(result.lines[0]?.resolutionNotes).toContain(
      'Costo base desde snapshot 2026-04 (hybrid_modeled, confianza high).'
    )
    expect(result.lines[0]?.effectiveMarginPct).toBeCloseTo(0.1304, 4)
  })

  it('prefers role_blended snapshots before modeled role costs when blended evidence exists', async () => {
    const getPreferredRoleModeledCostBasisByRoleId = vi.fn().mockResolvedValue({
      snapshotId: 'EO-RMS-000002',
      snapshotKey: 'role_modeled:role-1:contractor:2026-04',
      roleId: 'role-1',
      roleSku: 'ECG-001',
      roleCode: 'strategist',
      roleLabel: 'Estratega',
      employmentTypeCode: 'contractor',
      periodYear: 2026,
      periodMonth: 4,
      periodId: '2026-04',
      snapshotDate: '2026-04-18',
      sourceCostComponentEffectiveFrom: '2026-04-18',
      sourceKind: 'admin_manual',
      sourceRef: 'pricing_catalog_admin',
      resolvedCurrency: 'USD',
      baseLaborCostAmount: 2000,
      directOverheadPct: 0.05,
      sharedOverheadPct: 0.05,
      directOverheadAmount: 100,
      sharedOverheadAmount: 100,
      loadedCostAmount: 2200,
      costPerHourAmount: 13.75,
      hoursPerFteMonth: 160,
      confidenceScore: 0.7,
      confidenceLabel: 'medium',
      snapshotStatus: 'complete',
      detail: {},
      materializedAt: '2026-04-18T00:00:00.000Z',
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z'
    })

    const result = await buildPricingEngineOutputV2(
      {
        businessLineCode: 'wave',
        commercialModel: 'on_demand',
        countryFactorCode: 'international_usd',
        outputCurrency: 'USD',
        quoteDate: '2026-04-18',
        lines: [
          {
            lineType: 'role',
            roleSku: 'ECG-001',
            fteFraction: 1,
            periods: 1
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
        getPreferredRoleModeledCostBasisByRoleId,
        getCurrentPricing: vi.fn().mockResolvedValue({
          roleId: 'role-1',
          currencyCode: 'USD',
          effectiveFrom: '2026-04-18',
          marginPct: 0.5,
          hourlyPrice: 0,
          fteMonthlyPrice: 3600,
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
          multiplierPct: 0,
          description: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        getCountryPricingFactor: vi.fn().mockResolvedValue({
          factorCode: 'international_usd',
          factorLabel: 'International',
          factorMin: 1,
          factorOpt: 1,
          factorMax: 1,
          appliesWhen: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        convertFteToHours: vi.fn().mockResolvedValue({
          fteFraction: 1,
          fteLabel: '1.0',
          monthlyHours: 160,
          recommendedDescription: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        resolvePricingAddons: vi.fn().mockResolvedValue([]),
        resolvePricingOutputExchangeRate: vi.fn().mockResolvedValue(1),
        resolvePricingOutputFxReadiness: vi.fn().mockResolvedValue({
          fromCurrency: 'USD',
          toCurrency: 'USD',
          rateDate: '2026-04-18',
          domain: 'pricing_output',
          state: 'supported',
          rate: 1,
          rateDateResolved: '2026-04-18',
          source: 'identity',
          ageDays: 0,
          stalenessThresholdDays: 7,
          composedViaUsd: false,
          message: 'USD baseline.'
        }),
        convertUsdToPricingCurrency: vi.fn().mockImplementation(({ amountUsd }) => Promise.resolve(amountUsd)),
        convertCurrencyAmount: vi.fn().mockImplementation(({ amount }) => Promise.resolve(amount)),
        getToolBySku: vi.fn(),
        getOverheadAddonBySku: vi.fn(),
        listOverheadAddons: vi.fn().mockResolvedValue([]),
        getPreferredMemberActualCostBasis: vi.fn(),
        getPreferredRoleBlendedCostBasisByRoleId: vi.fn().mockResolvedValue({
          snapshotId: 'rbs-1',
          snapshotKey: 'rbs:role-1:contractor:2026-04',
          roleId: 'role-1',
          roleSku: 'ECG-001',
          roleCode: 'strategist',
          roleLabel: 'Estratega',
          employmentTypeCode: 'contractor',
          periodYear: 2026,
          periodMonth: 4,
          periodId: '2026-04',
          snapshotDate: '2026-04-18',
          sourceKind: 'people_blended',
          sourceRef: 'mrb:2026-04',
          resolvedCurrency: 'USD',
          blendedLoadedCostAmount: 1500,
          blendedCostPerHourAmount: 9.375,
          blendedTotalLaborCostAmount: 1300,
          blendedDirectOverheadAmount: 100,
          blendedSharedOverheadAmount: 100,
          weightedFte: 4,
          weightedHours: 640,
          sampleSize: 4,
          memberCount: 4,
          freshestMemberSnapshotAt: '2026-04-18T00:00:00.000Z',
          oldestMemberSnapshotAt: '2026-04-18T00:00:00.000Z',
          freshnessDays: 0,
          freshnessStatus: 'fresh',
          confidenceScore: 0.87,
          confidenceLabel: 'high',
          snapshotStatus: 'complete',
          detail: {},
          materializedAt: '2026-04-18T00:00:00.000Z',
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        getPreferredToolProviderCostBasisByToolSku: vi.fn()
      }
    )

    expect(result.lines[0]?.costStack.costBasisKind).toBe('role_blended')
    expect(result.lines[0]?.costStack.costBasisConfidenceLabel).toBe('high')
    expect(result.lines[0]?.costStack.totalCostUsd).toBe(1500)
    expect(getPreferredRoleModeledCostBasisByRoleId).not.toHaveBeenCalled()
  })

  it('surfaces member_actual metadata when resolving person lines', async () => {
    const result = await buildPricingEngineOutputV2(
      {
        businessLineCode: 'wave',
        commercialModel: 'on_demand',
        countryFactorCode: 'international_usd',
        outputCurrency: 'USD',
        quoteDate: '2026-04-18',
        lines: [
          {
            lineType: 'person',
            memberId: 'member-1',
            fteFraction: 1,
            periods: 1
          }
        ]
      },
      {
        getCommercialModelMultiplier: vi.fn().mockResolvedValue({
          modelCode: 'on_demand',
          modelLabel: 'On-Demand',
          multiplierPct: 0,
          description: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        getCountryPricingFactor: vi.fn().mockResolvedValue({
          factorCode: 'international_usd',
          factorLabel: 'International',
          factorMin: 1,
          factorOpt: 1,
          factorMax: 1,
          appliesWhen: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        resolvePricingOutputExchangeRate: vi.fn().mockResolvedValue(1),
        resolvePricingOutputFxReadiness: vi.fn().mockResolvedValue({
          fromCurrency: 'USD',
          toCurrency: 'USD',
          rateDate: '2026-04-18',
          domain: 'pricing_output',
          state: 'supported',
          rate: 1,
          rateDateResolved: '2026-04-18',
          source: 'identity',
          ageDays: 0,
          stalenessThresholdDays: 7,
          composedViaUsd: false,
          message: 'USD baseline.'
        }),
        convertUsdToPricingCurrency: vi.fn().mockImplementation(({ amountUsd }) => Promise.resolve(amountUsd)),
        convertCurrencyAmount: vi.fn().mockImplementation(({ amount }) => Promise.resolve(amount)),
        convertFteToHours: vi.fn().mockResolvedValue({
          fteFraction: 1,
          fteLabel: '1.0',
          monthlyHours: 160,
          recommendedDescription: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        resolvePricingAddons: vi.fn().mockResolvedValue([]),
        listOverheadAddons: vi.fn().mockResolvedValue([]),
        getOverheadAddonBySku: vi.fn(),
        getSellableRoleBySku: vi.fn(),
        listCompatibleEmploymentTypes: vi.fn(),
        getPreferredRoleModeledCostBasisByRoleId: vi.fn(),
        getCurrentPricing: vi.fn(),
        getRoleTierMargins: vi.fn(),
        getToolBySku: vi.fn(),
        getPreferredToolProviderCostBasisByToolSku: vi.fn(),
        getPreferredRoleBlendedCostBasisByRoleId: vi.fn(),
        getPreferredMemberActualCostBasis: vi.fn().mockResolvedValue({
          memberId: 'member-1',
          periodYear: 2026,
          periodMonth: 4,
          periodId: '2026-04',
          snapshotDate: '2026-04-18',
          sourceKind: 'member_actual',
          sourceRef: '2026-04',
          currency: 'USD',
          loadedCostAmount: 1200,
          costPerHourAmount: 7.5,
          totalLaborCostAmount: 1000,
          directOverheadAmount: 100,
          sharedOverheadAmount: 100,
          contractedFte: 1,
          contractedHours: 160,
          commercialAvailabilityHours: 160,
          snapshotStatus: 'complete',
          confidenceScore: 0.95,
          confidenceLabel: 'high',
          sourceCompensationVersionId: 'cv-1',
          sourcePayrollPeriodId: '2026-04',
          roleId: 'role-1',
          roleSku: 'ECG-001',
          roleCode: 'strategist',
          roleLabel: 'Estratega',
          employmentTypeCode: 'contractor',
          detail: {}
        })
      }
    )

    expect(result.lines[0]?.costStack.costBasisKind).toBe('member_actual')
    expect(result.lines[0]?.costStack.costBasisSnapshotDate).toBe('2026-04-18')
    expect(result.lines[0]?.costStack.employmentTypeCode).toBe('contractor')
    expect(result.lines[0]?.costStack.totalCostUsd).toBe(1200)
  })

  it("autoResolveAddons='internal_only' only auto-sums internal addons; visible ones go to suggestedVisibleAddons", async () => {
    // Dos addons aplicables al mismo contexto: uno interno, uno visible.
    // En 'internal_only' el interno se auto-suma (result.addons) y el visible
    // viaja como propuesta (result.suggestedVisibleAddons) sin sumar al total.
    // Los SKUs usan los rule matchers del addon-resolver (EFO-003 para
    // commercial_model=on_demand; EFO-005 para role con canSellAsStaff).
    const addonCatalog = [
      buildAddon('EFO-003', { visibleToClient: false, finalPricePct: 0.1 }),
      buildAddon('EFO-005', { visibleToClient: true, finalPricePct: 0.05 })
    ]

    const result = await buildPricingEngineOutputV2(
      {
        businessLineCode: 'wave',
        commercialModel: 'on_demand',
        countryFactorCode: 'international_usd',
        outputCurrency: 'USD',
        quoteDate: '2026-04-18',
        autoResolveAddons: 'internal_only',
        lines: [
          {
            lineType: 'role',
            roleSku: 'ECG-001',
            fteFraction: 1,
            periods: 1
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
        getPreferredRoleModeledCostBasisByRoleId: vi.fn().mockResolvedValue({
          snapshotId: 'EO-RMS-000002',
          snapshotKey: 'role_modeled:role-1:contractor:2026-04',
          roleId: 'role-1',
          roleSku: 'ECG-001',
          roleCode: 'strategist',
          roleLabel: 'Estratega',
          employmentTypeCode: 'contractor',
          periodYear: 2026,
          periodMonth: 4,
          periodId: '2026-04',
          snapshotDate: '2026-04-18',
          sourceCostComponentEffectiveFrom: '2026-04-18',
          sourceKind: 'admin_manual',
          sourceRef: 'pricing_catalog_admin',
          resolvedCurrency: 'USD',
          baseLaborCostAmount: 700,
          directOverheadPct: 0.2,
          sharedOverheadPct: 0.1,
          directOverheadAmount: 200,
          sharedOverheadAmount: 100,
          loadedCostAmount: 1000,
          costPerHourAmount: 10,
          hoursPerFteMonth: 100,
          confidenceScore: 0.75,
          confidenceLabel: 'medium',
          snapshotStatus: 'complete',
          detail: {},
          materializedAt: '2026-04-18T00:00:00.000Z',
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        getCurrentPricing: vi.fn().mockResolvedValue({
          roleId: 'role-1',
          currencyCode: 'USD',
          effectiveFrom: '2026-04-18',
          marginPct: 0.5,
          hourlyPrice: 20,
          fteMonthlyPrice: 2000,
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
          multiplierPct: 0,
          description: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        getCountryPricingFactor: vi.fn().mockResolvedValue({
          factorCode: 'international_usd',
          factorLabel: 'International',
          factorMin: 1,
          factorOpt: 1,
          factorMax: 1,
          appliesWhen: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        convertFteToHours: vi.fn().mockResolvedValue({
          fteFraction: 1,
          fteLabel: '1.0',
          monthlyHours: 100,
          recommendedDescription: null,
          effectiveFrom: '2026-04-18',
          updatedAt: '2026-04-18T00:00:00.000Z'
        }),
        resolvePricingAddons: vi.fn().mockImplementation(input =>
          Promise.resolve(resolvePricingAddonsFromCatalog(input, addonCatalog as never))
        ),
        resolvePricingOutputExchangeRate: vi.fn().mockResolvedValue(1),
        resolvePricingOutputFxReadiness: vi.fn().mockResolvedValue({
          fromCurrency: 'USD',
          toCurrency: 'USD',
          rateDate: '2026-04-18',
          domain: 'pricing_output',
          state: 'supported',
          rate: 1,
          rateDateResolved: '2026-04-18',
          source: 'identity',
          ageDays: 0,
          stalenessThresholdDays: 7,
          composedViaUsd: false,
          message: 'USD baseline.'
        }),
        convertUsdToPricingCurrency: vi.fn().mockImplementation(({ amountUsd }) => Promise.resolve(amountUsd)),
        convertCurrencyAmount: vi.fn().mockImplementation(({ amount }) => Promise.resolve(amount)),
        getToolBySku: vi.fn(),
        getOverheadAddonBySku: vi.fn(),
        listOverheadAddons: vi.fn().mockResolvedValue(addonCatalog),
        getPreferredMemberActualCostBasis: vi.fn(),
        getPreferredRoleBlendedCostBasisByRoleId: vi.fn().mockResolvedValue(null)
      }
    )

    // Addons auto-sumados (result.addons): solo el interno.
    expect(result.addons.map(a => a.sku)).toEqual(['EFO-003'])
    expect(result.addons.every(a => a.visibleToClient === false)).toBe(true)

    // Addons propuestos (result.suggestedVisibleAddons): solo el visible.
    expect(result.suggestedVisibleAddons?.map(a => a.sku)).toEqual(['EFO-005'])
    expect(result.suggestedVisibleAddons?.every(a => a.visibleToClient === true)).toBe(true)
  })
})
