import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// ── Kysely mock ───────────────────────────────────────────────
// Las lecturas son via `(await getDb()).selectFrom(...).selectAll().execute()`.
// Mockeamos una builder chainable que captura el state y lo expone para
// assertions. Cada llamada a selectFrom retorna un nuevo builder.

type QueryBuilderState = {
  table: string
  whereClauses: Array<{ column: string; op: string; value: unknown }>
  orderClauses: Array<{ column: string; direction: 'asc' | 'desc' }>
}

let mockRowsByTable: Record<string, unknown[]> = {}
const capturedQueries: QueryBuilderState[] = []

const makeBuilder = (table: string): QueryBuilderState & Record<string, unknown> => {
  const state: QueryBuilderState = {
    table,
    whereClauses: [],
    orderClauses: []
  }

  const builder = {
    ...state,
    selectAll: () => builder,
    where: (column: string, op: string, value: unknown) => {
      state.whereClauses.push({ column, op, value })
      
return builder
    },
    orderBy: (column: string, direction: 'asc' | 'desc' = 'asc') => {
      state.orderClauses.push({ column, direction })
      
return builder
    },
    execute: async () => {
      capturedQueries.push({ ...state })
      const rows = mockRowsByTable[table] ?? []

      
return applyFilters(rows, state)
    },
    executeTakeFirst: async () => {
      capturedQueries.push({ ...state })
      const rows = mockRowsByTable[table] ?? []
      const filtered = applyFilters(rows, state)

      
return filtered[0] ?? undefined
    }
  }

  return builder as QueryBuilderState & Record<string, unknown>
}

const applyFilters = (rows: unknown[], state: QueryBuilderState) =>
  rows.filter(row =>
    state.whereClauses.every(clause => {
      const value = (row as Record<string, unknown>)[clause.column]

      
return clause.op === '=' ? value === clause.value : true
    })
  )

const mockDb = {
  selectFrom: (table: string) => makeBuilder(table)
}

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(async () => mockDb)
}))

import {
  listProductCategories,
  getProductCategoryByCode,
  getProductCategoryByHubspotValue,
  listProductUnits,
  getProductUnitByCode,
  getProductUnitByHubspotValue,
  listTaxCategories,
  getTaxCategoryByCode,
  getTaxCategoryByHubspotValue,
  listSourceKindMappings,
  getSourceKindMapping,
  resolveHubSpotProductType,
  __clearReferenceCacheForTests
} from './product-catalog-references'

// ── Seed fixtures ─────────────────────────────────────────────

const categoryRows = [
  {
    code: 'staff_augmentation',
    label_es: 'Staff Augmentation',
    label_en: 'Staff Augmentation',
    hubspot_option_value: 'Staff augmentation',
    active: true,
    display_order: 10
  },
  {
    code: 'retainer_ongoing',
    label_es: 'Retainer (On-Going)',
    label_en: 'Retainer (On-Going)',
    hubspot_option_value: 'Retainer (On-Going)',
    active: true,
    display_order: 30
  },
  {
    code: 'deprecated_x',
    label_es: 'Deprecada',
    label_en: null,
    hubspot_option_value: null,
    active: false,
    display_order: 999
  }
]

const unitRows = [
  {
    code: 'hora',
    label_es: 'Hora',
    label_en: 'Hour',
    hubspot_option_value: 'Hora',
    active: true,
    display_order: 10
  },
  {
    code: 'mes',
    label_es: 'Mes',
    label_en: 'Month',
    hubspot_option_value: 'Mes',
    active: true,
    display_order: 40
  }
]

const taxRows = [
  {
    code: 'standard_iva_19',
    label_es: 'IVA Chile 19%',
    label_en: 'VAT Chile 19%',
    hubspot_option_value: null,
    default_rate_pct: '0.1900',
    jurisdiction: 'CL',
    active: true,
    display_order: 10
  },
  {
    code: 'mx_iva_16',
    label_es: 'IVA México 16%',
    label_en: 'VAT Mexico 16%',
    hubspot_option_value: null,
    default_rate_pct: '0.1600',
    jurisdiction: 'MX',
    active: true,
    display_order: 20
  }
]

const sourceKindRows = [
  { source_kind: 'service', hubspot_product_type: 'service', notes: null },
  { source_kind: 'tool', hubspot_product_type: 'non_inventory', notes: null },
  { source_kind: 'manual', hubspot_product_type: 'service', notes: 'Default' }
]

beforeEach(() => {
  vi.clearAllMocks()
  capturedQueries.length = 0
  __clearReferenceCacheForTests()

  mockRowsByTable = {
    'greenhouse_commercial.product_categories': categoryRows,
    'greenhouse_commercial.product_units': unitRows,
    'greenhouse_finance.tax_categories': taxRows,
    'greenhouse_commercial.product_source_kind_mapping': sourceKindRows
  }
})

// ── Tests ─────────────────────────────────────────────────────

describe('product_categories readers', () => {
  it('list excludes inactive rows by default', async () => {
    const rows = await listProductCategories()

    expect(rows).toHaveLength(2)
    expect(rows.map(r => r.code)).toEqual(['staff_augmentation', 'retainer_ongoing'])
    expect(rows[0].hubspotOptionValue).toBe('Staff augmentation')

    // Verify WHERE active = true applied
    const query = capturedQueries[0]

    expect(query.whereClauses).toContainEqual({ column: 'active', op: '=', value: true })
  })

  it('list includes inactive when explicitly requested', async () => {
    const rows = await listProductCategories({ includeInactive: true })

    expect(rows).toHaveLength(3)
    expect(rows.find(r => r.code === 'deprecated_x')?.active).toBe(false)
  })

  it('getByCode returns the right row', async () => {
    const row = await getProductCategoryByCode('retainer_ongoing')

    expect(row?.labelEs).toBe('Retainer (On-Going)')
  })

  it('getByCode returns null for empty/unknown codes', async () => {
    expect(await getProductCategoryByCode('')).toBeNull()
    expect(await getProductCategoryByCode('does_not_exist')).toBeNull()
  })

  it('getByHubspotValue reverse-maps HS option to GH code', async () => {
    const row = await getProductCategoryByHubspotValue('Staff augmentation')

    expect(row?.code).toBe('staff_augmentation')
  })

  it('getByHubspotValue returns null when value missing', async () => {
    expect(await getProductCategoryByHubspotValue('')).toBeNull()
    expect(await getProductCategoryByHubspotValue('Unknown')).toBeNull()
  })

  it('caches list results within TTL (second call does not hit DB)', async () => {
    await listProductCategories()
    const queriesBefore = capturedQueries.length

    await listProductCategories()

    expect(capturedQueries.length).toBe(queriesBefore)
  })

  it('cache invalidation works with __clearReferenceCacheForTests', async () => {
    await listProductCategories()
    const queriesBefore = capturedQueries.length

    __clearReferenceCacheForTests()
    await listProductCategories()

    expect(capturedQueries.length).toBe(queriesBefore + 1)
  })
})

describe('product_units readers', () => {
  it('list returns ordered rows', async () => {
    const rows = await listProductUnits()

    expect(rows.map(r => r.code)).toEqual(['hora', 'mes'])
    expect(rows[0].hubspotOptionValue).toBe('Hora')
  })

  it('getByCode and getByHubspotValue are consistent', async () => {
    const byCode = await getProductUnitByCode('mes')
    const byHs = await getProductUnitByHubspotValue('Mes')

    expect(byCode?.code).toBe(byHs?.code)
  })
})

describe('tax_categories readers', () => {
  it('list filters by jurisdiction', async () => {
    const cl = await listTaxCategories({ jurisdiction: 'CL' })
    const mx = await listTaxCategories({ jurisdiction: 'MX' })

    expect(cl.map(r => r.code)).toEqual(['standard_iva_19'])
    expect(mx.map(r => r.code)).toEqual(['mx_iva_16'])
  })

  it('normalizes default_rate_pct from numeric string to number', async () => {
    const row = await getTaxCategoryByCode('standard_iva_19')

    expect(row?.defaultRatePct).toBe(0.19)
  })

  it('getByHubspotValue returns null when seeds have no hubspot mapping', async () => {
    // El seed Chile deja hubspot_option_value=NULL hasta que HS admin configure options.
    const row = await getTaxCategoryByHubspotValue('standard')

    expect(row).toBeNull()
  })
})

describe('source_kind_mapping readers', () => {
  it('list returns all mappings', async () => {
    const rows = await listSourceKindMappings()

    expect(rows).toHaveLength(3)
  })

  it('getSourceKindMapping returns correct hubspot_product_type', async () => {
    const row = await getSourceKindMapping('tool')

    expect(row?.hubspotProductType).toBe('non_inventory')
  })

  it('resolveHubSpotProductType returns mapped value for registered source_kind', async () => {
    expect(await resolveHubSpotProductType('service')).toBe('service')
    expect(await resolveHubSpotProductType('tool')).toBe('non_inventory')
  })

  it('resolveHubSpotProductType falls back to service for null/unknown', async () => {
    expect(await resolveHubSpotProductType(null)).toBe('service')
    expect(await resolveHubSpotProductType(undefined)).toBe('service')
    expect(await resolveHubSpotProductType('unknown_kind')).toBe('service')
  })
})
