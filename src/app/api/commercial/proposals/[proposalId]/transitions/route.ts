import { NextResponse } from 'next/server'

import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import { transitionProposalState } from '@/lib/commercial/tenders/proposals/store'
import { isTenderState, requiresHumanGate, isValidTenderStateTransition } from '@/lib/commercial/tenders/tender-state-machine'
import { getProposalById } from '@/lib/commercial/tenders/proposals/store'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * POST /api/commercial/proposals/[proposalId]/transitions — el ciclo avanza SOLO por acá.
 * Los gates humanos exigen la capability `gate` (approve) además del actor member; las transiciones
 * normales exigen `execute`. El command re-verifica actor y matriz; la DB es la última defensa.
 */
export async function POST(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId } = await params

    const body = (await request.json().catch(() => null)) as {
      ownerOrgId?: string
      toState?: string
      reason?: string
      metadata?: Record<string, unknown>
    } | null

    if (!body?.ownerOrgId || !body.toState || !body.reason) {
      throw new ProposalInputError('ownerOrgId, toState y reason son obligatorios.')
    }

    if (!isTenderState(body.toState)) {
      throw new ProposalInputError('toState desconocido.')
    }

    // La capability se decide por el TIPO de transición: un gate humano exige `approve`.
    const current = await getProposalById({ ownerOrgId: body.ownerOrgId, proposalId })

    const isGate =
      current !== null &&
      isValidTenderStateTransition(current.state, body.toState) &&
      requiresHumanGate(current.state, body.toState)

    const { actor } = await assertProposalStudioAccess({
      tenant,
      ownerOrgId: body.ownerOrgId,
      need: isGate ? 'approve' : 'execute'
    })

    const result = await transitionProposalState({
      ownerOrgId: body.ownerOrgId,
      proposalId,
      toState: body.toState,
      actor,
      reason: body.reason,
      metadata: body.metadata
    })

    return NextResponse.json({ proposal: result.proposal, idempotent: result.idempotent })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
