import { NextResponse } from 'next/server'

import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import { retryProposalRenderJob } from '@/lib/commercial/tenders/proposals/render-jobs'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * POST /api/commercial/proposals/[proposalId]/render-jobs/[renderJobId]/retry — reintenta el
 * MISMO snapshot (fallos no-reintentables se rechazan: el mismo manifest daría el mismo rechazo).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string; renderJobId: string }> }
) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { renderJobId } = await params

    const body = (await request.json().catch(() => null)) as { ownerOrgId?: string } | null

    if (!body?.ownerOrgId) throw new ProposalInputError('ownerOrgId es obligatorio.')

    const { actor } = await assertProposalStudioAccess({
      tenant,
      ownerOrgId: body.ownerOrgId,
      need: 'render_retry'
    })

    const result = await retryProposalRenderJob({ ownerOrgId: body.ownerOrgId, renderJobId, actor })

    return NextResponse.json(result)
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
