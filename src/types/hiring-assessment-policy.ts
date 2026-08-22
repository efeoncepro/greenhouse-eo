// TASK-1719 Slice 1/2 — Policy de assessment por HiringOpening + ledger de assignment
// (ADR GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1).
//
// La policy declara QUÉ prueba corresponde a una vacante y CUÁNDO se asigna. La automatización
// es determinística (regla etapa→plantilla): NUNCA se dispara desde un score, match o atributo
// inferido — ese invariante es lo que la mantiene fuera de "IA de alto riesgo" (ADR D7).

import type { HiringApplicationStage } from '@/types/hiring'

// ── Policy (state machine D5.1: nace draft + manual) ──

export const OPENING_ASSESSMENT_POLICY_MODES = ['manual', 'on_stage_entry'] as const
export type OpeningAssessmentPolicyMode = (typeof OPENING_ASSESSMENT_POLICY_MODES)[number]

export const OPENING_ASSESSMENT_POLICY_STATES = ['draft', 'enabled', 'disabled'] as const
export type OpeningAssessmentPolicyState = (typeof OPENING_ASSESSMENT_POLICY_STATES)[number]

/**
 * Etapas candidate-facing no terminales habilitadas como trigger en V1.
 *
 * **`shortlisted` es la etapa canónica recomendada** (decisión de doctrina de selección,
 * 2026-08-17). `interview` sigue siendo válida, pero elegirla debería ser deliberado:
 *
 * 1. **La prueba es la evidencia CON la que se arma la entrevista, no un paso posterior.** La
 *    ganancia de validez real está en combinar entrevista estructurada + muestra de trabajo
 *    (≈.63 vs cualquiera sola; Schmidt & Hunter 1998, ranking confirmado por Sackett et al.
 *    2022, que además deja la entrevista estructurada como el predictor más fuerte). Esa
 *    ganancia NO es automática por tener las dos cosas: aparece cuando la entrevista puede
 *    interrogar lo que la prueba dejó abierto. Disparar en `interview` entrega los dos métodos
 *    sin la combinación.
 * 2. **El momento del filtro es una decisión de EQUIDAD, no de eficiencia.** Una prueba no
 *    pagada aplicada temprano no sesga por el puntaje: sesga por quién logra completarla (empleo
 *    actual, cuidados a cargo, conectividad, margen económico). Es impacto adverso por
 *    COMPLETACIÓN, invisible en las métricas de scoring porque esas personas nunca llegan a
 *    tener una. En `shortlisted` la población ya está acotada y una caída de completación sí es
 *    interpretable.
 * 3. **Es lo defendible frente al candidato.** En Preselección el pedido tiene contrapartida
 *    ("avanzaste"); antes del juicio humano es pedir trabajo sin haber mirado.
 *
 * **NUNCA agregar `screening` sin resolver antes qué se le comunica al candidato**: no es una
 * etapa candidate-facing, así que un assignment bloqueado ahí degrada a SILENCIO y rompe el
 * invariante "ni cero ni dos".
 *
 * TASK-1754 — el `satisfies` no es adorno de tipos: es el único lado del contrato que se
 * revisaba a ojo. Esta lista y `HIRING_APPLICATION_STAGES` eran dos arreglos de strings sin
 * relación declarada, así que un disparador podía apuntar a una etapa que el dominio no tiene
 * —o que dejó de tener— y compilar igual. Es exactamente la forma del incidente del 2026-08-19:
 * la automatización apuntando a un estado que nadie podía alcanzar. Con el `satisfies`, retirar
 * un literal del enum de etapas rompe la compilación acá, en vez de romper el silencio en
 * producción.
 */
export const OPENING_ASSESSMENT_TRIGGER_STAGES = ['shortlisted', 'interview'] as const satisfies readonly HiringApplicationStage[]
export type OpeningAssessmentTriggerStage = (typeof OPENING_ASSESSMENT_TRIGGER_STAGES)[number]

/**
 * Etapa recomendada por defecto al configurar una policy nueva. NO es un default automático —
 * el command sigue exigiendo la etapa explícita — pero es la que las superficies deben
 * preseleccionar y la que el canary usa.
 */
export const OPENING_ASSESSMENT_RECOMMENDED_TRIGGER_STAGE: OpeningAssessmentTriggerStage = 'shortlisted'

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
 *
 * TASK-1754 — el `satisfies` admite `'manual'` de forma EXPLÍCITA porque no es una etapa, y
 * declararlo así es lo que deja al resto de la lista atada al enum del dominio. Escribirlo
 * como `readonly HiringApplicationStage[]` a secas no compilaría, y ensancharlo a `string[]`
 * devolvería el arreglo al estado en que cualquier literal pasa.
 */
export const ASSESSMENT_ASSIGNMENT_TRIGGERS = ['shortlisted', 'interview', 'manual'] as const satisfies readonly (
  | HiringApplicationStage
  | 'manual'
)[]
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

// ── Ledger de propuestas de asignación (Slice 2: propose → confirm) ──

export const ASSESSMENT_ASSIGNMENT_PROPOSAL_STATUSES = [
  'proposed',
  'confirmed',
  /** El operador dejó pasar la ventana: vuelve a mirar antes de mandarle un correo a alguien. */
  'expired',
  /** El mundo cambió entre el preview y el confirm: el digest ya no describe la realidad. */
  'superseded',
] as const
export type AssessmentAssignmentProposalStatus = (typeof ASSESSMENT_ASSIGNMENT_PROPOSAL_STATUSES)[number]

/**
 * Preview PII-FREE por contrato: labels, versiones, banderas y reason codes. NUNCA nombre,
 * correo, token, link ni respuestas del candidato — se persiste en `preview_json` y viaja al
 * cliente tal cual.
 */
export interface AssessmentAssignmentPreview {
  openingTitle: string | null
  templateName: string | null
  templateVersion: number | null
  policyVersion: number
  mode: OpeningAssessmentPolicyMode
  triggerStage: AssessmentAssignmentTrigger
  timeLimitMinutes: number | null
  recipientReady: boolean
  /**
   * Instancia ABIERTA (`assigned|sent|in_progress|submitted`) — exactamente
   * `OPEN_ASSESSMENT_INSTANCE_STATUSES`, el mismo predicado del índice parcial y del command.
   * Es BLOQUEANTE: si esto es `true`, el command no crearía una instancia nueva.
   */
  existingOpenAssessment: boolean
  /**
   * Instancia YA CORREGIDA (`scored`). **NO es bloqueante**: un retake legítimo existe y el
   * command sí crearía una instancia nueva. Se muestra igual porque quien confirma tiene que
   * saber que le va a mandar una segunda prueba a alguien que ya fue evaluado.
   */
  existingScoredAssessment: boolean
  /** Señal de preview, no la decisión: el outcome canónico lo resuelve el command. */
  blockingReasonCode: AssessmentAssignmentReasonCode | null
}

export interface AssessmentAssignmentProposal {
  proposalId: string
  applicationId: string
  policyId: string
  policyVersion: number
  /** Ata lo confirmado a lo que el operador vio; se recomputa en el confirm y se compara. */
  effectDigest: string
  preview: AssessmentAssignmentPreview
  status: AssessmentAssignmentProposalStatus
  proposedBy: string
  confirmedBy: string | null
  /** Fila del ledger de assignment que produjo el confirm (null hasta confirmar). */
  assignmentId: string | null
  expiresAt: string
  confirmedAt: string | null
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
