import { NextResponse } from 'next/server'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { getProductSyncConflictDetail } from '@/lib/commercial/product-catalog/product-sync-conflicts-store'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RouteParams {
  conflictId: string
}

export async function GET(_request: Request, { params }: { params: Promise<RouteParams> }) {
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

  const { conflictId } = await params
  const detail = await getProductSyncConflictDetail(conflictId)

  if (!detail) {
    return NextResponse.json({ error: 'Conflict not found.' }, { status: 404 })
  }

  return NextResponse.json(detail)
}
