import 'server-only'

import type { PoolClient } from 'pg'

import {
  readToolForSync,
  type ToolReadResult
} from '@/lib/commercial/product-catalog/source-readers'
import type { GhOwnedFieldsSnapshot } from '@/lib/commercial/product-catalog/types'
import {
  upsertProductCatalogFromSource,
  type UpsertProductCatalogFromSourceResult
} from '@/lib/commercial/product-catalog/upsert-product-catalog-from-source'

// TASK-546 Fase B — tool_catalog → product_catalog.
//
// Decision: spec §4.2 says "only materialize if sellable=true". The
// tool_catalog schema has no `sellable` column. We interpret sellable as
// `tool_sku IS NOT NULL AND is_active=true`. The sku is generated lazily by
// the store when the tool is first marked sellable, so this predicate is the
// same thing the addon/service catalogs rely on.
//
// When the tool is NOT sellable (no sku) the reader returns null and we skip.
// When the tool has a sku but `is_active=false`, we still materialize but
// with `is_archived=true`.

const TOOL_PRODUCT_TYPE = 'license' as const
const TOOL_PRICING_MODEL = 'fixed' as const
const TOOL_UNIT = 'month' as const
const TOOL_CURRENCY = 'USD' as const

const buildToolSnapshot = (tool: ToolReadResult): GhOwnedFieldsSnapshot => ({
  product_code: tool.toolSku,
  product_name: tool.toolName,
  description: tool.description,
  default_unit_price: tool.proratedPriceUsd,
  default_currency: TOOL_CURRENCY,
  default_unit: TOOL_UNIT,
  product_type: TOOL_PRODUCT_TYPE,
  pricing_model: TOOL_PRICING_MODEL,

  // Tools can apply to multiple business lines; pick the first for the
  // canonical field. Drift detection can surface when the set changes.
  business_line_code: tool.applicableBusinessLines[0] ?? null,
  is_archived: !tool.isActive
})

export interface HandleToolToProductResult {
  status: 'applied' | 'skipped_not_sellable'
  result?: UpsertProductCatalogFromSourceResult
}

export const handleToolToProduct = async (
  client: PoolClient,
  toolId: string
): Promise<HandleToolToProductResult> => {
  const tool = await readToolForSync(client, toolId)

  // Skip when the tool is not sellable (no sku). The product_catalog row
  // should not be created — and if one exists from a previous sellable state
  // (unlikely without a sku), the drift cron in TASK-548 will flag it.
  if (!tool) {
    return { status: 'skipped_not_sellable' }
  }

  const snapshot = buildToolSnapshot(tool)

  const result = await upsertProductCatalogFromSource(client, {
    sourceKind: 'tool',
    sourceId: tool.toolId,
    sourceVariantKey: null,
    snapshot
  })

  return { status: 'applied', result }
}

export const __buildToolSnapshot = buildToolSnapshot
