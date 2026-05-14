import type { ContractType, PayrollVia, PayRegime } from '@/types/hr-contracts'

import type {
  OnboardingLaneDecision,
  OnboardingRelationshipType,
  OnboardingRuleLane,
  OnboardingStartType
} from './types'

const decision = (
  ruleLane: OnboardingRuleLane,
  overrides: Partial<OnboardingLaneDecision> = {}
): OnboardingLaneDecision => ({
  ruleLane,
  requiresIdentityProvisioning: true,
  requiresApplicationAccess: true,
  requiresPayrollReadiness: false,
  requiresLeavePolicyBootstrap: false,
  requiresHrDocuments: false,
  requiresAssignmentBootstrap: true,
  requiresManagerAssignment: true,
  requiresEquipmentOrAccessSetup: false,
  greenhouseExecutionMode: 'partial',
  ...overrides
})

export const resolveOnboardingLane = ({
  relationshipType,
  contractType,
  payRegime,
  payrollVia,
  startType
}: {
  relationshipType: OnboardingRelationshipType
  contractType: ContractType | 'unknown'
  payRegime: PayRegime | 'unknown'
  payrollVia: PayrollVia | 'none' | 'unknown'
  startType: OnboardingStartType
}): OnboardingLaneDecision => {
  if (startType === 'identity_only') {
    return decision('identity_only', {
      requiresPayrollReadiness: false,
      requiresLeavePolicyBootstrap: false,
      requiresHrDocuments: false,
      requiresAssignmentBootstrap: false,
      requiresManagerAssignment: false,
      greenhouseExecutionMode: 'informational'
    })
  }

  if (startType === 'relationship_transition') {
    return decision('relationship_transition', {
      requiresPayrollReadiness: payrollVia === 'internal',
      requiresLeavePolicyBootstrap: payRegime === 'chile',
      requiresHrDocuments: true,
      greenhouseExecutionMode: 'partial'
    })
  }

  if (payrollVia === 'deel' || contractType === 'eor' || relationshipType === 'eor') {
    return decision('external_payroll', {
      requiresPayrollReadiness: false,
      requiresLeavePolicyBootstrap: false,
      requiresHrDocuments: true,
      requiresEquipmentOrAccessSetup: true,
      greenhouseExecutionMode: 'partial'
    })
  }

  if (payrollVia === 'internal' && payRegime === 'chile' && (contractType === 'indefinido' || contractType === 'plazo_fijo')) {
    return decision('internal_payroll', {
      requiresPayrollReadiness: true,
      requiresLeavePolicyBootstrap: true,
      requiresHrDocuments: true,
      requiresEquipmentOrAccessSetup: true,
      greenhouseExecutionMode: 'full'
    })
  }

  if (contractType === 'honorarios' || contractType === 'contractor' || relationshipType === 'contractor') {
    return decision('non_payroll', {
      requiresPayrollReadiness: false,
      requiresLeavePolicyBootstrap: false,
      requiresHrDocuments: true,
      requiresEquipmentOrAccessSetup: true,
      greenhouseExecutionMode: 'partial'
    })
  }

  return decision('unknown', {
    greenhouseExecutionMode: 'informational'
  })
}
