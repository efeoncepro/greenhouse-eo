import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  COMPETENCY_CATEGORIES,
  QUESTION_LEVELS,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  type Competency,
  type CompetencyCategory,
  type CreateQuestionInput,
  type CreateTemplateInput,
  type AssessmentTemplate,
  type AssessmentTemplateWithModules,
  type ListQuestionFilters,
  type PublicQuestion,
  type Question,
  type QuestionStatus,
  type TemplateModule,
} from '@/types/hiring-assessment'

import { HiringNotFoundError, HiringValidationError } from '../errors'

// ── Query helper + coerción ──

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

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)

  
return Number.isFinite(n) ? n : 0
}

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

const jsonArr = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v

  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)

      if (Array.isArray(p)) return p
    } catch {
      return []
    }
  }

  
return []
}

const assertNonEmpty = (v: unknown, field: string): string => {
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new HiringValidationError(`El campo ${field} es obligatorio.`, 'assessment_field_required', 400, { field })
  }

  
return v.trim()
}

const assertEnum = <T extends string>(v: unknown, allowed: readonly T[], field: string): T => {
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw new HiringValidationError(`El valor de ${field} no es válido.`, 'assessment_invalid_enum', 400, { field, allowed })
  }

  
return v as T
}

// ══════════════════════════════════════════════════════════════════════════
// Competency catalog
// ══════════════════════════════════════════════════════════════════════════

type CompetencyRow = {
  competency_id: unknown
  key: unknown
  name: unknown
  category: unknown
  description: unknown
  status: unknown
  created_at: unknown
  updated_at: unknown
}

const normalizeCompetency = (r: CompetencyRow): Competency => ({
  competencyId: str(r.competency_id),
  key: str(r.key),
  name: str(r.name),
  category: str(r.category) as CompetencyCategory,
  description: nstr(r.description),
  status: str(r.status) as Competency['status'],
  createdAt: ts(r.created_at) ?? '',
  updatedAt: ts(r.updated_at) ?? '',
})

const COMPETENCY_COLS = `competency_id, key, name, category, description, status, created_at, updated_at`

export const listCompetencies = async (category?: CompetencyCategory): Promise<Competency[]> => {
  const values: unknown[] = []
  let where = `WHERE status = 'active'`

  if (category) {
    values.push(assertEnum(category, COMPETENCY_CATEGORIES, 'category'))
    where += ` AND category = $1`
  }

  const rows = await runGreenhousePostgresQuery<CompetencyRow>(
    `SELECT ${COMPETENCY_COLS} FROM greenhouse_hiring.hiring_competency ${where} ORDER BY category, key`,
    values,
  )

  
return rows.map(normalizeCompetency)
}

export const getCompetencyByKey = async (key: string): Promise<Competency | null> => {
  const rows = await runGreenhousePostgresQuery<CompetencyRow>(
    `SELECT ${COMPETENCY_COLS} FROM greenhouse_hiring.hiring_competency WHERE key = $1 LIMIT 1`,
    [key],
  )

  
return rows[0] ? normalizeCompetency(rows[0]) : null
}

const resolveCompetencyId = async (client: PoolClient | null, key: string): Promise<string> => {
  const rows = await runQuery<{ competency_id: string }>(
    client,
    `SELECT competency_id FROM greenhouse_hiring.hiring_competency WHERE key = $1 LIMIT 1`,
    [key],
  )

  if (!rows[0]) {
    throw new HiringValidationError(`La competencia "${key}" no existe en el catálogo.`, 'assessment_competency_not_found', 400, { key })
  }

  
return rows[0].competency_id
}

// ══════════════════════════════════════════════════════════════════════════
// Question bank (answer_key/rubric SENSIBLE — masked reader para candidatos)
// ══════════════════════════════════════════════════════════════════════════

type QuestionRow = {
  question_id: unknown
  competency_id: unknown
  level: unknown
  type: unknown
  prompt: unknown
  options_json: unknown
  answer_key_json: unknown
  rubric_json: unknown
  status: unknown
  created_by: unknown
  created_at: unknown
  updated_at: unknown
}

const normalizeQuestion = (r: QuestionRow): Question => ({
  questionId: str(r.question_id),
  competencyId: str(r.competency_id),
  level: str(r.level) as Question['level'],
  type: str(r.type) as Question['type'],
  prompt: str(r.prompt),
  options: jsonArr(r.options_json),
  answerKey: jsonObj(r.answer_key_json),
  rubric: jsonObj(r.rubric_json),
  status: str(r.status) as Question['status'],
  createdBy: nstr(r.created_by),
  createdAt: ts(r.created_at) ?? '',
  updatedAt: ts(r.updated_at) ?? '',
})

const QUESTION_COLS_FULL = `question_id, competency_id, level, type, prompt, options_json, answer_key_json, rubric_json, status, created_by, created_at, updated_at`

/** Candidate-facing projection — allowlist, NUNCA incluye answer_key/rubric. */
export const buildPublicQuestion = (q: Question): PublicQuestion => ({
  questionId: q.questionId,
  competencyId: q.competencyId,
  level: q.level,
  type: q.type,
  prompt: q.prompt,
  options: q.options,
})

/** Reader interno (con answer_key). Requiere capability en el caller. */
export const listQuestions = async (filters: ListQuestionFilters = {}): Promise<Question[]> => {
  const clauses: string[] = []
  const values: unknown[] = []

  if (filters.competencyKey) {
    values.push(filters.competencyKey)
    clauses.push(`competency_id = (SELECT competency_id FROM greenhouse_hiring.hiring_competency WHERE key = $${values.length})`)
  }

  if (filters.level) {
    values.push(assertEnum(filters.level, QUESTION_LEVELS, 'level'))
    clauses.push(`level = $${values.length}`)
  }

  if (filters.type) {
    values.push(assertEnum(filters.type, QUESTION_TYPES, 'type'))
    clauses.push(`type = $${values.length}`)
  }

  if (filters.status) {
    values.push(assertEnum(filters.status, QUESTION_STATUSES, 'status'))
    clauses.push(`status = $${values.length}`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  values.push(limit, offset)

  const rows = await runGreenhousePostgresQuery<QuestionRow>(
    `SELECT ${QUESTION_COLS_FULL} FROM greenhouse_hiring.hiring_question ${where}
     ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  )

  
return rows.map(normalizeQuestion)
}

export const createQuestion = async (
  input: CreateQuestionInput,
  actorUserId: string | null,
  // TASK-1361 — client opcional para que el confirm de un borrador IA sea atómico (marcar la
  // propuesta confirmed + crear la pregunta en la misma tx). Sin client abre su propia tx.
  externalClient: PoolClient | null = null,
): Promise<Question> => {
  const competencyKey = assertNonEmpty(input.competencyKey, 'competencyKey')
  const level = assertEnum(input.level, QUESTION_LEVELS, 'level')
  const type = assertEnum(input.type, QUESTION_TYPES, 'type')
  const prompt = assertNonEmpty(input.prompt, 'prompt')

  const run = async (client: PoolClient): Promise<Question> => {
    const competencyId = await resolveCompetencyId(client, competencyKey)

    const rows = await runQuery<QuestionRow>(
      client,
      `INSERT INTO greenhouse_hiring.hiring_question
         (competency_id, level, type, prompt, options_json, answer_key_json, rubric_json, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)
       RETURNING ${QUESTION_COLS_FULL}`,
      [
        competencyId,
        level,
        type,
        prompt,
        JSON.stringify(input.options ?? []),
        JSON.stringify(input.answerKey ?? {}),
        JSON.stringify(input.rubric ?? {}),
        actorUserId,
      ],
    )

    // Nace 'draft' (SME gate). Sin evento de dominio (contenido, no aggregate de negocio).
    return normalizeQuestion(rows[0])
  }

  return externalClient ? run(externalClient) : withGreenhousePostgresTransaction(run)
}

const QUESTION_STATUS_TRANSITIONS: Record<QuestionStatus, QuestionStatus[]> = {
  draft: ['sme_review', 'retired'],
  sme_review: ['active', 'draft', 'retired'],
  active: ['retired'],
  retired: [],
}

/** SME gate: draft → sme_review → active → retired. Solo transiciones permitidas. */
export const transitionQuestionStatus = async (
  questionId: string,
  toStatus: QuestionStatus,
  actorUserId: string | null,
): Promise<Question> => {
  const next = assertEnum(toStatus, QUESTION_STATUSES, 'status')

  
return withGreenhousePostgresTransaction(async (client) => {
    const current = await runQuery<{ status: string }>(
      client,
      `SELECT status FROM greenhouse_hiring.hiring_question WHERE question_id = $1 LIMIT 1`,
      [questionId],
    )

    if (!current[0]) throw new HiringNotFoundError('La pregunta no existe.', 'assessment_question_not_found')
    const from = current[0].status as QuestionStatus

    if (!QUESTION_STATUS_TRANSITIONS[from].includes(next)) {
      throw new HiringValidationError(
        `Transición de estado no permitida: ${from} → ${next}.`,
        'assessment_invalid_status_transition',
        422,
        { from, to: next },
      )
    }

    const rows = await runQuery<QuestionRow>(
      client,
      `UPDATE greenhouse_hiring.hiring_question
       SET status = $1, status_changed_by = $3, status_changed_at = NOW()
       WHERE question_id = $2 RETURNING ${QUESTION_COLS_FULL}`,
      [next, questionId, actorUserId],
    )

    
return normalizeQuestion(rows[0])
  })
}

// ══════════════════════════════════════════════════════════════════════════
// Assessment templates + modules
// ══════════════════════════════════════════════════════════════════════════

type TemplateRow = {
  template_id: unknown
  name: unknown
  role_hint: unknown
  status: unknown
  created_by: unknown
  created_at: unknown
  updated_at: unknown
}

const normalizeTemplate = (r: TemplateRow): AssessmentTemplate => ({
  templateId: str(r.template_id),
  name: str(r.name),
  roleHint: nstr(r.role_hint),
  status: str(r.status) as AssessmentTemplate['status'],
  createdBy: nstr(r.created_by),
  createdAt: ts(r.created_at) ?? '',
  updatedAt: ts(r.updated_at) ?? '',
})

const TEMPLATE_COLS = `template_id, name, role_hint, status, created_by, created_at, updated_at`

type ModuleRow = {
  module_id: unknown
  template_id: unknown
  competency_id: unknown
  target_level: unknown
  weight: unknown
}

const normalizeModule = (r: ModuleRow): TemplateModule => ({
  moduleId: str(r.module_id),
  templateId: str(r.template_id),
  competencyId: str(r.competency_id),
  targetLevel: (nstr(r.target_level) as TemplateModule['targetLevel']) ?? null,
  weight: num(r.weight),
})

export const listTemplates = async (): Promise<AssessmentTemplate[]> => {
  const rows = await runGreenhousePostgresQuery<TemplateRow>(
    `SELECT ${TEMPLATE_COLS} FROM greenhouse_hiring.hiring_assessment_template WHERE status = 'active' ORDER BY created_at DESC`,
  )

  
return rows.map(normalizeTemplate)
}

export const getTemplateWithModules = async (templateId: string): Promise<AssessmentTemplateWithModules | null> => {
  const tRows = await runGreenhousePostgresQuery<TemplateRow>(
    `SELECT ${TEMPLATE_COLS} FROM greenhouse_hiring.hiring_assessment_template WHERE template_id = $1 LIMIT 1`,
    [templateId],
  )

  if (!tRows[0]) return null

  const mRows = await runGreenhousePostgresQuery<ModuleRow>(
    `SELECT module_id, template_id, competency_id, target_level, weight
     FROM greenhouse_hiring.hiring_assessment_template_module WHERE template_id = $1 ORDER BY weight DESC`,
    [templateId],
  )

  
return { ...normalizeTemplate(tRows[0]), modules: mRows.map(normalizeModule) }
}

export const createTemplate = async (
  input: CreateTemplateInput,
  actorUserId: string | null,
): Promise<AssessmentTemplateWithModules> => {
  const name = assertNonEmpty(input.name, 'name')

  if (!Array.isArray(input.modules) || input.modules.length === 0) {
    throw new HiringValidationError('La plantilla necesita al menos un módulo.', 'assessment_template_empty', 400)
  }

  return withGreenhousePostgresTransaction(async (client) => {
    const tRows = await runQuery<TemplateRow>(
      client,
      `INSERT INTO greenhouse_hiring.hiring_assessment_template (name, role_hint, created_by)
       VALUES ($1, $2, $3) RETURNING ${TEMPLATE_COLS}`,
      [name, input.roleHint ?? null, actorUserId],
    )

    const template = normalizeTemplate(tRows[0])

    const modules: TemplateModule[] = []

    for (const m of input.modules) {
      const competencyId = await resolveCompetencyId(client, assertNonEmpty(m.competencyKey, 'competencyKey'))
      const targetLevel = m.targetLevel == null ? null : assertEnum(m.targetLevel, QUESTION_LEVELS, 'targetLevel')
      const weight = typeof m.weight === 'number' && m.weight >= 0 ? m.weight : 0

      const mRows = await runQuery<ModuleRow>(
        client,
        `INSERT INTO greenhouse_hiring.hiring_assessment_template_module (template_id, competency_id, target_level, weight)
         VALUES ($1, $2, $3, $4) RETURNING module_id, template_id, competency_id, target_level, weight`,
        [template.templateId, competencyId, targetLevel, weight],
      )

      modules.push(normalizeModule(mRows[0]))
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessmentTemplate,
        aggregateId: template.templateId,
        eventType: EVENT_TYPES.hiringAssessmentTemplateCreated,
        payload: { templateId: template.templateId, name: template.name, moduleCount: modules.length },
      },
      client,
    )
    
return { ...template, modules }
  })
}
