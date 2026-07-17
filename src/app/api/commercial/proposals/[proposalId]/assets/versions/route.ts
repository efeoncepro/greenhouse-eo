import { NextResponse } from 'next/server'

import { readProposalArtifactVersions } from '@/lib/commercial/tenders/proposals/artifact-versions'
import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * GET /api/commercial/proposals/[proposalId]/assets/versions?ownerOrgId=…
 * TASK-1412 — historial de versiones por kind (la versión es derivada; ver artifact-versions.ts).
 * Sin URLs de storage: la descarga va por el endpoint gobernado de download.
 */
export async function GET(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId } = await params
    const ownerOrgId = new URL(request.url).searchParams.get('ownerOrgId')

    if (!ownerOrgId) {
      throw new ProposalInputError('ownerOrgId es obligatorio.')
    }

    await assertProposalStudioAccess({ tenant, ownerOrgId, need: 'read' })

    const result = await readProposalArtifactVersions({ ownerOrgId, proposalId })

    return NextResponse.json(result)
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
