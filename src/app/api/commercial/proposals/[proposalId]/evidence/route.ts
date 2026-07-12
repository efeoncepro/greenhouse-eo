import { NextResponse } from 'next/server'

import { recordProposalEvidence } from '@/lib/commercial/tenders/proposals/assets'
import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import type { ProposalAudience, ProposalEvidenceClassification } from '@/lib/commercial/tenders/proposals/types'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * POST /api/commercial/proposals/[proposalId]/evidence — registra evidencia INMUTABLE.
 * Un claim client-facing referencia una de estas filas; el agente puede PROPONERLA, pero el
 * registro lo ejecuta un actor autorizado — jamás el modelo.
 */
export async function POST(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId } = await params

    const body = (await request.json().catch(() => null)) as {
      ownerOrgId?: string
      sourceAssetId?: string
      externalSourceSnapshot?: Record<string, unknown>
      locator?: string
      method?: string
      asOf?: string
      classification?: string
      audience?: string
    } | null

    if (!body?.ownerOrgId || !body.locator || !body.method || !body.asOf) {
      throw new ProposalInputError('ownerOrgId, locator, method y asOf son obligatorios.')
    }

    if (body.classification !== 'measured' && body.classification !== 'illustrative' && body.classification !== 'attested') {
      throw new ProposalInputError('classification debe ser measured | illustrative | attested.')
    }

    if (body.audience !== 'internal' && body.audience !== 'client_facing') {
      throw new ProposalInputError('audience se DECLARA (internal | client_facing) — no es derivable.')
    }

    const { actor } = await assertProposalStudioAccess({ tenant, ownerOrgId: body.ownerOrgId, need: 'update' })

    const result = await recordProposalEvidence({
      ownerOrgId: body.ownerOrgId,
      proposalId,
      sourceAssetId: body.sourceAssetId,
      externalSourceSnapshot: body.externalSourceSnapshot,
      locator: body.locator,
      method: body.method,
      asOf: body.asOf,
      classification: body.classification as ProposalEvidenceClassification,
      audience: body.audience as ProposalAudience,
      actor
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
