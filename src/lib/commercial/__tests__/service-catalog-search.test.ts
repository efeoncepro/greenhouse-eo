import { beforeEach, describe, expect, it, vi } from 'vitest'

import { searchServiceCatalog } from '../service-catalog-search'
import { listServiceCatalog, type ServiceCatalogEntry } from '../service-catalog-store'

vi.mock('../service-catalog-store', () => ({
  listServiceCatalog: vi.fn()
}))

const entry = (over: Partial<ServiceCatalogEntry>): ServiceCatalogEntry => ({
  moduleId: over.serviceSku ?? 'm',
  moduleCode: over.moduleCode ?? 'mod',
  moduleName: over.moduleName ?? 'Servicio',
  serviceSku: over.serviceSku ?? 'EFG-000',
  serviceCategory: over.serviceCategory ?? null,
  displayName: over.displayName ?? null,
  serviceUnit: 'project',
  serviceType: null,
  commercialModel: 'on_demand',
  tier: '2',
  defaultDurationMonths: null,
  defaultDescription: null,
  businessLineCode: null,
  active: true,
  createdAt: '',
  updatedAt: '',
  roleRecipeCount: over.roleRecipeCount ?? 1,
  toolRecipeCount: over.toolRecipeCount ?? 0
})

const mockedList = vi.mocked(listServiceCatalog)

describe('searchServiceCatalog', () => {
  beforeEach(() => {
    mockedList.mockReset()
  })

  it('returns empty for blank query without hitting the catalog', async () => {
    expect(await searchServiceCatalog('   ')).toEqual([])
    expect(mockedList).not.toHaveBeenCalled()
  })

  it('ranks exact > prefix > substring', async () => {
    mockedList.mockResolvedValue([
      entry({ serviceSku: 'EFG-1', displayName: 'Campaña con Diseño Digital incluido' }), // substring
      entry({ serviceSku: 'EFG-2', displayName: 'Diseño Digital' }), // exact
      entry({ serviceSku: 'EFG-3', displayName: 'Diseño Digital Avanzado' }) // prefix
    ])

    const results = await searchServiceCatalog('diseño digital')

    expect(results.map(r => r.serviceSku)).toEqual(['EFG-2', 'EFG-3', 'EFG-1'])
    expect(results[0].name).toBe('Diseño Digital')
  })

  it('matches by serviceSku and falls back to moduleName when no displayName', async () => {
    mockedList.mockResolvedValue([entry({ serviceSku: 'EFG-7', displayName: null, moduleName: 'Branding Pack' })])

    expect((await searchServiceCatalog('EFG-7'))[0].name).toBe('Branding Pack')
    expect((await searchServiceCatalog('branding')).map(r => r.serviceSku)).toEqual(['EFG-7'])
  })

  it('excludes services without a recipe (not priceable) by default', async () => {
    mockedList.mockResolvedValue([
      entry({ serviceSku: 'EFG-8', displayName: 'Diseño Digital', roleRecipeCount: 0, toolRecipeCount: 0 })
    ])

    expect(await searchServiceCatalog('diseño')).toEqual([])
    expect((await searchServiceCatalog('diseño', { includeUnpriceable: true }))[0].priceable).toBe(false)
  })

  it('returns multiple candidates for elicitation and honors limit', async () => {
    mockedList.mockResolvedValue([
      entry({ serviceSku: 'EFG-1', displayName: 'Diseño Digital Básico' }),
      entry({ serviceSku: 'EFG-2', displayName: 'Diseño Digital Full' }),
      entry({ serviceSku: 'EFG-3', displayName: 'Diseño Digital Express' })
    ])

    expect(await searchServiceCatalog('diseño digital')).toHaveLength(3)
    expect(await searchServiceCatalog('diseño digital', { limit: 2 })).toHaveLength(2)
  })
})
