import type { ContractType, PayrollVia, PayRegime } from '@/types/hr-contracts'

export const FINAL_SETTLEMENT_STATUSES = ['draft', 'calculated', 'reviewed', 'approved', 'issued', 'cancelled'] as const
export type FinalSettlementStatus = (typeof FINAL_SETTLEMENT_STATUSES)[number]

export type FinalSettlementReadinessStatus = 'ready' | 'needs_review' | 'blocked'
export type FinalSettlementReadinessSeverity = 'blocker' | 'warning' | 'info'

export interface FinalSettlementReadinessCheck {
  code: string
  status: 'passed' | 'blocked' | 'warning'
  severity: FinalSettlementReadinessSeverity
  message: string
  evidence?: Record<string, unknown>
}

export interface FinalSettlementReadiness {
  status: FinalSettlementReadinessStatus
  hasBlockers: boolean
  checks: FinalSettlementReadinessCheck[]
}

export type FinalSettlementComponentKind = 'earning' | 'deduction' | 'employer_cost' | 'informational'
export type FinalSettlementComponentCode =
  | 'pending_salary'
  | 'pending_fixed_allowances'
  | 'monthly_gratification_due'
  | 'proportional_vacation'
  | 'pending_vacation_carryover'
  | 'proportional_vacation_current_period'
  | 'used_or_advanced_vacation_adjustment'
  | 'statutory_deductions'
  | 'authorized_deduction'
  | 'payroll_overlap_adjustment'

export type FinalSettlementTaxability =
  | 'taxable_imponible'
  | 'taxable_non_imponible'
  | 'deduction_statutory'
  | 'deduction_authorized'
  | 'not_taxable'
  | 'needs_review'

export type FinalSettlementLegalTreatment =
  | 'remuneration'
  | 'legal_indemnity'
  | 'authorized_deduction'
  | 'employer_cost'
  | 'informational'

export type FinalSettlementTaxTreatment =
  | 'taxable_monthly'
  | 'non_income'
  | 'not_applicable'
  | 'needs_review'

export type FinalSettlementPrevisionalTreatment =
  | 'contribution_base'
  | 'not_contribution_base'
  | 'employer_only'
  | 'not_applicable'
  | 'needs_review'

export type FinalSettlementOverlapBehavior =
  | 'deduct_delta_only'
  | 'never_duplicate_monthly'
  | 'not_applicable'

export interface AuthorizedDeductionEvidence {
  sourceRef: Record<string, unknown>
  actorUserId?: string | null
  reason: string
  authorizedAt?: string | null
}

export interface FinalSettlementComponentPolicy {
  componentCode: FinalSettlementComponentCode
  policyCode: string
  legalTreatment: FinalSettlementLegalTreatment
  taxTreatment: FinalSettlementTaxTreatment
  previsionalTreatment: FinalSettlementPrevisionalTreatment
  overlapBehavior: FinalSettlementOverlapBehavior
  requiresSourceRef: boolean
  blocksApprovalWhenAmbiguous: boolean
}

export interface FinalSettlementBreakdownLine {
  componentCode: FinalSettlementComponentCode | string
  label: string
  kind: FinalSettlementComponentKind
  amount: number
  basis: Record<string, unknown>
  formulaRef: string
  sourceRef: Record<string, unknown>
  taxability: FinalSettlementTaxability
  policyCode?: string
  legalTreatment?: FinalSettlementLegalTreatment
  taxTreatment?: FinalSettlementTaxTreatment
  previsionalTreatment?: FinalSettlementPrevisionalTreatment
  overlapBehavior?: FinalSettlementOverlapBehavior
  evidence?: Record<string, unknown>
}

export interface FinalSettlementTotals {
  grossTotal: number
  deductionTotal: number
  netPayable: number
}

export interface FinalSettlementExplanation {
  schemaVersion: 1
  engineVersion: 'cl-resignation-dependent-v1'
  generatedAt: string
  summary: string
  formulas: Array<{
    formulaRef: string
    description: string
    source: string
  }>
  warnings: string[]
}

export interface FinalSettlementSourceSnapshot {
  schemaVersion: 1 | 2
  offboardingCaseId: string
  memberId: string
  profileId: string
  personLegalEntityRelationshipId: string | null
  legalEntityOrganizationId: string | null
  compensationVersionId: string | null
  hireDate: string | null
  lastAnnualVacationDate: string | null
  effectiveDate: string
  lastWorkingDay: string
  contractEndDate: string | null
  separationType: 'resignation'
  contractType: Extract<ContractType, 'indefinido' | 'plazo_fijo'>
  payRegime: Extract<PayRegime, 'chile'>
  payrollVia: Extract<PayrollVia, 'internal'>
  payrollOverlapLedger?: Record<string, unknown>
}

export interface FinalSettlement {
  finalSettlementId: string
  offboardingCaseId: string
  settlementVersion: number
  supersedesFinalSettlementId: string | null
  profileId: string
  memberId: string
  personLegalEntityRelationshipId: string | null
  legalEntityOrganizationId: string | null
  compensationVersionId: string | null
  separationType: 'resignation'
  contractTypeSnapshot: Extract<ContractType, 'indefinido' | 'plazo_fijo'>
  payRegimeSnapshot: Extract<PayRegime, 'chile'>
  payrollViaSnapshot: Extract<PayrollVia, 'internal'>
  effectiveDate: string
  lastWorkingDay: string
  contractEndDateSnapshot: string | null
  hireDateSnapshot: string | null
  calculationStatus: FinalSettlementStatus
  readinessStatus: FinalSettlementReadinessStatus
  readinessHasBlockers: boolean
  currency: 'CLP'
  grossTotal: number
  deductionTotal: number
  netPayable: number
  sourceSnapshot: FinalSettlementSourceSnapshot
  breakdown: FinalSettlementBreakdownLine[]
  explanation: FinalSettlementExplanation
  readiness: FinalSettlementReadiness
  calculatedAt: string | null
  calculatedByUserId: string | null
  approvedAt: string | null
  approvedByUserId: string | null
  cancelledAt: string | null
  cancelledByUserId: string | null
  cancelReason: string | null
  createdAt: string
  updatedAt: string
}

export interface CalculateFinalSettlementInput {
  offboardingCaseId: string
  actorUserId: string
  sourceRef?: Record<string, unknown>
  manualDeductions?: Array<{
    componentCode: 'authorized_deduction'
    label: string
    amount: number
    sourceRef: Record<string, unknown>
    reason?: string
  }>
}
