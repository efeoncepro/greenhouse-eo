import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'

vi.mock('@/lib/commercial/service-catalog-search', () => ({ searchServiceCatalog: vi.fn() }))
vi.mock('@/lib/finance/pricing/simulate-quote-pricing', () => ({ simulateQuotePricingFromService: vi.fn() }))

import { searchServiceCatalog } from '@/lib/commercial/service-catalog-search'
import { simulateQuotePricingFromService } from '@/lib/finance/pricing/simulate-quote-pricing'

import { executeNexaTool, getNexaToolDeclarations } from './nexa-tools'
import type { NexaRuntimeContext } from './nexa-contract'

const base: NexaRuntimeContext = {
  userId: 'u1',
  clientId: '',
  clientName: '',
  tenantType: 'efeonce_internal',
  role: 'x',
  roleCodes: [],
  routeGroups: [],
  timezone: 'America/Santiago'
}

const internalTenant: NexaRuntimeContext = {
  ...base,
  tenantType: 'efeonce_internal',
  roleCodes: [ROLE_CODES.FINANCE_ADMIN],
  routeGroups: ['commercial']
}

const clientTenant: NexaRuntimeContext = {
  ...base,
  tenantType: 'client',
  clientId: 'c1',
  clientName: 'Globe Co',
  roleCodes: [],
  routeGroups: ['client']
}

const candidate = (sku: string, name: string) => ({
  serviceSku: sku,
  name,
  serviceCategory: null,
  tier: '2' as const,
  commercialModel: 'on_demand' as const,
  priceable: true
})

const simulation = (audience: 'internal' | 'client' | 'public') => ({
  service: { serviceSku: 'EFG-9', name: 'Diseño Digital' },
  pricing: {
    lines: [],
    addons: [],
    totals: { subtotalUsd: 0, overheadUsd: 0, totalUsd: 0, totalOutputCurrency: 1200000, exchangeRateUsed: 1 },
    aggregateMargin: audience === 'internal' ? { marginPct: 58, classification: 'healthy' as const } : undefined,
    warnings: [],
    structuredWarnings: []
  },
  estimate: {
    binding: false as const,
    currency: 'CLP' as const,
    calculatedAt: '2026-06-21',
    disclaimer: 'Estimado referencial... no constituye una oferta vinculante.'
  }
})

const mockedSearch = vi.mocked(searchServiceCatalog)
const mockedSim = vi.mocked(simulateQuotePricingFromService)

describe('quote_price Nexa tool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedSim.mockImplementation(async (_input, ctx) => simulation(ctx.audience) as never)
  })

  it('is available to internal commercial and to client tenants', () => {
    const internalNames = getNexaToolDeclarations(internalTenant).map(d => d.name)
    const clientNames = getNexaToolDeclarations(clientTenant).map(d => d.name)

    expect(internalNames).toContain('quote_price')
    expect(clientNames).toContain('quote_price')
  })

  it('says it cannot find the service instead of inventing a price', async () => {
    mockedSearch.mockResolvedValue([])

    const { result } = await executeNexaTool({
      toolCallId: 't',
      toolName: 'quote_price',
      args: { service: 'catering' },
      context: internalTenant
    })

    expect(result.summary).toContain('No encontré')
    expect(result.raw?.matches).toBe(0)
    expect(mockedSim).not.toHaveBeenCalled()
  })

  it('asks for clarification when the name is ambiguous', async () => {
    mockedSearch.mockResolvedValue([candidate('EFG-1', 'Diseño Digital Básico'), candidate('EFG-2', 'Diseño Digital Full')])

    const { result } = await executeNexaTool({
      toolCallId: 't',
      toolName: 'quote_price',
      args: { service: 'diseño digital' },
      context: internalTenant
    })

    expect(result.summary).toContain('¿A cuál te refieres?')
    expect(result.metrics).toHaveLength(2)
    expect(mockedSim).not.toHaveBeenCalled()
  })

  it('internal: returns estimate with margin metric', async () => {
    mockedSearch.mockResolvedValue([candidate('EFG-9', 'Diseño Digital')])

    const { result } = await executeNexaTool({
      toolCallId: 't',
      toolName: 'quote_price',
      args: { service: 'Diseño Digital', currency: 'CLP' },
      context: internalTenant
    })

    expect(mockedSim).toHaveBeenCalledWith(
      { serviceSku: 'EFG-9', outputCurrency: 'CLP' },
      { audience: 'internal', costStackVisible: true }
    )
    expect(result.summary).toContain('estimado referencial')
    expect(result.metrics.some(m => m.label === 'Margen')).toBe(true)
  })

  it('client: returns estimate WITHOUT margin metric', async () => {
    mockedSearch.mockResolvedValue([candidate('EFG-9', 'Diseño Digital')])

    const { result } = await executeNexaTool({
      toolCallId: 't',
      toolName: 'quote_price',
      args: { service: 'Diseño Digital' },
      context: clientTenant
    })

    expect(mockedSim).toHaveBeenCalledWith(
      { serviceSku: 'EFG-9', outputCurrency: 'USD' },
      { audience: 'client', costStackVisible: false }
    )
    expect(result.metrics.some(m => m.label === 'Margen')).toBe(false)
    expect(result.scopeLabel).toContain('cliente')
  })
})
