/**
 * TASK-1735 — Expediente de Evaluación SMART: tipos del dossier agéntico.
 * El LLM PROPONE un borrador (ledger `hiring_application_dossier_proposal`); solo un
 * humano lo confirma y materializa como nota `source='agent'` del expediente.
 * Espeja el shape del proposal ledger de TASK-1361 (`hiring-assessment-ai.ts`).
 */

export const DOSSIER_PROPOSAL_STATUSES = ['proposed', 'confirmed', 'rejected'] as const
export type DossierProposalStatus = (typeof DOSSIER_PROPOSAL_STATUSES)[number]

export const DOSSIER_PROPOSAL_DECISIONS = ['confirm', 'reject'] as const
export type DossierProposalDecision = (typeof DOSSIER_PROPOSAL_DECISIONS)[number]

/** Borrador estructurado del expediente (salida sanitizada del LLM). */
export interface EvaluationDossierDraft {
  resumenEjecutivo: string
  /** Afirmaciones donde CV y assessment se refuerzan, con evidencia citada de las fuentes. */
  coherencias: Array<{ afirmacion: string; evidencia: string }>
  /** Brechas o red flags CV↔assessment, con evidencia citada de las fuentes. */
  gaps: Array<{ afirmacion: string; evidencia: string }>
  /** Focos sugeridos para la entrevista (preguntas/temas a profundizar). */
  focosEntrevista: string[]
  /** Lo que NO se pudo verificar con las fuentes disponibles (obligación de honestidad). */
  noVerificable: string[]
}

/** Respuesta del assessment dentro del packet (texto del candidato = NO confiable). */
export interface DossierPacketResponse {
  responseId: string
  competencyKey: string
  /** Nombre humano de la competencia (`hiring_competency.name`) — lo que el LLM DEBE usar en el texto. */
  competencyName: string
  prompt: string
  answerText: string
  effectiveScore: number | null
  /** ID de la propuesta IA de score existente (TASK-1361) — referencia, nunca el rationale copiado. */
  rationaleRef: string | null
}

export interface DossierPacketCompetencyResult {
  competencyKey: string
  /** Nombre humano de la competencia (`hiring_competency.name`) — lo que el LLM DEBE usar en el texto. */
  competencyName: string
  score: number
}

/**
 * Packet minimizado al provider LLM — allowlist EXPLÍCITA (TASK-1735):
 * texto redactado del CV (proyección TASK-1718) + assessment (resultados/respuestas/scores)
 * + journey de stages. PROHIBIDO: nombre completo, email, teléfono, identidad legal,
 * self-ID demográfico — el assembler ni siquiera los consulta.
 */
export interface EvaluationDossierPacket {
  schemaVersion: 'hiring_evaluation_dossier_packet.v1'
  applicationId: string
  cv: {
    contentHash: string
    /** Texto redactado de la proyección TASK-1718; NUNCA el PDF crudo. */
    text: string
  }
  assessment: {
    competencyResults: DossierPacketCompetencyResult[]
    responses: DossierPacketResponse[]
    overallScore: number | null
  }
  journey: {
    appliedAt: string
    source: string
    currentStage: string
    stages: Array<{ stage: string; at: string }>
    decision: { decision: string; decisionAt: string | null } | null
  }
}

/** Fila normalizada del ledger `hiring_application_dossier_proposal`. */
export interface DossierProposal {
  proposalId: string
  applicationId: string
  /** `{ dossier: EvaluationDossierDraft, sources: {...} }` — el borrador original inmutable. */
  proposed: Record<string, unknown>
  provider: string
  /** Modelo EFECTIVO resuelto (no el default). */
  model: string
  promptVersion: string
  inputDigest: string
  status: DossierProposalStatus
  decisionNote: string | null
  confirmedBy: string | null
  confirmedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface ConfirmEvaluationDossierInput {
  proposalId: string
  decision: DossierProposalDecision
  /** El humano puede editar el cuerpo antes de confirmar; lo editado es lo que se persiste. */
  editedBodyMd?: string
  decisionNote?: string
  actorUserId: string
}
