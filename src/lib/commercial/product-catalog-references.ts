import 'server-only'

import type { Selectable } from 'kysely'

import { getDb } from '@/lib/db'

import type { DB } from '@/types/db'

type ProductCategoryRow = Selectable<DB['greenhouse_commercial.product_categories']>
type ProductUnitRow = Selectable<DB['greenhouse_commercial.product_units']>
type TaxCategoryRow = Selectable<DB['greenhouse_finance.tax_categories']>
type SourceKindMappingRow = Selectable<DB['greenhouse_commercial.product_source_kind_mapping']>

// ─────────────────────────────────────────────────────────────
// TASK-601 Fase A — Readers para tablas de referencia del catálogo.
//
// Cache: TTL 60s en memoria. Las 4 tablas son vocabularios cortos y estables
// (seeds fijos, cambios esporádicos). El cache evita un round-trip por cada
// outbound event y se invalida naturalmente al vencer el TTL — los cambios
// admin se reflejan en ≤60s.
//
// No se provee invalidación manual en esta fase; si TASK-605 (admin UI) agrega
// CRUD, puede exponer un helper `invalidateReferenceCache(namespace)`.
// ─────────────────────────────────────────────────────────────

export interface ProductCategory {
  code: string
  labelEs: string
  labelEn: string | null
  hubspotOptionValue: string | null
  active: boolean
  displayOrder: number | null
}

export interface ProductUnit {
  code: string
  labelEs: string
  labelEn: string | null
  hubspotOptionValue: string | null
  active: boolean
  displayOrder: number | null
}

export interface TaxCategory {
  code: string
  labelEs: string
  labelEn: string | null
  hubspotOptionValue: string | null
  defaultRatePct: number | null
  jurisdiction: string
  active: boolean
  displayOrder: number | null
}

export interface SourceKindMapping {
  sourceKind: string
  hubspotProductType: string
  notes: string | null
}

// ── Cache helper (local; no hay helper genérico en el repo) ──────

const CACHE_TTL_MS = 60_000

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

const cacheStore = new Map<string, CacheEntry<unknown>>()

const withMemoryCache = async <T>(key: string, loader: () => Promise<T>): Promise<T> => {
  const now = Date.now()
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined

  if (entry && entry.expiresAt > now) {
    return entry.value
  }

  const value = await loader()

  cacheStore.set(key, { expiresAt: now + CACHE_TTL_MS, value })

  return value
}

/**
 * Clears the in-memory cache for reference table readers. Exported for tests
 * and for future admin workflows that mutate seeds at runtime.
 */
export const __clearReferenceCacheForTests = () => {
  cacheStore.clear()
}

// ── Normalizers ───────────────────────────────────────────────

const toNumber = (value: string | number | null): number | null => {
  if (value === null) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  
return Number.isFinite(parsed) ? parsed : null
}

const mapProductCategory = (row: ProductCategoryRow): ProductCategory => ({
  code: row.code,
  labelEs: row.label_es,
  labelEn: row.label_en,
  hubspotOptionValue: row.hubspot_option_value,
  active: row.active,
  displayOrder: row.display_order
})

const mapProductUnit = (row: ProductUnitRow): ProductUnit => ({
  code: row.code,
  labelEs: row.label_es,
  labelEn: row.label_en,
  hubspotOptionValue: row.hubspot_option_value,
  active: row.active,
  displayOrder: row.display_order
})

const mapTaxCategory = (row: TaxCategoryRow): TaxCategory => ({
  code: row.code,
  labelEs: row.label_es,
  labelEn: row.label_en,
  hubspotOptionValue: row.hubspot_option_value,
  defaultRatePct: toNumber(row.default_rate_pct as string | null),
  jurisdiction: row.jurisdiction,
  active: row.active,
  displayOrder: row.display_order
})

const mapSourceKindMapping = (row: SourceKindMappingRow): SourceKindMapping => ({
  sourceKind: row.source_kind,
  hubspotProductType: row.hubspot_product_type,
  notes: row.notes
})

// ── product_categories ────────────────────────────────────────

export const listProductCategories = async (options: { includeInactive?: boolean } = {}) =>
  withMemoryCache(`product_categories:all:${options.includeInactive ? '1' : '0'}`, async () => {
    const db = await getDb()
    let query = db
      .selectFrom('greenhouse_commercial.product_categories')
      .selectAll()
      .orderBy('display_order', 'asc')
      .orderBy('code', 'asc')

    if (!options.includeInactive) {
      query = query.where('active', '=', true)
    }

    const rows = await query.execute()

    
return rows.map(mapProductCategory)
  })

export const getProductCategoryByCode = async (code: string): Promise<ProductCategory | null> => {
  const trimmed = code.trim()

  if (!trimmed) return null

  return withMemoryCache(`product_categories:code:${trimmed}`, async () => {
    const db = await getDb()

    const row = await db
      .selectFrom('greenhouse_commercial.product_categories')
      .selectAll()
      .where('code', '=', trimmed)
      .executeTakeFirst()

    return row ? mapProductCategory(row) : null
  })
}

export const getProductCategoryByHubspotValue = async (
  value: string
): Promise<ProductCategory | null> => {
  const trimmed = value.trim()

  if (!trimmed) return null

  return withMemoryCache(`product_categories:hubspot:${trimmed}`, async () => {
    const db = await getDb()

    const row = await db
      .selectFrom('greenhouse_commercial.product_categories')
      .selectAll()
      .where('hubspot_option_value', '=', trimmed)
      .where('active', '=', true)
      .executeTakeFirst()

    return row ? mapProductCategory(row) : null
  })
}

// ── product_units ─────────────────────────────────────────────

export const listProductUnits = async (options: { includeInactive?: boolean } = {}) =>
  withMemoryCache(`product_units:all:${options.includeInactive ? '1' : '0'}`, async () => {
    const db = await getDb()
    let query = db
      .selectFrom('greenhouse_commercial.product_units')
      .selectAll()
      .orderBy('display_order', 'asc')
      .orderBy('code', 'asc')

    if (!options.includeInactive) {
      query = query.where('active', '=', true)
    }

    const rows = await query.execute()

    
return rows.map(mapProductUnit)
  })

export const getProductUnitByCode = async (code: string): Promise<ProductUnit | null> => {
  const trimmed = code.trim()

  if (!trimmed) return null

  return withMemoryCache(`product_units:code:${trimmed}`, async () => {
    const db = await getDb()

    const row = await db
      .selectFrom('greenhouse_commercial.product_units')
      .selectAll()
      .where('code', '=', trimmed)
      .executeTakeFirst()

    return row ? mapProductUnit(row) : null
  })
}

export const getProductUnitByHubspotValue = async (
  value: string
): Promise<ProductUnit | null> => {
  const trimmed = value.trim()

  if (!trimmed) return null

  return withMemoryCache(`product_units:hubspot:${trimmed}`, async () => {
    const db = await getDb()

    const row = await db
      .selectFrom('greenhouse_commercial.product_units')
      .selectAll()
      .where('hubspot_option_value', '=', trimmed)
      .where('active', '=', true)
      .executeTakeFirst()

    return row ? mapProductUnit(row) : null
  })
}

// ── tax_categories ────────────────────────────────────────────

export const listTaxCategories = async (
  options: { includeInactive?: boolean; jurisdiction?: string } = {}
) => {
  const jurisdictionKey = options.jurisdiction?.trim().toUpperCase() ?? 'ALL'
  const cacheKey = `tax_categories:all:${options.includeInactive ? '1' : '0'}:${jurisdictionKey}`

  return withMemoryCache(cacheKey, async () => {
    const db = await getDb()
    let query = db
      .selectFrom('greenhouse_finance.tax_categories')
      .selectAll()
      .orderBy('display_order', 'asc')
      .orderBy('code', 'asc')

    if (!options.includeInactive) {
      query = query.where('active', '=', true)
    }

    if (jurisdictionKey !== 'ALL') {
      query = query.where('jurisdiction', '=', jurisdictionKey)
    }

    const rows = await query.execute()

    
return rows.map(mapTaxCategory)
  })
}

export const getTaxCategoryByCode = async (code: string): Promise<TaxCategory | null> => {
  const trimmed = code.trim()

  if (!trimmed) return null

  return withMemoryCache(`tax_categories:code:${trimmed}`, async () => {
    const db = await getDb()

    const row = await db
      .selectFrom('greenhouse_finance.tax_categories')
      .selectAll()
      .where('code', '=', trimmed)
      .executeTakeFirst()

    return row ? mapTaxCategory(row) : null
  })
}

export const getTaxCategoryByHubspotValue = async (
  value: string
): Promise<TaxCategory | null> => {
  const trimmed = value.trim()

  if (!trimmed) return null

  return withMemoryCache(`tax_categories:hubspot:${trimmed}`, async () => {
    const db = await getDb()

    const row = await db
      .selectFrom('greenhouse_finance.tax_categories')
      .selectAll()
      .where('hubspot_option_value', '=', trimmed)
      .where('active', '=', true)
      .executeTakeFirst()

    return row ? mapTaxCategory(row) : null
  })
}

// ── product_source_kind_mapping ──────────────────────────────

export const listSourceKindMappings = async () =>
  withMemoryCache('product_source_kind_mapping:all', async () => {
    const db = await getDb()

    const rows = await db
      .selectFrom('greenhouse_commercial.product_source_kind_mapping')
      .selectAll()
      .orderBy('source_kind', 'asc')
      .execute()

    return rows.map(mapSourceKindMapping)
  })

export const getSourceKindMapping = async (
  sourceKind: string
): Promise<SourceKindMapping | null> => {
  const trimmed = sourceKind.trim()

  if (!trimmed) return null

  return withMemoryCache(`product_source_kind_mapping:kind:${trimmed}`, async () => {
    const db = await getDb()

    const row = await db
      .selectFrom('greenhouse_commercial.product_source_kind_mapping')
      .selectAll()
      .where('source_kind', '=', trimmed)
      .executeTakeFirst()

    return row ? mapSourceKindMapping(row) : null
  })
}

/**
 * Convenience resolver used by the outbound projection (TASK-603 Fase C):
 * given a Greenhouse `source_kind`, returns the canonical HubSpot product type
 * (`service` | `inventory` | `non_inventory`). Falls back to `'service'` if
 * the source_kind is not registered — matches the `manual` default in the seed.
 */
export const resolveHubSpotProductType = async (sourceKind: string | null | undefined) => {
  if (!sourceKind) return 'service'
  const mapping = await getSourceKindMapping(sourceKind)

  
return mapping?.hubspotProductType ?? 'service'
}
