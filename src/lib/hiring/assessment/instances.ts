import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
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

// ── Normalizers ──

type AssessmentRow = {
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

const normalizeAssessment = (r: AssessmentRow): Assessment => ({
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
const ASSESSMENT_COLS = `assessment_id, public_id, application_id, template_id, method, evaluator_user_id, status, time_limit_minutes, accommodations_json, started_at, submitted_at, created_by, created_at, updated_at`

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

export const listAssessmentsForApplication = async (applicationId: string): Promise<Assessment[]> => {
  const rows = await runGreenhousePostgresQuery<AssessmentRow>(
    `SELECT ${ASSESSMENT_COLS} FROM greenhouse_hiring.hiring_assessment WHERE application_id = $1 ORDER BY created_at DESC`,
    [applicationId],
  )

  
return rows.map(normalizeAssessment)
}

/** Resuelve una instancia por su token (single-use). Solo si sigue rendible. */
export const resolveAssessmentByToken = async (rawToken: string): Promise<Assessment | null> => {
  if (!rawToken) return null

  const rows = await runGreenhousePostgresQuery<AssessmentRow>(
    `SELECT ${ASSESSMENT_COLS} FROM greenhouse_hiring.hiring_assessment
     WHERE access_token_hash = $1 AND method = 'candidate_test' AND status IN ('assigned', 'sent', 'in_progress')
     LIMIT 1`,
    [hashToken(rawToken)],
  )

  
return rows[0] ? normalizeAssessment(rows[0]) : null
}

// ── Writers ──

interface AssignCandidateTestInput {
  applicationId: string
  templateId: string
  timeLimitMinutes?: number | null
  accommodations?: Record<string, unknown>
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

    // Idempotencia: si ya hay un candidate_test abierto para (application, template), lo reusamos
    // (sin re-emitir token — el token vive una sola vez).
    const existing = await runQuery<AssessmentRow>(
      client,
      `SELECT ${ASSESSMENT_COLS} FROM greenhouse_hiring.hiring_assessment
       WHERE application_id = $1 AND template_id = $2 AND method = 'candidate_test'
         AND status IN ('assigned', 'sent', 'in_progress') LIMIT 1`,
      [applicationId, templateId],
    )

    if (existing[0]) {
      throw new HiringValidationError(
        'Ya existe una evaluación abierta para esta postulación y plantilla.',
        'assessment_already_open',
        409,
        { assessmentId: str(existing[0].assessment_id) },
      )
    }

    const rawToken = randomBytes(24).toString('base64url')

    const rows = await runQuery<AssessmentRow>(
      client,
      `INSERT INTO greenhouse_hiring.hiring_assessment
         (application_id, template_id, method, status, access_token_hash, time_limit_minutes, accommodations_json, created_by)
       VALUES ($1, $2, 'candidate_test', 'assigned', $3, $4, $5::jsonb, $6)
       RETURNING ${ASSESSMENT_COLS}`,
      [
        applicationId,
        templateId,
        hashToken(rawToken),
        input.timeLimitMinutes ?? null,
        JSON.stringify(input.accommodations ?? {}),
        actorUserId,
      ],
    )

    const assessment = normalizeAssessment(rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessment,
        aggregateId: assessment.assessmentId,
        eventType: EVENT_TYPES.hiringAssessmentAssigned,
        payload: { assessmentId: assessment.assessmentId, applicationId, templateId, method: 'candidate_test' },
      },
      client,
    )
    
return { assessment, token: rawToken }
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

/** Marca una instancia como en progreso (arranca el timer). Idempotente. */
export const startAssessment = async (assessmentId: string): Promise<Assessment> => {
  const rows = await runGreenhousePostgresQuery<AssessmentRow>(
    `UPDATE greenhouse_hiring.hiring_assessment
     SET status = 'in_progress', started_at = COALESCE(started_at, NOW())
     WHERE assessment_id = $1 AND status IN ('assigned', 'sent', 'in_progress')
     RETURNING ${ASSESSMENT_COLS}`,
    [assessmentId],
  )

  if (!rows[0]) throw new HiringNotFoundError('La evaluación no existe o no está rendible.', 'assessment_not_startable')
  
return normalizeAssessment(rows[0])
}

interface SaveResponseInput {
  assessmentId: string
  competencyId: string
  questionId?: string | null
  questionType: QuestionType
  answer: Record<string, unknown>
}

/** Guarda una respuesta (candidate_test). Idempotente por (assessment, question). El scoring
 *  objetivo se computa al submit (Slice 4); acá solo se marca needs_human_rating por tipo. */
export const saveResponse = async (input: SaveResponseInput): Promise<AssessmentResponse> => {
  const assessmentId = str(input.assessmentId)
  const competencyId = str(input.competencyId)

  if (!assessmentId || !competencyId) {
    throw new HiringValidationError('assessmentId y competencyId son obligatorios.', 'assessment_field_required', 400)
  }

  const needsHumanRating = HUMAN_RATED_QUESTION_TYPES.includes(input.questionType)

  return withGreenhousePostgresTransaction(async (client) => {
    const open = await runQuery<{ status: string }>(
      client,
      `SELECT status FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1 LIMIT 1`,
      [assessmentId],
    )

    if (!open[0]) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

    if (!['assigned', 'sent', 'in_progress'].includes(open[0].status)) {
      throw new HiringValidationError('La evaluación ya no acepta respuestas.', 'assessment_not_open', 409, {
        status: open[0].status,
      })
    }

    const rows = await runQuery<ResponseRow>(
      client,
      `INSERT INTO greenhouse_hiring.hiring_assessment_response
         (assessment_id, question_id, competency_id, answer_json, needs_human_rating)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING ${RESPONSE_COLS}`,
      [assessmentId, input.questionId ?? null, competencyId, JSON.stringify(input.answer ?? {}), needsHumanRating],
    )

    
return normalizeResponse(rows[0])
  })
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
       RETURNING ${RESPONSE_COLS}`,
      [assessmentId, competencyId, score, evaluatorUserId],
    )

    
return normalizeResponse(rows[0])
  })
}

/**
 * Respuestas de una instancia. Anti-anclaje (independent-before-debrief): para un
 * interviewer_scorecard, un evaluador NO ve los ratings de OTROS evaluadores de la misma
 * application hasta que su propia instancia esté `scored`/`submitted`.
 */
export const listResponses = async (
  assessmentId: string,
  viewerUserId?: string | null,
): Promise<AssessmentResponse[]> => {
  const rows = await runGreenhousePostgresQuery<ResponseRow>(
    `SELECT ${RESPONSE_COLS} FROM greenhouse_hiring.hiring_assessment_response WHERE assessment_id = $1 ORDER BY created_at`,
    [assessmentId],
  )

  void viewerUserId
  
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
  const own = await runGreenhousePostgresQuery<{ status: string }>(
    `SELECT status FROM greenhouse_hiring.hiring_assessment
     WHERE application_id = $1 AND method = 'interviewer_scorecard' AND evaluator_user_id = $2 LIMIT 1`,
    [applicationId, viewerEvaluatorUserId],
  )

  const ownClosed = own[0] && ['submitted', 'scored'].includes(own[0].status)

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
