import 'server-only'

/**
 * TASK-1244 — Growth AI Visibility · Admin evidence review · readers.
 *
 * Estado vigente de revisión + cola de pendientes, derivados del log append-only
 * `grader_report_reviews`. Este módulo SÓLO lee (no importa commands/snapshot) para que
 * `report/snapshot.ts` lo consuma sin ciclo de import.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { type GraderReportSeverity } from '../report/contracts'
import { resolveSeverity } from '../report/recommendations'

import { type ReportReviewState } from './state'

/**
 * Estado vigente de un (run, score_version): la decisión más reciente, o `pending` si no
 * hay ninguna fila (los `review_required` nacen pending sin tocar el writer de scoring).
 */
export const readReportReviewState = async (runId: string, scoreVersion: string): Promise<ReportReviewState> => {
  const rows = await runGreenhousePostgresQuery<{ decision: string }>(
    `SELECT decision
       FROM greenhouse_growth.grader_report_reviews
      WHERE run_id = $1 AND score_version = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [runId, scoreVersion]
  )

  const decision = rows[0]?.decision

  return decision === 'approved' || decision === 'rejected' ? decision : 'pending'
}

/** `true` ⇔ el (run, score_version) tiene aprobación humana vigente. Gate del publish. */
export const isReportReviewApproved = async (runId: string, scoreVersion: string): Promise<boolean> =>
  (await readReportReviewState(runId, scoreVersion)) === 'approved'

export interface PendingReportReview {
  runId: string
  scoreVersion: string
  reviewReasons: string[]
  /** Marca temporal del run (cuándo entró a la cola) — para SLA/orden. */
  finishedAt: string | null
  createdAt: string
  // ── Enriquecimiento de triage (TASK-1247) ──────────────────────────────────
  // Suficiente para PRIORIZAR en la cola sin construir el `grader_report` completo por fila
  // (eso es caro: lee findings). La evidencia decisoria fina — presencia por motor,
  // WYSIWYG público, accuracy findings — vive en el drawer, que hace fetch del report al abrir.
  /** Marca sujeto del análisis (`grader_profiles.brand_name`, NOT NULL). */
  brandName: string
  /** Sitio declarado del sujeto (`grader_profiles.website_url`); null si no se declaró. */
  websiteUrl: string | null
  /** Categoría gobernada legible; null si aún sin mapear. */
  categoryLabel: string | null
  /** Mercado del perfil (ej. `CL`), para desambiguar marcas homónimas. */
  market: string
  /** Score overall persistido. `null ≠ 0`: sin evidencia suficiente NO es cero (gap real). */
  overallScore: number | null
  /** Severidad nombrada derivada con el resolver canónico (SoT compartida, sin drift de umbral). */
  overallSeverity: GraderReportSeverity
  /** Estado del score más reciente (siempre `review_required` en esta cola; explícito para el DTO). */
  scoreStatus: string
  /** Confianza del score (0..1) — contexto de cuán respaldada está la señal. */
  confidence: number
  /** Cantidad de evidencia (respuestas resueltas) detrás del score. */
  evidenceCount: number
}

/**
 * Cola de revisión: los runs cuyo score MÁS RECIENTE es `review_required` y NO tienen una
 * decisión vigente (pending) para esa `score_version`. Incluye `review_reasons` (que ya
 * agrega las razones de scoring TASK-1227 + exactitud de marca TASK-1238) + enriquecimiento
 * de triage (TASK-1247: marca/dominio/categoría/score/severidad/confianza) vía JOIN al perfil
 * y al score persistido — SIN construir el report completo. Más antiguos primero (FIFO).
 */
export const listPendingReportReviews = async (limit = 100): Promise<PendingReportReview[]> => {
  const rows = await runGreenhousePostgresQuery<{
    run_id: string
    score_version: string
    review_reasons: string[] | null
    finished_at: Date | string | null
    score_created_at: Date | string
    overall_score: string | number | null
    score_status: string
    confidence: string | number | null
    evidence_count: string | number | null
    brand_name: string
    website_url: string | null
    category_label: string | null
    market: string
  }>(
    `WITH latest_score AS (
       SELECT DISTINCT ON (s.run_id)
              s.run_id, s.score_version, s.score_status, s.review_reasons,
              s.overall_score, s.confidence, s.evidence_count,
              s.created_at AS score_created_at
         FROM greenhouse_growth.grader_scores s
        ORDER BY s.run_id, s.created_at DESC
     )
     SELECT ls.run_id, ls.score_version, ls.review_reasons, ls.score_created_at,
            ls.overall_score, ls.score_status, ls.confidence, ls.evidence_count,
            r.finished_at,
            p.brand_name, p.website_url, p.category_label, p.market
       FROM latest_score ls
       JOIN greenhouse_growth.grader_runs r ON r.run_id = ls.run_id
       JOIN greenhouse_growth.grader_profiles p ON p.profile_id = r.profile_id
      WHERE ls.score_status = 'review_required'
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_growth.grader_report_reviews rv
           WHERE rv.run_id = ls.run_id AND rv.score_version = ls.score_version
        )
      ORDER BY r.finished_at ASC NULLS LAST, ls.score_created_at ASC
      LIMIT $1`,
    [limit]
  )

  return rows.map(row => {
    const overallScore = row.overall_score === null ? null : Number(row.overall_score)

    return {
      runId: row.run_id,
      scoreVersion: row.score_version,
      reviewReasons: row.review_reasons ?? [],
      finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
      createdAt: new Date(row.score_created_at).toISOString(),
      brandName: row.brand_name,
      websiteUrl: row.website_url,
      categoryLabel: row.category_label,
      market: row.market,
      overallScore,
      overallSeverity: resolveSeverity(overallScore),
      scoreStatus: row.score_status,
      confidence: row.confidence === null ? 0 : Number(row.confidence),
      evidenceCount: row.evidence_count === null ? 0 : Number(row.evidence_count)
    }
  })
}
