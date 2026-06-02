import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { resolveWorkforceFoundationGapSeverity } from './gap-codes'
import { buildWorkforceFoundationMapFromInput } from './object-map'
import type {
  WorkforceFoundationAssignmentCandidate,
  WorkforceFoundationCompensationCandidate,
  WorkforceFoundationMapInput,
  WorkforceFoundationPaymentRail,
  WorkforceFoundationReadiness,
  WorkforceFoundationRelationshipEvidence,
  WorkforceFoundationSubject
} from './object-map-types'

const generatedAt = '2026-05-31T12:00:00.000Z'

const subject = (overrides: Partial<WorkforceFoundationSubject> = {}): WorkforceFoundationSubject => ({
  profileId: 'profile-1',
  memberId: 'member-1',
  displayName: 'Ada Lovelace',
  primaryEmail: 'ada@example.com',
  active: true,
  isDemo: false,
  source: 'members',
  confidence: 'high',
  compatibility: {
    memberContractType: 'indefinido',
    memberPayRegime: 'chile',
    memberPayrollVia: 'internal',
    memberDeelContractId: null,
    workforceIntakeStatus: 'completed'
  },
  ...overrides
})

const relationship = (
  overrides: Partial<WorkforceFoundationRelationshipEvidence> = {}
): WorkforceFoundationRelationshipEvidence => ({
  relationshipId: 'rel-1',
  relationshipType: 'employee',
  status: 'active',
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  legalEntityOrganizationId: 'org-1',
  legalEntityName: 'Efeonce',
  sourceOfTruth: 'operating_entity_member_runtime',
  sourceRecordType: 'member',
  sourceRecordId: 'member-1',
  ...overrides
})

const assignment = (
  overrides: Partial<WorkforceFoundationAssignmentCandidate> = {}
): WorkforceFoundationAssignmentCandidate => ({
  roleTitle: 'Engineer',
  managerMemberId: 'manager-1',
  departmentId: 'dept-1',
  spaceId: 'space-1',
  source: 'members',
  confidence: 'medium',
  ...overrides
})

const compensation = (
  overrides: Partial<WorkforceFoundationCompensationCandidate> = {}
): WorkforceFoundationCompensationCandidate => ({
  versionId: 'comp-1',
  memberId: 'member-1',
  contractType: 'indefinido',
  payRegime: 'chile',
  payrollVia: 'internal',
  currency: 'CLP',
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  isCurrent: true,
  baseSalaryPresent: true,
  source: 'compensation_versions',
  confidence: 'high',
  ...overrides
})

const paymentRail = (
  overrides: Partial<WorkforceFoundationPaymentRail> = {}
): WorkforceFoundationPaymentRail => ({
  payrollVia: 'internal',
  deelContractId: null,
  providerContractId: null,
  providerWorkerId: null,
  source: 'members',
  confidence: 'medium',
  obligationSummary: {
    totalObligations: 0,
    payrollObligations: 0,
    contractorPayableObligations: 0,
    missingLineage: 0,
    openObligations: 0,
    currencies: []
  },
  paymentProfileSummary: {
    activeProfiles: 1,
    pendingOrDraftProfiles: 0,
    currencies: ['CLP']
  },
  ...overrides
})

const readiness = (overrides: Partial<WorkforceFoundationReadiness> = {}): WorkforceFoundationReadiness => ({
  status: 'ready',
  ready: true,
  score: 100,
  blockerCount: 0,
  warningCount: 0,
  topBlockerLane: null,
  lanes: [],
  blockerCodes: [],
  warningCodes: [],
  evaluatedAt: generatedAt,
  ...overrides
})

const input = (overrides: Partial<WorkforceFoundationMapInput> = {}): WorkforceFoundationMapInput => ({
  generatedAt,
  subject: subject(),
  activeRelationships: [relationship()],
  assignment: assignment(),
  compensation: compensation(),
  paymentRail: paymentRail(),
  readiness: readiness(),
  classification: {
    profileId: 'profile-1',
    kind: 'employee',
    employmentContractType: 'indefinido',
    contractorSubtype: null,
    classificationRiskStatus: null,
    displayLabel: 'Empleado - Contrato indefinido',
    source: 'active_employment_relationship'
  },
  ...overrides
})

const codes = (map: ReturnType<typeof buildWorkforceFoundationMapFromInput>) =>
  map.gaps.map(gap => gap.code)

describe('WorkforceFoundationMap V1', () => {
  it('maps an active employee with relationship and compensation without gaps', () => {
    const map = buildWorkforceFoundationMapFromInput(input())

    expect(map.person.profileId).toBe('profile-1')
    expect(map.relationship.current?.relationshipType).toBe('employee')
    expect(map.compensation.versionId).toBe('comp-1')
    expect(map.classification.kind).toBe('employee')
    expect(map.classification.parity).toBe(true)
    expect(map.gaps).toEqual([])
  })

  it('keeps contractor current classification separate from legacy member contract history', () => {
    const map = buildWorkforceFoundationMapFromInput(input({
      subject: subject({
        compatibility: {
          memberContractType: 'indefinido',
          memberPayRegime: 'chile',
          memberPayrollVia: 'internal',
          memberDeelContractId: null,
          workforceIntakeStatus: 'completed'
        }
      }),
      activeRelationships: [relationship({ relationshipType: 'contractor' })],
      compensation: compensation({
        contractType: 'contractor',
        payRegime: 'international',
        payrollVia: 'deel',
        currency: 'USD'
      }),
      paymentRail: paymentRail({
        payrollVia: 'deel',
        providerContractId: 'deel-123',
        source: 'contractor_engagements',
        confidence: 'high'
      }),
      classification: {
        profileId: 'profile-1',
        kind: 'contractor',
        employmentContractType: 'indefinido',
        contractorSubtype: 'international_contractor',
        classificationRiskStatus: 'clear',
        displayLabel: 'Contractor - Internacional',
        source: 'active_contractor_engagement'
      }
    }))

    expect(map.classification.kind).toBe('contractor')
    expect(map.classification.employmentContractType).toBe('indefinido')
    expect(map.classification.relationshipDerivedKind).toBe('contractor')
    expect(codes(map)).not.toContain('relationship.current_classification_mismatch')
  })

  it('flags an active member without relationship, compensation or readiness', () => {
    const map = buildWorkforceFoundationMapFromInput(input({
      activeRelationships: [],
      compensation: null,
      readiness: readiness({ status: 'blocked', ready: false, blockerCount: 2, blockerCodes: ['work_relationship_missing'] }),
      classification: {
        profileId: 'profile-1',
        kind: 'none',
        employmentContractType: 'indefinido',
        contractorSubtype: null,
        classificationRiskStatus: null,
        displayLabel: 'Sin clasificacion vigente',
        source: 'employment_history'
      }
    }))

    expect(codes(map)).toEqual(expect.arrayContaining([
      'relationship.missing_active_work_relationship',
      'compensation.missing_current_version',
      'readiness.unresolved_or_blocked'
    ]))
    expect(map.gaps.find(gap => gap.code === 'relationship.missing_active_work_relationship')?.severity).toBe('warning')
  })

  it('flags a member without identity profile as a person-root degradation', () => {
    const map = buildWorkforceFoundationMapFromInput(input({
      subject: subject({ profileId: null, confidence: 'medium' }),
      activeRelationships: [],
      classification: null
    }))

    expect(codes(map)).toEqual(expect.arrayContaining([
      'person.member_without_profile',
      'person.no_identity_profile'
    ]))
  })

  it('flags compensation tuple mismatch', () => {
    const map = buildWorkforceFoundationMapFromInput(input({
      compensation: compensation({
        contractType: 'contractor',
        payRegime: 'chile',
        payrollVia: 'internal'
      })
    }))

    expect(codes(map)).toContain('compensation.tuple_mismatch')
  })

  it('flags Deel payment rail without contract references', () => {
    const map = buildWorkforceFoundationMapFromInput(input({
      paymentRail: paymentRail({
        payrollVia: 'deel',
        deelContractId: null,
        providerContractId: null
      })
    }))

    expect(codes(map)).toContain('payment_rail.missing_deel_contract_id')
  })

  it('downgrades tolerated demo gaps to info and records fixture context', () => {
    const map = buildWorkforceFoundationMapFromInput(input({
      subject: subject({ profileId: null, active: true, isDemo: true }),
      activeRelationships: [],
      compensation: null,
      classification: null
    }))

    expect(codes(map)).toContain('data.demo_or_fixture_tolerated_gap')
    expect(map.gaps.find(gap => gap.code === 'relationship.missing_active_work_relationship')?.severity).toBe('info')
  })

  it('classifies sensitive fields for future redaction adapters', () => {
    const map = buildWorkforceFoundationMapFromInput(input())

    expect(map.sensitiveFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'compensation.versionId', classification: 'hr_sensitive' }),
      expect.objectContaining({ path: 'paymentRail.deelContractId', classification: 'finance_sensitive' })
    ]))
  })

  it('keeps error severity for real classification conflicts', () => {
    expect(resolveWorkforceFoundationGapSeverity({
      code: 'relationship.current_classification_mismatch',
      active: true,
      isDemo: false
    })).toBe('error')
  })
})
