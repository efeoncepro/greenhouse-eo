import 'server-only'

import type { PoolClient } from 'pg'

import {
  readSellableRoleForSync,
  type SellableRoleReadResult
} from '@/lib/commercial/product-catalog/source-readers'
import type { GhOwnedFieldsSnapshot } from '@/lib/commercial/product-catalog/types'
import {
  upsertProductCatalogFromSource,
  type UpsertProductCatalogFromSourceResult
} from '@/lib/commercial/product-catalog/upsert-product-catalog-from-source'

// TASK-546 Fase B — handler that materializes a sellable_role into the
// product_catalog. The role is always mapped to `product_type='service'`
// (staff_aug/consulting style) and `pricing_model='staff_aug'` regardless of
// category; the variant is encoded in `product_code` (ECG-xxx) and the
// business line surfaces via notes-derived mapping in future iterations.

const SELLABLE_ROLE_PRODUCT_TYPE = 'service' as const
const SELLABLE_ROLE_PRICING_MODEL = 'staff_aug' as const
const SELLABLE_ROLE_UNIT = 'hour' as const
const SELLABLE_ROLE_CURRENCY = 'USD' as const

const buildSellableRoleSnapshot = (
  role: SellableRoleReadResult
): GhOwnedFieldsSnapshot => ({
  product_code: role.roleSku,
  product_name: role.roleLabelEs,
  description: role.notes,
  default_unit_price: role.hourlyPriceUsd,
  default_currency: SELLABLE_ROLE_CURRENCY,
  default_unit: SELLABLE_ROLE_UNIT,
  product_type: SELLABLE_ROLE_PRODUCT_TYPE,
  pricing_model: SELLABLE_ROLE_PRICING_MODEL,
  business_line_code: null,
  is_archived: !role.active
})

export interface HandleSellableRoleToProductResult {
  status: 'applied' | 'skipped_not_found'
  result?: UpsertProductCatalogFromSourceResult
}

export const handleSellableRoleToProduct = async (
  client: PoolClient,
  roleId: string
): Promise<HandleSellableRoleToProductResult> => {
  const role = await readSellableRoleForSync(client, roleId)

  if (!role) {
    return { status: 'skipped_not_found' }
  }

  const snapshot = buildSellableRoleSnapshot(role)

  const result = await upsertProductCatalogFromSource(client, {
    sourceKind: 'sellable_role',
    sourceId: role.roleId,
    sourceVariantKey: null,
    snapshot
  })

  return { status: 'applied', result }
}

// Export the mapper for tests that want to assert the snapshot shape without
// going through Postgres.
export const __buildSellableRoleSnapshot = buildSellableRoleSnapshot
