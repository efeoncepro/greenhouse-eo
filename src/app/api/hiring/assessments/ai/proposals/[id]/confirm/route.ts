import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, hiringNotFoundResponse, toHiringErrorResponse } from '@/lib/hiring'
import { confirmAiProposal, getAiProposalById } from '@/lib/hiring/assessment/ai'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { AiProposalDecision, ConfirmAiProposalInput } from '@/types/hiring-assessment-ai'

/**
 * TASK-1361 — `POST /api/hiring/assessments/ai/proposals/[id]/confirm`. El write gobernado humano
 * (propose→confirm→execute). Capability LEAST-PRIVILEGE por kind: `question_draft` requiere
 * `hiring.assessment.author` (crea la pregunta), `response_score` requiere `hiring.assessment.score`
 * (aplica el puntaje). NO gateado por el flag del feature (drenar la cola siempre es posible).
 * Body: `{ decision: 'confirm'|'reject', decisionNote?, questionOverride?, finalScore? }`.
 */
export const dynamic = 'force-dynamic'

interface ConfirmBody {
  decision?: AiProposalDecision
  decisionNote?: string
  questionOverride?: ConfirmAiProposalInput['questionOverride']
  finalScore?: number
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const { id } = await params

  let body: ConfirmBody

  try {
    body = (await request.json()) as ConfirmBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    if (body.decision !== 'confirm' && body.decision !== 'reject') {
      return NextResponse.json(
        { error: 'decision debe ser confirm o reject.', code: 'hiring_invalid_input', actionable: false },
        { status: 400 },
      )
    }

    // Capability least-privilege según el kind (el confirm aplica createQuestion o recordHumanScore).
    const proposal = await getAiProposalById(id)

    if (!proposal) return hiringNotFoundResponse('La propuesta de IA no existe.', 'assessment_ai_proposal_not_found')

    if (proposal.kind === 'question_draft') {
      if (!can(tenant, 'hiring.assessment.author', 'create', 'tenant')) {
        return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.author' } })
      }
    } else if (!can(tenant, 'hiring.assessment.score', 'execute', 'tenant')) {
      return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.score' } })
    }

    const result = await confirmAiProposal(
      { proposalId: id, decision: body.decision, decisionNote: body.decisionNote, questionOverride: body.questionOverride, finalScore: body.finalScore },
      tenant.userId,
    )

    return NextResponse.json(result)
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_ai_proposal_confirm')
  }
}
