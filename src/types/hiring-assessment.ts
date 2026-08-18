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

// `cancelled` (TASK-1719 Slice 3) es TERMINAL y sólo alcanzable desde `assigned`/`sent`.
// Espeja el CHECK `hiring_assessment_status_check`. Queda FUERA de
// OPEN_ASSESSMENT_INSTANCE_STATUSES a propósito: liberar el slot (application, template)
// ES la recuperación (habilita re-asignar sin borrar la fila cancelada).
export const ASSESSMENT_STATUSES = [
  'assigned',
  'sent',
  'in_progress',
  'submitted',
  'scored',
  'expired',
  'cancelled',
] as const
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number]

/**
 * Estados desde los que una instancia candidate_test AÚN se puede cancelar: el candidato
 * no empezó a rendir. Desde `in_progress`/`submitted`/`scored` cancelar borraría trabajo
 * suyo, así que es 409, no una transición.
 */
export const ASSESSMENT_CANCELLABLE_STATUSES = ['assigned', 'sent'] as const

/**
 * Motivos de cancelación — allowlist estable, NUNCA texto libre en el campo de razón.
 * Sin PII: nunca nombre, email, token, respuesta ni score.
 */
export const ASSESSMENT_CANCELLATION_REASON_CODES = [
  'sent_in_error',
  'wrong_template',
  'duplicate_assignment',
  'opening_closed',
  'application_withdrawn',
  'application_rejected',
  'accommodation_required',
  'other',
] as const
export type AssessmentCancellationReasonCode = (typeof ASSESSMENT_CANCELLATION_REASON_CODES)[number]

/** Techo de la nota libre opcional que acompaña al reason code (no sustituye la allowlist). */
export const ASSESSMENT_CANCELLATION_NOTE_MAX_LENGTH = 500

/**
 * TASK-1719 — Ajustes razonables (accommodations). Contrato canónico ÚNICO de
 * `hiring_assessment.accommodations_json`.
 *
 * ⚠️ La grafía es `extraMinutes` y NINGUNA otra. La lectura aceptaba seis formas del mismo
 * hecho (`extraMinutes` · `timeExtensionMinutes` · `additionalMinutes` · `extendedTimeMinutes`
 * · `timeMultiplier`/`extendedTimeMultiplier` · `extendedTimePercent`/`timeExtensionPercent`)
 * porque nunca hubo write path que fijara una. Seis maneras de decir lo mismo son un contrato
 * IMPLÍCITO, y es exactamente la clase de bug que ya mordió a este repo: el `perCriterion` de
 * TASK-1734 admitía dos lecturas (contribución ponderada vs nota independiente) y el router
 * comparó contra la equivocada en 11 de 14 casos REALES, con el build verde.
 *
 * Se narró a `extraMinutes` con la base verificada: 17 instancias, 0 con `accommodations_json`
 * distinto de `{}`, 0 claves distintas en uso (consulta directa a PG, 2026-08-17). Nadie perdió
 * un ajuste porque nunca se otorgó ninguno.
 *
 * ⚠️ NUNCA agregar un campo de texto libre para el MOTIVO del ajuste. Ver
 * `src/lib/hiring/assessment/accommodations.ts` — es una decisión de privacidad, no un olvido.
 */
export interface AssessmentAccommodations {
  /** Minutos ADICIONALES al `time_limit_minutes` base. Entero 1..180. */
  extraMinutes: number
  /** `user_id` de quien otorgó el ajuste (siempre de la sesión, nunca del body). */
  grantedBy: string
  /** ISO-8601 del otorgamiento. Re-otorgar REEMPLAZA con nuevo actor y timestamp. */
  grantedAt: string
}

/** Rango del tiempo extra. Piso 1 (otorgar 0 es no otorgar); techo 180 (3 h sobre la base). */
export const ASSESSMENT_ACCOMMODATION_MIN_EXTRA_MINUTES = 1
export const ASSESSMENT_ACCOMMODATION_MAX_EXTRA_MINUTES = 180

/**
 * Estados desde los que TODAVÍA tiene sentido otorgar tiempo extra: el candidato aún puede
 * usarlo. Desde `submitted`/`scored`/`expired`/`cancelled` ya no hay tiempo que extender.
 */
export const ASSESSMENT_ACCOMMODATABLE_STATUSES = ['assigned', 'sent', 'in_progress'] as const

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
