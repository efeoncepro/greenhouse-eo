import 'server-only'

/**
 * TASK-1244 — Growth AI Visibility · Admin evidence review · commands (EPIC-020 F).
 *
 * Gate humano de release YMYL. `approveAiVisibilityReport` / `rejectAiVisibilityReport`
 * son los comandos gobernados (audit append-only) que desbloquean (o cierran) un reporte
 * `review_required` ANTES de su publicación pública. El LLM NUNCA aprueba: la decisión es
 * un comando humano (propose→confirm→execute; el endpoint admin es el punto de confirmación).
 *
 * Approve: registra la decisión + PUBLICA el snapshot (TASK-1239, que ahora honra la
 * aprobación) + materializa `public_delivery_state='ready'` (el poll público empieza a
 * devolver el `reportToken`) + dispara el HubSpot lead handoff (paridad con la publish
 * route normal, non-fatal). Idempotente: re-aprobar re-drivea publish + ready (recovery).
 * Reject: registra la decisión + deja `public_delivery_state='unavailable'` (final honesto).
 *
 * La aprobación queda ligada a la `score_version` revisada: un re-score (nueva versión
 * review_required) NO la hereda → re-revisión obligatoria (anti "approve-once auto-release").
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { syncAiVisibilityRunToHubSpot } from '../hubspot/command'
import { readGraderReport } from '../report/command'
import { publishGraderReportSnapshot } from '../report/snapshot'
import { setPublicDeliveryState } from '../public-delivery/finalize-delivery'

import { readReportReviewState } from './queries'
import { ReportReviewError, resolveReviewTransition, type ReportReviewDecision } from './state'

export interface ApproveReportResult {
  runId: string
  scoreVersion: string
  state: 'approved'
  reportToken: string
}

export interface RejectReportResult {
  runId: string
  scoreVersion: string
  state: 'rejected'
}

/** Inserta la fila de decisión en el log append-only (= audit + estado). */
const recordDecision = async (input: {
  runId: string
  scoreVersion: string
  decision: ReportReviewDecision
  reviewedByUserId: string
  reason: string | null
}): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_growth.grader_report_reviews
       (run_id, score_version, decision, reason, reviewed_by_user_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.runId, input.scoreVersion, input.decision, input.reason, input.reviewedByUserId]
  )
}

/**
 * Resuelve el reporte vigente del run y asegura que sea efectivamente `review_required`
 * (el único estado que pasa por este gate). Devuelve la `score_version` a revisar.
 * Propaga `GraderReportError` (run/score not found).
 */
const resolveReviewableScoreVersion = async (runId: string): Promise<string> => {
  const { report } = await readGraderReport({ runId })

  if (report.gate.status !== 'review_required') {
    throw new ReportReviewError(
      'not_reviewable',
      'Este reporte no está en revisión (sólo se aprueba/rechaza un reporte marcado para revisión humana).'
    )
  }

  return report.scoreVersion
}

/**
 * Aprueba el reporte `review_required` de un run y lo publica. Idempotente (re-aprobar
 * re-drivea publish + ready). Lanza `ReportReviewError('not_reviewable'|'invalid_transition')`
 * o `GraderReportError` (run/score inexistente). NUNCA auto-aprueba: requiere `reviewedByUserId`.
 */
export const approveAiVisibilityReport = async (input: {
  runId: string
  reviewedByUserId: string
  reason?: string | null
}): Promise<ApproveReportResult> => {
  const scoreVersion = await resolveReviewableScoreVersion(input.runId)

  const current = await readReportReviewState(input.runId, scoreVersion)
  const { apply } = resolveReviewTransition(current, 'approved')

  if (apply) {
    await recordDecision({
      runId: input.runId,
      scoreVersion,
      decision: 'approved',
      reviewedByUserId: input.reviewedByUserId,
      reason: input.reason?.trim() ? input.reason.trim() : null
    })
  }

  // Publish honra la aprobación (snapshot.ts consulta el estado): un review_required
  // aprobado es publicable. Idempotente por versión.
  const snapshot = await publishGraderReportSnapshot({ runId: input.runId, createdBy: input.reviewedByUserId })

  await setPublicDeliveryState(input.runId, 'ready')

  // Paridad con la publish route: el snapshot publicado = lead con report_url → handoff a
  // HubSpot (enqueue gobernado, idempotente, non-fatal). Un fallo acá no rompe la aprobación.
  try {
    await syncAiVisibilityRunToHubSpot({ runId: input.runId, trigger: 'report_published' })
  } catch (handoffError) {
    captureWithDomain(handoffError, 'growth', {
      tags: { source: 'growth_ai_visibility_report_review_approve', stage: 'lead_handoff_enqueue' },
      extra: { runId: input.runId }
    })
  }

  return { runId: input.runId, scoreVersion, state: 'approved', reportToken: snapshot.reportToken }
}

/**
 * Rechaza el reporte `review_required` de un run (final honesto: `unavailable`). `reason`
 * obligatoria (por qué se bloqueó). Lanza `ReportReviewError('reason_required'|'not_reviewable'|
 * 'invalid_transition')` o `GraderReportError`. NUNCA publica.
 */
export const rejectAiVisibilityReport = async (input: {
  runId: string
  reviewedByUserId: string
  reason: string
}): Promise<RejectReportResult> => {
  const reason = input.reason?.trim() ?? ''

  if (!reason) {
    throw new ReportReviewError('reason_required', 'Indica el motivo del rechazo (queda en el audit interno).')
  }

  const scoreVersion = await resolveReviewableScoreVersion(input.runId)

  const current = await readReportReviewState(input.runId, scoreVersion)
  const { apply } = resolveReviewTransition(current, 'rejected')

  if (apply) {
    await recordDecision({
      runId: input.runId,
      scoreVersion,
      decision: 'rejected',
      reviewedByUserId: input.reviewedByUserId,
      reason
    })
  }

  await setPublicDeliveryState(input.runId, 'unavailable')

  return { runId: input.runId, scoreVersion, state: 'rejected' }
}
