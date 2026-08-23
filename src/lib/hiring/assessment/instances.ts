import 'server-only'

import { createHash, randomBytes, randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { TERMINAL_APPLICATION_STAGES } from '@/types/hiring'
import {
  ASSESSMENT_METHODS,
  HUMAN_RATED_QUESTION_TYPES,
  type Assessment,
  type AssessmentMethod,
  type AssessmentResponse,
  type QuestionType,
} from '@/types/hiring-assessment'

import { HiringNotFoundError, HiringValidationError } from '../errors'

// ── Query helper + coerción (módulo autónomo) ──

const runQuery = async <T extends Record<string, unknown>>(
  client: PoolClient | null,
  text: string,
  values: unknown[],
): Promise<T[]> => {
  if (client) {
    const result = await client.query(text, values)

    
return result.rows as T[]
  }

  
return runGreenhousePostgresQuery<T>(text, values)
}

const str = (v: unknown): string => (v == null ? '' : String(v))
const nstr = (v: unknown): string | null => (v == null ? null : String(v))

const nnum = (v: unknown): number | null => {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)

  
return Number.isFinite(n) ? n : null
}

const ntime = (v: unknown): number | null => {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)

  
return Number.isFinite(n) ? n : null
}

const boolean = (v: unknown): boolean => v === true || v === 't' || v === 'true'
const ts = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v))

const jsonObj = (v: unknown): Record<string, unknown> => {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>

  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)

      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>
    } catch {
      return {}
    }
  }

  
return {}
}

const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex')

export type AssessmentDeadlineResult<T> =
  | { outcome: 'ok'; value: T }
  | { outcome: 'expired' }

// ── Normalizers ──

export type AssessmentRow = {
  assessment_id: unknown
  public_id: unknown
  application_id: unknown
  template_id: unknown
  method: unknown
  evaluator_user_id: unknown
  status: unknown
  time_limit_minutes: unknown
  accommodations_json: unknown
  started_at: unknown
  submitted_at: unknown
  created_by: unknown
  created_at: unknown
  updated_at: unknown
}

export const normalizeAssessment = (r: AssessmentRow): Assessment => ({
  assessmentId: str(r.assessment_id),
  publicId: str(r.public_id),
  applicationId: str(r.application_id),
  templateId: nstr(r.template_id),
  method: str(r.method) as AssessmentMethod,
  evaluatorUserId: nstr(r.evaluator_user_id),
  status: str(r.status) as Assessment['status'],
  timeLimitMinutes: ntime(r.time_limit_minutes),
  accommodations: jsonObj(r.accommodations_json),
  startedAt: ts(r.started_at),
  submittedAt: ts(r.submitted_at),
  createdBy: nstr(r.created_by),
  createdAt: ts(r.created_at) ?? '',
  updatedAt: ts(r.updated_at) ?? '',
})

// public_id excluye access_token_hash del view model — el hash NUNCA sale del store.
export const ASSESSMENT_COLS = `assessment_id, public_id, application_id, template_id, method, evaluator_user_id, status, time_limit_minutes, accommodations_json, started_at, submitted_at, created_by, created_at, updated_at`

type ResponseRow = {
  response_id: unknown
  assessment_id: unknown
  question_id: unknown
  competency_id: unknown
  answer_json: unknown
  auto_score: unknown
  needs_human_rating: unknown
  human_score: unknown
  scored_by: unknown
  scored_at: unknown
  created_at: unknown
  updated_at: unknown
}

const normalizeResponse = (r: ResponseRow): AssessmentResponse => ({
  responseId: str(r.response_id),
  assessmentId: str(r.assessment_id),
  questionId: nstr(r.question_id),
  competencyId: str(r.competency_id),
  answer: jsonObj(r.answer_json),
  autoScore: nnum(r.auto_score),
  needsHumanRating: boolean(r.needs_human_rating),
  humanScore: nnum(r.human_score),
  scoredBy: nstr(r.scored_by),
  scoredAt: ts(r.scored_at),
  createdAt: ts(r.created_at) ?? '',
  updatedAt: ts(r.updated_at) ?? '',
})

const RESPONSE_COLS = `response_id, assessment_id, question_id, competency_id, answer_json, auto_score, needs_human_rating, human_score, scored_by, scored_at, created_at, updated_at`

// ── Readers ──

export const getAssessmentById = async (assessmentId: string): Promise<Assessment | null> => {
  const rows = await runGreenhousePostgresQuery<AssessmentRow>(
    `SELECT ${ASSESSMENT_COLS} FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1 LIMIT 1`,
    [assessmentId],
  )

  
return rows[0] ? normalizeAssessment(rows[0]) : null
}

export const getAssessmentByIdWithClient = async (
  client: PoolClient,
  assessmentId: string,
): Promise<Assessment | null> => {
  const rows = await runQuery<AssessmentRow>(client,
    `SELECT ${ASSESSMENT_COLS} FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1 LIMIT 1`,
    [assessmentId])

  return rows[0] ? normalizeAssessment(rows[0]) : null
}

export const listAssessmentsForApplication = async (applicationId: string): Promise<Assessment[]> => {
  const rows = await runGreenhousePostgresQuery<AssessmentRow>(
    `SELECT ${ASSESSMENT_COLS} FROM greenhouse_hiring.hiring_assessment WHERE application_id = $1 ORDER BY created_at DESC`,
    [applicationId],
  )

  
return rows.map(normalizeAssessment)
}

/** Vigencia del link tokenizado del candidato (TASK-1383; 1363 comunica la fecha). */
const TOKEN_TTL_DAYS = 14

/** Resolución autoritativa bajo lock. Antes de iniciar manda el TTL; ya iniciada manda closeDeadline. */
export const resolveAssessmentByTokenWithClient = async (
  client: PoolClient,
  rawToken: string,
): Promise<Assessment | null> => {
  if (!rawToken) return null

  const tokenHash = hashToken(rawToken)

  const rows = await runQuery<AssessmentRow & { effective_expiry: unknown }>(
    client,
    `SELECT ${ASSESSMENT_COLS}, CASE WHEN status = 'in_progress'
              THEN greenhouse_hiring.assessment_candidate_test_close_deadline(
                started_at, time_limit_minutes, accommodations_json)
              ELSE token_expires_at END AS effective_expiry
       FROM greenhouse_hiring.hiring_assessment
      WHERE access_token_hash = $1 AND method = 'candidate_test'
      LIMIT 1 FOR UPDATE`,
    [tokenHash],
  )

  const row = rows[0]

  if (!row || !['assigned', 'sent', 'in_progress'].includes(str(row.status))) return null

  const applications = await runQuery<{ candidate_facet_id: string; stage: string; decision: string | null }>(
    client,
    `SELECT candidate_facet_id, stage, decision
       FROM greenhouse_hiring.hiring_application
      WHERE application_id = $1 LIMIT 1 FOR UPDATE`,
    [str(row.application_id)],
  )

  const application = applications[0]

  if (!application) return null

  const facets = await runQuery<{ consent_status: string }>(client,
    `SELECT consent_status FROM greenhouse_hiring.candidate_facet
      WHERE candidate_facet_id = $1 LIMIT 1 FOR UPDATE`,
    [application.candidate_facet_id])

  const facet = facets[0]

  if (!facet || application.decision
      || TERMINAL_APPLICATION_STAGES.has(application.stage)
      || facet.consent_status === 'withdrawn') {
    return null
  }

  const clockRows = await runQuery<{ database_now: unknown }>(client,
    'SELECT clock_timestamp() AS database_now', [])

  const expiresAt = ts(row.effective_expiry)
  const databaseNow = ts(clockRows[0]?.database_now)

  if (!expiresAt || !databaseNow || Date.parse(expiresAt) <= Date.parse(databaseNow)) {
    await runQuery(client,
      `UPDATE greenhouse_hiring.hiring_assessment SET status = 'expired', updated_at = clock_timestamp()
       WHERE assessment_id = $1 AND status IN ('assigned', 'sent', 'in_progress')`,
      [str(row.assessment_id)],
    )

    return null
  }

  return normalizeAssessment(row)
}

export const resolveAssessmentByToken = async (rawToken: string): Promise<Assessment | null> =>
  withGreenhousePostgresTransaction((client) => resolveAssessmentByTokenWithClient(client, rawToken))

// ── Writers ──

interface AssignCandidateTestInput {
  applicationId: string
  templateId: string
  timeLimitMinutes?: number | null
  accommodations?: Record<string, unknown>
}

/**
 * Estados en los que una instancia YA cuenta como abierta para (application, template).
 * Es exactamente el predicado del índice parcial `hiring_assessment_open_instance_unique_idx`
 * — incluye `submitted`. Antes el SELECT previo filtraba sólo 3 estados mientras el índice
 * cubría 4: con una instancia `submitted` el INSERT reventaba con un `23505` crudo que salía
 * como HTTP 500 `hiring_internal_error` con `actionable: true` (la UI ofrecía "Reintentar"
 * para algo que no se resuelve reintentando nunca) y, en el carril reactivo, fabricaba
 * dead-letters. NUNCA desalinear esta lista del predicado del índice.
 */
export const OPEN_ASSESSMENT_INSTANCE_STATUSES = ['assigned', 'sent', 'in_progress', 'submitted'] as const

const OPEN_INSTANCE_SQL_PREDICATE = `status IN ('assigned', 'sent', 'in_progress', 'submitted')`

/** Instancia candidate_test ya abierta para (application, template) — la ganadora de la carrera. */
export const findOpenCandidateTest = async (
  client: PoolClient | null,
  applicationId: string,
  templateId: string,
): Promise<Assessment | null> => {
  const rows = await runQuery<AssessmentRow>(
    client,
    `SELECT ${ASSESSMENT_COLS} FROM greenhouse_hiring.hiring_assessment
     WHERE application_id = $1 AND template_id = $2 AND method = 'candidate_test'
       AND ${OPEN_INSTANCE_SQL_PREDICATE} LIMIT 1`,
    [applicationId, templateId],
  )

  return rows[0] ? normalizeAssessment(rows[0]) : null
}

export interface InsertCandidateTestResult {
  assessment: Assessment
  created: boolean
  /** SÓLO en la rama `created: true`. La rama `created: false` NUNCA devuelve token. */
  token: string | null
}

/**
 * Primitive transaccional de creación de la instancia tokenizada (ADR D2).
 *
 * `ON CONFLICT DO NOTHING RETURNING` sobre el índice parcial ya existente + re-lectura del
 * ganador, **sin excepción de por medio**: la carrera no es un error, es un resultado tipado.
 * Cierra de una vez las dos vías de escape del check-then-insert anterior — el mismatch de
 * predicado (determinista, con una instancia `submitted`) y la carrera entre SELECT e INSERT.
 *
 * El caller decide qué significa `created: false`: el route legacy lo traduce a 409
 * `assessment_already_open`; el command gobernado devuelve `already_assigned` tipado.
 */
export const insertCandidateTest = async (
  client: PoolClient,
  input: AssignCandidateTestInput,
  actorUserId: string | null,
): Promise<InsertCandidateTestResult> => {
  const applicationId = str(input.applicationId)
  const templateId = str(input.templateId)
  const rawToken = randomBytes(24).toString('base64url')
  const accessTokenVersionId = randomUUID()

  const rows = await runQuery<AssessmentRow>(
    client,
    `INSERT INTO greenhouse_hiring.hiring_assessment
       (application_id, template_id, method, status, access_token_hash, access_token_version_id,
        time_limit_minutes, accommodations_json, created_by, token_expires_at)
     VALUES ($1, $2, 'candidate_test', 'assigned', $3, $4::uuid, $5, $6::jsonb, $7,
             NOW() + make_interval(days => ${TOKEN_TTL_DAYS}))
     ON CONFLICT (application_id, template_id) WHERE ${OPEN_INSTANCE_SQL_PREDICATE}
     DO NOTHING
     RETURNING ${ASSESSMENT_COLS}`,
    [
      applicationId,
      templateId,
      hashToken(rawToken),
      accessTokenVersionId,
      input.timeLimitMinutes ?? null,
      JSON.stringify(input.accommodations ?? {}),
      actorUserId,
    ],
  )

  if (rows[0]) {
    return { assessment: normalizeAssessment(rows[0]), created: true, token: rawToken }
  }

  const winner = await findOpenCandidateTest(client, applicationId, templateId)

  if (!winner) {
    throw new HiringValidationError(
      'No se pudo registrar la evaluación de esta postulación.',
      'assessment_assignment_conflict',
      409,
    )
  }

  // El token del intento perdedor se descarta: el link vive una sola vez, en su ganador.
  return { assessment: winner, created: false, token: null }
}

/** Crea (o reusa) una instancia candidate_test tokenizada. El token crudo se devuelve UNA vez. */
export const assignCandidateTest = async (
  input: AssignCandidateTestInput,
  actorUserId: string | null,
): Promise<{ assessment: Assessment; token: string }> => {
  const applicationId = str(input.applicationId)
  const templateId = str(input.templateId)

  if (!applicationId || !templateId) {
    throw new HiringValidationError('applicationId y templateId son obligatorios.', 'assessment_field_required', 400)
  }

  return withGreenhousePostgresTransaction(async (client) => {
    const app = await runQuery<{ application_id: string }>(
      client,
      `SELECT application_id FROM greenhouse_hiring.hiring_application WHERE application_id = $1 LIMIT 1`,
      [applicationId],
    )

    if (!app[0]) throw new HiringValidationError('La postulación no existe.', 'hiring_application_not_found', 400)

    const result = await insertCandidateTest(client, { ...input, applicationId, templateId }, actorUserId)

    // Contrato POST legacy intacto: `created:false` → 409 `assessment_already_open`, ahora
    // también para la instancia `submitted` que antes salía como 500 actionable.
    if (!result.created || !result.token) {
      throw new HiringValidationError(
        'Ya existe una evaluación abierta para esta postulación y plantilla.',
        'assessment_already_open',
        409,
        { assessmentId: result.assessment.assessmentId },
      )
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessment,
        aggregateId: result.assessment.assessmentId,
        eventType: EVENT_TYPES.hiringAssessmentAssigned,
        payload: { assessmentId: result.assessment.assessmentId, applicationId, templateId, method: 'candidate_test' },
      },
      client,
    )

    return { assessment: result.assessment, token: result.token }
  })
}

/** Crea una instancia interviewer_scorecard (un evaluador humano). */
export const assignInterviewerScorecard = async (
  applicationId: string,
  evaluatorUserId: string,
  actorUserId: string | null,
): Promise<Assessment> => {
  if (!applicationId || !evaluatorUserId) {
    throw new HiringValidationError('applicationId y evaluatorUserId son obligatorios.', 'assessment_field_required', 400)
  }

  
return withGreenhousePostgresTransaction(async (client) => {
    const rows = await runQuery<AssessmentRow>(
      client,
      `INSERT INTO greenhouse_hiring.hiring_assessment
         (application_id, method, evaluator_user_id, status, created_by)
       VALUES ($1, 'interviewer_scorecard', $2, 'in_progress', $3)
       RETURNING ${ASSESSMENT_COLS}`,
      [applicationId, evaluatorUserId, actorUserId],
    )

    const assessment = normalizeAssessment(rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessment,
        aggregateId: assessment.assessmentId,
        eventType: EVENT_TYPES.hiringAssessmentAssigned,
        payload: { assessmentId: assessment.assessmentId, applicationId, method: 'interviewer_scorecard', evaluatorUserId },
      },
      client,
    )
    
return assessment
  })
}

/** Arranca una sola vez bajo lock; el trigger DB recalcula todas las sesiones activas. */
export const startAssessmentWithClient = async (
  client: PoolClient,
  assessmentId: string,
): Promise<AssessmentDeadlineResult<Assessment>> => {
  const rows = await runQuery<AssessmentRow & { database_now: unknown; effective_expiry: unknown }>(client,
    `SELECT ${ASSESSMENT_COLS}, clock_timestamp() AS database_now,
            CASE WHEN status = 'in_progress'
              THEN greenhouse_hiring.assessment_candidate_test_close_deadline(
                started_at, time_limit_minutes, accommodations_json)
              ELSE token_expires_at END AS effective_expiry
       FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1 LIMIT 1 FOR UPDATE`,
    [assessmentId],
  )

  const row = rows[0]

  if (!row) throw new HiringNotFoundError('La evaluación no existe o no está rendible.', 'assessment_not_startable')

  if (!['assigned', 'sent', 'in_progress'].includes(str(row.status))) {
    throw new HiringNotFoundError('La evaluación no existe o no está rendible.', 'assessment_not_startable')
  }

  const expiry = ts(row.effective_expiry)
  const now = ts(row.database_now)

  if (!expiry || !now || Date.parse(expiry) <= Date.parse(now)) {
    await runQuery(client,
      `UPDATE greenhouse_hiring.hiring_assessment SET status = 'expired', updated_at = clock_timestamp()
       WHERE assessment_id = $1 AND status IN ('assigned', 'sent', 'in_progress')`, [assessmentId])

return { outcome: 'expired' }
  }

  if (str(row.status) === 'in_progress') return { outcome: 'ok', value: normalizeAssessment(row) }

  const updated = await runQuery<AssessmentRow>(client,
    `UPDATE greenhouse_hiring.hiring_assessment
        SET status = 'in_progress', started_at = COALESCE(started_at, clock_timestamp()),
            updated_at = clock_timestamp()
      WHERE assessment_id = $1 AND status IN ('assigned', 'sent') RETURNING ${ASSESSMENT_COLS}`,
    [assessmentId])

  if (!updated[0]) throw new HiringNotFoundError('La evaluación no existe o no está rendible.', 'assessment_not_startable')

  return { outcome: 'ok', value: normalizeAssessment(updated[0]) }
}

export const startAssessment = async (assessmentId: string): Promise<Assessment> => {
  const result = await withGreenhousePostgresTransaction((client) => startAssessmentWithClient(client, assessmentId))

  if (result.outcome === 'expired') {
    throw new HiringValidationError('La evaluación ya no está disponible.', 'assessment_not_startable', 409)
  }

  return result.value
}

export interface SaveResponseInput {
  assessmentId: string
  competencyId: string
  questionId?: string | null
  questionType: QuestionType
  answer: Record<string, unknown>
}

/**
 * Guarda una respuesta (candidate_test). Idempotente por (assessment, question) — upsert
 * respaldado por UNIQUE parcial (TASK-1383): el autosave repetido actualiza, nunca duplica
 * (los duplicados sesgaban el AVG del score final). `needs_human_rating` se deriva del tipo
 * REAL de la pregunta en DB (nunca del declarado por el caller — la superficie pública de
 * 1363 no es fuente de verdad). El primer save auto-arranca el timer (assigned/sent →
 * in_progress) y las instancias vencidas se expiran antes de aceptar el write.
 */
export const saveResponseWithClient = async (
  client: PoolClient,
  input: SaveResponseInput,
): Promise<AssessmentDeadlineResult<AssessmentResponse>> => {
  const assessmentId = str(input.assessmentId)
  const competencyId = str(input.competencyId)
  const questionId = input.questionId ? str(input.questionId) : null

  if (!assessmentId || !competencyId) {
    throw new HiringValidationError('assessmentId y competencyId son obligatorios.', 'assessment_field_required', 400)
  }

  const started = await startAssessmentWithClient(client, assessmentId)

  if (started.outcome === 'expired') return started

    const open = await runQuery<{ status: string; answer_deadline: unknown; close_deadline: unknown; database_now: unknown }>(
      client,
      `SELECT status,
              greenhouse_hiring.assessment_candidate_test_deadline(
                started_at, time_limit_minutes, accommodations_json) AS answer_deadline,
              greenhouse_hiring.assessment_candidate_test_close_deadline(
                started_at, time_limit_minutes, accommodations_json) AS close_deadline,
              clock_timestamp() AS database_now
         FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1 LIMIT 1 FOR UPDATE`,
      [assessmentId],
    )

    if (!open[0]) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

    if (!['assigned', 'sent', 'in_progress'].includes(open[0].status)) {
      throw new HiringValidationError('La evaluación ya no acepta respuestas.', 'assessment_not_open', 409, {
        status: open[0].status,
      })
    }

    const nowMs = Date.parse(ts(open[0].database_now) ?? '')
    const closeMs = Date.parse(ts(open[0].close_deadline) ?? '')
    const answer = ts(open[0].answer_deadline)

    if (!Number.isFinite(nowMs) || !Number.isFinite(closeMs) || nowMs >= closeMs) {
      await runQuery(client,
        `UPDATE greenhouse_hiring.hiring_assessment SET status = 'expired', updated_at = clock_timestamp()
         WHERE assessment_id = $1 AND status = 'in_progress'`, [assessmentId])

return { outcome: 'expired' }
    }

    // Sin límite explícito, la ventana completa de 24 h es también la ventana de guardado.
    if (answer && nowMs >= Date.parse(answer)) {
      throw new HiringValidationError('La evaluación ya no acepta respuestas.', 'assessment_not_open', 409)
    }

    // Tipo real desde DB cuando hay pregunta; el declarado solo para respuestas ad-hoc.
    let needsHumanRating = HUMAN_RATED_QUESTION_TYPES.includes(input.questionType)

    if (questionId) {
      const q = await runQuery<{ type: string }>(
        client,
        `SELECT type FROM greenhouse_hiring.hiring_question WHERE question_id = $1 LIMIT 1`,
        [questionId],
      )

      if (!q[0]) throw new HiringNotFoundError('La pregunta no existe.', 'assessment_question_not_found')
      needsHumanRating = HUMAN_RATED_QUESTION_TYPES.includes(q[0].type as QuestionType)
    }

    const conflictClause = questionId
      ? `(assessment_id, question_id) WHERE question_id IS NOT NULL`
      : `(assessment_id, competency_id) WHERE question_id IS NULL`

    const rows = await runQuery<ResponseRow>(
      client,
      `INSERT INTO greenhouse_hiring.hiring_assessment_response
         (assessment_id, question_id, competency_id, answer_json, needs_human_rating)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT ${conflictClause} DO UPDATE SET
         answer_json = EXCLUDED.answer_json,
         needs_human_rating = EXCLUDED.needs_human_rating,
         updated_at = NOW()
       RETURNING ${RESPONSE_COLS}`,
      [assessmentId, questionId, competencyId, JSON.stringify(input.answer ?? {}), needsHumanRating],
    )

  return { outcome: 'ok', value: normalizeResponse(rows[0]) }
}

export const saveResponse = async (input: SaveResponseInput): Promise<AssessmentResponse> => {
  const result = await withGreenhousePostgresTransaction((client) => saveResponseWithClient(client, input))

  if (result.outcome === 'expired') {
    throw new HiringValidationError('La evaluación ya no acepta respuestas.', 'assessment_not_open', 409)
  }

  return result.value
}

/** Rating por competencia de un evaluador humano (interviewer_scorecard). */
export const recordScorecardRating = async (
  assessmentId: string,
  competencyId: string,
  score: number,
  evaluatorUserId: string,
): Promise<AssessmentResponse> => {
  if (!assessmentId || !competencyId) {
    throw new HiringValidationError('assessmentId y competencyId son obligatorios.', 'assessment_field_required', 400)
  }

  
return withGreenhousePostgresTransaction(async (client) => {
    const rows = await runQuery<ResponseRow>(
      client,
      `INSERT INTO greenhouse_hiring.hiring_assessment_response
         (assessment_id, competency_id, answer_json, human_score, needs_human_rating, scored_by, scored_at)
       VALUES ($1, $2, '{}'::jsonb, $3, FALSE, $4, NOW())
       ON CONFLICT (assessment_id, competency_id) WHERE question_id IS NULL DO UPDATE SET
         human_score = EXCLUDED.human_score,
         scored_by = EXCLUDED.scored_by,
         scored_at = NOW(),
         updated_at = NOW()
       RETURNING ${RESPONSE_COLS}`,
      [assessmentId, competencyId, score, evaluatorUserId],
    )

    
return normalizeResponse(rows[0])
  })
}

// ── Predicado anti-anclaje compartido (TASK-1383 · TASK-1737) ──
// UN solo lugar decide "¿el scorecard PROPIO del viewer en esta application está cerrado?".
// Lo consumen listResponses / listPeerScorecardResults (ratings) y el filtro del
// Expediente de Evaluación (`listHiringApplicationNotes`, TASK-1737). No duplicar el SQL.

const CLOSED_SCORECARD_STATUSES = ['submitted', 'scored'] as const

export interface OwnScorecardState {
  /** El viewer tiene un interviewer_scorecard propio asignado en la application. */
  hasOwn: boolean
  /** Ese scorecard propio ya está `submitted`/`scored`. */
  ownClosed: boolean
}

/** Estado del scorecard PROPIO del viewer para una application (fuente única del predicado). */
export const getOwnScorecardStateForApplication = async (
  applicationId: string,
  viewerUserId: string,
): Promise<OwnScorecardState> => {
  const own = await runGreenhousePostgresQuery<{ status: string }>(
    `SELECT status FROM greenhouse_hiring.hiring_assessment
     WHERE application_id = $1 AND method = 'interviewer_scorecard' AND evaluator_user_id = $2
     LIMIT 1`,
    [applicationId, viewerUserId],
  )

  return {
    hasOwn: Boolean(own[0]),
    ownClosed: Boolean(own[0] && CLOSED_SCORECARD_STATUSES.includes(own[0].status as (typeof CLOSED_SCORECARD_STATUSES)[number])),
  }
}

/**
 * Gate anti-anclaje del Expediente de Evaluación (TASK-1737): el viewer queda "blind"
 * SOLO cuando tiene scorecard propio abierto (asignado y aún no submitted/scored).
 * Un operador sin scorecard asignado (reclutador/People Ops) NO activa el predicado.
 */
export const isViewerBlindForApplicationEvaluation = async (
  applicationId: string,
  viewerUserId: string,
): Promise<boolean> => {
  const { hasOwn, ownClosed } = await getOwnScorecardStateForApplication(applicationId, viewerUserId)

  return hasOwn && !ownClosed
}

/**
 * Respuestas de una instancia. Anti-anclaje (independent-before-debrief, TASK-1383): para un
 * interviewer_scorecard AJENO, el evaluador que mira NO recibe los ratings hasta que su
 * propia instancia de la misma application esté `submitted`/`scored`. Sin `viewerUserId`
 * (llamadas server-internas) no se filtra.
 */
export const listResponses = async (
  assessmentId: string,
  viewerUserId?: string | null,
): Promise<AssessmentResponse[]> => {
  if (viewerUserId) {
    const meta = await runGreenhousePostgresQuery<{
      method: string
      evaluator_user_id: string | null
      application_id: string
    }>(
      `SELECT method, evaluator_user_id, application_id
       FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1 LIMIT 1`,
      [assessmentId],
    )

    const instance = meta[0]

    if (
      instance &&
      instance.method === 'interviewer_scorecard' &&
      instance.evaluator_user_id !== viewerUserId
    ) {
      const { ownClosed } = await getOwnScorecardStateForApplication(instance.application_id, viewerUserId)

      // Anti-anclaje: el evaluador con scorecard abierto no ve ratings ajenos.
      if (!ownClosed) return []
    }
  }

  const rows = await runGreenhousePostgresQuery<ResponseRow>(
    `SELECT ${RESPONSE_COLS} FROM greenhouse_hiring.hiring_assessment_response WHERE assessment_id = $1 ORDER BY created_at`,
    [assessmentId],
  )

  
return rows.map(normalizeResponse)
}

/** Reader transaccional para el boundary candidato; no aplica vistas de evaluador humano. */
export const listResponsesWithClient = async (
  client: PoolClient,
  assessmentId: string,
): Promise<AssessmentResponse[]> => {
  const rows = await runQuery<ResponseRow>(client,
    `SELECT ${RESPONSE_COLS} FROM greenhouse_hiring.hiring_assessment_response
      WHERE assessment_id = $1 ORDER BY created_at`,
    [assessmentId])

  return rows.map(normalizeResponse)
}

/**
 * Ratings de scorecards de OTROS evaluadores de una application, respetando independent-before-debrief:
 * solo se devuelven si el evaluador que mira ya cerró (submitted/scored) su propio scorecard.
 */
export const listPeerScorecardResults = async (
  applicationId: string,
  viewerEvaluatorUserId: string,
): Promise<AssessmentResponse[]> => {
  const { ownClosed } = await getOwnScorecardStateForApplication(applicationId, viewerEvaluatorUserId)

  if (!ownClosed) return [] // anti-anclaje: no ves ratings ajenos hasta cerrar el propio

  const rows = await runGreenhousePostgresQuery<ResponseRow>(
    `SELECT r.* FROM greenhouse_hiring.hiring_assessment_response r
     JOIN greenhouse_hiring.hiring_assessment a ON a.assessment_id = r.assessment_id
     WHERE a.application_id = $1 AND a.method = 'interviewer_scorecard' AND a.evaluator_user_id <> $2
     ORDER BY r.created_at`,
    [applicationId, viewerEvaluatorUserId],
  )

  
return rows.map(normalizeResponse)
}

export const assertAssessmentMethod = (method: string): AssessmentMethod => {
  if (!ASSESSMENT_METHODS.includes(method as AssessmentMethod)) {
    throw new HiringValidationError('method inválido.', 'assessment_invalid_enum', 400)
  }

  
return method as AssessmentMethod
}

// ── TASK-1689 — Re-emisión del token para el email de "evaluación asignada" ──

/**
 * Rota el token de acceso de un candidate_test para que el consumer reactivo de email
 * (`hiring_assessment_assigned_email`) pueda construir el link público SIN que el token
 * viaje por el outbox (el outbox sincroniza a BigQuery: un token crudo ahí sería un leak).
 *
 * Sólo rota cuando el candidato AÚN no comenzó (`assigned`/`sent`): un test `in_progress`,
 * `submitted` o `expired` devuelve null y el consumer hace skip honesto. Marca `sent`.
 * El consumer DEBE chequear su dedupe (wasEmailAlreadySent) ANTES de llamar acá — rotar
 * después de un envío exitoso invalidaría el link ya entregado.
 */
export const reissueCandidateTestTokenForEmail = async (
  assessmentId: string,
): Promise<{ token: string; timeLimitMinutes: number | null; tokenTtlDays: number } | null> => {
  return withGreenhousePostgresTransaction(client => reissueCandidateTestTokenForEmailWithClient(client, assessmentId))
}

export const reissueCandidateTestTokenForEmailWithClient = async (
  client: PoolClient,
  assessmentId: string,
): Promise<{ token: string; timeLimitMinutes: number | null; tokenTtlDays: number } | null> => {
  const rawToken = randomBytes(24).toString('base64url')
  const accessTokenVersionId = randomUUID()

  const rows = await runQuery<{ assessment_id: string; time_limit_minutes: number | string | null }>(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment
       SET access_token_hash = $2,
           access_token_version_id = $3::uuid,
           token_expires_at = NOW() + make_interval(days => ${TOKEN_TTL_DAYS}),
           status = 'sent',
           updated_at = NOW()
       WHERE assessment_id = $1 AND method = 'candidate_test' AND status IN ('assigned', 'sent')
       RETURNING assessment_id, time_limit_minutes`,
    [assessmentId, hashToken(rawToken), accessTokenVersionId],
  )

  if (!rows[0]) return null

  const rawLimit = rows[0].time_limit_minutes

  return {
    token: rawToken,
    timeLimitMinutes: rawLimit == null ? null : Number(rawLimit),
    tokenTtlDays: TOKEN_TTL_DAYS,
  }
}

/**
 * TASK-1746 — Rotation primitive for a governed access recovery. The caller has already
 * inserted the recovery receipt in the same transaction, so the deferred DB constraint
 * proves that this update and its audit either commit together or both roll back.
 */
export const rotateCandidateTestTokenForAccessRecoveryWithClient = async (
  client: PoolClient,
  input: {
    assessmentId: string
    expectedStatus: 'assigned' | 'sent' | 'in_progress' | 'expired'
    resultingStatus: 'sent' | 'in_progress'
    expiresAt: Date
    tokenVersionId: string
  },
): Promise<{ token: string; timeLimitMinutes: number | null } | null> => {
  const rawToken = randomBytes(24).toString('base64url')

  const rows = await runQuery<{ assessment_id: string; time_limit_minutes: number | string | null }>(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment
     SET access_token_hash = $2,
         access_token_version_id = $3::uuid,
         token_expires_at = $4,
         status = $5,
         updated_at = NOW()
     WHERE assessment_id = $1
       AND method = 'candidate_test'
       AND status = $6
       AND (($5 = 'sent' AND started_at IS NULL) OR ($5 = 'in_progress' AND started_at IS NOT NULL))
     RETURNING assessment_id, time_limit_minutes`,
    [
      input.assessmentId,
      hashToken(rawToken),
      input.tokenVersionId,
      input.expiresAt,
      input.resultingStatus,
      input.expectedStatus,
    ],
  )

  if (!rows[0]) return null

  return {
    token: rawToken,
    timeLimitMinutes: rows[0].time_limit_minutes == null ? null : Number(rows[0].time_limit_minutes),
  }
}
