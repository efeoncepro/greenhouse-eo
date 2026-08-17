// TASK-1719 Slice 1/2 — Policy de assessment por HiringOpening + ledger de assignment
// (ADR GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1).
//
// La policy declara QUÉ prueba corresponde a una vacante y CUÁNDO se asigna. La automatización
// es determinística (regla etapa→plantilla): NUNCA se dispara desde un score, match o atributo
// inferido — ese invariante es lo que la mantiene fuera de "IA de alto riesgo" (ADR D7).

// ── Policy (state machine D5.1: nace draft + manual) ──

export const OPENING_ASSESSMENT_POLICY_MODES = ['manual', 'on_stage_entry'] as const
export type OpeningAssessmentPolicyMode = (typeof OPENING_ASSESSMENT_POLICY_MODES)[number]

export const OPENING_ASSESSMENT_POLICY_STATES = ['draft', 'enabled', 'disabled'] as const
export type OpeningAssessmentPolicyState = (typeof OPENING_ASSESSMENT_POLICY_STATES)[number]

/** Etapas candidate-facing no terminales habilitadas como trigger en V1. */
export const OPENING_ASSESSMENT_TRIGGER_STAGES = ['shortlisted', 'interview'] as const
export type OpeningAssessmentTriggerStage = (typeof OPENING_ASSESSMENT_TRIGGER_STAGES)[number]

export interface OpeningAssessmentPolicy {
  policyId: string
  openingId: string
  templateId: string
  /** Empieza en 1 e incrementa en cada reconfiguración; la historia vive en el event log. */
  policyVersion: number
  mode: OpeningAssessmentPolicyMode
  state: OpeningAssessmentPolicyState
  triggerStage: OpeningAssessmentTriggerStage | null
  timeLimitMinutes: number | null
  /** Digest del contenido resuelto OBSERVADO al habilitar (D4: detector de drift barato). */
  templateContentDigest: string | null
  volumeCapPerWindow: number
  volumeWindowMinutes: number
  createdBy: string | null
  enabledBy: string | null
  enabledAt: string | null
  createdAt: string
  updatedAt: string
}

export const OPENING_ASSESSMENT_POLICY_EVENT_TYPES = [
  'configured',
  'reconfigured',
  'enabled',
  'disabled',
] as const
export type OpeningAssessmentPolicyEventType = (typeof OPENING_ASSESSMENT_POLICY_EVENT_TYPES)[number]

export interface OpeningAssessmentPolicyEvent {
  policyEventId: string
  policyId: string
  policyVersion: number
  eventType: OpeningAssessmentPolicyEventType
  fromState: OpeningAssessmentPolicyState | null
  toState: OpeningAssessmentPolicyState
  reasonCode: string | null
  actorUserId: string | null
  detail: Record<string, unknown>
  createdAt: string
}

// ── Ledger de assignment (Slice 2) ──

export const ASSESSMENT_ASSIGNMENT_ORIGINS = ['manual', 'stage_auto', 'reconciliation'] as const
export type AssessmentAssignmentOrigin = (typeof ASSESSMENT_ASSIGNMENT_ORIGINS)[number]

/**
 * `manual` es un valor legítimo de `triggerStage` en el ledger: identifica la asignación
 * confirmada por un humano fuera de una entrada a etapa. Mantenerlo en la misma columna
 * conserva una sola clave de idempotencia para ambas rutas.
 */
export const ASSESSMENT_ASSIGNMENT_TRIGGERS = ['shortlisted', 'interview', 'manual'] as const
export type AssessmentAssignmentTrigger = (typeof ASSESSMENT_ASSIGNMENT_TRIGGERS)[number]

export const ASSESSMENT_ASSIGNMENT_OUTCOMES = [
  /**
   * NO TERMINAL y EFÍMERO: sólo vive entre el INSERT del intent y el UPDATE que le adjunta la
   * instancia, dentro de la MISMA transacción. Existe porque el ledger es el hecho durable y la
   * instancia su consecuencia: escribir `assigned` sin instancia viola
   * `hiring_assessment_assignment_assigned_instance_ck` (y un ledger que dice `assigned` sin
   * instancia sería un ledger que miente). Una fila `intent` en reposo es evidencia de un bug,
   * nunca un outcome comunicable al candidato.
   */
  'intent',
  'assigned',
  'already_assigned',
  'held',
  'blocked',
  'stale',
  'cancelled',
] as const
export type AssessmentAssignmentOutcome = (typeof ASSESSMENT_ASSIGNMENT_OUTCOMES)[number]

/** Reason codes estables. Sin PII: nunca nombre, email, token, respuesta ni score. */
export const ASSESSMENT_ASSIGNMENT_REASON_CODES = [
  'missing_email',
  'unverified_recipient',
  'volume_cap',
  'policy_disabled',
  'policy_mode_manual',
  'template_inactive',
  'stage_changed',
  'application_decided',
  'existing_open_instance',
  'operator_cancelled',
] as const
export type AssessmentAssignmentReasonCode = (typeof ASSESSMENT_ASSIGNMENT_REASON_CODES)[number]

export interface AssessmentAssignmentRecord {
  assignmentId: string
  applicationId: string
  policyId: string
  assessmentId: string | null
  policyVersion: number
  triggerStage: AssessmentAssignmentTrigger
  /** La automatización SOLO escribe 1 (ADR D2 capa 3); retake/re-asignación son humanos. */
  attemptSeq: number
  origin: AssessmentAssignmentOrigin
  outcome: AssessmentAssignmentOutcome
  outcomeReason: AssessmentAssignmentReasonCode | null
  supersededAt: string | null
  actorUserId: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Resultado tipado del command común. El caller DEBE leer `status`: nunca inferir éxito desde
 * HTTP 200 ni desde la ausencia de excepción. `deliveryStatus: 'pending'` NO significa correo
 * enviado — el email log es la evidencia posterior.
 */
export type AssessmentAssignmentResult =
  | { status: 'assigned'; assignmentId: string; assessmentId: string; deliveryStatus: 'pending' }
  | { status: 'already_assigned'; assignmentId: string; assessmentId: string | null }
  | { status: 'held'; assignmentId: string; reasonCode: AssessmentAssignmentReasonCode }
  | { status: 'blocked'; assignmentId: string; reasonCode: AssessmentAssignmentReasonCode }
  | { status: 'stale'; assignmentId: string; reasonCode: AssessmentAssignmentReasonCode }
  | { status: 'cancelled'; assignmentId: string; reasonCode: AssessmentAssignmentReasonCode | null }
