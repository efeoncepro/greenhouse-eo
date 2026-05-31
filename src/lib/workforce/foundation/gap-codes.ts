export type WorkforceFoundationGapCode =
  | 'person.no_identity_profile'
  | 'person.member_without_profile'
  | 'relationship.missing_active_work_relationship'
  | 'relationship.multiple_active_work_relationships'
  | 'relationship.current_classification_mismatch'
  | 'assignment.missing_required_context'
  | 'compensation.missing_current_version'
  | 'compensation.member_scoped_without_relationship_link'
  | 'compensation.tuple_mismatch'
  | 'payment_rail.missing_deel_contract_id'
  | 'payment_rail.obligation_without_workforce_lineage'
  | 'readiness.unresolved_or_blocked'
  | 'data.demo_or_fixture_tolerated_gap'

export type WorkforceFoundationGapSeverity = 'info' | 'warning' | 'error'

export type WorkforceFoundationSensitiveClassification =
  | 'public_internal'
  | 'hr_sensitive'
  | 'finance_sensitive'
  | 'legal_sensitive'
  | 'agent_restricted'

export type WorkforceFoundationGap = {
  code: WorkforceFoundationGapCode
  severity: WorkforceFoundationGapSeverity
  source: string
  message: string
}

export type WorkforceFoundationSensitiveField = {
  path: string
  classification: WorkforceFoundationSensitiveClassification
  reason: string
}

const BASE_SEVERITY_BY_CODE: Record<WorkforceFoundationGapCode, WorkforceFoundationGapSeverity> = {
  'person.no_identity_profile': 'warning',
  'person.member_without_profile': 'warning',
  'relationship.missing_active_work_relationship': 'warning',
  'relationship.multiple_active_work_relationships': 'error',
  'relationship.current_classification_mismatch': 'error',
  'assignment.missing_required_context': 'info',
  'compensation.missing_current_version': 'warning',
  'compensation.member_scoped_without_relationship_link': 'warning',
  'compensation.tuple_mismatch': 'warning',
  'payment_rail.missing_deel_contract_id': 'warning',
  'payment_rail.obligation_without_workforce_lineage': 'warning',
  'readiness.unresolved_or_blocked': 'warning',
  'data.demo_or_fixture_tolerated_gap': 'info'
}

const DEMO_TOLERATED_CODES = new Set<WorkforceFoundationGapCode>([
  'person.no_identity_profile',
  'person.member_without_profile',
  'relationship.missing_active_work_relationship',
  'assignment.missing_required_context',
  'compensation.missing_current_version',
  'readiness.unresolved_or_blocked'
])

export const resolveWorkforceFoundationGapSeverity = ({
  code,
  active,
  isDemo
}: {
  code: WorkforceFoundationGapCode
  active: boolean
  isDemo: boolean
}): WorkforceFoundationGapSeverity => {
  if (!active && BASE_SEVERITY_BY_CODE[code] !== 'error') return 'info'
  if (isDemo && DEMO_TOLERATED_CODES.has(code)) return 'info'

  return BASE_SEVERITY_BY_CODE[code]
}

export const makeWorkforceFoundationGap = (params: {
  code: WorkforceFoundationGapCode
  active: boolean
  isDemo: boolean
  source: string
  message: string
}): WorkforceFoundationGap => ({
  code: params.code,
  severity: resolveWorkforceFoundationGapSeverity({
    code: params.code,
    active: params.active,
    isDemo: params.isDemo
  }),
  source: params.source,
  message: params.message
})

export const WORKFORCE_FOUNDATION_SENSITIVE_FIELDS: readonly WorkforceFoundationSensitiveField[] = [
  {
    path: 'compensation.versionId',
    classification: 'hr_sensitive',
    reason: 'Compensation versions are payroll/HR evidence and should not leak into broad surfaces.'
  },
  {
    path: 'compensation.baseSalaryPresent',
    classification: 'finance_sensitive',
    reason: 'Salary presence and amount lineage is finance/payroll-sensitive even when values are masked.'
  },
  {
    path: 'paymentRail.deelContractId',
    classification: 'finance_sensitive',
    reason: 'Provider contract references are payment execution evidence.'
  },
  {
    path: 'paymentRail.providerWorkerId',
    classification: 'finance_sensitive',
    reason: 'Provider worker references are payment execution evidence.'
  },
  {
    path: 'paymentRail.paymentProfileSummary',
    classification: 'finance_sensitive',
    reason: 'Payment profile coverage can reveal payout instrumentation.'
  },
  {
    path: 'relationship.legalEntityOrganizationId',
    classification: 'legal_sensitive',
    reason: 'Legal employer/contracting entity is legal workforce evidence.'
  },
  {
    path: 'readiness.blockerCodes',
    classification: 'agent_restricted',
    reason: 'Blocker detail can contain operational remediation context.'
  }
]
