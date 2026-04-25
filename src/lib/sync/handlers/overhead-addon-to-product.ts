import 'server-only'

import type { PoolClient } from 'pg'

import {
  readOverheadAddonForSync,
  type OverheadAddonReadResult
} from '@/lib/commercial/product-catalog/source-readers'
import type { GhOwnedFieldsSnapshot } from '@/lib/commercial/product-catalog/types'
import {
  upsertProductCatalogFromSource,
  type UpsertProductCatalogFromSourceResult
} from '@/lib/commercial/product-catalog/upsert-product-catalog-from-source'

// TASK-546 Fase B — overhead_addons → product_catalog.
//
// Spec §4.2 says "only materialize if visibleToClient=true". We treat a
// NOT-visible addon as "not eligible for product_catalog" — the handler
// returns `skipped_not_visible` without upserting. If the addon was
// previously visible and flipped, the store publishes a `.deactivated` event
// which the handler reads as visibleToClient=false + active=true and
// materializes with `is_archived=true`.
//
// Product type mapping: overhead addons are surfaced as services (they sell
// to clients as part of a quote). Pricing model `fixed` for consistency with
// tools; more granularity can come from follow-up if needed.

const OVERHEAD_ADDON_PRODUCT_TYPE = 'service' as const
const OVERHEAD_ADDON_PRICING_MODEL = 'fixed' as const
const OVERHEAD_ADDON_UNIT = 'unit' as const
const OVERHEAD_ADDON_CURRENCY = 'USD' as const

const allowedUnit = (raw: string | null): 'hour' | 'month' | 'unit' | 'project' => {
  if (!raw) return OVERHEAD_ADDON_UNIT
  const normalized = raw.trim().toLowerCase()

  if (normalized === 'hour' || normalized === 'month' || normalized === 'project') {
    return normalized
  }

  return OVERHEAD_ADDON_UNIT
}

const buildOverheadAddonSnapshot = (
  addon: OverheadAddonReadResult
): GhOwnedFieldsSnapshot => ({
  product_code: addon.addonSku,
  product_name: addon.addonName,
  description: addon.description,
  default_unit_price: addon.finalPriceUsd,
  default_currency: OVERHEAD_ADDON_CURRENCY,
  default_unit: allowedUnit(addon.unit),
  product_type: OVERHEAD_ADDON_PRODUCT_TYPE,
  pricing_model: OVERHEAD_ADDON_PRICING_MODEL,
  business_line_code: null,

  // Archive if EITHER the addon itself is inactive OR it was hidden from the
  // client. This keeps downstream consumers (quote builder) from surfacing
  // products that shouldn't appear in quotes.
  is_archived: !addon.active || !addon.visibleToClient
})

export interface HandleOverheadAddonToProductResult {
  status: 'applied' | 'skipped_not_found'
  result?: UpsertProductCatalogFromSourceResult
}

export const handleOverheadAddonToProduct = async (
  client: PoolClient,
  addonId: string
): Promise<HandleOverheadAddonToProductResult> => {
  const addon = await readOverheadAddonForSync(client, addonId)

  if (!addon) {
    return { status: 'skipped_not_found' }
  }

  const snapshot = buildOverheadAddonSnapshot(addon)

  const result = await upsertProductCatalogFromSource(client, {
    sourceKind: 'overhead_addon',
    sourceId: addon.addonId,
    sourceVariantKey: null,
    snapshot
  })

  return { status: 'applied', result }
}

export const __buildOverheadAddonSnapshot = buildOverheadAddonSnapshot
