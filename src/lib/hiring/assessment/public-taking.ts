import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  getAssessmentById,
  listResponses,
  resolveAssessmentByToken,
  saveResponse,
  startAssessment,
} from '@/lib/hiring/assessment/instances'
import { buildPublicQuestion } from '@/lib/hiring/assessment/store'
import { submitAssessment } from '@/lib/hiring/assessment/scoring'
import { HiringNotFoundError, HiringValidationError } from '@/lib/hiring/errors'
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

const numberFromAccommodation = (accommodations: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const raw = accommodations[key]
    const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN

    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return null
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
  startedAt: string | null
  submittedAt: string | null
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

export const resolveAssessmentTiming = (assessment: Assessment): PublicAssessmentTiming => {
  const baseMinutes = Math.max(0, assessment.timeLimitMinutes ?? 0)

  const explicitExtra = numberFromAccommodation(assessment.accommodations, [
    'extraMinutes',
    'timeExtensionMinutes',
    'additionalMinutes',
    'extendedTimeMinutes',
  ])

  const multiplier = numberFromAccommodation(assessment.accommodations, ['timeMultiplier', 'extendedTimeMultiplier'])
  const percent = numberFromAccommodation(assessment.accommodations, ['extendedTimePercent', 'timeExtensionPercent'])
  const multiplierExtra = multiplier && multiplier > 1 ? Math.round(baseMinutes * (multiplier - 1)) : 0
  const percentExtra = percent ? Math.round(baseMinutes * (percent / 100)) : 0
  const extraMinutes = Math.max(0, Math.round(explicitExtra ?? Math.max(multiplierExtra, percentExtra, 0)))
  const effectiveMinutes = Math.max(0, baseMinutes + extraMinutes)

  if (!assessment.startedAt || effectiveMinutes <= 0) {
    return {
      baseMinutes,
      extraMinutes,
      effectiveMinutes,
      hasAccommodation: extraMinutes > 0,
      startedAt: assessment.startedAt,
      submittedAt: assessment.submittedAt,
      expiresAt: null,
      remainingSeconds: assessment.startedAt ? 0 : null,
    }
  }

  const startedMs = new Date(assessment.startedAt).getTime()
  const expiresMs = startedMs + effectiveMinutes * 60_000
  const remainingSeconds = Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000))

  return {
    baseMinutes,
    extraMinutes,
    effectiveMinutes,
    hasAccommodation: extraMinutes > 0,
    startedAt: assessment.startedAt,
    submittedAt: assessment.submittedAt,
    expiresAt: new Date(expiresMs).toISOString(),
    remainingSeconds,
  }
}

const getAssessmentContext = async (assessmentId: string): Promise<ContextRow | null> => {
  const rows = await runGreenhousePostgresQuery<ContextRow>(
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
     LIMIT 1`,
    [assessmentId],
  )

  return rows[0] ?? null
}

export const listPublicAssessmentQuestions = async (assessment: Assessment): Promise<{
  competencies: PublicAssessmentCompetency[]
  questions: PublicAssessmentQuestion[]
}> => {
  if (!assessment.templateId) return { competencies: [], questions: [] }

  const rows = await runGreenhousePostgresQuery<PublicQuestionRow>(
    `WITH ranked AS (
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
     LIMIT 12`,
    [assessment.templateId],
  )

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

const publicResponsesFrom = (responses: AssessmentResponse[]): PublicAssessmentResponse[] =>
  responses.map((response) => ({
    responseId: response.responseId,
    questionId: response.questionId,
    competencyId: response.competencyId,
    answer: response.answer,
    updatedAt: response.updatedAt,
  }))

export const buildPublicAssessmentView = async (assessment: Assessment): Promise<PublicAssessmentView> => {
  const context = await getAssessmentContext(assessment.assessmentId)

  if (!context) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

  const [{ competencies, questions }, responses] = await Promise.all([
    listPublicAssessmentQuestions(assessment),
    listResponses(assessment.assessmentId),
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
    timing: resolveAssessmentTiming(assessment),
    competencies,
    questions,
    responses: publicResponsesFrom(responses),
  }
}

export const resolvePublicAssessmentViewByToken = async (token: string): Promise<PublicAssessmentView | null> => {
  const assessment = await resolveAssessmentByToken(token)

  return assessment ? buildPublicAssessmentView(assessment) : null
}

export const startPublicAssessment = async (token: string): Promise<PublicAssessmentView> => {
  const assessment = await resolveAssessmentByToken(token)

  if (!assessment) throw new HiringValidationError('La evaluación no está disponible.', 'assessment_not_startable', 404)

  const started = await startAssessment(assessment.assessmentId)

  return buildPublicAssessmentView(started)
}

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
  const assessment = await resolveAssessmentByToken(token)

  if (!assessment) throw new HiringValidationError('La evaluación no está disponible.', 'assessment_not_open', 409)

  const { questions } = await listPublicAssessmentQuestions(assessment)
  const question = questions.find((entry) => entry.questionId === input.questionId)

  if (!question) throw new HiringValidationError('La pregunta no pertenece a esta evaluación.', 'assessment_question_not_found', 404)

  await saveResponse({
    assessmentId: assessment.assessmentId,
    competencyId: question.competencyId,
    questionId: question.questionId,
    questionType: question.type,
    answer: normalizePublicAnswer(question.type, input.answer),
  })

  const updated = await getAssessmentById(assessment.assessmentId)

  if (!updated) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

  return buildPublicAssessmentView(updated)
}

export const submitPublicAssessment = async (token: string): Promise<PublicAssessmentView> => {
  const assessment = await resolveAssessmentByToken(token)

  if (!assessment) throw new HiringValidationError('La evaluación no está disponible.', 'assessment_not_open', 409)

  const [{ questions }, responses] = await Promise.all([
    listPublicAssessmentQuestions(assessment),
    listResponses(assessment.assessmentId),
  ])

  const answeredQuestionIds = new Set(responses.map((response) => response.questionId).filter(Boolean))
  const missingQuestion = questions.find((question) => !answeredQuestionIds.has(question.questionId))

  if (questions.length === 0 || missingQuestion) {
    throw new HiringValidationError('La evaluación tiene respuestas pendientes.', 'assessment_incomplete', 400, {
      missingQuestionId: missingQuestion?.questionId ?? null,
    })
  }

  await submitAssessment(assessment.assessmentId, null)
  const submitted = await getAssessmentById(assessment.assessmentId)

  if (!submitted) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

  return buildPublicAssessmentView(submitted)
}
