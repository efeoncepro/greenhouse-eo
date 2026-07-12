import { NextResponse } from 'next/server'

import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError, ProposalNotFoundError } from '@/lib/commercial/tenders/proposals/errors'
import { getProposalById, listProposalTransitions } from '@/lib/commercial/tenders/proposals/store'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/** GET /api/commercial/proposals/[proposalId]?ownerOrgId=… — detalle + historial append-only. */
export async function GET(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId } = await params
    const ownerOrgId = new URL(request.url).searchParams.get('ownerOrgId')

    if (!ownerOrgId) throw new ProposalInputError('ownerOrgId es obligatorio.')

    await assertProposalStudioAccess({ tenant, ownerOrgId, need: 'read' })

    const proposal = await getProposalById({ ownerOrgId, proposalId })

    if (!proposal) throw new ProposalNotFoundError(proposalId)

    const transitions = await listProposalTransitions({ ownerOrgId, proposalId })

    return NextResponse.json({ proposal, transitions })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
