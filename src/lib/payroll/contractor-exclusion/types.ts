import 'server-only'

/**
 * TASK-957 Slice A — Contractor payroll exclusion types.
 *
 * "Engaged" statuses = el contractor está siendo pagado (o a punto de) por el
 * rail contractor-payable. Un engagement en `draft`/`pending_review` aún NO es
 * un rail de pago vivo (no genera payables todavía) → NO excluye del roster
 * legacy (excluirlo prematuramente podría dropear a alguien de su nómina de
 * empleado legítima). Los terminales (`ended`/`cancelled`) tampoco excluyen.
 *
 * El gate del roster usa este set acotado. La señal `double_rail_overlap`
 * (reliability) es MÁS amplia (cualquier engagement no-terminal + comp version
 * aplicable) — detecta también la fase de setup como riesgo a investigar.
 */
export const CONTRACTOR_EXCLUSION_ENGAGED_STATUSES = ['active', 'paused', 'ending'] as const

export type ContractorExclusionEngagedStatus = (typeof CONTRACTOR_EXCLUSION_ENGAGED_STATUSES)[number]

export type ContractorExclusionReason = 'active_contractor_engagement'

/**
 * Per-member contractor-engagement payroll exclusion verdict.
 *
 * Consumer responsibility: cuando `excluded === true`, saltar al member del
 * roster legacy (su compensación vive en el `ContractorEngagement`, no en
 * `compensation_versions`).
 */
export type ContractorPayrollExclusion = {
  memberId: string
  excluded: boolean
  engagementPublicId: string | null
  engagementStatus: ContractorExclusionEngagedStatus | null
  reason: ContractorExclusionReason | null
}

export type ContractorExclusionFacts = {
  memberId: string
  engagementPublicId: string | null
  engagementStatus: ContractorExclusionEngagedStatus | null
}
