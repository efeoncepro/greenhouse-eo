import { NextResponse } from 'next/server'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { resolveProductSyncConflict } from '@/lib/commercial/product-catalog/conflict-resolution-commands'
import {
  PRODUCT_SYNC_CONFLICT_ACTIONS,
  PRODUCT_SYNC_CONFLICT_FIELDS,
  type ProductSyncConflictAction,
  type ProductSyncConflictField
} from '@/lib/commercial/product-catalog/types'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RouteParams {
  conflictId: string
}

interface ResolveBody {
  action?: unknown
  reason?: unknown
  field?: unknown
}

export async function POST(request: Request, { params }: { params: Promise<RouteParams> }) {
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

  let body: ResolveBody

  try {
    body = (await request.json()) as ResolveBody
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON.' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action.trim() : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const field = typeof body.field === 'string' ? body.field.trim() : ''

  if (!PRODUCT_SYNC_CONFLICT_ACTIONS.includes(action as ProductSyncConflictAction)) {
    return NextResponse.json(
      { error: `action must be one of: ${PRODUCT_SYNC_CONFLICT_ACTIONS.join(', ')}` },
      { status: 400 }
    )
  }

  if (field && !PRODUCT_SYNC_CONFLICT_FIELDS.includes(field as ProductSyncConflictField)) {
    return NextResponse.json(
      { error: `field must be one of: ${PRODUCT_SYNC_CONFLICT_FIELDS.join(', ')}` },
      { status: 400 }
    )
  }

  const { conflictId } = await params

  try {
    const result = await resolveProductSyncConflict({
      conflictId,
      action: action as ProductSyncConflictAction,
      actor: {
        userId: tenant.userId,
        actorName: tenant.userId,
        reason
      },
      field: (field as ProductSyncConflictField | undefined) ?? undefined
    })

    return NextResponse.json(result)
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      'message' in error
    ) {
      const typed = error as { statusCode: number; message: string; code?: string; details?: unknown }

      return NextResponse.json(
        { error: typed.message, code: typed.code, details: typed.details },
        { status: typed.statusCode }
      )
    }

    throw error
  }
}
