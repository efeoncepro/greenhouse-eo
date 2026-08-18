import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import {
  cancelAssessmentAiScoringRun,
  confirmAssessmentAiScoringRun,
  listAssessmentAiReviewItems,
  resolveScoringRunItem,
} from '@/lib/hiring/assessment/ai'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { AiScoringRunItemResolution } from '@/types/hiring-assessment-ai-run'

/**
 * TASK-1734 Slice 4 — `/api/hiring/assessments/ai/scoring-runs/[runId]` (operator-only).
 *
 * - `GET` — reader de revisión exact-scoped (`listAssessmentAiReviewItems`): items con
 *   risk class, reason codes estables, evidencia del proposal, provenance y cobertura de
 *   gates. NUNCA campos de identidad del candidato. Capability `hiring.assessment.score`
 *   (la autoridad de aplicar scores es la que revisa la cola — mismo tier del confirm).
 * - `POST` — `{ action: 'resolve_item' | 'confirm_run' | 'cancel_run', ... }`:
 *   - `resolve_item`: resolución humana UNO a uno de una excepción (`runItemId`,
 *     `resolution`, `finalScore?`, `decisionNote?`, `sawProposalBeforeScoring`).
 *   - `confirm_run`: confirmación por lote gobernada (flag
 *     `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` + gates + manifest append-only).
 *   - `cancel_run`: cancelación terminal-once (NO flag-gated: camino de rollback).
 *
 * El resultado jamás alimenta rutas públicas/candidate-facing; el candidato solo conoce
 * la confirmación genérica de envío (contrato anti-leak de la task).
 */
export const dynamic = 'force-dynamic'

interface ScoringRunActionBody {
  action?: 'resolve_item' | 'confirm_run' | 'cancel_run'
  runItemId?: string
  resolution?: AiScoringRunItemResolution
  finalScore?: number
  decisionNote?: string
  sawProposalBeforeScoring?: boolean
  reasonCode?: string
}

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.score', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.score' } })
  }

  const { runId } = await params

  try {
    return NextResponse.json(await listAssessmentAiReviewItems(runId))
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_ai_scoring_run_review')
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.score', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.score' } })
  }

  const { runId } = await params

  let body: ScoringRunActionBody

  try {
    body = (await request.json()) as ScoringRunActionBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    if (body.action === 'resolve_item') {
      if (typeof body.runItemId !== 'string' || body.runItemId.length === 0) {
        return NextResponse.json(
          { error: 'Falta el runItemId a resolver.', code: 'hiring_invalid_input', actionable: false },
          { status: 400 },
        )
      }

      const result = await resolveScoringRunItem({
        runId,
        runItemId: body.runItemId,
        resolution: body.resolution as AiScoringRunItemResolution,
        finalScore: body.finalScore,
        decisionNote: body.decisionNote,
        sawProposalBeforeScoring: body.sawProposalBeforeScoring as boolean,
        actorUserId: tenant.userId,
      })

      return NextResponse.json(result)
    }

    if (body.action === 'confirm_run') {
      const result = await confirmAssessmentAiScoringRun({
        runId,
        actorUserId: tenant.userId,
        decisionNote: body.decisionNote,
      })

      return NextResponse.json(result)
    }

    if (body.action === 'cancel_run') {
      const result = await cancelAssessmentAiScoringRun(runId, tenant.userId, body.reasonCode ?? null)

      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'action debe ser resolve_item, confirm_run o cancel_run.', code: 'hiring_invalid_input', actionable: false },
      { status: 400 },
    )
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_ai_scoring_run_action')
  }
}
