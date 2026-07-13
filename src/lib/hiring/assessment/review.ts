import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { CompetencyCategory, QuestionLevel, QuestionType } from '@/types/hiring-assessment'

type ReviewRow = {
  response_id: unknown
  question_id: unknown
  competency_id: unknown
  competency_key: unknown
  competency_name: unknown
  competency_category: unknown
  question_type: unknown
  question_prompt: unknown
  rubric_json: unknown
  target_level: unknown
  weight: unknown
}

type ModuleRow = {
  competency_id: unknown
  competency_key: unknown
  competency_name: unknown
  competency_category: unknown
  target_level: unknown
  weight: unknown
}

const str = (value: unknown): string => (value == null ? '' : String(value))
const nstr = (value: unknown): string | null => (value == null ? null : String(value))

const num = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
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

export interface AssessmentReviewItem {
  responseId: string
  questionId: string | null
  competencyId: string
  competencyKey: string
  competencyName: string
  competencyCategory: CompetencyCategory
  questionType: QuestionType | null
  questionPrompt: string | null
  rubric: Record<string, unknown>
  targetLevel: QuestionLevel | null
  weight: number
}

export interface AssessmentReviewCompetencyModule {
  competencyId: string
  competencyKey: string
  competencyName: string
  competencyCategory: CompetencyCategory
  targetLevel: QuestionLevel | null
  weight: number
}

export const listAssessmentReviewItems = async (assessmentId: string): Promise<AssessmentReviewItem[]> => {
  const rows = await runGreenhousePostgresQuery<ReviewRow>(
    `SELECT r.response_id,
            r.question_id,
            r.competency_id,
            c.key AS competency_key,
            c.name AS competency_name,
            c.category AS competency_category,
            q.type AS question_type,
            q.prompt AS question_prompt,
            q.rubric_json,
            tm.target_level,
            COALESCE(tm.weight, 0) AS weight
     FROM greenhouse_hiring.hiring_assessment_response r
     JOIN greenhouse_hiring.hiring_assessment a ON a.assessment_id = r.assessment_id
     JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = r.competency_id
     LEFT JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
     LEFT JOIN greenhouse_hiring.hiring_assessment_template_module tm
       ON tm.template_id = a.template_id
      AND tm.competency_id = r.competency_id
     WHERE r.assessment_id = $1
     ORDER BY COALESCE(tm.weight, 0) DESC, c.key, r.created_at`,
    [assessmentId],
  )

  return rows.map((row) => ({
    responseId: str(row.response_id),
    questionId: nstr(row.question_id),
    competencyId: str(row.competency_id),
    competencyKey: str(row.competency_key),
    competencyName: str(row.competency_name),
    competencyCategory: str(row.competency_category) as CompetencyCategory,
    questionType: nstr(row.question_type) as QuestionType | null,
    questionPrompt: nstr(row.question_prompt),
    rubric: jsonObj(row.rubric_json),
    targetLevel: nstr(row.target_level) as QuestionLevel | null,
    weight: num(row.weight),
  }))
}

export const listAssessmentReviewCompetencyModules = async (
  assessmentId: string,
): Promise<AssessmentReviewCompetencyModule[]> => {
  const rows = await runGreenhousePostgresQuery<ModuleRow>(
    `SELECT c.competency_id,
            c.key AS competency_key,
            c.name AS competency_name,
            c.category AS competency_category,
            tm.target_level,
            tm.weight
     FROM greenhouse_hiring.hiring_assessment a
     JOIN greenhouse_hiring.hiring_assessment_template_module tm ON tm.template_id = a.template_id
     JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = tm.competency_id
     WHERE a.assessment_id = $1
     ORDER BY tm.weight DESC, c.key`,
    [assessmentId],
  )

  return rows.map((row) => ({
    competencyId: str(row.competency_id),
    competencyKey: str(row.competency_key),
    competencyName: str(row.competency_name),
    competencyCategory: str(row.competency_category) as CompetencyCategory,
    targetLevel: nstr(row.target_level) as QuestionLevel | null,
    weight: num(row.weight),
  }))
}
