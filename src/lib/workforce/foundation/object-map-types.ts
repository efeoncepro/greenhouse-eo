import type { CurrentWorkClassification } from '@/lib/account-360/current-work-classification'
import type {
  WorkforceFoundationGap,
  WorkforceFoundationSensitiveField
} from '@/lib/workforce/foundation/gap-codes'

export type WorkforceFoundationConfidence = 'high' | 'medium' | 'low' | 'unknown'

export type WorkforceFoundationSource =
  | 'identity_profiles'
  | 'members'
  | 'person_legal_entity_relationships'
  | 'contractor_engagements'
  | 'compensation_versions'
  | 'payment_obligations'
  | 'beneficiary_payment_profiles'
  | 'workforce_activation_readiness'
  | 'not_available'

export type WorkforceFoundationReadinessStatus = 'ready' | 'warning' | 'blocked' | 'unknown'

export type WorkforceFoundationSubject = {
  profileId: string | null
  memberId: string | null
  displayName: string
  primaryEmail: string | null
  active: boolean
  isDemo: boolean
  source: 'identity_profiles' | 'members'
  confidence: WorkforceFoundationConfidence
  compatibility: {
    memberContractType: string | null
    memberPayRegime: string | null
    memberPayrollVia: string | null
    memberDeelContractId: string | null
    workforceIntakeStatus: string | null
  }
}

export type WorkforceFoundationRelationshipEvidence = {
  relationshipId: string
  relationshipType: string
  status: string
  effectiveFrom: string | null
  effectiveTo: string | null
  legalEntityOrganizationId: string | null
  legalEntityName: string | null
  sourceOfTruth: string | null
  sourceRecordType: string | null
  sourceRecordId: string | null
}

export type WorkforceFoundationAssignmentCandidate = {
  roleTitle: string | null
  managerMemberId: string | null
  departmentId: string | null
  spaceId: string | null
  source: 'members' | 'not_available'
  confidence: WorkforceFoundationConfidence
}

export type WorkforceFoundationCompensationCandidate = {
  versionId: string | null
  memberId: string | null
  contractType: string | null
  payRegime: string | null
  payrollVia: string | null
  currency: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
  isCurrent: boolean
  baseSalaryPresent: boolean
  source: 'compensation_versions' | 'not_available'
  confidence: WorkforceFoundationConfidence
}

export type WorkforceFoundationPaymentRail = {
  payrollVia: string | null
  deelContractId: string | null
  providerContractId: string | null
  providerWorkerId: string | null
  source: 'members' | 'contractor_engagements' | 'not_available'
  confidence: WorkforceFoundationConfidence
  obligationSummary: {
    totalObligations: number
    payrollObligations: number
    contractorPayableObligations: number
    missingLineage: number
    openObligations: number
    currencies: string[]
  }
  paymentProfileSummary: {
    activeProfiles: number
    pendingOrDraftProfiles: number
    currencies: string[]
  }
}

export type WorkforceFoundationReadiness = {
  status: WorkforceFoundationReadinessStatus
  ready: boolean | null
  score: number | null
  blockerCount: number
  warningCount: number
  topBlockerLane: string | null
  lanes: Array<{ lane: string; status: string; source: 'workforce_activation_readiness' }>
  blockerCodes: string[]
  warningCodes: string[]
  evaluatedAt: string | null
}

export type WorkforceFoundationClassification = CurrentWorkClassification & {
  source: CurrentWorkClassification['source']
  relationshipDerivedKind: CurrentWorkClassification['kind']
  parity: boolean
}

export type WorkforceFoundationMap = {
  generatedAt: string
  person: WorkforceFoundationSubject
  relationship: {
    current: WorkforceFoundationRelationshipEvidence | null
    active: WorkforceFoundationRelationshipEvidence[]
    sourceOfTruth: WorkforceFoundationSource
    confidence: WorkforceFoundationConfidence
  }
  assignment: WorkforceFoundationAssignmentCandidate
  compensation: WorkforceFoundationCompensationCandidate
  paymentRail: WorkforceFoundationPaymentRail
  readiness: WorkforceFoundationReadiness
  classification: WorkforceFoundationClassification
  gaps: WorkforceFoundationGap[]
  sensitiveFields: WorkforceFoundationSensitiveField[]
}

export type WorkforceFoundationMapInput = {
  generatedAt?: string
  subject: WorkforceFoundationSubject
  activeRelationships: WorkforceFoundationRelationshipEvidence[]
  assignment: WorkforceFoundationAssignmentCandidate
  compensation: WorkforceFoundationCompensationCandidate | null
  paymentRail: WorkforceFoundationPaymentRail
  readiness: WorkforceFoundationReadiness | null
  classification: CurrentWorkClassification | null
}

export type WorkforceFoundationSubjectFilters = {
  activeOnly?: boolean
  includeDemo?: boolean
  profileId?: string
  memberId?: string
  limit?: number
}
