import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import {
  backfillSubmittedAssessmentAiScoringRuns,
  getEffectiveHiringAssessmentAiRunMode,
  isHiringAssessmentAiRunConfirmEnabled,
  listAssessmentAiScoringRuns,
  readProvisionalAssessmentAiProjection,
  reconcileAssessmentAiScoringRuns,
  startAssessmentAiScoringRun,
} from '@/lib/hiring/assessment/ai'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1738 Slice 1 — `/api/hiring/assessments/ai/scoring-runs?assessmentId=` (operator-only).
 *
 * Ruta colección DELGADA para descubrir los runs de scoring IA de un assessment EXACTO:
 * adapter fino sobre el primitive existente `listAssessmentAiScoringRuns` (TASK-1734,
 * `scoring-run/commands.ts`). Cero lógica propia: el routing de riesgo, los gates y el
 * manifest viven en `src/lib/hiring/assessment/ai/scoring-run/**`.
 *
 * - `assessmentId` es OBLIGATORIO (exact-scope; nunca un listado global sin scope).
 * - Capability `hiring.assessment.score` (`execute`) — mismo gate que la ruta `[runId]`:
 *   la autoridad que aplica scores es la que revisa la cola.
 * - El envelope incluye `confirmEnabled` (estado del flag
 *   `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` en ESTE runtime) para que el consumer
 *   muestre el estado flag-off con honestidad ANTES de intentar el confirm — es metadata
 *   del envelope de la ruta, no un campo nuevo en los DTOs del primitive.
 * - El resultado es exclusivamente interno para operadores: jamás alimenta rutas
 *   públicas/candidate-facing (contrato anti-leak de TASK-1734).
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.score', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.score' } })
  }

  const assessmentId = new URL(request.url).searchParams.get('assessmentId')

  if (!assessmentId || assessmentId.trim().length === 0) {
    return NextResponse.json(
      { error: 'Falta el assessmentId a consultar.', code: 'hiring_invalid_input', actionable: false },
      { status: 400 },
    )
  }

  try {
    const [runs, provisional] = await Promise.all([
      listAssessmentAiScoringRuns(assessmentId),
      readProvisionalAssessmentAiProjection(assessmentId),
    ])

    return NextResponse.json({
      runs,
      provisional,
      mode: getEffectiveHiringAssessmentAiRunMode(),
      confirmEnabled: isHiringAssessmentAiRunConfirmEnabled(),
    })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_ai_scoring_runs_collection')
  }
}

interface ScoringRunsCommandBody {
  action?: 'start' | 'backfill' | 'reconcile'
  assessmentId?: string
  dryRun?: boolean
  limit?: number
  reason?: string
  idempotencyKey?: string
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.score', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.score' } })
  }

  let body: ScoringRunsCommandBody

  try {
    body = (await request.json()) as ScoringRunsCommandBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    if (body.action === 'start') {
      if (!body.assessmentId || !body.reason?.trim() || !body.idempotencyKey?.trim()) {
        return hiringInvalidBodyResponse()
      }

      return NextResponse.json(await startAssessmentAiScoringRun(body.assessmentId, tenant.userId, {
        reason: body.reason,
        idempotencyKey: body.idempotencyKey,
      }))
    }

    if (body.action === 'backfill') {
      return NextResponse.json(await backfillSubmittedAssessmentAiScoringRuns({
        dryRun: body.dryRun !== false,
        limit: body.limit ?? 10,
        assessmentId: body.assessmentId,
        actorUserId: tenant.userId,
        reason: body.reason ?? '',
        idempotencyKey: body.idempotencyKey ?? '',
      }))
    }

    if (body.action === 'reconcile') {
      return NextResponse.json(await reconcileAssessmentAiScoringRuns(tenant.userId))
    }

    return hiringInvalidBodyResponse()
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_ai_scoring_runs_command')
  }
}
