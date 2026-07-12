import { NextResponse } from 'next/server'

import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import {
  listProposalRenderJobs,
  requestProposalRender,
  type RequestProposalRenderInput
} from '@/lib/commercial/tenders/proposals/render-jobs'
import type { ProposalAudience } from '@/lib/commercial/tenders/proposals/types'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * POST /api/commercial/proposals/[proposalId]/render-jobs — solicita un render gobernado.
 * El body trae el ResolvedCompositionManifest YA resuelto (resolvePlan) + evidenceIds citados.
 * Gates fail-closed: audience por referencia · accesibilidad · deadline vencido · validadores.
 */
export async function POST(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId } = await params

    const body = (await request.json().catch(() => null)) as {
      ownerOrgId?: string
      artifactPurpose?: string
      audience?: string
      outputTarget?: string
      manifest?: RequestProposalRenderInput['manifest']
      evidenceIds?: string[]
    } | null

    if (!body?.ownerOrgId || !body.artifactPurpose || !body.manifest || !body.outputTarget) {
      throw new ProposalInputError('ownerOrgId, artifactPurpose, outputTarget y manifest son obligatorios.')
    }

    if (body.audience !== 'internal' && body.audience !== 'client_facing') {
      throw new ProposalInputError('audience debe ser internal | client_facing.')
    }

    const { actor } = await assertProposalStudioAccess({
      tenant,
      ownerOrgId: body.ownerOrgId,
      need: 'render_execute'
    })

    const result = await requestProposalRender({
      ownerOrgId: body.ownerOrgId,
      proposalId,
      artifactPurpose: body.artifactPurpose,
      audience: body.audience as ProposalAudience,
      manifest: body.manifest,
      outputTarget: body.outputTarget,
      evidenceIds: body.evidenceIds,
      actor
    })

    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}

/** GET /api/commercial/proposals/[proposalId]/render-jobs?ownerOrgId=… — estado de los jobs. */
export async function GET(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId } = await params
    const ownerOrgId = new URL(request.url).searchParams.get('ownerOrgId')

    if (!ownerOrgId) throw new ProposalInputError('ownerOrgId es obligatorio.')

    await assertProposalStudioAccess({ tenant, ownerOrgId, need: 'render_read' })

    const jobs = await listProposalRenderJobs({ ownerOrgId, proposalId })

    return NextResponse.json({ items: jobs, total: jobs.length })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
