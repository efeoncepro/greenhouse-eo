import { NextResponse } from 'next/server'

import { listCommercialProductCatalog } from '@/lib/commercial/product-catalog-store'
import type { ProductSourceKind } from '@/lib/commercial/product-catalog/types'
import { query } from '@/lib/db'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────
// TASK-605 Fase E — Admin API: list product catalog.
//
// Lightweight list endpoint consumed by the admin surface at
// `/admin/commercial/product-catalog`. Filters + pagination + drift
// counts per product (from source_sync_runs product_drift_v2). No joins
// to prices table — UI pulls prices lazily per-row on detail view.
// ─────────────────────────────────────────────────────────────

interface DriftCountRow extends Record<string, unknown> {
  product_id: string
  drifted_count: string | number
  last_scanned_at: string | Date | null
}

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

const parseBoolean = (value: string | null): boolean | null => {
  if (value === null) return null
  const lower = value.toLowerCase()

  if (lower === 'true' || lower === '1') return true
  if (lower === 'false' || lower === '0') return false

  return null
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || undefined
  const businessLineCode = searchParams.get('businessLineCode') || undefined
  const sourceKind = (searchParams.get('sourceKind') as ProductSourceKind | null) || undefined
  const includeArchived = parseBoolean(searchParams.get('includeArchived')) ?? false
  const activeFilter = parseBoolean(searchParams.get('active'))
  const limit = Math.min(500, parsePositiveInt(searchParams.get('limit'), 100))
  const offset = Math.max(0, parsePositiveInt(searchParams.get('offset'), 0) - 1 + 1)

  const catalog = await listCommercialProductCatalog({
    search,
    businessLineCode,
    sourceKind,
    includeArchived,
    active: activeFilter,
    limit,
    offset
  })

  // Enrich with latest drift report count per product. One query for the
  // full page — avoids N+1. Reads the most recent product_drift_v2 run per
  // product from source_sync_runs.notes JSON.
  const productIds = catalog.items.map(item => item.productId)
  const driftByProduct = new Map<string, { driftedCount: number; lastScannedAt: string | null }>()

  if (productIds.length > 0) {
    const driftRows = await query<DriftCountRow>(
      `WITH latest AS (
         SELECT DISTINCT ON (
                   COALESCE(
                     (notes::jsonb ->> 'productId'),
                     NULL
                   )
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
        driftedCount: Number.isFinite(count) ? count : 0,
        lastScannedAt: typeof scanned === 'string' ? scanned : null
      })
    }
  }

  const items = catalog.items.map(item => {
    const drift = driftByProduct.get(item.productId)

    return {
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      businessLineCode: item.businessLineCode,
      defaultCurrency: item.defaultCurrency,
      defaultUnitPrice: item.defaultUnitPrice,
      defaultUnit: item.defaultUnit,
      productType: item.productType,
      sourceKind: item.sourceKind,
      isArchived: item.isArchived,
      syncStatus: item.syncStatus,
      hubspotProductId: item.hubspotProductId,
      lastOutboundSyncAt: item.lastOutboundSyncAt,
      driftedFieldsCount: drift?.driftedCount ?? 0,
      lastDriftScannedAt: drift?.lastScannedAt ?? null
    }
  })

  return NextResponse.json({
    items,
    total: catalog.total,
    limit,
    offset
  })
}
