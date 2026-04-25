import 'server-only'

import type { ProductSourceKind } from './types'

/**
 * Canonical fallback values per source_kind when the underlying source
 * catalog row does not project category/unit/business_line into
 * `product_catalog`. Keyed by source_kind; applied at outbound time by the
 * HubSpot payload adapter when the snapshot field is null.
 *
 * Values chosen from the REAL option sets fetched from portal 48713323
 * (2026-04-24). Updating these values requires coordinating with portal
 * admins since `categoria_de_item` and `unidad` are local enums.
 *
 * `taxCategoryCode` is intentionally always null — `hs_tax_category` uses
 * `externalOptions: true` and requires the HubSpot Taxation add-on, which
 * is not enabled on portal 48713323. Adapter omits it from outbound.
 */
export interface SourceKindDefaults {
  categoryCode: string | null
  unitCode: string | null
  businessLineCode: string | null
  hubspotProductType: 'inventory' | 'non_inventory' | 'service'
}

export const SOURCE_KIND_DEFAULTS: Record<ProductSourceKind, SourceKindDefaults> = {
  sellable_role: {
    categoryCode: 'Staff augmentation',
    unitCode: 'Hora',
    businessLineCode: null,
    hubspotProductType: 'service'
  },
  sellable_role_variant: {
    categoryCode: 'Staff augmentation',
    unitCode: 'Hora',
    businessLineCode: null,
    hubspotProductType: 'service'
  },
  service: {
    categoryCode: 'Proyecto o Implementación',
    unitCode: 'Proyecto',
    businessLineCode: null,
    hubspotProductType: 'service'
  },
  overhead_addon: {
    categoryCode: 'Retainer (On-Going)',
    unitCode: 'Mes',
    businessLineCode: 'efeonce',
    hubspotProductType: 'non_inventory'
  },
  tool: {
    categoryCode: 'Licencia / Acceso Tecnológico',
    unitCode: 'Licencia',
    businessLineCode: null,
    hubspotProductType: 'non_inventory'
  },
  manual: {
    categoryCode: null,
    unitCode: null,
    businessLineCode: null,
    hubspotProductType: 'service'
  },
  hubspot_imported: {
    categoryCode: null,
    unitCode: null,
    businessLineCode: null,
    hubspotProductType: 'service'
  }
}

/**
 * Normalizes free-text `business_line` values to the canonical lowercase set
 * used consistently across all products. Observed noise in portal data:
 * "Globe", "globe", "Wave / Reach", "Efeonce / Globe / Wave / Reach".
 *
 * Returns null if the input does not match any known business line.
 */
const BUSINESS_LINE_ALIASES: Record<string, string> = {
  globe: 'globe',
  wave: 'wave',
  reach: 'reach',
  efeonce: 'efeonce'
}

export const normalizeBusinessLineCode = (
  raw: string | null | undefined
): string | null => {
  if (!raw) return null
  const trimmed = raw.trim().toLowerCase()

  if (!trimmed) return null

  // Handle compound values like "globe, wave, reach" → pick first matching
  const parts = trimmed.split(/[\/,;|]+/).map(p => p.trim()).filter(Boolean)

  for (const part of parts) {
    if (BUSINESS_LINE_ALIASES[part]) return BUSINESS_LINE_ALIASES[part]
  }

  return BUSINESS_LINE_ALIASES[trimmed] ?? null
}
