// TASK-1360 — Assessment Engine. Tipos de dominio (view models camelCase + enums 1:1 con los
// CHECK de greenhouse_hiring). answer_key/rubric NUNCA en el view model candidate-facing.

// ── Enums ──

export const COMPETENCY_CATEGORIES = ['attitudinal', 'aptitude', 'skill'] as const
export type CompetencyCategory = (typeof COMPETENCY_CATEGORIES)[number]

export const COMPETENCY_STATUSES = ['active', 'archived'] as const
export type CompetencyStatus = (typeof COMPETENCY_STATUSES)[number]

export const QUESTION_LEVELS = ['nociones', 'intermedio', 'avanzado'] as const
export type QuestionLevel = (typeof QUESTION_LEVELS)[number]

export const QUESTION_TYPES = ['single_choice', 'multi_choice', 'likert', 'situational', 'open_text'] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export const QUESTION_STATUSES = ['draft', 'sme_review', 'active', 'retired'] as const
export type QuestionStatus = (typeof QUESTION_STATUSES)[number]

export const TEMPLATE_STATUSES = ['active', 'archived'] as const
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number]

export const ASSESSMENT_METHODS = ['candidate_test', 'interviewer_scorecard'] as const
export type AssessmentMethod = (typeof ASSESSMENT_METHODS)[number]

export const ASSESSMENT_STATUSES = ['assigned', 'sent', 'in_progress', 'submitted', 'scored', 'expired'] as const
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number]

// Objective (auto-scored) vs human-rated question types.
export const OBJECTIVE_QUESTION_TYPES: readonly QuestionType[] = ['single_choice', 'multi_choice', 'likert']
export const HUMAN_RATED_QUESTION_TYPES: readonly QuestionType[] = ['situational', 'open_text']

// ── View models ──

export interface Competency {
  competencyId: string
  key: string
  name: string
  category: CompetencyCategory
  description: string | null
  status: CompetencyStatus
  createdAt: string
  updatedAt: string
}

/** Internal question view (with answer_key/rubric). NEVER expose to a candidate. */
export interface Question {
  questionId: string
  competencyId: string
  level: QuestionLevel
  type: QuestionType
  prompt: string
  options: unknown[]
  answerKey: Record<string, unknown>
  rubric: Record<string, unknown>
  status: QuestionStatus
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

/** Candidate-facing question projection — allowlist, NO answer_key/rubric. */
export interface PublicQuestion {
  questionId: string
  competencyId: string
  level: QuestionLevel
  type: QuestionType
  prompt: string
  options: unknown[]
}

export interface AssessmentTemplate {
  templateId: string
  name: string
  roleHint: string | null
  status: TemplateStatus
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface TemplateModule {
  moduleId: string
  templateId: string
  competencyId: string
  targetLevel: QuestionLevel | null
  weight: number
}

export interface AssessmentTemplateWithModules extends AssessmentTemplate {
  modules: TemplateModule[]
}

export interface Assessment {
  assessmentId: string
  publicId: string
  applicationId: string
  templateId: string | null
  method: AssessmentMethod
  evaluatorUserId: string | null
  status: AssessmentStatus
  timeLimitMinutes: number | null
  accommodations: Record<string, unknown>
  startedAt: string | null
  submittedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface AssessmentResponse {
  responseId: string
  assessmentId: string
  questionId: string | null
  competencyId: string
  answer: Record<string, unknown>
  autoScore: number | null
  needsHumanRating: boolean
  humanScore: number | null
  scoredBy: string | null
  scoredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CompetencyResult {
  resultId: string
  assessmentId: string
  competencyId: string
  score: number
  levelAchieved: QuestionLevel | null
}

/** Scorecard shape rolled into hiring_application.explainability_json (advisory). */
export interface AssessmentScorecard {
  assessmentId: string
  overallScore: number
  competencies: Array<{ competencyId: string; competencyKey: string; score: number; weight: number }>
}

// ── Inputs ──

export interface CreateQuestionInput {
  competencyKey: string
  level: QuestionLevel
  type: QuestionType
  prompt: string
  options?: unknown[]
  answerKey?: Record<string, unknown>
  rubric?: Record<string, unknown>
}

export interface CreateTemplateInput {
  name: string
  roleHint?: string | null
  modules: Array<{ competencyKey: string; targetLevel?: QuestionLevel | null; weight: number }>
}

export interface ListQuestionFilters {
  competencyKey?: string
  level?: QuestionLevel
  type?: QuestionType
  status?: QuestionStatus
  limit?: number
  offset?: number
}
