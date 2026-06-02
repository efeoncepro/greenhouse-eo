/**
 * TASK-797 — Contractor closure canonical types (pure, NOT server-only).
 *
 * Closure es un lifecycle PROPIO del contractor — NUNCA finiquito laboral. Se
 * apoya en el state machine del engagement (active/paused -> ending -> ended) y
 * en estas estructuras de readiness. Mirror conceptual del patrón de
 * `payables/readiness.ts` (evaluator puro + resolver server-side).
 *
 * Boundary duro (TASK-890): el cierre NUNCA dispara `final_settlements`, NUNCA
 * toca las lanes de `work_relationship_offboarding_cases`, NUNCA reactiva una
 * relación dependiente.
 */

/** Causales canónicas de cierre contractual. Espejo del CHECK enum en DB. */
export const CONTRACTOR_CLOSURE_REASONS = [
  'contract_completed',
  'mutual_agreement',
  'contractor_resignation',
  'non_renewal',
  'terminated_for_cause',
  'converted_to_employee',
  'provider_terminated',
  'other'
] as const
export type ContractorClosureReason = (typeof CONTRACTOR_CLOSURE_REASONS)[number]

/**
 * Blockers de cierre. Todos son ACKNOWLEDGEABLE: el operador puede cerrar de
 * todas formas declarando una razón explícita (override gobernado + auditado).
 * Sin acknowledgement, el cierre final (-> ended) queda bloqueado.
 */
export const CONTRACTOR_CLOSURE_BLOCKER_CODES = [
  /** Hay work submissions abiertas (NO terminal: draft/submitted/disputed/approved). */
  'open_work_submissions',
  /** Hay payables abiertos (NO terminal: todo salvo paid/cancelled). */
  'open_payables',
  /** payroll_via provider-owned (deel/remote/oyster) sin provider_termination_ref. */
  'provider_termination_ref_missing',
  /** classification_risk_status ∈ {legal_review_required, blocked}. */
  'classification_risk_blocking'
] as const
export type ContractorClosureBlockerCode = (typeof CONTRACTOR_CLOSURE_BLOCKER_CODES)[number]

/** Advisories: informativos, NUNCA bloquean el cierre. */
export const CONTRACTOR_CLOSURE_ADVISORY_CODES = [
  /**
   * Recordatorio de access offboarding. El access offboarding es SEPARADO del
   * cierre contractual (spec TASK-797): se surface como recordatorio, no como
   * gate. Solo cuando el contractor tiene portal user (memberId presente).
   */
  'access_handoff_reminder'
] as const
export type ContractorClosureAdvisoryCode = (typeof CONTRACTOR_CLOSURE_ADVISORY_CODES)[number]

export interface ContractorClosureBlocker {
  code: ContractorClosureBlockerCode
  message: string
  /** true cuando el operador lo reconoció explícitamente (override con razón). */
  acknowledged: boolean
}

export interface ContractorClosureAdvisory {
  code: ContractorClosureAdvisoryCode
  message: string
}

export interface ContractorClosureReadinessInputs {
  /** Work submissions NO terminales (draft/submitted/disputed/approved). */
  openWorkSubmissionsCount: number
  /** Payables NO terminales (todo salvo paid/cancelled). */
  openPayablesCount: number
  /** engagement.payrollVia ∈ {deel, remote, oyster}. */
  providerOwned: boolean
  /** engagement.providerTerminationRef presente (o aportado en el comando). */
  providerTerminationRefPresent: boolean
  /** engagement.classificationRiskStatus ∈ {legal_review_required, blocked}. */
  classificationRiskBlocking: boolean
  /** engagement.memberId presente (tiene portal user → recordatorio access handoff). */
  hasPortalMember: boolean
  /** Códigos de blocker reconocidos explícitamente por el operador. */
  acknowledgedBlockerCodes?: readonly ContractorClosureBlockerCode[]
}

export interface ContractorClosureReadinessResult {
  /** true cuando NO quedan blockers sin reconocer. */
  ready: boolean
  blockers: ContractorClosureBlocker[]
  advisories: ContractorClosureAdvisory[]
  evaluatedAt: string
}

export interface InitiateContractorClosureInput {
  contractorEngagementId: string
  closureReason: ContractorClosureReason
  /** Razón en texto libre, ≥ 10 chars (audit). */
  reason: string
  closureEffectiveDate: string
  providerTerminationRef?: string | null
  actorUserId: string
}

export interface ExecuteContractorClosureInput {
  contractorEngagementId: string
  /** Si el engagement aún está active/paused, estos completan el cierre en una sola tx. */
  closureReason?: ContractorClosureReason
  reason: string
  closureEffectiveDate?: string
  providerTerminationRef?: string | null
  /** Blockers que el operador reconoce explícitamente para cerrar de todas formas. */
  acknowledgedBlockerCodes?: readonly ContractorClosureBlockerCode[]
  /** Política explícita: permitir invoices/payables post-cierre. Default FALSE. */
  postClosureInvoicesAllowed?: boolean
  actorUserId: string
}
