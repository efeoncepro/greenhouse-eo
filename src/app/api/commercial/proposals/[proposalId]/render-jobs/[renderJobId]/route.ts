import { NextResponse } from 'next/server'

import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError, ProposalNotFoundError } from '@/lib/commercial/tenders/proposals/errors'
import { getProposalRenderJob } from '@/lib/commercial/tenders/proposals/render-jobs'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/** GET /api/commercial/proposals/[proposalId]/render-jobs/[renderJobId]?ownerOrgId=… */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposalId: string; renderJobId: string }> }
) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { renderJobId } = await params
    const ownerOrgId = new URL(request.url).searchParams.get('ownerOrgId')

    if (!ownerOrgId) throw new ProposalInputError('ownerOrgId es obligatorio.')

    await assertProposalStudioAccess({ tenant, ownerOrgId, need: 'render_read' })

    const job = await getProposalRenderJob({ ownerOrgId, renderJobId })

    if (!job) throw new ProposalNotFoundError(renderJobId)

    return NextResponse.json(job)
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
