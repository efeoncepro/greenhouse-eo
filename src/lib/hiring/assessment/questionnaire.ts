import 'server-only'

import { createHash } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { HiringValidationError } from '../errors'

/** One resolution shared by policy preview, snapshot capture and legacy taking. */
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
              q.answer_key_json,
              q.rubric_json,
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

export type QuestionnaireRow = Record<string, unknown> & {
  module_id: unknown
  competency_id: unknown
  question_id: unknown
  level: unknown
  type: unknown
  prompt: unknown
  options_json: unknown
}

const str = (value: unknown) => value == null ? '' : String(value)

/** Keep the existing policy digest stable; changing it would invalidate enabled policies. */
export const summarizeQuestionnaire = (rows: QuestionnaireRow[]) => {
  const lines = rows.map(row => {
    const content = createHash('sha256').update([
      str(row.level), str(row.type), str(row.prompt),
      typeof row.options_json === 'string' ? row.options_json : JSON.stringify(row.options_json ?? null),
    ].join('|')).digest('hex')

    return `${str(row.module_id)}:${str(row.competency_id)}:${str(row.question_id) || '-'}:${row.question_id == null ? '-' : content}`
  })

  return {
    digest: createHash('sha256').update(lines.join('\n')).digest('hex'),
    moduleCount: new Set(rows.map(row => str(row.module_id))).size,
    questionCount: rows.filter(row => row.question_id != null).length,
    emptyModuleCount: new Set(rows.filter(row => row.question_id == null).map(row => str(row.module_id))).size,
  }
}

export const canonicalAssessmentValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalAssessmentValue)

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonicalAssessmentValue(item)]))
  }

  return value
}

export interface QuestionnaireSnapshot {
  version: 1
  contentDigest: string
  policyDigest: string
  rows: QuestionnaireRow[]
}

export const questionnaireContentDigest = (rows: QuestionnaireRow[]) =>
  createHash('sha256').update(JSON.stringify(canonicalAssessmentValue(rows))).digest('hex')

export const buildQuestionnaireSnapshot = (
  rows: QuestionnaireRow[], expectedPolicyDigest?: string | null,
): QuestionnaireSnapshot => {
  const summary = summarizeQuestionnaire(rows)

  if (!summary.moduleCount || summary.emptyModuleCount || !summary.questionCount) {
    throw new HiringValidationError('La plantilla tiene competencias sin preguntas activas.', 'assessment_questionnaire_incomplete', 409)
  }

  if (expectedPolicyDigest && summary.digest !== expectedPolicyDigest) {
    throw new HiringValidationError('El cuestionario cambió después de habilitar la política.', 'assessment_questionnaire_changed', 409)
  }

  return { version: 1, policyDigest: summary.digest, contentDigest: questionnaireContentDigest(rows), rows }
}

export const captureQuestionnaire = async (
  client: PoolClient, templateId: string, expectedPolicyDigest?: string | null,
): Promise<QuestionnaireSnapshot> => {
  const result = await client.query<QuestionnaireRow>(PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL, [templateId])

  const snapshot = buildQuestionnaireSnapshot(result.rows, expectedPolicyDigest)
  const ids = snapshot.rows.map(row => String(row.question_id))
  const locked = await client.query('SELECT question_id FROM greenhouse_hiring.hiring_question WHERE question_id = ANY($1::text[]) FOR KEY SHARE', [ids])

  if (locked.rows.length !== ids.length) {
    throw new HiringValidationError('El banco cambió durante la asignación.', 'assessment_questionnaire_changed', 409)
  }

  return snapshot
}

/** Null means legacy. Invalid stored content fails closed, never falls back to the live bank. */
export const parseQuestionnaireSnapshot = (value: unknown): QuestionnaireSnapshot | null => {
  if (value == null) return null
  const snapshot = value as QuestionnaireSnapshot

  if (snapshot.version !== 1 || !Array.isArray(snapshot.rows) || snapshot.rows.length === 0
      || questionnaireContentDigest(snapshot.rows) !== snapshot.contentDigest) {
    throw new HiringValidationError('No se pudo verificar el cuestionario de esta evaluación.', 'assessment_questionnaire_invalid', 409)
  }

  return snapshot
}

export const readQuestionnaireSnapshot = async (assessmentId: string, client: PoolClient | null = null) => {
  const sql = 'SELECT questionnaire_snapshot_json FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1'

  const rows = client ? (await client.query(sql, [assessmentId])).rows
    : await runGreenhousePostgresQuery(sql, [assessmentId])

  return parseQuestionnaireSnapshot(rows[0]?.questionnaire_snapshot_json)
}
