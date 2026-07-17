import { NextResponse } from 'next/server'

import { attachProposalAsset } from '@/lib/commercial/tenders/proposals/assets'
import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import type { ProposalAssetKind, ProposalAudience } from '@/lib/commercial/tenders/proposals/types'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const ASSET_KINDS: ReadonlySet<string> = new Set([
  'rfp_source',
  'fillable_template',
  'diagnostic',
  'technical_offer',
  'economic_offer',
  'admissibility_matrix',
  'deck',
  'other_doc'
])

/**
 * POST /api/commercial/proposals/[proposalId]/assets — vincula un asset del store canónico
 * (ya subido y escaneado) como deliverable/RFP semántico. El binario NUNCA entra por acá.
 */
export async function POST(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId } = await params

    const body = (await request.json().catch(() => null)) as {
      ownerOrgId?: string
      assetId?: string
      kind?: string
      audience?: string
      version?: number
    } | null

    if (!body?.ownerOrgId || !body.assetId || !body.kind) {
      throw new ProposalInputError('ownerOrgId, assetId y kind son obligatorios.')
    }

    if (!ASSET_KINDS.has(body.kind)) {
      throw new ProposalInputError('kind desconocido.')
    }

    if (body.audience && body.audience !== 'internal' && body.audience !== 'client_facing') {
      throw new ProposalInputError('audience debe ser internal | client_facing.')
    }

    const { actor } = await assertProposalStudioAccess({ tenant, ownerOrgId: body.ownerOrgId, need: 'update' })

    const result = await attachProposalAsset({
      ownerOrgId: body.ownerOrgId,
      proposalId,
      assetId: body.assetId,
      kind: body.kind as ProposalAssetKind,
      audience: body.audience as ProposalAudience | undefined,
      actorUserId: tenant.userId,
      actor
    })

    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
