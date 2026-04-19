import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/commercial/service-catalog-store', () => ({
  getServiceBySku: vi.fn()
}))

vi.mock('@/lib/finance/pricing/pricing-engine-v2', () => ({
  buildPricingEngineOutputV2: vi.fn()
}))

import { expandServiceIntoQuoteLines } from '@/lib/commercial/service-catalog-expand'
import { getServiceBySku } from '@/lib/commercial/service-catalog-store'
import type { ServiceCatalogDetail } from '@/lib/commercial/service-catalog-store'
import { buildPricingEngineOutputV2 } from '@/lib/finance/pricing/pricing-engine-v2'
import type { PricingEngineOutputV2 } from '@/lib/finance/pricing/contracts'

const mockedGetServiceBySku = vi.mocked(getServiceBySku)
const mockedPricingEngineV2 = vi.mocked(buildPricingEngineOutputV2)

const makeEngineOutput = (): PricingEngineOutputV2 => ({
  lines: [],
  addons: [],
  totals: {
    subtotalUsd: 0,
    overheadUsd: 0,
    totalUsd: 0,
    totalOutputCurrency: 0,
    commercialMultiplierApplied: 1,
    countryFactorApplied: 1,
    exchangeRateUsed: 1
  },
  aggregateMargin: {
    marginPct: 0,
    classification: 'healthy'
  },
  warnings: [],
  structuredWarnings: []
})

const makeService = (overrides: Partial<ServiceCatalogDetail> = {}): ServiceCatalogDetail => ({
  moduleId: 'sm-mod-1',
  moduleCode: 'svc-test',
  moduleName: 'Test Service',
  serviceSku: 'SVC-TEST-001',
  serviceCategory: null,
  displayName: 'Test Service',
  serviceUnit: 'project',
  serviceType: null,
  commercialModel: 'on_demand',
  tier: '2',
  defaultDurationMonths: null,
  defaultDescription: null,
  businessLineCode: null,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  roleRecipeCount: 0,
  toolRecipeCount: 0,
  roleRecipe: [],
  toolRecipe: [],
  ...overrides
})

const makeRoleLine = (lineOrder: number, overrides: Partial<ServiceCatalogDetail['roleRecipe'][number]> = {}) => ({
  moduleId: 'sm-mod-1',
  lineOrder,
  roleId: `sr-${lineOrder}`,
  roleSku: `ROLE-${lineOrder}`,
  roleLabelEs: `Rol ${lineOrder}`,
  hoursPerPeriod: 10,
  quantity: 1,
  isOptional: false,
  notes: null,
  ...overrides
})

const makeToolLine = (lineOrder: number, overrides: Partial<ServiceCatalogDetail['toolRecipe'][number]> = {}) => ({
  moduleId: 'sm-mod-1',
  lineOrder,
  toolId: `tl-${lineOrder}`,
  toolSku: `TOOL-${lineOrder}`,
  toolName: `Tool ${lineOrder}`,
  quantity: 1,
  isOptional: false,
  passThrough: false,
  notes: null,
  ...overrides
})

beforeEach(() => {
  mockedGetServiceBySku.mockReset()
  mockedPricingEngineV2.mockReset()
  mockedPricingEngineV2.mockResolvedValue(makeEngineOutput())
})

describe('expandServiceIntoQuoteLines — error paths', () => {
  it('throws SERVICE_NOT_FOUND (status 404) when service missing', async () => {
    mockedGetServiceBySku.mockResolvedValue(null)

    try {
      await expandServiceIntoQuoteLines({ serviceSku: 'NOPE' })
      expect.fail('expected throw')
    } catch (err) {
      const e = err as Error & { code?: string; status?: number }

      expect(e.code).toBe('SERVICE_NOT_FOUND')
      expect(e.status).toBe(404)
    }

    expect(mockedPricingEngineV2).not.toHaveBeenCalled()
  })

  it('throws SERVICE_INACTIVE (status 409) when service is inactive', async () => {
    mockedGetServiceBySku.mockResolvedValue(makeService({ active: false }))

    try {
      await expandServiceIntoQuoteLines({ serviceSku: 'SVC-TEST-001' })
      expect.fail('expected throw')
    } catch (err) {
      const e = err as Error & { code?: string; status?: number }

      expect(e.code).toBe('SERVICE_INACTIVE')
      expect(e.status).toBe(409)
    }

    expect(mockedPricingEngineV2).not.toHaveBeenCalled()
  })
})

describe('expandServiceIntoQuoteLines — expansion', () => {
  it('produces 5 pricingLines + 5 expandedLines for 2 roles + 3 tools, calling engine once with autoResolveAddons=false', async () => {
    mockedGetServiceBySku.mockResolvedValue(
      makeService({
        roleRecipe: [makeRoleLine(1), makeRoleLine(2)],
        toolRecipe: [makeToolLine(1), makeToolLine(2), makeToolLine(3)]
      })
    )

    const result = await expandServiceIntoQuoteLines({ serviceSku: 'SVC-TEST-001' })

    expect(result.lines).toHaveLength(5)
    expect(mockedPricingEngineV2).toHaveBeenCalledTimes(1)

    const engineArg = mockedPricingEngineV2.mock.calls[0][0]

    expect(engineArg.lines).toHaveLength(5)
    expect(engineArg.autoResolveAddons).toBe(false)

    // 2 role lines + 3 tool lines
    expect(engineArg.lines.filter((l: { lineType: string }) => l.lineType === 'role')).toHaveLength(2)
    expect(engineArg.lines.filter((l: { lineType: string }) => l.lineType === 'tool')).toHaveLength(3)
  })

  it('role override: hoursPerPeriod override wins over recipe', async () => {
    mockedGetServiceBySku.mockResolvedValue(
      makeService({
        roleRecipe: [makeRoleLine(1, { hoursPerPeriod: 10 })]
      })
    )

    await expandServiceIntoQuoteLines({
      serviceSku: 'SVC-TEST-001',
      overrides: {
        roles: [{ lineOrder: 1, hoursPerPeriod: 25 }]
      }
    })

    const engineArg = mockedPricingEngineV2.mock.calls[0][0]
    const roleLine = engineArg.lines[0]

    expect(roleLine.lineType).toBe('role')

    if (roleLine.lineType === 'role') {
      expect(roleLine.hours).toBe(25)
    }
  })

  it('role override: excluded=true omits the line', async () => {
    mockedGetServiceBySku.mockResolvedValue(
      makeService({
        roleRecipe: [makeRoleLine(1), makeRoleLine(2)]
      })
    )

    const result = await expandServiceIntoQuoteLines({
      serviceSku: 'SVC-TEST-001',
      overrides: {
        roles: [{ lineOrder: 1, excluded: true }]
      }
    })

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].referenceId).toBe('sr-2')
  })

  it('tool override: quantity override wins', async () => {
    mockedGetServiceBySku.mockResolvedValue(
      makeService({
        toolRecipe: [makeToolLine(1, { quantity: 1 })]
      })
    )

    await expandServiceIntoQuoteLines({
      serviceSku: 'SVC-TEST-001',
      overrides: {
        tools: [{ lineOrder: 1, quantity: 7 }]
      }
    })

    const engineArg = mockedPricingEngineV2.mock.calls[0][0]
    const toolLine = engineArg.lines[0]

    expect(toolLine.lineType).toBe('tool')

    if (toolLine.lineType === 'tool') {
      expect(toolLine.quantity).toBe(7)
    }
  })

  it('tool override: excluded=true omits the line', async () => {
    mockedGetServiceBySku.mockResolvedValue(
      makeService({
        toolRecipe: [makeToolLine(1), makeToolLine(2)]
      })
    )

    const result = await expandServiceIntoQuoteLines({
      serviceSku: 'SVC-TEST-001',
      overrides: {
        tools: [{ lineOrder: 2, excluded: true }]
      }
    })

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].referenceId).toBe('tl-1')
  })

  it('monthly serviceUnit with defaultDurationMonths=6 yields periods=6 on role and tool pricing lines', async () => {
    mockedGetServiceBySku.mockResolvedValue(
      makeService({
        serviceUnit: 'monthly',
        defaultDurationMonths: 6,
        roleRecipe: [makeRoleLine(1)],
        toolRecipe: [makeToolLine(1)]
      })
    )

    await expandServiceIntoQuoteLines({ serviceSku: 'SVC-TEST-001' })

    const engineArg = mockedPricingEngineV2.mock.calls[0][0]

    for (const line of engineArg.lines) {
      if (line.lineType === 'role' || line.lineType === 'tool') {
        expect(line.periods).toBe(6)
      }
    }
  })

  it('project serviceUnit yields periods=1 regardless of defaultDurationMonths', async () => {
    mockedGetServiceBySku.mockResolvedValue(
      makeService({
        serviceUnit: 'project',
        defaultDurationMonths: 6,
        roleRecipe: [makeRoleLine(1)],
        toolRecipe: [makeToolLine(1)]
      })
    )

    await expandServiceIntoQuoteLines({ serviceSku: 'SVC-TEST-001' })

    const engineArg = mockedPricingEngineV2.mock.calls[0][0]

    for (const line of engineArg.lines) {
      if (line.lineType === 'role' || line.lineType === 'tool') {
        expect(line.periods).toBe(1)
      }
    }
  })

  it('commercialModelOverride wins over service.commercialModel', async () => {
    mockedGetServiceBySku.mockResolvedValue(
      makeService({
        commercialModel: 'on_demand',
        roleRecipe: [makeRoleLine(1)]
      })
    )

    await expandServiceIntoQuoteLines({
      serviceSku: 'SVC-TEST-001',
      commercialModelOverride: 'on_going'
    })

    const engineArg = mockedPricingEngineV2.mock.calls[0][0]

    expect(engineArg.commercialModel).toBe('on_going')
  })
})
