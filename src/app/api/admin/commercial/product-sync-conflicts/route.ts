import { NextResponse } from 'next/server'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { listProductSyncConflicts } from '@/lib/commercial/product-catalog/product-sync-conflicts-store'
import { PRODUCT_SYNC_CONFLICT_RESOLUTIONS, PRODUCT_SYNC_CONFLICT_TYPES } from '@/lib/commercial/product-catalog/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasEntitlement(buildTenantEntitlementSubject(tenant), 'commercial.product_catalog.resolve_conflict', 'update')) {
    return NextResponse.json(
      { error: 'Missing capability commercial.product_catalog.resolve_conflict.' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')
  const limit = limitParam ? Number(limitParam) : undefined
  const offset = offsetParam ? Number(offsetParam) : undefined

  if (type && !PRODUCT_SYNC_CONFLICT_TYPES.includes(type as typeof PRODUCT_SYNC_CONFLICT_TYPES[number])) {
    return NextResponse.json(
      { error: `type must be one of: ${PRODUCT_SYNC_CONFLICT_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  if (status && !PRODUCT_SYNC_CONFLICT_RESOLUTIONS.includes(status as typeof PRODUCT_SYNC_CONFLICT_RESOLUTIONS[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${PRODUCT_SYNC_CONFLICT_RESOLUTIONS.join(', ')}` },
      { status: 400 }
    )
  }

  if (limit != null && (!Number.isFinite(limit) || limit <= 0)) {
    return NextResponse.json({ error: 'limit must be a positive number.' }, { status: 400 })
  }

  if (offset != null && (!Number.isFinite(offset) || offset < 0)) {
    return NextResponse.json({ error: 'offset must be a non-negative number.' }, { status: 400 })
  }

  const result = await listProductSyncConflicts({
    query: q,
    conflictType: (type as typeof PRODUCT_SYNC_CONFLICT_TYPES[number] | null) ?? null,
    resolutionStatus: (status as typeof PRODUCT_SYNC_CONFLICT_RESOLUTIONS[number] | null) ?? null,
    limit,
    offset
  })

  return NextResponse.json(result)
}
