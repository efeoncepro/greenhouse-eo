import { NextResponse } from 'next/server'

import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import { attachProposalQuote } from '@/lib/commercial/tenders/proposals/store'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * POST /api/commercial/proposals/[proposalId]/quote — la COSTURA con el cotizador.
 * La oferta económica ES la Quote referenciada; el Proposal no calcula ni transcribe el precio.
 */
export async function POST(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId } = await params
    const body = (await request.json().catch(() => null)) as { ownerOrgId?: string; quoteId?: string } | null

    if (!body?.ownerOrgId || !body.quoteId) {
      throw new ProposalInputError('ownerOrgId y quoteId son obligatorios.')
    }

    const { actor } = await assertProposalStudioAccess({ tenant, ownerOrgId: body.ownerOrgId, need: 'update' })

    const proposal = await attachProposalQuote({
      ownerOrgId: body.ownerOrgId,
      proposalId,
      quoteId: body.quoteId,
      actor
    })

    return NextResponse.json({ proposal })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
