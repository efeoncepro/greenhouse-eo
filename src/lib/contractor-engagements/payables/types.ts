/**
 * TASK-793 — Contractor Payables canonical types (NOT server-only).
 *
 * Pure types shared by the server store + Finance bridge + API DTOs + tests.
 * Mirrors the CHECK enums of `greenhouse_hr.contractor_payables`
 * (migration 20260531010000000).
 *
 * A ContractorPayable is an approved economic obligation PRIOR to Finance. A
 * ready payable generates exactly ONE Finance payment_obligation via the bridge.
 * The payout is `labor_cost_external` — NEVER payroll dependiente.
 */

export const CONTRACTOR_PAYABLE_SOURCE_KINDS = [
  'work_submission',
  'fixed_recurring',
  'invoice',
  'off_cycle'
] as const
export type ContractorPayableSourceKind = (typeof CONTRACTOR_PAYABLE_SOURCE_KINDS)[number]

export const CONTRACTOR_PAYABLE_BENEFICIARY_TYPES = ['member', 'other'] as const
export type ContractorPayableBeneficiaryType = (typeof CONTRACTOR_PAYABLE_BENEFICIARY_TYPES)[number]

export const CONTRACTOR_PAYABLE_STATUSES = [
  'pending_readiness',
  'ready_for_finance',
  'obligation_created',
  'payment_order_created',
  'paid',
  'cancelled',
  'blocked'
] as const
export type ContractorPayableStatus = (typeof CONTRACTOR_PAYABLE_STATUSES)[number]

export interface ContractorPayable {
  contractorPayableId: string
  publicId: string
  contractorEngagementId: string
  contractorWorkSubmissionId: string | null
  contractorInvoiceId: string | null
  payableSourceKind: ContractorPayableSourceKind
  beneficiaryType: ContractorPayableBeneficiaryType
  beneficiaryId: string
  grossAmount: number
  withholdingAmount: number
  netPayable: number
  currency: string
  paymentCurrency: string | null
  fxPolicyCode: string | null
  taxComplianceOwner: string
  taxWithholdingPolicyCode: string | null
  economicCategory: string
  payrollVia: string
  paymentProfileId: string | null
  paymentProfileWaiverReason: string | null
  dueDate: string | null
  status: ContractorPayableStatus
  financeObligationId: string | null
  paymentOrderId: string | null
  readiness: Record<string, unknown>
  sourceSnapshot: Record<string, unknown>
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateContractorPayableFromSubmissionInput {
  contractorWorkSubmissionId: string
  dueDate?: string | null
  paymentProfileId?: string | null
  actorUserId: string
}

export interface CreateContractorPayableOffCycleInput {
  contractorEngagementId: string
  grossAmount: number
  currency?: string | null
  paymentCurrency?: string | null
  dueDate?: string | null
  paymentProfileId?: string | null
  reason: string
  actorUserId: string
}
