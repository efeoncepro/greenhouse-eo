import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import {
  ApprovalApplyError,
  ApprovalNotPendingError,
  ApprovalSelfReviewError,
  decideApproval
} from '@/lib/commercial/pricing-catalog-approvals'
import {
  canReviewPricingCatalogApproval,
  requireAdminTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/pricing-catalog/approvals/[id]
 * Decide una approval (approve | reject | cancel). TASK-471 slice 5.
 * Body: { decision, comment } — comment obligatorio min 15 chars.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canReviewPricingCatalogApproval(tenant)) {
    return NextResponse.json({ error: 'Forbidden — requires efeonce_admin.' }, { status: 403 })
  }

  const { id } = await params

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const decision = body.decision as string | undefined
  const comment = typeof body.comment === 'string' ? body.comment.trim() : ''

  if (!decision || !['approved', 'rejected', 'cancelled'].includes(decision)) {
    return NextResponse.json(
      { error: 'decision must be approved | rejected | cancelled.' },
      { status: 400 }
    )
  }

  if (comment.length < 15) {
    return NextResponse.json(
      { error: 'comment is required (min 15 chars).' },
      { status: 400 }
    )
  }

  const session = await getServerAuthSession()
  const reviewerName = session?.user?.name || session?.user?.email || tenant.userId || 'unknown'

  try {
    const result = await decideApproval({
      approvalId: id,
      decision: decision as 'approved' | 'rejected' | 'cancelled',
      reviewerUserId: tenant.userId,
      reviewerName,
      comment
    })

    return NextResponse.json({
      approval: result.approval,
      applied: result.applied,
      appliedFields: result.appliedFields,
      newAuditId: result.newAuditId
    })
  } catch (error) {
    if (error instanceof ApprovalSelfReviewError) {
      return NextResponse.json({ error: error.message, code: 'self_review' }, { status: 403 })
    }

    if (error instanceof ApprovalNotPendingError) {
      return NextResponse.json({ error: error.message, code: 'not_pending' }, { status: 409 })
    }

    if (error instanceof ApprovalApplyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    console.error('[TASK-471] Failed to decide approval', error)

    return NextResponse.json({ error: 'Failed to decide approval.' }, { status: 500 })
  }
}
