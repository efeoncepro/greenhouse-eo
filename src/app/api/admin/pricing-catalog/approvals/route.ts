import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import {
  listApprovals,
  proposeApproval,
  type ApprovalStatus
} from '@/lib/commercial/pricing-catalog-approvals'
import {
  canAdministerPricingCatalog,
  requireAdminTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/pricing-catalog/approvals
 * Lists approval queue entries (TASK-471 slice 5). Query param `status` optional
 * to filter by pending/approved/rejected/cancelled.
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status') as ApprovalStatus | null
  const validStatuses: ApprovalStatus[] = ['pending', 'approved', 'rejected', 'cancelled']

  try {
    const items = await listApprovals({
      status: status && validStatuses.includes(status) ? status : undefined
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('[TASK-471] Failed to list approvals', error)

    return NextResponse.json({ error: 'Failed to list approvals.' }, { status: 500 })
  }
}

/**
 * POST /api/admin/pricing-catalog/approvals
 * Creates a new approval queue entry (proposal). Body:
 *   { entityType, entityId, entitySku?, proposedChanges, justification? }
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const entityType = typeof body.entityType === 'string' ? body.entityType : null
  const entityId = typeof body.entityId === 'string' ? body.entityId : null
  const entitySku = typeof body.entitySku === 'string' ? body.entitySku : null

  const proposedChanges =
    body.proposedChanges && typeof body.proposedChanges === 'object' && !Array.isArray(body.proposedChanges)
      ? (body.proposedChanges as Record<string, unknown>)
      : null

  const justification = typeof body.justification === 'string' ? body.justification.trim() : null

  if (!entityType || !entityId || !proposedChanges) {
    return NextResponse.json(
      { error: 'entityType, entityId, proposedChanges are required.' },
      { status: 400 }
    )
  }

  if (!justification || justification.length < 15) {
    return NextResponse.json(
      { error: 'justification is required (min 15 chars) for high/critical changes.' },
      { status: 400 }
    )
  }

  const session = await getServerAuthSession()
  const actorName = session?.user?.name || session?.user?.email || tenant.userId || 'unknown'

  try {
    const approval = await proposeApproval({
      entityType,
      entityId,
      entitySku,
      proposedChanges,
      justification,
      proposedByUserId: tenant.userId,
      proposedByName: actorName
    })

    return NextResponse.json({ approval }, { status: 201 })
  } catch (error) {
    console.error('[TASK-471] Failed to propose approval', error)

    return NextResponse.json({ error: 'Failed to propose approval.' }, { status: 500 })
  }
}
