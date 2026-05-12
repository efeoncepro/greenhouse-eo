import { describe, expect, it } from 'vitest'

import { buildOffboardingWorkQueueItem } from './derivation'
import type { OffboardingWorkQueueDocumentSummary, OffboardingWorkQueueSettlementSummary } from './types'
import type { OffboardingCase } from '../types'

const baseCase: OffboardingCase = {
  offboardingCaseId: 'case-1',
  publicId: 'EO-OFF-2026-000001',
  profileId: 'profile-1',
  memberId: 'member-1',
  userId: 'user-1',
  personLegalEntityRelationshipId: 'rel-1',
  legalEntityOrganizationId: 'org-1',
  organizationId: 'org-1',
  spaceId: 'space-1',
  relationshipType: 'employee',
  employmentType: 'full_time',
  contractTypeSnapshot: 'indefinido',
  payRegimeSnapshot: 'chile',
  payrollViaSnapshot: 'internal',
  deelContractIdSnapshot: null,
  countryCode: 'CL',
  contractEndDateSnapshot: null,
  separationType: 'resignation',
  source: 'manual_hr',
  status: 'needs_review',
  ruleLane: 'internal_payroll',
  requiresPayrollClosure: true,
  requiresLeaveReconciliation: true,
  requiresHrDocuments: true,
  requiresAccessRevocation: true,
  requiresAssetRecovery: true,
  requiresAssignmentHandoff: true,
  requiresApprovalReassignment: true,
  greenhouseExecutionMode: 'full',
  effectiveDate: '2026-05-31',
  lastWorkingDay: '2026-05-30',
  lastWorkingDayAfterEffectiveReason: null,
  submittedAt: null,
  approvedAt: null,
  scheduledAt: null,
  executedAt: null,
  cancelledAt: null,
  blockedReason: null,
  reasonCode: null,
  notes: null,
  legacyChecklistRef: {},
  sourceRef: {},
  metadata: {},
  createdByUserId: 'user-1',
  updatedByUserId: 'user-1',
  createdAt: '2026-05-04T00:00:00.000Z',
  updatedAt: '2026-05-04T00:00:00.000Z',
  resignationLetterAssetId: null,
  maintenanceObligationJson: null
}

const collaborator = {
  memberId: 'member-1',
  displayName: 'Valentina Hoyos',
  primaryEmail: 'valentina@example.com',
  roleTitle: 'Productora'
}

const settlement: OffboardingWorkQueueSettlementSummary = {
  finalSettlementId: 'fs-1',
  settlementVersion: 1,
  calculationStatus: 'approved',
  readinessStatus: 'ready',
  readinessHasBlockers: false,
  netPayable: 121963,
  currency: 'CLP',
  calculatedAt: '2026-05-11T00:00:00.000Z',
  approvedAt: '2026-05-11T01:00:00.000Z'
}

const document: OffboardingWorkQueueDocumentSummary = {
  finalSettlementDocumentId: 'doc-1',
  finalSettlementId: 'fs-1',
  settlementVersion: 1,
  documentVersion: 1,
  documentStatus: 'approved',
  readinessStatus: 'ready',
  readinessHasBlockers: false,
  pdfAssetId: 'asset-1',
  isHistoricalForLatestSettlement: false,
  issuedAt: null,
  signedOrRatifiedAt: null
}

describe('OffboardingWorkQueue derivation', () => {
  it('blocks resignation final settlement until carta and pension declaration are present', () => {
    const item = buildOffboardingWorkQueueItem({
      item: baseCase,
      collaborator,
      settlement: null,
      document: null
    })

    expect(item.closureLane.code).toBe('final_settlement')
    expect(item.nextStep.code).toBe('upload_resignation_letter')
    expect(item.primaryAction?.code).toBe('upload_resignation_letter')
    expect(item.prerequisites.blockingReasons).toHaveLength(2)
    expect(item.filters).toContain('attention')
  })

  it('marks resignation cases as ready to calculate when prerequisites are complete', () => {
    const item = buildOffboardingWorkQueueItem({
      item: {
        ...baseCase,
        resignationLetterAssetId: 'asset-letter',
        maintenanceObligationJson: {
          variant: 'not_subject',
          declaredAt: '2026-05-11T00:00:00.000Z',
          declaredByUserId: 'user-1'
        }
      },
      collaborator,
      settlement: null,
      document: null
    })

    expect(item.nextStep.code).toBe('calculate')
    expect(item.filters).toContain('ready_to_calculate')
    expect(item.primaryAction?.disabled).toBe(false)
  })

  it('routes approved calculations to document generation', () => {
    const item = buildOffboardingWorkQueueItem({
      item: {
        ...baseCase,
        resignationLetterAssetId: 'asset-letter',
        maintenanceObligationJson: {
          variant: 'subject',
          amount: 100000,
          beneficiary: 'Beneficiaria',
          declaredAt: '2026-05-11T00:00:00.000Z',
          declaredByUserId: 'user-1'
        }
      },
      collaborator,
      settlement,
      document: null
    })

    expect(item.nextStep.code).toBe('render_document')
    expect(item.progress.completed).toBeGreaterThanOrEqual(4)
  })

  it('detects historical documents against the latest settlement', () => {
    const item = buildOffboardingWorkQueueItem({
      item: {
        ...baseCase,
        resignationLetterAssetId: 'asset-letter',
        maintenanceObligationJson: {
          variant: 'not_subject',
          declaredAt: '2026-05-11T00:00:00.000Z',
          declaredByUserId: 'user-1'
        }
      },
      collaborator,
      settlement: {
        ...settlement,
        finalSettlementId: 'fs-2',
        settlementVersion: 2
      },
      document
    })

    expect(item.latestDocument?.isHistoricalForLatestSettlement).toBe(true)
    expect(item.nextStep.code).toBe('render_document')
    expect(item.attentionReasons).toContain('El documento corresponde a un cálculo anterior.')
  })

  it('keeps honorarios outside the labor final settlement lane', () => {
    const item = buildOffboardingWorkQueueItem({
      item: {
        ...baseCase,
        relationshipType: 'contractor',
        contractTypeSnapshot: 'honorarios',
        payrollViaSnapshot: 'none',
        ruleLane: 'non_payroll',
        requiresPayrollClosure: false,
        separationType: 'contract_end'
      },
      collaborator,
      settlement: null,
      document: null
    })

    expect(item.closureLane.code).toBe('contractual_close')
    expect(item.nextStep.code).toBe('review_payment')
    expect(item.filters).toContain('no_labor_settlement')
  })
})
