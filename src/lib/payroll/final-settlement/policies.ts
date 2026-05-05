import { PayrollValidationError } from '@/lib/payroll/shared'

import type {
  FinalSettlementBreakdownLine,
  FinalSettlementComponentCode,
  FinalSettlementComponentPolicy,
  FinalSettlementTaxability
} from './types'

export const FINAL_SETTLEMENT_COMPONENT_POLICIES: Record<FinalSettlementComponentCode, FinalSettlementComponentPolicy> = {
  pending_salary: {
    componentCode: 'pending_salary',
    policyCode: 'cl.final_settlement.pending_salary.v1',
    legalTreatment: 'remuneration',
    taxTreatment: 'taxable_monthly',
    previsionalTreatment: 'contribution_base',
    overlapBehavior: 'deduct_delta_only',
    requiresSourceRef: true,
    blocksApprovalWhenAmbiguous: true
  },
  pending_fixed_allowances: {
    componentCode: 'pending_fixed_allowances',
    policyCode: 'cl.final_settlement.pending_fixed_allowances.v1',
    legalTreatment: 'remuneration',
    taxTreatment: 'needs_review',
    previsionalTreatment: 'needs_review',
    overlapBehavior: 'deduct_delta_only',
    requiresSourceRef: true,
    blocksApprovalWhenAmbiguous: true
  },
  monthly_gratification_due: {
    componentCode: 'monthly_gratification_due',
    policyCode: 'cl.final_settlement.monthly_gratification_due.v1',
    legalTreatment: 'remuneration',
    taxTreatment: 'taxable_monthly',
    previsionalTreatment: 'contribution_base',
    overlapBehavior: 'deduct_delta_only',
    requiresSourceRef: true,
    blocksApprovalWhenAmbiguous: true
  },
  proportional_vacation: {
    componentCode: 'proportional_vacation',
    policyCode: 'cl.final_settlement.proportional_vacation.non_income.v1',
    legalTreatment: 'legal_indemnity',
    taxTreatment: 'non_income',
    previsionalTreatment: 'not_contribution_base',
    overlapBehavior: 'never_duplicate_monthly',
    requiresSourceRef: true,
    blocksApprovalWhenAmbiguous: true
  },
  used_or_advanced_vacation_adjustment: {
    componentCode: 'used_or_advanced_vacation_adjustment',
    policyCode: 'cl.final_settlement.used_or_advanced_vacation_adjustment.v1',
    legalTreatment: 'authorized_deduction',
    taxTreatment: 'not_applicable',
    previsionalTreatment: 'not_contribution_base',
    overlapBehavior: 'not_applicable',
    requiresSourceRef: true,
    blocksApprovalWhenAmbiguous: true
  },
  statutory_deductions: {
    componentCode: 'statutory_deductions',
    policyCode: 'cl.final_settlement.statutory_deductions.delta_only.v1',
    legalTreatment: 'authorized_deduction',
    taxTreatment: 'not_applicable',
    previsionalTreatment: 'not_applicable',
    overlapBehavior: 'deduct_delta_only',
    requiresSourceRef: true,
    blocksApprovalWhenAmbiguous: true
  },
  authorized_deduction: {
    componentCode: 'authorized_deduction',
    policyCode: 'cl.final_settlement.authorized_deduction.evidence_required.v1',
    legalTreatment: 'authorized_deduction',
    taxTreatment: 'not_applicable',
    previsionalTreatment: 'not_contribution_base',
    overlapBehavior: 'not_applicable',
    requiresSourceRef: true,
    blocksApprovalWhenAmbiguous: true
  },
  payroll_overlap_adjustment: {
    componentCode: 'payroll_overlap_adjustment',
    policyCode: 'cl.final_settlement.payroll_overlap_adjustment.informational.v1',
    legalTreatment: 'informational',
    taxTreatment: 'not_applicable',
    previsionalTreatment: 'not_applicable',
    overlapBehavior: 'never_duplicate_monthly',
    requiresSourceRef: true,
    blocksApprovalWhenAmbiguous: false
  }
}

const TAXABILITY_BY_POLICY: Record<string, FinalSettlementTaxability> = {
  taxable_monthly_contribution_base: 'taxable_imponible',
  taxable_monthly_not_contribution_base: 'taxable_non_imponible',
  non_income_not_contribution_base: 'not_taxable',
  not_applicable_not_applicable: 'deduction_statutory',
  not_applicable_not_contribution_base: 'deduction_authorized',
  needs_review_needs_review: 'needs_review'
}

export const getFinalSettlementComponentPolicy = (componentCode: string) => {
  const policy = FINAL_SETTLEMENT_COMPONENT_POLICIES[componentCode as FinalSettlementComponentCode]

  if (!policy) {
    throw new PayrollValidationError('Final settlement component policy is not registered.', 409, { componentCode })
  }

  return policy
}

export const policyTaxability = (policy: FinalSettlementComponentPolicy): FinalSettlementTaxability => {
  if (policy.componentCode === 'statutory_deductions') return 'deduction_statutory'
  if (policy.componentCode === 'authorized_deduction') return 'deduction_authorized'

  return TAXABILITY_BY_POLICY[`${policy.taxTreatment}_${policy.previsionalTreatment}`] ?? 'needs_review'
}

export const withFinalSettlementPolicy = (
  line: Omit<
    FinalSettlementBreakdownLine,
    'policyCode' | 'legalTreatment' | 'taxTreatment' | 'previsionalTreatment' | 'overlapBehavior' | 'taxability'
  > & { componentCode: FinalSettlementComponentCode; taxability?: FinalSettlementTaxability }
): FinalSettlementBreakdownLine => {
  const policy = getFinalSettlementComponentPolicy(line.componentCode)

  if (policy.requiresSourceRef && Object.keys(line.sourceRef ?? {}).length === 0) {
    throw new PayrollValidationError('Final settlement component requires source evidence.', 409, {
      componentCode: line.componentCode,
      policyCode: policy.policyCode
    })
  }

  return {
    ...line,
    taxability: line.taxability ?? policyTaxability(policy),
    policyCode: policy.policyCode,
    legalTreatment: policy.legalTreatment,
    taxTreatment: policy.taxTreatment,
    previsionalTreatment: policy.previsionalTreatment,
    overlapBehavior: policy.overlapBehavior
  }
}

export const assertFinalSettlementPolicies = (lines: FinalSettlementBreakdownLine[]) => {
  for (const line of lines) {
    const policy = getFinalSettlementComponentPolicy(line.componentCode)

    if (
      line.policyCode !== policy.policyCode ||
      line.legalTreatment !== policy.legalTreatment ||
      line.taxTreatment !== policy.taxTreatment ||
      line.previsionalTreatment !== policy.previsionalTreatment
    ) {
      throw new PayrollValidationError('Final settlement component policy evidence is inconsistent.', 409, {
        componentCode: line.componentCode,
        policyCode: line.policyCode
      })
    }
  }
}
