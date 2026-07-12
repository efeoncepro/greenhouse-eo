import { NextResponse } from 'next/server'

import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import { createProposal, listProposals } from '@/lib/commercial/tenders/proposals/store'
import type { CreateProposalInput } from '@/lib/commercial/tenders/proposals/types'
import { isTenderState } from '@/lib/commercial/tenders/tender-state-machine'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * Proposal Studio F0 (TASK-1392) — Full API Parity del aggregate.
 * GET  /api/commercial/proposals?ownerOrgId=…&state=…   → lista org-scoped
 * POST /api/commercial/proposals                        → createProposal (también ES la promoción
 *                                                          del radar si origin=public_tender)
 * La puerta: entitlement per-ORG proposal_studio_v1 + capability del actor.
 */

export async function GET(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  const url = new URL(request.url)
  const ownerOrgId = url.searchParams.get('ownerOrgId')
  const state = url.searchParams.get('state')

  try {
    if (!ownerOrgId) throw new ProposalInputError('ownerOrgId es obligatorio.')

    if (state && !isTenderState(state)) throw new ProposalInputError('state desconocido.')

    await assertProposalStudioAccess({ tenant, ownerOrgId, need: 'read' })

    const { items, total } = await listProposals({
      ownerOrgId,
      state: state && isTenderState(state) ? state : undefined,
      limit: Number.parseInt(url.searchParams.get('pageSize') ?? '50', 10),
      offset: Number.parseInt(url.searchParams.get('offset') ?? '0', 10)
    })

    return NextResponse.json({ items, total })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const body = (await request.json().catch(() => null)) as Partial<CreateProposalInput> | null

    if (!body || typeof body.ownerOrgId !== 'string' || typeof body.clientOrganizationId !== 'string') {
      throw new ProposalInputError('ownerOrgId y clientOrganizationId son obligatorios.')
    }

    if (body.origin !== 'public_tender' && body.origin !== 'private_rfp' && body.origin !== 'direct_sales') {
      throw new ProposalInputError('origin debe ser public_tender | private_rfp | direct_sales.')
    }

    if (typeof body.title !== 'string') {
      throw new ProposalInputError('title es obligatorio.')
    }

    const { actor } = await assertProposalStudioAccess({
      tenant,
      ownerOrgId: body.ownerOrgId,
      need: 'create'
    })

    const result = await createProposal({
      ownerOrgId: body.ownerOrgId,
      clientOrganizationId: body.clientOrganizationId,
      origin: body.origin,
      publicOpportunityId: body.publicOpportunityId,
      title: body.title,
      platform: body.platform,
      deadline: body.deadline,
      deadlineConfidence: body.deadlineConfidence,
      deadlineAssumption: body.deadlineAssumption,
      currency: body.currency,
      idempotencyKey: body.idempotencyKey,
      actor
    })

    return NextResponse.json(
      { proposal: result.proposal, idempotent: result.idempotent },
      { status: result.idempotent ? 200 : 201 }
    )
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
