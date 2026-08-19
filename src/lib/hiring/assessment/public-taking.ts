import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import {
  type AssessmentDeadlineResult,
  getAssessmentByIdWithClient,
  listResponses,
  listResponsesWithClient,
  resolveAssessmentByTokenWithClient,
  saveResponseWithClient,
  startAssessmentWithClient,
} from '@/lib/hiring/assessment/instances'
import { buildPublicQuestion } from '@/lib/hiring/assessment/store'
import { submitAssessmentWithClient } from '@/lib/hiring/assessment/scoring'
import { HiringNotFoundError, HiringValidationError } from '@/lib/hiring/errors'
import {
  captureVoluntaryDemographicSelfIdWithClient,
  getSelfIdSubjectByAssessmentWithClient,
} from '@/lib/hiring/assessment/fairness/capture-self-id'
import type {
  CaptureVoluntaryDemographicSelfIdResult,
  DemographicSelection,
} from '@/lib/hiring/assessment/fairness/contracts'
import type {
  Assessment,
  AssessmentResponse,
  CompetencyCategory,
  PublicQuestion,
  Question,
  QuestionLevel,
  QuestionType,
} from '@/types/hiring-assessment'

type ContextRow = {
  assessment_id: unknown
  application_public_id: unknown
  template_name: unknown
  template_role_hint: unknown
  opening_public_id: unknown
  opening_title: unknown
  public_area: unknown
  public_seniority: unknown
  requested_role: unknown
}

type PublicQuestionRow = {
  module_id: unknown
  weight: unknown
  target_level: unknown
  competency_id: unknown
  competency_key: unknown
  competency_name: unknown
  competency_category: unknown
  competency_description: unknown
  question_id: unknown
  level: unknown
  type: unknown
  prompt: unknown
  options_json: unknown
  question_rank: unknown
  module_rank: unknown
}

const str = (value: unknown): string => (value == null ? '' : String(value))
const nstr = (value: unknown): string | null => (value == null ? null : String(value))

const num = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const jsonArr = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

const jsonObj = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return {}
}

/**
 * TASK-1719 — Lectura del ÚNICO contrato canónico de accommodations: `extraMinutes`.
 *
 * ⚠️ Esto aceptaba SEIS grafías del mismo hecho (`extraMinutes`, `timeExtensionMinutes`,
 * `additionalMinutes`, `extendedTimeMinutes`, más `timeMultiplier`/`extendedTimeMultiplier`
 * y `extendedTimePercent`/`timeExtensionPercent`), defensa escrita cuando no existía write
 * path que fijara una forma. Se narró al abrir el write path (`accommodations.ts`), con la
 * base verificada: 17 instancias, 0 con `accommodations_json` distinto de `{}` y 0 claves
 * distintas en uso — no había ningún ajuste que perder.
 *
 * Seis maneras de expresar lo mismo son un contrato implícito, y es la clase de bug que ya
 * mordió a este repo: el `perCriterion` de TASK-1734 admitía dos lecturas y el router comparó
 * contra la equivocada en 11 de 14 casos reales, con el build verde. NUNCA reintroducir un
 * alias "por compatibilidad": el escritor canónico es uno solo.
 */
const accommodationExtraMinutes = (accommodations: Record<string, unknown>): number => {
  const raw = accommodations.extraMinutes
  const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

export interface PublicAssessmentCompetency {
  moduleId: string
  competencyId: string
  key: string
  name: string
  category: CompetencyCategory
  description: string | null
  targetLevel: QuestionLevel | null
  weight: number
}

export interface PublicAssessmentQuestion extends PublicQuestion {
  competencyKey: string
  competencyName: string
  competencyCategory: CompetencyCategory
  targetLevel: QuestionLevel | null
  weight: number
  ordinal: number
}

export interface PublicAssessmentResponse {
  responseId: string
  questionId: string | null
  competencyId: string
  answer: Record<string, unknown>
  updatedAt: string
}

export interface PublicAssessmentTiming {
  baseMinutes: number
  extraMinutes: number
  effectiveMinutes: number
  hasAccommodation: boolean
  hasTimeLimit: boolean
  databaseNowAt: string
  startedAt: string | null
  submittedAt: string | null
  answerDeadlineAt: string | null
  closeDeadlineAt: string | null
  phase: 'answering' | 'submit_grace' | 'closed'
  expiresAt: string | null
  remainingSeconds: number | null
}

export interface PublicAssessmentView {
  assessment: {
    assessmentId: string
    publicId: string
    applicationPublicId: string
    status: Assessment['status']
    roleTitle: string
    templateName: string | null
    openingPublicId: string | null
    area: string | null
    seniority: string | null
  }
  timing: PublicAssessmentTiming
  competencies: PublicAssessmentCompetency[]
  questions: PublicAssessmentQuestion[]
  responses: PublicAssessmentResponse[]
}

export const resolveAssessmentTiming = (
  assessment: Assessment,
  databaseNowMs = Date.now(),
): PublicAssessmentTiming => {
  const baseMinutes = Math.max(0, assessment.timeLimitMinutes ?? 0)
  const extraMinutes = accommodationExtraMinutes(assessment.accommodations)
  const effectiveMinutes = Math.max(0, baseMinutes + extraMinutes)
  const hasTimeLimit = assessment.timeLimitMinutes != null
  const terminal = ['submitted', 'scored', 'expired', 'cancelled'].includes(assessment.status)

  if (!assessment.startedAt) {
    return {
      baseMinutes,
      extraMinutes,
      effectiveMinutes,
      hasAccommodation: extraMinutes > 0,
      hasTimeLimit,
      databaseNowAt: new Date(databaseNowMs).toISOString(),
      startedAt: assessment.startedAt,
      submittedAt: assessment.submittedAt,
      answerDeadlineAt: null,
      closeDeadlineAt: null,
      phase: terminal ? 'closed' : 'answering',
      expiresAt: null,
      remainingSeconds: null,
    }
  }

  const startedMs = new Date(assessment.startedAt).getTime()
  const answerDeadlineMs = hasTimeLimit ? startedMs + effectiveMinutes * 60_000 : null

  const closeDeadlineMs = answerDeadlineMs == null
    ? startedMs + 24 * 60 * 60_000
    : answerDeadlineMs + 30 * 60_000

  const phase = terminal || databaseNowMs >= closeDeadlineMs
    ? 'closed'
    : answerDeadlineMs != null && databaseNowMs >= answerDeadlineMs
      ? 'submit_grace'
      : 'answering'

  const visibleDeadlineMs = phase === 'answering' ? (answerDeadlineMs ?? closeDeadlineMs) : closeDeadlineMs
  const remainingSeconds = Math.max(0, Math.ceil((visibleDeadlineMs - databaseNowMs) / 1000))

  return {
    baseMinutes,
    extraMinutes,
    effectiveMinutes,
    hasAccommodation: extraMinutes > 0,
    hasTimeLimit,
    databaseNowAt: new Date(databaseNowMs).toISOString(),
    startedAt: assessment.startedAt,
    submittedAt: assessment.submittedAt,
    answerDeadlineAt: answerDeadlineMs == null ? null : new Date(answerDeadlineMs).toISOString(),
    closeDeadlineAt: new Date(closeDeadlineMs).toISOString(),
    phase,
    expiresAt: new Date(visibleDeadlineMs).toISOString(),
    remainingSeconds,
  }
}

const getAssessmentContext = async (
  assessmentId: string,
  client: PoolClient | null = null,
): Promise<ContextRow | null> => {
  const sql =
    `SELECT a.assessment_id,
            app.public_id AS application_public_id,
            tpl.name AS template_name,
            tpl.role_hint AS template_role_hint,
            opening.public_id AS opening_public_id,
            COALESCE(opening.public_title, opening.internal_title) AS opening_title,
            opening.public_area,
            opening.public_seniority,
            demand.requested_role
     FROM greenhouse_hiring.hiring_assessment a
     JOIN greenhouse_hiring.hiring_application app ON app.application_id = a.application_id
     JOIN greenhouse_hiring.hiring_opening opening ON opening.opening_id = app.opening_id
     LEFT JOIN greenhouse_hiring.talent_demand demand ON demand.demand_id = opening.demand_id
     LEFT JOIN greenhouse_hiring.hiring_assessment_template tpl ON tpl.template_id = a.template_id
     WHERE a.assessment_id = $1
     LIMIT 1`

  const rows = client
    ? (await client.query<ContextRow>(sql, [assessmentId])).rows
    : await runGreenhousePostgresQuery<ContextRow>(sql, [assessmentId])

  return rows[0] ?? null
}

/**
 * SoT de la resolución EN VIVO del cuestionario ($1 = template_id). Se exporta porque el
 * `template_content_digest` de la policy (TASK-1719 D4) debe observar EXACTAMENTE lo que
 * rendiría el candidato: dos consultas distintas producirían un digest que no detecta el
 * drift real del banco de preguntas. Consumidores: `listPublicAssessmentQuestions` acá y
 * `resolveTemplateContentDigest` en `assignment-policy/readers.ts`. NUNCA duplicar el SQL.
 */
export const PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL = `WITH ranked AS (
       SELECT tm.module_id,
              tm.weight,
              tm.target_level,
              c.competency_id,
              c.key AS competency_key,
              c.name AS competency_name,
              c.category AS competency_category,
              c.description AS competency_description,
              q.question_id,
              q.level,
              q.type,
              q.prompt,
              q.options_json,
              ROW_NUMBER() OVER (
                PARTITION BY tm.module_id
                ORDER BY
                  CASE WHEN tm.target_level IS NOT NULL AND q.level = tm.target_level THEN 0 ELSE 1 END,
                  CASE WHEN q.type IN ('situational', 'open_text') THEN 0 ELSE 1 END,
                  q.created_at DESC NULLS LAST,
                  q.question_id
              ) AS question_rank,
              DENSE_RANK() OVER (ORDER BY tm.weight DESC, c.key) AS module_rank
       FROM greenhouse_hiring.hiring_assessment_template_module tm
       JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = tm.competency_id
       LEFT JOIN greenhouse_hiring.hiring_question q
         ON q.competency_id = tm.competency_id
        AND q.status = 'active'
        AND (tm.target_level IS NULL OR q.level = tm.target_level)
       WHERE tm.template_id = $1
     )
     SELECT *
     FROM ranked
     WHERE question_id IS NULL
        OR question_rank <= CASE WHEN module_rank <= 3 THEN 2 ELSE 1 END
     ORDER BY weight DESC, competency_key, question_rank
     LIMIT 12`

export const listPublicAssessmentQuestionsWithClient = async (
  client: PoolClient | null,
  assessment: Assessment,
): Promise<{
  competencies: PublicAssessmentCompetency[]
  questions: PublicAssessmentQuestion[]
}> => {
  if (!assessment.templateId) return { competencies: [], questions: [] }

  const rows = client
    ? (await client.query<PublicQuestionRow>(PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL, [assessment.templateId])).rows
    : await runGreenhousePostgresQuery<PublicQuestionRow>(PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL, [assessment.templateId])

  const competencyMap = new Map<string, PublicAssessmentCompetency>()
  const questions: PublicAssessmentQuestion[] = []

  for (const row of rows) {
    const competencyId = str(row.competency_id)

    if (!competencyMap.has(competencyId)) {
      competencyMap.set(competencyId, {
        moduleId: str(row.module_id),
        competencyId,
        key: str(row.competency_key),
        name: str(row.competency_name),
        category: str(row.competency_category) as CompetencyCategory,
        description: nstr(row.competency_description),
        targetLevel: nstr(row.target_level) as QuestionLevel | null,
        weight: num(row.weight),
      })
    }

    if (!row.question_id) continue

    const question: Question = {
      questionId: str(row.question_id),
      competencyId,
      level: str(row.level) as QuestionLevel,
      type: str(row.type) as QuestionType,
      prompt: str(row.prompt),
      options: jsonArr(row.options_json),
      answerKey: {},
      rubric: {},
      status: 'active',
      createdBy: null,
      createdAt: '',
      updatedAt: '',
    }

    questions.push({
      ...buildPublicQuestion(question),
      competencyKey: str(row.competency_key),
      competencyName: str(row.competency_name),
      competencyCategory: str(row.competency_category) as CompetencyCategory,
      targetLevel: nstr(row.target_level) as QuestionLevel | null,
      weight: num(row.weight),
      ordinal: questions.length + 1,
    })
  }

  return {
    competencies: Array.from(competencyMap.values()),
    questions,
  }
}

export const listPublicAssessmentQuestions = (assessment: Assessment) =>
  listPublicAssessmentQuestionsWithClient(null, assessment)

const publicResponsesFrom = (responses: AssessmentResponse[]): PublicAssessmentResponse[] =>
  responses.map((response) => ({
    responseId: response.responseId,
    questionId: response.questionId,
    competencyId: response.competencyId,
    answer: response.answer,
    updatedAt: response.updatedAt,
  }))

export const buildPublicAssessmentViewWithClient = async (
  client: PoolClient | null,
  assessment: Assessment,
): Promise<PublicAssessmentView> => {
  const databaseNowMs = client
    ? new Date((await client.query<{ database_now: Date | string }>(
      'SELECT clock_timestamp() AS database_now',
    )).rows[0]?.database_now ?? Date.now()).getTime()
    : Date.now()

  const context = await getAssessmentContext(assessment.assessmentId, client)

  if (!context) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

  const [{ competencies, questions }, responses] = await Promise.all([
    listPublicAssessmentQuestionsWithClient(client, assessment),
    client ? listResponsesWithClient(client, assessment.assessmentId) : listResponses(assessment.assessmentId),
  ])

  const roleTitle = str(context.opening_title || context.requested_role || context.template_name || 'la vacante')

  return {
    assessment: {
      assessmentId: assessment.assessmentId,
      publicId: assessment.publicId,
      applicationPublicId: str(context.application_public_id),
      status: assessment.status,
      roleTitle,
      templateName: nstr(context.template_name),
      openingPublicId: nstr(context.opening_public_id),
      area: nstr(context.public_area),
      seniority: nstr(context.public_seniority),
    },
    timing: resolveAssessmentTiming(assessment, databaseNowMs),
    competencies,
    questions,
    responses: publicResponsesFrom(responses),
  }
}

export const buildPublicAssessmentView = (assessment: Assessment): Promise<PublicAssessmentView> =>
  buildPublicAssessmentViewWithClient(null, assessment)

export const resolvePublicAssessmentViewByToken = async (token: string): Promise<PublicAssessmentView | null> => {
  return withGreenhousePostgresTransaction(async (client) => {
    const assessment = await resolveAssessmentByTokenWithClient(client, token)

    return assessment ? buildPublicAssessmentViewWithClient(client, assessment) : null
  })
}

export const capturePublicAssessmentSelfId = async (
  token: string,
  input: {
    consentGranted?: boolean
    consentPolicyVersion?: string
    selections?: DemographicSelection[]
  },
): Promise<CaptureVoluntaryDemographicSelfIdResult> => {
  if (input.consentGranted !== true) {
    throw new HiringValidationError(
      'Se requiere consentimiento explícito para registrar la autoidentificación.',
      'hiring_fairness_consent_required',
      422,
    )
  }

  const result = await withGreenhousePostgresTransaction(async (client) => {
    const assessment = await resolveAssessmentByTokenWithClient(client, token)

    if (!assessment) return null

    const subject = await getSelfIdSubjectByAssessmentWithClient(client, assessment.assessmentId)

    if (!subject) {
      throw new HiringValidationError('La evaluación no está disponible.', 'assessment_selfid_unavailable', 404)
    }

    return captureVoluntaryDemographicSelfIdWithClient(client, {
      identityProfileId: subject.identityProfileId,
      applicationId: subject.applicationId,
      consentGranted: true,
      consentPolicyVersion: input.consentPolicyVersion?.trim() ?? '',
      selections: input.selections ?? [],
      actorKind: 'candidate_token',
    })
  })

  if (!result) {
    throw new HiringValidationError('La evaluación no está disponible.', 'assessment_selfid_unavailable', 404)
  }

  return result
}

export const startPublicAssessment = async (token: string): Promise<PublicAssessmentView> => {
  const result = await withGreenhousePostgresTransaction(async (client) => {
    const assessment = await resolveAssessmentByTokenWithClient(client, token)

    if (!assessment) return null

    const started = await startPublicAssessmentWithClient(client, assessment.assessmentId)

    return started.outcome === 'ok'
      ? { outcome: 'ok' as const, view: await buildPublicAssessmentViewWithClient(client, started.value) }
      : started
  })

  if (!result || result.outcome === 'expired') {
    throw new HiringValidationError(
      'La evaluación no está disponible.',
      'assessment_not_startable',
      result ? 409 : 404,
    )
  }

  return result.view
}

export const startPublicAssessmentWithClient = (
  client: PoolClient,
  assessmentId: string,
): Promise<AssessmentDeadlineResult<Assessment>> => startAssessmentWithClient(client, assessmentId)

const normalizePublicAnswer = (type: QuestionType, answer: unknown): Record<string, unknown> => {
  const value = jsonObj(answer)

  if (type === 'single_choice') {
    const selected = value.selected

    if (typeof selected !== 'string' || !selected.trim()) {
      throw new HiringValidationError('Selecciona una respuesta.', 'assessment_answer_required', 400)
    }

    return { selected }
  }

  if (type === 'multi_choice') {
    const selected = Array.isArray(value.selected) ? value.selected.map(String).filter(Boolean) : []

    if (selected.length === 0) {
      throw new HiringValidationError('Selecciona al menos una respuesta.', 'assessment_answer_required', 400)
    }

    return { selected }
  }

  if (type === 'likert') {
    const likertValue = Number(value.value)

    if (!Number.isFinite(likertValue)) {
      throw new HiringValidationError('Selecciona un valor.', 'assessment_answer_required', 400)
    }

    return { value: likertValue }
  }

  const text = typeof value.text === 'string' ? value.text.trim() : ''

  if (!text) throw new HiringValidationError('Escribe tu respuesta.', 'assessment_answer_required', 400)

  return { text: text.slice(0, 6000) }
}

export const savePublicAssessmentResponse = async (
  token: string,
  input: { questionId: string; answer: unknown },
): Promise<PublicAssessmentView> => {
  const result = await withGreenhousePostgresTransaction(async (client) => {
    const assessment = await resolveAssessmentByTokenWithClient(client, token)

    if (!assessment) return null

    const saved = await savePublicAssessmentResponseWithClient(client, assessment, input)

    if (saved.outcome === 'expired') return saved

    const updated = await getAssessmentByIdWithClient(client, assessment.assessmentId)

    if (!updated) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

    return { outcome: 'ok' as const, view: await buildPublicAssessmentViewWithClient(client, updated) }
  })

  if (!result || result.outcome === 'expired') {
    throw new HiringValidationError('La evaluación no está disponible.', 'assessment_not_open', 409)
  }

  return result.view
}

export const savePublicAssessmentResponseWithClient = async (
  client: PoolClient,
  assessment: Assessment,
  input: { questionId: string; answer: unknown },
): Promise<AssessmentDeadlineResult<void>> => {

  const { questions } = await listPublicAssessmentQuestionsWithClient(client, assessment)
  const question = questions.find((entry) => entry.questionId === input.questionId)

  if (!question) throw new HiringValidationError('La pregunta no pertenece a esta evaluación.', 'assessment_question_not_found', 404)

  const saved = await saveResponseWithClient(client, {
    assessmentId: assessment.assessmentId,
    competencyId: question.competencyId,
    questionId: question.questionId,
    questionType: question.type,
    answer: normalizePublicAnswer(question.type, input.answer),
  })

  return saved.outcome === 'ok' ? { outcome: 'ok', value: undefined } : saved
}

export const submitPublicAssessment = async (token: string): Promise<PublicAssessmentView> => {
  const result = await withGreenhousePostgresTransaction(async (client) => {
    const assessment = await resolveAssessmentByTokenWithClient(client, token)

    if (!assessment) return null

    const submitted = await submitPublicAssessmentWithClient(client, assessment)

    if (submitted.outcome === 'expired') return submitted

    const updated = await getAssessmentByIdWithClient(client, assessment.assessmentId)

    if (!updated) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

    return { outcome: 'ok' as const, view: await buildPublicAssessmentViewWithClient(client, updated) }
  })

  if (!result || result.outcome === 'expired') {
    throw new HiringValidationError('La evaluación no está disponible.', 'assessment_not_open', 409)
  }

  return result.view
}

export const submitPublicAssessmentWithClient = async (
  client: PoolClient,
  assessment: Assessment,
): Promise<AssessmentDeadlineResult<void>> => {

  const [{ questions }, responses] = await Promise.all([
    listPublicAssessmentQuestionsWithClient(client, assessment),
    listResponsesWithClient(client, assessment.assessmentId),
  ])

  const answeredQuestionIds = new Set(responses.map((response) => response.questionId).filter(Boolean))
  const missingQuestion = questions.find((question) => !answeredQuestionIds.has(question.questionId))

  if (questions.length === 0 || missingQuestion) {
    throw new HiringValidationError('La evaluación tiene respuestas pendientes.', 'assessment_incomplete', 400, {
      missingQuestionId: missingQuestion?.questionId ?? null,
    })
  }

  return submitAssessmentWithClient(client, assessment.assessmentId, null)
}
