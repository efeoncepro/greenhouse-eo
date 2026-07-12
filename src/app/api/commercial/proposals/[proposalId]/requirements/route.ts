import { NextResponse } from 'next/server'

import { declareProposalRequirement } from '@/lib/commercial/tenders/proposals/assets'
import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import type { ProposalRequirementKind } from '@/lib/commercial/tenders/proposals/types'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const REQUIREMENT_KINDS: ReadonlySet<string> = new Set([
  'excluyente',
  'puntua',
  'economic_minimum',
  'format',
  'deadline',
  'penalty',
  'sla'
])

/**
 * POST /api/commercial/proposals/[proposalId]/requirements — declara un requisito del RFP
 * (command humano hasta que F1 lo parsee). TASK-1391 deriva de este set sus gates fail-closed.
 */
export async function POST(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId } = await params

    const body = (await request.json().catch(() => null)) as {
      ownerOrgId?: string
      requirementKind?: string
      label?: string
      value?: string
      weight?: number
      sourceLocator?: string
      sourceAssetId?: string
      isBlocking?: boolean
      requiresHumanAttestation?: boolean
    } | null

    if (!body?.ownerOrgId || !body.requirementKind || !body.label) {
      throw new ProposalInputError('ownerOrgId, requirementKind y label son obligatorios.')
    }

    if (!REQUIREMENT_KINDS.has(body.requirementKind)) {
      throw new ProposalInputError('requirementKind desconocido.')
    }

    const { actor } = await assertProposalStudioAccess({ tenant, ownerOrgId: body.ownerOrgId, need: 'update' })

    const result = await declareProposalRequirement({
      ownerOrgId: body.ownerOrgId,
      proposalId,
      requirementKind: body.requirementKind as ProposalRequirementKind,
      label: body.label,
      value: body.value,
      weight: body.weight,
      sourceLocator: body.sourceLocator,
      sourceAssetId: body.sourceAssetId,
      isBlocking: body.isBlocking,
      requiresHumanAttestation: body.requiresHumanAttestation,
      actor
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
