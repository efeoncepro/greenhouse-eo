import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getDteProposal, resolveDteProposal } from '@/lib/nubox/reconciliation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/finance/dte-reconciliation/[proposalId]
 * Get a single DTE reconciliation proposal.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { proposalId } = await params

  try {
    const proposal = await getDteProposal(proposalId)

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    return NextResponse.json(proposal)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/finance/dte-reconciliation/[proposalId]
 * Approve or reject a DTE reconciliation proposal.
 *
 * Body:
 *   - action: 'approve' | 'reject'
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { proposalId } = await params

  let action: 'approve' | 'reject'

  try {
    const body = await request.json()

    if (body.action !== 'approve' && body.action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    action = body.action
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const resolved = await resolveDteProposal({
      proposalId,
      action,
      resolvedBy: tenant.userId || 'system'
    })

    if (!resolved) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    return NextResponse.json(resolved)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('not pending') ? 409 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
