import { NextResponse } from 'next/server'

import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import { listProposalsForOperator } from '@/lib/commercial/tenders/proposals/operator-view'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * GET /api/commercial/proposals/operator-view?ownerOrgId=…&includeClosed=…
 *
 * TASK-1399 — la bandeja del operador: "¿cómo van mis propuestas y dónde está el PDF?".
 * Ordenada por urgencia real (deadline más próximo primero). Devuelve conteos y el link canónico
 * de descarga del último artefacto — NUNCA contenido de evidencia/RFP ni URLs de bucket.
 */
export async function GET(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const url = new URL(request.url)
    const ownerOrgId = url.searchParams.get('ownerOrgId')

    if (!ownerOrgId) throw new ProposalInputError('ownerOrgId es obligatorio.')

    await assertProposalStudioAccess({ tenant, ownerOrgId, need: 'read' })

    const items = await listProposalsForOperator({
      ownerOrgId,
      includeClosed: url.searchParams.get('includeClosed') === 'true',
      limit: Number(url.searchParams.get('limit')) || undefined
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
