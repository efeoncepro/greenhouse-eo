import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { OBJECTIVE_QUESTION_TYPES, type AssessmentScorecard, type QuestionType } from '@/types/hiring-assessment'

import { HiringNotFoundError, HiringValidationError } from '../errors'

// ══════════════════════════════════════════════════════════════════════════
// Objective auto-scoring — PURE (testeable sin PG). Escala canónica 0-100.
// Convenciones de answer_key/answer:
//   single_choice : answerKey { correct: string } · answer { selected: string }
//   multi_choice  : answerKey { correct: string[] } · answer { selected: string[] }
//   likert        : answerKey { max?: number } (default 5) · answer { value: number }
//   situational/open_text : NO objetivo → null (needs human rating)
// ══════════════════════════════════════════════════════════════════════════

const clamp01to100 = (n: number): number => Math.max(0, Math.min(100, n))

export const computeObjectiveScore = (
  type: QuestionType,
  answerKey: Record<string, unknown>,
  answer: Record<string, unknown>,
): number | null => {
  if (!OBJECTIVE_QUESTION_TYPES.includes(type)) return null

  if (type === 'single_choice') {
    const correct = answerKey.correct
    const selected = answer.selected

    if (typeof correct !== 'string') return 0
    
return selected === correct ? 100 : 0
  }

  if (type === 'multi_choice') {
    const correct = Array.isArray(answerKey.correct) ? (answerKey.correct as unknown[]).map(String) : []
    const selected = Array.isArray(answer.selected) ? (answer.selected as unknown[]).map(String) : []

    if (correct.length === 0) return 0
    const correctSet = new Set(correct)
    const selectedSet = new Set(selected)
    // Jaccard-ish: aciertos menos falsos positivos, normalizado por el total de correctas.
    let hits = 0
    let falsePositives = 0

    for (const s of selectedSet) (correctSet.has(s) ? hits++ : falsePositives++)
    const raw = (hits - falsePositives) / correct.length

    
return clamp01to100(raw * 100)
  }

  if (type === 'likert') {
    const max = typeof answerKey.max === 'number' && answerKey.max > 0 ? answerKey.max : 5
    const value = typeof answer.value === 'number' ? answer.value : Number(answer.value)

    if (!Number.isFinite(value)) return 0
    
return clamp01to100((value / max) * 100)
  }

  return null
}

// ── DB-facing scoring + rollup ──

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)

  
return Number.isFinite(n) ? n : 0
}

/**
 * Submit de un candidate_test: auto-scorea las respuestas objetivas (contra answer_key), deja
 * las abiertas en cola humana, y marca la instancia `submitted`. NO hace rollup todavía (espera
 * a que las abiertas se corrijan). Emite hiring.assessment.submitted.
 */
export const submitAssessment = async (assessmentId: string, actorUserId: string | null): Promise<void> => {
  await withGreenhousePostgresTransaction(async (client) => {
    const a = await client.query(
      `SELECT status, method FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1 LIMIT 1`,
      [assessmentId],
    )

    const row = a.rows[0] as { status: string; method: string } | undefined

    if (!row) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

    // TASK-1383: submit SOLO desde in_progress (el timer arrancó vía start o el primer
    // autosave). Un submit sobre assigned/sent = flujo roto, no un estado válido.
    if (row.status !== 'in_progress') {
      throw new HiringValidationError('La evaluación no está en progreso.', 'assessment_not_open', 409, { status: row.status })
    }

    // Auto-score objetivo: join a la pregunta para conocer type + answer_key.
    const resp = await client.query(
      `SELECT r.response_id, q.type, q.answer_key_json, r.answer_json
       FROM greenhouse_hiring.hiring_assessment_response r
       JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
       WHERE r.assessment_id = $1 AND r.question_id IS NOT NULL`,
      [assessmentId],
    )

    for (const rr of resp.rows as Array<{ response_id: string; type: string; answer_key_json: unknown; answer_json: unknown }>) {
      const type = rr.type as QuestionType

      const score = computeObjectiveScore(
        type,
        (rr.answer_key_json ?? {}) as Record<string, unknown>,
        (rr.answer_json ?? {}) as Record<string, unknown>,
      )

      if (score !== null) {
        await client.query(
          `UPDATE greenhouse_hiring.hiring_assessment_response
           SET auto_score = $1, needs_human_rating = FALSE WHERE response_id = $2`,
          [score, rr.response_id],
        )
      }
    }

    await client.query(
      `UPDATE greenhouse_hiring.hiring_assessment SET status = 'submitted', submitted_at = NOW() WHERE assessment_id = $1`,
      [assessmentId],
    )
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessment,
        aggregateId: assessmentId,
        eventType: EVENT_TYPES.hiringAssessmentSubmitted,
        payload: { assessmentId, actorUserId },
      },
      client,
    )
  })
}

/** Corrección humana de una respuesta abierta/situacional (o confirmación de sugerencia IA). */
export const recordHumanScore = async (
  responseId: string,
  score: number,
  scorerUserId: string,
  // TASK-1361 — client opcional para que el confirm de una sugerencia IA sea atómico
  // (marcar la propuesta confirmed + aplicar el score en la misma tx).
  client?: RollupClient,
): Promise<void> => {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new HiringValidationError('El puntaje debe estar entre 0 y 100.', 'assessment_invalid_score', 400)
  }

  const text = `UPDATE greenhouse_hiring.hiring_assessment_response
     SET human_score = $1, needs_human_rating = FALSE, scored_by = $2, scored_at = NOW()
     WHERE response_id = $3 RETURNING response_id`

  const values = [score, scorerUserId, responseId]

  const rows = client
    ? (await client.query(text, values)).rows
    : await runGreenhousePostgresQuery(text, values)

  if (!rows[0]) throw new HiringNotFoundError('La respuesta no existe.', 'assessment_response_not_found')
}

/** ¿La instancia ya no tiene respuestas pendientes de corrección humana? */
export const isAssessmentFullyScored = async (assessmentId: string): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ pending: string }>(
    `SELECT COUNT(*)::text AS pending FROM greenhouse_hiring.hiring_assessment_response
     WHERE assessment_id = $1 AND needs_human_rating = TRUE`,
    [assessmentId],
  )

  
return num(rows[0]?.pending) === 0
}

/**
 * Materializa hiring_competency_result (score por competencia = promedio de human_score ?? auto_score
 * de las respuestas de esa competencia) y marca la instancia `scored`. Luego dispara el rollup a la
 * application. Falla si quedan respuestas sin corregir.
 */
export const finalizeAssessment = async (assessmentId: string, actorUserId: string | null): Promise<void> => {
  await withGreenhousePostgresTransaction(async (client) => {
    const a = await client.query(
      `SELECT application_id, status FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1 LIMIT 1`,
      [assessmentId],
    )

    const row = a.rows[0] as { application_id: string; status: string } | undefined

    if (!row) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

    const pending = await client.query(
      `SELECT COUNT(*)::int AS n FROM greenhouse_hiring.hiring_assessment_response
       WHERE assessment_id = $1 AND needs_human_rating = TRUE`,
      [assessmentId],
    )

    if ((pending.rows[0] as { n: number }).n > 0) {
      throw new HiringValidationError('Faltan respuestas por corregir.', 'assessment_pending_human_rating', 409)
    }

    // Resultado por competencia (promedio de la puntuación efectiva).
    await client.query(
      `INSERT INTO greenhouse_hiring.hiring_competency_result (assessment_id, competency_id, score)
       SELECT $1, competency_id, ROUND(AVG(COALESCE(human_score, auto_score, 0))::numeric, 2)
       FROM greenhouse_hiring.hiring_assessment_response
       WHERE assessment_id = $1
       GROUP BY competency_id
       ON CONFLICT (assessment_id, competency_id) DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()`,
      [assessmentId],
    )

    await client.query(
      `UPDATE greenhouse_hiring.hiring_assessment SET status = 'scored' WHERE assessment_id = $1`,
      [assessmentId],
    )
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessment,
        aggregateId: assessmentId,
        eventType: EVENT_TYPES.hiringAssessmentScored,
        payload: { assessmentId, applicationId: row.application_id, actorUserId },
      },
      client,
    )

    await rollupCompetencyResultsToApplication(row.application_id, client)
  })
}

interface RollupClient {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>
}

/**
 * Helper canónico ÚNICO del rollup: agrega los competency_result de los assessments `scored` de una
 * application, los pondera por los módulos de la plantilla (candidate_test) y escribe el score
 * agregado (0-100) a hiring_application.score/match_score/explainability_json. ADVISORY — nunca
 * decide ni rechaza. Ningún callsite recomputa el score fuera de acá.
 */
export const rollupCompetencyResultsToApplication = async (
  applicationId: string,
  client?: RollupClient,
): Promise<AssessmentScorecard | null> => {
  const q = async (text: string, values: unknown[]): Promise<Record<string, unknown>[]> => {
    if (client) return (await client.query(text, values)).rows as Record<string, unknown>[]
    
return runGreenhousePostgresQuery(text, values)
  }

  // Score por competencia (promedio entre instancias scored) + peso de la plantilla del candidate_test.
  const rows = await q(
    `SELECT cr.competency_id,
            c.key AS competency_key,
            ROUND(AVG(cr.score)::numeric, 2) AS score,
            COALESCE(MAX(tm.weight), 0) AS weight
     FROM greenhouse_hiring.hiring_competency_result cr
     JOIN greenhouse_hiring.hiring_assessment a ON a.assessment_id = cr.assessment_id
     JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = cr.competency_id
     LEFT JOIN greenhouse_hiring.hiring_assessment_template_module tm
       ON tm.competency_id = cr.competency_id AND tm.template_id = a.template_id
     WHERE a.application_id = $1 AND a.status = 'scored'
     GROUP BY cr.competency_id, c.key`,
    [applicationId],
  )

  if (rows.length === 0) return null

  const competencies = rows.map((r) => ({
    competencyId: String(r.competency_id),
    competencyKey: String(r.competency_key),
    score: num(r.score),
    weight: num(r.weight),
  }))

  const totalWeight = competencies.reduce((s, c) => s + c.weight, 0)

  const overall =
    totalWeight > 0
      ? Math.round((competencies.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight) * 100) / 100
      : Math.round((competencies.reduce((s, c) => s + c.score, 0) / competencies.length) * 100) / 100

  const scorecard: AssessmentScorecard = { assessmentId: '', overallScore: overall, competencies }

  await q(
    `UPDATE greenhouse_hiring.hiring_application
     SET score = $1, match_score = $1,
         explainability_json = jsonb_set(COALESCE(explainability_json, '{}'::jsonb), '{assessment}', $2::jsonb, true)
     WHERE application_id = $3`,
    [overall, JSON.stringify({ overallScore: overall, competencies }), applicationId],
  )

  return scorecard
}
