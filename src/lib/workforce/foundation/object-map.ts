import 'server-only'

import { resolveCurrentWorkClassification } from '@/lib/account-360/current-work-classification'
import { resolveActivePersonLegalEntityRelationships } from '@/lib/account-360/person-legal-entity-relationships'
import { query } from '@/lib/db'
import { resolveWorkforceActivationReadiness } from '@/lib/workforce/activation/readiness'
import { buildWorkforceActivationReadinessAuditSnapshot } from '@/lib/workforce/activation/readiness'
import {
  WORKFORCE_FOUNDATION_SENSITIVE_FIELDS,
  makeWorkforceFoundationGap,
  type WorkforceFoundationGap
} from '@/lib/workforce/foundation/gap-codes'
import type {
  WorkforceFoundationAssignmentCandidate,
  WorkforceFoundationClassification,
  WorkforceFoundationCompensationCandidate,
  WorkforceFoundationMap,
  WorkforceFoundationMapInput,
  WorkforceFoundationPaymentRail,
  WorkforceFoundationReadiness,
  WorkforceFoundationRelationshipEvidence,
  WorkforceFoundationSubject,
  WorkforceFoundationSubjectFilters
} from '@/lib/workforce/foundation/object-map-types'
import {
  isCanonicalContractPayrollTuple,
  isContractType,
  normalizePayRegime,
  normalizePayrollVia
} from '@/types/hr-contracts'

type SubjectRow = {
  profile_id: string | null
  member_id: string | null
  display_name: string | null
  full_name: string | null
  primary_email: string | null
  canonical_email: string | null
  active: boolean | null
  is_demo: boolean | null
  contract_type: string | null
  pay_regime: string | null
  payroll_via: string | null
  deel_contract_id: string | null
  workforce_intake_status: string | null
  role_title: string | null
  reports_to_member_id: string | null
  department_id: string | null
  source_space_id: string | null
}

type CompensationRow = {
  version_id: string
  member_id: string
  contract_type: string
  pay_regime: string
  payroll_via: string | null
  currency: string
  effective_from: string | Date
  effective_to: string | Date | null
  is_current: boolean
  base_salary_present: boolean
}

type ContractorEngagementRow = {
  provider_contract_id: string | null
  provider_worker_id: string | null
  payroll_via: string | null
  status: string
}

type PaymentSummaryRow = {
  total_obligations: string | number | null
  payroll_obligations: string | number | null
  contractor_payable_obligations: string | number | null
  missing_lineage: string | number | null
  open_obligations: string | number | null
  currencies: string[] | null
}

type PaymentProfileSummaryRow = {
  active_profiles: string | number | null
  pending_or_draft_profiles: string | number | null
  currencies: string[] | null
}

const toIsoDate = (value: string | Date | null | undefined) => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

const toInt = (value: string | number | null | undefined) => Number(value ?? 0)

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))))

const emptyCompensation = (): WorkforceFoundationCompensationCandidate => ({
  versionId: null,
  memberId: null,
  contractType: null,
  payRegime: null,
  payrollVia: null,
  currency: null,
  effectiveFrom: null,
  effectiveTo: null,
  isCurrent: false,
  baseSalaryPresent: false,
  source: 'not_available',
  confidence: 'unknown'
})

const emptyReadiness = (): WorkforceFoundationReadiness => ({
  status: 'unknown',
  ready: null,
  score: null,
  blockerCount: 0,
  warningCount: 0,
  topBlockerLane: null,
  lanes: [],
  blockerCodes: [],
  warningCodes: [],
  evaluatedAt: null
})

const classifyRelationshipKind = (
  relationships: readonly WorkforceFoundationRelationshipEvidence[]
): WorkforceFoundationClassification['relationshipDerivedKind'] => {
  if (relationships.some(relationship => relationship.relationshipType === 'employee')) return 'employee'
  if (relationships.some(relationship => relationship.relationshipType === 'contractor')) return 'contractor'

  return 'none'
}

const selectCurrentRelationship = (
  relationships: readonly WorkforceFoundationRelationshipEvidence[]
) => {
  const employee = relationships.find(relationship => relationship.relationshipType === 'employee')

  return employee ?? relationships[0] ?? null
}

const deriveRelationshipConfidence = (relationships: readonly WorkforceFoundationRelationshipEvidence[]) => {
  if (relationships.length === 0) return 'unknown'
  if (relationships.length === 1) return 'high'

  return 'low'
}

const normalizeClassification = (
  input: WorkforceFoundationMapInput
): WorkforceFoundationClassification => {
  const derivedKind = classifyRelationshipKind(input.activeRelationships)

  const classification = input.classification ?? {
    profileId: input.subject.profileId ?? 'unknown',
    kind: 'none',
    employmentContractType: input.subject.compatibility.memberContractType,
    contractorSubtype: null,
    classificationRiskStatus: null,
    displayLabel: 'Sin clasificacion vigente',
    source: 'none'
  }

  return {
    ...classification,
    relationshipDerivedKind: derivedKind,
    parity: classification.kind === derivedKind
  }
}

const resolveAssignmentGaps = ({
  subject,
  assignment
}: {
  subject: WorkforceFoundationSubject
  assignment: WorkforceFoundationAssignmentCandidate
}) => {
  if (!subject.active || subject.isDemo) return []
  if (assignment.roleTitle && assignment.spaceId) return []

  return [
    makeWorkforceFoundationGap({
      code: 'assignment.missing_required_context',
      active: subject.active,
      isDemo: subject.isDemo,
      source: 'greenhouse_core.members',
      message: 'Missing role title or space context for the assignment candidate.'
    })
  ]
}

const resolveCompensationGaps = ({
  subject,
  relationship,
  compensation
}: {
  subject: WorkforceFoundationSubject
  relationship: readonly WorkforceFoundationRelationshipEvidence[]
  compensation: WorkforceFoundationCompensationCandidate
}) => {
  const gaps: WorkforceFoundationGap[] = []

  if (!compensation.versionId) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'compensation.missing_current_version',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'greenhouse_payroll.compensation_versions',
        message: 'No current compensation version was found for the member.'
      })
    )
  }

  if (compensation.versionId && relationship.length === 0) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'compensation.member_scoped_without_relationship_link',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'greenhouse_payroll.compensation_versions',
        message: 'Current compensation is member-scoped and no active work relationship links it to a relationship.'
      })
    )
  }

  if (
    compensation.contractType &&
    compensation.payRegime &&
    compensation.payrollVia &&
    isContractType(compensation.contractType) &&
    !isCanonicalContractPayrollTuple({
      contractType: compensation.contractType,
      payRegime: normalizePayRegime(compensation.payRegime, compensation.contractType),
      payrollVia: normalizePayrollVia(compensation.payrollVia, compensation.contractType)
    })
  ) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'compensation.tuple_mismatch',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'greenhouse_payroll.compensation_versions',
        message: 'Current compensation contract/pay regime/payroll rail tuple does not match canonical derivations.'
      })
    )
  }

  return gaps
}

const resolvePaymentRailGaps = ({
  subject,
  paymentRail
}: {
  subject: WorkforceFoundationSubject
  paymentRail: WorkforceFoundationPaymentRail
}) => {
  const gaps: WorkforceFoundationGap[] = []

  if (paymentRail.payrollVia === 'deel' && !paymentRail.deelContractId && !paymentRail.providerContractId) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'payment_rail.missing_deel_contract_id',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'greenhouse_core.members|greenhouse_hr.contractor_engagements',
        message: 'Worker is routed through Deel but no Deel/provider contract reference is present.'
      })
    )
  }

  if (paymentRail.obligationSummary.missingLineage > 0) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'payment_rail.obligation_without_workforce_lineage',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'greenhouse_finance.payment_obligations',
        message: 'One or more payment obligations lack recognizable workforce lineage in source_ref or metadata.'
      })
    )
  }

  return gaps
}

const resolveRelationshipGaps = ({
  subject,
  relationships,
  classification
}: {
  subject: WorkforceFoundationSubject
  relationships: readonly WorkforceFoundationRelationshipEvidence[]
  classification: WorkforceFoundationClassification
}) => {
  const gaps: WorkforceFoundationGap[] = []

  if (subject.memberId && !subject.profileId) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'person.member_without_profile',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'greenhouse_core.members',
        message: 'Member has no identity_profile_id, so person-rooted workforce mapping is degraded.'
      })
    )
  }

  if (!subject.profileId) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'person.no_identity_profile',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'greenhouse_core.identity_profiles',
        message: 'No identity profile is available for the workforce subject.'
      })
    )
  }

  if (subject.active && relationships.length === 0) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'relationship.missing_active_work_relationship',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'greenhouse_core.person_legal_entity_relationships',
        message: 'Active worker has no active employee/contractor relationship evidence.'
      })
    )
  }

  if (relationships.length > 1) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'relationship.multiple_active_work_relationships',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'greenhouse_core.person_legal_entity_relationships',
        message: 'More than one active employee/contractor relationship is present for the same person.'
      })
    )
  }

  if (!classification.parity) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'relationship.current_classification_mismatch',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'resolveCurrentWorkClassification',
        message: 'Relationship-derived kind does not match the canonical current work classification resolver.'
      })
    )
  }

  if (subject.isDemo && gaps.length > 0) {
    gaps.push(
      makeWorkforceFoundationGap({
        code: 'data.demo_or_fixture_tolerated_gap',
        active: subject.active,
        isDemo: subject.isDemo,
        source: 'greenhouse_core.members',
        message: 'Gap belongs to demo/fixture data and is tolerated for audit coverage, not production readiness.'
      })
    )
  }

  return gaps
}

const resolveReadinessGaps = ({
  subject,
  readiness
}: {
  subject: WorkforceFoundationSubject
  readiness: WorkforceFoundationReadiness
}) => {
  if (readiness.status !== 'blocked' && readiness.status !== 'unknown') return []

  return [
    makeWorkforceFoundationGap({
      code: 'readiness.unresolved_or_blocked',
      active: subject.active,
      isDemo: subject.isDemo,
      source: 'src/lib/workforce/activation/readiness.ts',
      message: 'Workforce activation readiness is blocked or unavailable for this subject.'
    })
  ]
}

export const buildWorkforceFoundationMapFromInput = (
  input: WorkforceFoundationMapInput
): WorkforceFoundationMap => {
  const compensation = input.compensation ?? emptyCompensation()
  const readiness = input.readiness ?? emptyReadiness()
  const classification = normalizeClassification(input)
  const currentRelationship = selectCurrentRelationship(input.activeRelationships)
  const relationshipConfidence = deriveRelationshipConfidence(input.activeRelationships)

  const gaps = [
    ...resolveRelationshipGaps({
      subject: input.subject,
      relationships: input.activeRelationships,
      classification
    }),
    ...resolveAssignmentGaps({ subject: input.subject, assignment: input.assignment }),
    ...resolveCompensationGaps({
      subject: input.subject,
      relationship: input.activeRelationships,
      compensation
    }),
    ...resolvePaymentRailGaps({ subject: input.subject, paymentRail: input.paymentRail }),
    ...resolveReadinessGaps({ subject: input.subject, readiness })
  ]

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    person: input.subject,
    relationship: {
      current: currentRelationship,
      active: [...input.activeRelationships],
      sourceOfTruth: currentRelationship ? 'person_legal_entity_relationships' : 'not_available',
      confidence: relationshipConfidence
    },
    assignment: input.assignment,
    compensation,
    paymentRail: input.paymentRail,
    readiness,
    classification,
    gaps,
    sensitiveFields: [...WORKFORCE_FOUNDATION_SENSITIVE_FIELDS]
  }
}

const mapSubjectRow = (row: SubjectRow): WorkforceFoundationSubject => ({
  profileId: row.profile_id,
  memberId: row.member_id,
  displayName: row.display_name ?? row.full_name ?? 'Sin nombre',
  primaryEmail: row.primary_email ?? row.canonical_email,
  active: row.active ?? true,
  isDemo: Boolean(row.is_demo),
  source: row.member_id ? 'members' : 'identity_profiles',
  confidence: row.profile_id && row.member_id ? 'high' : row.profile_id || row.member_id ? 'medium' : 'unknown',
  compatibility: {
    memberContractType: row.contract_type,
    memberPayRegime: row.pay_regime,
    memberPayrollVia: row.payroll_via,
    memberDeelContractId: row.deel_contract_id,
    workforceIntakeStatus: row.workforce_intake_status
  }
})

const mapAssignment = (row: SubjectRow): WorkforceFoundationAssignmentCandidate => ({
  roleTitle: row.role_title,
  managerMemberId: row.reports_to_member_id,
  departmentId: row.department_id,
  spaceId: row.source_space_id,
  source: row.member_id ? 'members' : 'not_available',
  confidence: row.role_title || row.source_space_id ? 'medium' : 'unknown'
})

const mapCompensation = (row: CompensationRow | undefined): WorkforceFoundationCompensationCandidate | null => {
  if (!row) return null

  return {
    versionId: row.version_id,
    memberId: row.member_id,
    contractType: row.contract_type,
    payRegime: row.pay_regime,
    payrollVia: row.payroll_via,
    currency: row.currency,
    effectiveFrom: toIsoDate(row.effective_from),
    effectiveTo: toIsoDate(row.effective_to),
    isCurrent: row.is_current,
    baseSalaryPresent: row.base_salary_present,
    source: 'compensation_versions',
    confidence: 'high'
  }
}

const mapRelationship = (relationship: {
  relationshipId: string
  relationshipType: string
  status: string
  effectiveFrom: string | null
  effectiveTo: string | null
  legalEntityOrganizationId: string | null
  legalEntityName: string | null
  sourceOfTruth: string
  sourceRecordType: string | null
  sourceRecordId: string | null
}): WorkforceFoundationRelationshipEvidence => ({
  relationshipId: relationship.relationshipId,
  relationshipType: relationship.relationshipType,
  status: relationship.status,
  effectiveFrom: relationship.effectiveFrom,
  effectiveTo: relationship.effectiveTo,
  legalEntityOrganizationId: relationship.legalEntityOrganizationId,
  legalEntityName: relationship.legalEntityName,
  sourceOfTruth: relationship.sourceOfTruth,
  sourceRecordType: relationship.sourceRecordType,
  sourceRecordId: relationship.sourceRecordId
})

const defaultPaymentRail = (subject: WorkforceFoundationSubject): WorkforceFoundationPaymentRail => ({
  payrollVia: subject.compatibility.memberPayrollVia,
  deelContractId: subject.compatibility.memberDeelContractId,
  providerContractId: null,
  providerWorkerId: null,
  source: subject.compatibility.memberPayrollVia ? 'members' : 'not_available',
  confidence: subject.compatibility.memberPayrollVia ? 'medium' : 'unknown',
  obligationSummary: {
    totalObligations: 0,
    payrollObligations: 0,
    contractorPayableObligations: 0,
    missingLineage: 0,
    openObligations: 0,
    currencies: []
  },
  paymentProfileSummary: {
    activeProfiles: 0,
    pendingOrDraftProfiles: 0,
    currencies: []
  }
})

const buildReadinessSummary = async (memberId: string | null): Promise<WorkforceFoundationReadiness | null> => {
  if (!memberId) return null

  try {
    const readiness = await resolveWorkforceActivationReadiness(memberId)
    const snapshot = buildWorkforceActivationReadinessAuditSnapshot(readiness)

    const status: WorkforceFoundationReadiness['status'] = readiness.ready
      ? 'ready'
      : readiness.blockerCount > 0
        ? 'blocked'
        : readiness.warningCount > 0
          ? 'warning'
          : 'unknown'

    return {
      status,
      ready: readiness.ready,
      score: readiness.readinessScore,
      blockerCount: readiness.blockerCount,
      warningCount: readiness.warningCount,
      topBlockerLane: readiness.topBlockerLane,
      lanes: snapshot.laneStatuses.map(item => ({
        lane: item.key,
        status: item.status,
        source: 'workforce_activation_readiness'
      })),
      blockerCodes: snapshot.blockerCodes,
      warningCodes: snapshot.warningCodes,
      evaluatedAt: snapshot.evaluatedAt
    }
  } catch {
    return {
      ...emptyReadiness(),
      status: 'unknown'
    }
  }
}

const findSubjectByMember = async (memberId: string) => {
  const rows = await query<SubjectRow>(
    `
      SELECT
        ip.profile_id,
        m.member_id,
        m.display_name,
        ip.full_name,
        m.primary_email,
        ip.canonical_email,
        m.active,
        m.is_demo,
        m.contract_type,
        m.pay_regime,
        m.payroll_via,
        m.deel_contract_id,
        m.workforce_intake_status,
        m.role_title,
        m.reports_to_member_id,
        m.department_id,
        COALESCE(ms.space_id, pler.space_id) AS source_space_id
      FROM greenhouse_core.members m
      LEFT JOIN greenhouse_core.identity_profiles ip
        ON ip.profile_id = m.identity_profile_id
      LEFT JOIN LATERAL (
        SELECT pm.space_id
        FROM greenhouse_core.person_memberships pm
        WHERE pm.profile_id = m.identity_profile_id
          AND pm.active = TRUE
        ORDER BY pm.created_at DESC
        LIMIT 1
      ) ms ON TRUE
      LEFT JOIN LATERAL (
        SELECT rel.space_id
        FROM greenhouse_core.person_legal_entity_relationships rel
        WHERE rel.profile_id = m.identity_profile_id
          AND rel.status = 'active'
          AND rel.relationship_type = ANY($2::text[])
        ORDER BY rel.effective_from DESC
        LIMIT 1
      ) pler ON TRUE
      WHERE m.member_id = $1
      LIMIT 1
    `,
    [memberId, ['employee', 'contractor']]
  )

  return rows[0] ?? null
}

const findSubjectByProfile = async (profileId: string) => {
  const rows = await query<SubjectRow>(
    `
      SELECT
        ip.profile_id,
        m.member_id,
        m.display_name,
        ip.full_name,
        m.primary_email,
        ip.canonical_email,
        COALESCE(m.active, ip.active) AS active,
        COALESCE(m.is_demo, FALSE) AS is_demo,
        m.contract_type,
        m.pay_regime,
        m.payroll_via,
        m.deel_contract_id,
        m.workforce_intake_status,
        m.role_title,
        m.reports_to_member_id,
        m.department_id,
        COALESCE(ms.space_id, pler.space_id) AS source_space_id
      FROM greenhouse_core.identity_profiles ip
      LEFT JOIN greenhouse_core.members m
        ON m.identity_profile_id = ip.profile_id
      LEFT JOIN LATERAL (
        SELECT pm.space_id
        FROM greenhouse_core.person_memberships pm
        WHERE pm.profile_id = ip.profile_id
          AND pm.active = TRUE
        ORDER BY pm.created_at DESC
        LIMIT 1
      ) ms ON TRUE
      LEFT JOIN LATERAL (
        SELECT rel.space_id
        FROM greenhouse_core.person_legal_entity_relationships rel
        WHERE rel.profile_id = ip.profile_id
          AND rel.status = 'active'
          AND rel.relationship_type = ANY($2::text[])
        ORDER BY rel.effective_from DESC
        LIMIT 1
      ) pler ON TRUE
      WHERE ip.profile_id = $1
      ORDER BY m.active DESC NULLS LAST, m.updated_at DESC NULLS LAST
      LIMIT 1
    `,
    [profileId, ['employee', 'contractor']]
  )

  return rows[0] ?? null
}

const loadCurrentCompensation = async (memberId: string | null) => {
  if (!memberId) return null

  const rows = await query<CompensationRow>(
    `
      SELECT
        version_id,
        member_id,
        contract_type,
        pay_regime,
        NULL::text AS payroll_via,
        currency,
        effective_from,
        effective_to,
        is_current,
        base_salary IS NOT NULL AS base_salary_present
      FROM greenhouse_payroll.compensation_versions
      WHERE member_id = $1
        AND is_current = TRUE
      ORDER BY effective_from DESC, version DESC
      LIMIT 1
    `,
    [memberId]
  )

  return mapCompensation(rows[0])
}

const loadContractorEngagement = async (profileId: string | null) => {
  if (!profileId) return null

  const rows = await query<ContractorEngagementRow>(
    `
      SELECT
        provider_contract_id,
        provider_worker_id,
        payroll_via,
        status
      FROM greenhouse_hr.contractor_engagements
      WHERE profile_id = $1
        AND status NOT IN ('terminated', 'cancelled', 'completed', 'ended')
      ORDER BY start_date DESC, updated_at DESC
      LIMIT 1
    `,
    [profileId]
  )

  return rows[0] ?? null
}

const loadPaymentSummary = async (memberId: string | null) => {
  if (!memberId) {
    return {
      totalObligations: 0,
      payrollObligations: 0,
      contractorPayableObligations: 0,
      missingLineage: 0,
      openObligations: 0,
      currencies: []
    }
  }

  const rows = await query<PaymentSummaryRow>(
    `
      SELECT
        COUNT(*) AS total_obligations,
        COUNT(*) FILTER (WHERE source_kind = 'payroll') AS payroll_obligations,
        COUNT(*) FILTER (WHERE source_kind = 'contractor_payable') AS contractor_payable_obligations,
        COUNT(*) FILTER (
          WHERE source_kind IN ('payroll', 'contractor_payable')
            AND (
              source_ref IS NULL
              OR source_ref = ''
              OR metadata_json IS NULL
            )
        ) AS missing_lineage,
        COUNT(*) FILTER (WHERE status NOT IN ('paid', 'cancelled', 'superseded')) AS open_obligations,
        ARRAY_AGG(DISTINCT currency) FILTER (WHERE currency IS NOT NULL) AS currencies
      FROM greenhouse_finance.payment_obligations
      WHERE beneficiary_id = $1
        AND beneficiary_type IN ('member', 'collaborator', 'contractor')
    `,
    [memberId]
  )

  const row = rows[0]

  return {
    totalObligations: toInt(row?.total_obligations),
    payrollObligations: toInt(row?.payroll_obligations),
    contractorPayableObligations: toInt(row?.contractor_payable_obligations),
    missingLineage: toInt(row?.missing_lineage),
    openObligations: toInt(row?.open_obligations),
    currencies: row?.currencies ?? []
  }
}

const loadPaymentProfileSummary = async (memberId: string | null) => {
  if (!memberId) {
    return {
      activeProfiles: 0,
      pendingOrDraftProfiles: 0,
      currencies: []
    }
  }

  const rows = await query<PaymentProfileSummaryRow>(
    `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') AS active_profiles,
        COUNT(*) FILTER (WHERE status IN ('draft', 'pending_approval')) AS pending_or_draft_profiles,
        ARRAY_AGG(DISTINCT currency) FILTER (WHERE currency IS NOT NULL) AS currencies
      FROM greenhouse_finance.beneficiary_payment_profiles
      WHERE beneficiary_id = $1
        AND beneficiary_type IN ('member', 'collaborator', 'contractor')
    `,
    [memberId]
  )

  const row = rows[0]

  return {
    activeProfiles: toInt(row?.active_profiles),
    pendingOrDraftProfiles: toInt(row?.pending_or_draft_profiles),
    currencies: row?.currencies ?? []
  }
}

const buildPaymentRail = async (params: {
  subject: WorkforceFoundationSubject
  contractorEngagement: ContractorEngagementRow | null
}) => {
  const base = defaultPaymentRail(params.subject)
  const obligationSummary = await loadPaymentSummary(params.subject.memberId)
  const paymentProfileSummary = await loadPaymentProfileSummary(params.subject.memberId)
  const payrollVia = params.contractorEngagement?.payroll_via ?? params.subject.compatibility.memberPayrollVia

  return {
    ...base,
    payrollVia,
    deelContractId: params.subject.compatibility.memberDeelContractId,
    providerContractId: params.contractorEngagement?.provider_contract_id ?? null,
    providerWorkerId: params.contractorEngagement?.provider_worker_id ?? null,
    source: params.contractorEngagement ? 'contractor_engagements' : base.source,
    confidence: payrollVia ? (params.contractorEngagement ? 'high' : 'medium') : 'unknown',
    obligationSummary: {
      ...obligationSummary,
      currencies: uniqueStrings(obligationSummary.currencies)
    },
    paymentProfileSummary: {
      ...paymentProfileSummary,
      currencies: uniqueStrings(paymentProfileSummary.currencies)
    }
  } satisfies WorkforceFoundationPaymentRail
}

const buildMapForSubjectRow = async (row: SubjectRow) => {
  const subject = mapSubjectRow(row)

  const relationships = subject.profileId
    ? await resolveActivePersonLegalEntityRelationships({
        profileId: subject.profileId,
        relationshipTypes: ['employee', 'contractor']
      })
    : []

  const activeRelationships = relationships.map(mapRelationship)
  const contractorEngagement = await loadContractorEngagement(subject.profileId)

  const classification = subject.profileId
    ? await resolveCurrentWorkClassification({
        profileId: subject.profileId,
        memberContractType: subject.compatibility.memberContractType
      })
    : null

  const compensation = await loadCurrentCompensation(subject.memberId)

  return buildWorkforceFoundationMapFromInput({
    subject,
    activeRelationships,
    assignment: mapAssignment(row),
    compensation: compensation
      ? {
          ...compensation,
          payrollVia: compensation.payrollVia ?? subject.compatibility.memberPayrollVia
        }
      : null,
    paymentRail: await buildPaymentRail({ subject, contractorEngagement }),
    readiness: await buildReadinessSummary(subject.memberId),
    classification
  })
}

export const buildWorkforceFoundationMapForMember = async (
  memberId: string
): Promise<WorkforceFoundationMap> => {
  const row = await findSubjectByMember(memberId)

  if (!row) {
    return buildWorkforceFoundationMapFromInput({
      subject: {
        profileId: null,
        memberId,
        displayName: 'Sin nombre',
        primaryEmail: null,
        active: false,
        isDemo: false,
        source: 'members',
        confidence: 'unknown',
        compatibility: {
          memberContractType: null,
          memberPayRegime: null,
          memberPayrollVia: null,
          memberDeelContractId: null,
          workforceIntakeStatus: null
        }
      },
      activeRelationships: [],
      assignment: {
        roleTitle: null,
        managerMemberId: null,
        departmentId: null,
        spaceId: null,
        source: 'not_available',
        confidence: 'unknown'
      },
      compensation: null,
      paymentRail: defaultPaymentRail({
        profileId: null,
        memberId,
        displayName: 'Sin nombre',
        primaryEmail: null,
        active: false,
        isDemo: false,
        source: 'members',
        confidence: 'unknown',
        compatibility: {
          memberContractType: null,
          memberPayRegime: null,
          memberPayrollVia: null,
          memberDeelContractId: null,
          workforceIntakeStatus: null
        }
      }),
      readiness: await buildReadinessSummary(memberId),
      classification: null
    })
  }

  return buildMapForSubjectRow(row)
}

export const buildWorkforceFoundationMapForProfile = async (
  profileId: string
): Promise<WorkforceFoundationMap> => {
  const row = await findSubjectByProfile(profileId)

  if (!row) {
    throw new Error(`No identity profile found for profile_id=${profileId}`)
  }

  return buildMapForSubjectRow(row)
}

export const listWorkforceFoundationSubjects = async (
  filters: WorkforceFoundationSubjectFilters = {}
): Promise<WorkforceFoundationSubject[]> => {
  const values: unknown[] = []
  const memberClauses: string[] = []
  const profileClauses: string[] = []
  const includeProfileOnly = !filters.activeOnly || Boolean(filters.profileId)

  if (filters.activeOnly) {
    memberClauses.push('m.active = TRUE')
    profileClauses.push('ip.active = TRUE')
  }

  if (!includeProfileOnly) {
    profileClauses.push('FALSE')
  }

  if (!filters.includeDemo) {
    memberClauses.push('m.is_demo = FALSE')
  }

  if (filters.memberId) {
    values.push(filters.memberId)
    memberClauses.push(`m.member_id = $${values.length}`)
    profileClauses.push('FALSE')
  }

  if (filters.profileId) {
    values.push(filters.profileId)
    memberClauses.push(`m.identity_profile_id = $${values.length}`)
    profileClauses.push(`ip.profile_id = $${values.length}`)
  }

  values.push(filters.limit ?? 500)
  const limitParam = `$${values.length}`
  const memberWhere = memberClauses.length ? `WHERE ${memberClauses.join(' AND ')}` : ''
  const profileWhere = profileClauses.length ? `WHERE ${profileClauses.join(' AND ')}` : ''

  const rows = await query<SubjectRow>(
    `
      WITH member_subjects AS (
        SELECT
          ip.profile_id,
          m.member_id,
          m.display_name,
          ip.full_name,
          m.primary_email,
          ip.canonical_email,
          m.active,
          m.is_demo,
          m.contract_type,
          m.pay_regime,
          m.payroll_via,
          m.deel_contract_id,
          m.workforce_intake_status,
          m.role_title,
          m.reports_to_member_id,
          m.department_id,
          NULL::text AS source_space_id
        FROM greenhouse_core.members m
        LEFT JOIN greenhouse_core.identity_profiles ip
          ON ip.profile_id = m.identity_profile_id
        ${memberWhere}
      ),
      profile_only_subjects AS (
        SELECT
          ip.profile_id,
          NULL::text AS member_id,
          NULL::text AS display_name,
          ip.full_name,
          NULL::text AS primary_email,
          ip.canonical_email,
          ip.active,
          FALSE AS is_demo,
          NULL::text AS contract_type,
          NULL::text AS pay_regime,
          NULL::text AS payroll_via,
          NULL::text AS deel_contract_id,
          NULL::text AS workforce_intake_status,
          ip.job_title AS role_title,
          NULL::text AS reports_to_member_id,
          NULL::text AS department_id,
          NULL::text AS source_space_id
        FROM greenhouse_core.identity_profiles ip
        ${profileWhere}
          ${profileWhere ? 'AND' : 'WHERE'} NOT EXISTS (
            SELECT 1
            FROM greenhouse_core.members m
            WHERE m.identity_profile_id = ip.profile_id
          )
      )
      SELECT *
      FROM (
        SELECT * FROM member_subjects
        UNION ALL
        SELECT * FROM profile_only_subjects
      ) subjects
      ORDER BY active DESC NULLS LAST, display_name ASC NULLS LAST, full_name ASC NULLS LAST
      LIMIT ${limitParam}
    `,
    values
  )

  return rows.map(mapSubjectRow)
}
