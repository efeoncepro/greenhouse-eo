import 'server-only'

import { listCommercialProductCatalog } from '@/lib/commercial/product-catalog-store'
import { query } from '@/lib/db'

// ─────────────────────────────────────────────────────────────
// TASK-605 Fase E — Server-side data loaders for admin product
// catalog surface. Kept local to the view so the API route is
// not required for SSR (the API is still available for client-side
// refresh + mutations).
// ─────────────────────────────────────────────────────────────

interface DriftCountRow extends Record<string, unknown> {
  product_id: string
  drifted_count: string | number
  last_scanned_at: string | Date | null
}

export interface ProductCatalogListItem {
  productId: string
  productCode: string
  productName: string
  businessLineCode: string | null
  defaultCurrency: string
  defaultUnitPrice: number | null
  productType: string
  sourceKind: string | null
  isArchived: boolean
  syncStatus: string
  hubspotProductId: string | null
  lastOutboundSyncAt: string | null
  driftedFieldsCount: number
  lastDriftScannedAt: string | null
}

export interface ProductCatalogListData {
  items: ProductCatalogListItem[]
  total: number
}

export const getProductCatalogListData = async (): Promise<ProductCatalogListData> => {
  const catalog = await listCommercialProductCatalog({ includeArchived: true, limit: 500 })

  const productIds = catalog.items.map(item => item.productId)
  const driftByProduct = new Map<string, { count: number; scannedAt: string | null }>()

  if (productIds.length > 0) {
    const driftRows = await query<DriftCountRow>(
      `WITH latest AS (
         SELECT DISTINCT ON (
                   COALESCE((notes::jsonb ->> 'productId'), NULL)
                 )
                COALESCE((notes::jsonb ->> 'productId'), '')         AS product_id,
                COALESCE(jsonb_array_length(notes::jsonb -> 'driftedFields'), 0) AS drifted_count,
                finished_at                                          AS last_scanned_at
           FROM greenhouse_sync.source_sync_runs
          WHERE source_system = 'product_drift_v2'
          ORDER BY COALESCE((notes::jsonb ->> 'productId'), ''), finished_at DESC
       )
       SELECT product_id, drifted_count, last_scanned_at
         FROM latest
        WHERE product_id = ANY($1::text[])`,
      [productIds]
    )

    for (const row of driftRows) {
      const count = typeof row.drifted_count === 'number' ? row.drifted_count : Number(row.drifted_count)

      const scanned = row.last_scanned_at instanceof Date
        ? row.last_scanned_at.toISOString()
        : row.last_scanned_at

      driftByProduct.set(row.product_id, {
        count: Number.isFinite(count) ? count : 0,
        scannedAt: typeof scanned === 'string' ? scanned : null
      })
    }
  }

  const items: ProductCatalogListItem[] = catalog.items.map(item => {
    const drift = driftByProduct.get(item.productId)

    return {
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      businessLineCode: item.businessLineCode,
      defaultCurrency: item.defaultCurrency,
      defaultUnitPrice: item.defaultUnitPrice,
      productType: item.productType,
      sourceKind: item.sourceKind,
      isArchived: item.isArchived,
      syncStatus: item.syncStatus,
      hubspotProductId: item.hubspotProductId,
      lastOutboundSyncAt: item.lastOutboundSyncAt,
      driftedFieldsCount: drift?.count ?? 0,
      lastDriftScannedAt: drift?.scannedAt ?? null
    }
  })

  return { items, total: catalog.total }
}
