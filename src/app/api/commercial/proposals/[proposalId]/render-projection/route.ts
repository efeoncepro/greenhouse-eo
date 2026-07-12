import { NextResponse } from 'next/server'

import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import { buildProposalRenderProjection } from '@/lib/commercial/tenders/proposals/render-projection'
import type { ProposalAudience } from '@/lib/commercial/tenders/proposals/types'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * GET /api/commercial/proposals/[proposalId]/render-projection?ownerOrgId=…&audience=…
 *
 * EL contrato de lectura que TASK-1391 (renderer) y la autoría F1 consumen: proyección
 * allowlisted (assets metadata + evidencia permitida + requisitos). Nunca RFP crudo, costos,
 * snapshots externos ni URLs de storage. `audience=client_facing` excluye lo interno por
 * construcción.
 */
export async function GET(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId } = await params
    const url = new URL(request.url)
    const ownerOrgId = url.searchParams.get('ownerOrgId')
    const audience = url.searchParams.get('audience') ?? 'internal'

    if (!ownerOrgId) throw new ProposalInputError('ownerOrgId es obligatorio.')

    if (audience !== 'internal' && audience !== 'client_facing') {
      throw new ProposalInputError('audience debe ser internal | client_facing.')
    }

    await assertProposalStudioAccess({ tenant, ownerOrgId, need: 'read' })

    const projection = await buildProposalRenderProjection({
      ownerOrgId,
      proposalId,
      audience: audience as ProposalAudience
    })

    return NextResponse.json(projection)
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
