import { describe, expect, it } from 'vitest'

import {
  COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION,
  classifyAssignmentForCostAttribution,
  isBillableCommercialAssignment,
  isCommercialAssignment,
  isInternalCommercialAssignment
} from '@/lib/commercial-cost-attribution/assignment-classification'

describe('classifyAssignmentForCostAttribution', () => {
  it('classifies internal operational assignments with a shared rule version', () => {
    expect(
      classifyAssignmentForCostAttribution({
        clientId: 'space-efeonce',
        clientName: 'Efeonce',
        fteAllocation: '1.0'
      })
    ).toEqual(
      expect.objectContaining({
        classification: 'internal_operational',
        isCommercial: false,
        shouldParticipateInCommercialAttribution: false,
        exclusionReason: 'internal_operational_assignment',
        ruleVersion: COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION
      })
    )
  })

  it('classifies active external assignments as commercial billable by default', () => {
    expect(
      classifyAssignmentForCostAttribution({
        clientId: 'client-sky',
        clientName: 'Sky Airline',
        fteAllocation: '0.5'
      })
    ).toEqual(
      expect.objectContaining({
        classification: 'commercial_billable',
        isCommercial: true,
        isBillableCommercial: true,
        shouldParticipateInCommercialAttribution: true
      })
    )
  })

  it('supports explicit commercial non-billable classification without treating it as internal', () => {
    expect(
      classifyAssignmentForCostAttribution({
        clientId: 'client-sky',
        clientName: 'Sky Airline',
        billable: false
      })
    ).toEqual(
      expect.objectContaining({
        classification: 'commercial_non_billable',
        isCommercial: true,
        isBillableCommercial: false,
        shouldParticipateInCommercialAttribution: false,
        exclusionReason: 'commercial_non_billable_assignment'
      })
    )
  })

  it('excludes missing client references from commercial attribution', () => {
    expect(
      classifyAssignmentForCostAttribution({
        clientId: null,
        clientName: null
      })
    ).toEqual(
      expect.objectContaining({
        classification: 'excluded_invalid',
        exclusionReason: 'missing_client_reference'
      })
    )
  })

  it('keeps convenience helpers aligned with the classifier', () => {
    expect(isInternalCommercialAssignment({ clientId: 'space-efeonce', clientName: 'Efeonce' })).toBe(true)
    expect(isCommercialAssignment({ clientId: 'client-sky', clientName: 'Sky Airline' })).toBe(true)
    expect(isBillableCommercialAssignment({ clientId: 'client-sky', clientName: 'Sky Airline', billable: false })).toBe(false)
  })
})
