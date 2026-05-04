import type { ContractType, PayrollVia, PayRegime } from '@/types/hr-contracts'

import type {
  OffboardingLaneDecision,
  OffboardingRelationshipType,
  OffboardingRuleLane,
  OffboardingSeparationType
} from './types'

const decision = (
  ruleLane: OffboardingRuleLane,
  overrides: Partial<OffboardingLaneDecision> = {}
): OffboardingLaneDecision => ({
  ruleLane,
  requiresPayrollClosure: false,
  requiresLeaveReconciliation: false,
  requiresHrDocuments: false,
  requiresAccessRevocation: true,
  requiresAssetRecovery: false,
  requiresAssignmentHandoff: true,
  requiresApprovalReassignment: true,
  greenhouseExecutionMode: 'partial',
  ...overrides
})

export const resolveOffboardingLane = ({
  relationshipType,
  contractType,
  payRegime,
  payrollVia,
  separationType
}: {
  relationshipType: OffboardingRelationshipType
  contractType: ContractType | 'unknown'
  payRegime: PayRegime | 'unknown'
  payrollVia: PayrollVia | 'none' | 'unknown'
  separationType: OffboardingSeparationType
}): OffboardingLaneDecision => {
  if (separationType === 'identity_only') {
    return decision('identity_only', {
      requiresPayrollClosure: false,
      requiresLeaveReconciliation: false,
      requiresHrDocuments: false,
      requiresAssignmentHandoff: false,
      requiresApprovalReassignment: false,
      greenhouseExecutionMode: 'informational'
    })
  }

  if (separationType === 'relationship_transition') {
    return decision('relationship_transition', {
      requiresPayrollClosure: payrollVia === 'internal',
      requiresLeaveReconciliation: payRegime === 'chile',
      requiresHrDocuments: true,
      requiresAssetRecovery: false,
      greenhouseExecutionMode: 'partial'
    })
  }

  if (payrollVia === 'deel' || contractType === 'eor' || relationshipType === 'eor') {
    return decision('external_payroll', {
      requiresPayrollClosure: false,
      requiresLeaveReconciliation: false,
      requiresHrDocuments: true,
      requiresAssetRecovery: true,
      greenhouseExecutionMode: 'partial'
    })
  }

  if (payrollVia === 'internal' && payRegime === 'chile' && (contractType === 'indefinido' || contractType === 'plazo_fijo')) {
    return decision('internal_payroll', {
      requiresPayrollClosure: true,
      requiresLeaveReconciliation: true,
      requiresHrDocuments: true,
      requiresAssetRecovery: true,
      greenhouseExecutionMode: 'full'
    })
  }

  if (contractType === 'honorarios' || contractType === 'contractor' || relationshipType === 'contractor') {
    return decision('non_payroll', {
      requiresPayrollClosure: false,
      requiresLeaveReconciliation: false,
      requiresHrDocuments: true,
      requiresAssetRecovery: true,
      greenhouseExecutionMode: 'partial'
    })
  }

  return decision('unknown', {
    requiresAccessRevocation: true,
    greenhouseExecutionMode: 'informational'
  })
}
