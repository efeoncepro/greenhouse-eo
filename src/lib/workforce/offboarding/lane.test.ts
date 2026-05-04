import { describe, expect, it } from 'vitest'

import { resolveOffboardingLane } from './lane'

describe('resolveOffboardingLane', () => {
  it('routes Chile internal payroll employees to the payroll closure lane', () => {
    const decision = resolveOffboardingLane({
      relationshipType: 'employee',
      contractType: 'indefinido',
      payRegime: 'chile',
      payrollVia: 'internal',
      separationType: 'resignation'
    })

    expect(decision.ruleLane).toBe('internal_payroll')
    expect(decision.requiresPayrollClosure).toBe(true)
    expect(decision.requiresLeaveReconciliation).toBe(true)
    expect(decision.greenhouseExecutionMode).toBe('full')
  })

  it('keeps SCIM/admin deactivation as an identity-only workforce signal', () => {
    const decision = resolveOffboardingLane({
      relationshipType: 'other',
      contractType: 'unknown',
      payRegime: 'unknown',
      payrollVia: 'unknown',
      separationType: 'identity_only'
    })

    expect(decision.ruleLane).toBe('identity_only')
    expect(decision.requiresPayrollClosure).toBe(false)
    expect(decision.requiresHrDocuments).toBe(false)
    expect(decision.requiresAssignmentHandoff).toBe(false)
    expect(decision.greenhouseExecutionMode).toBe('informational')
  })

  it('routes Deel/EOR contracts outside the internal payroll closure lane', () => {
    const decision = resolveOffboardingLane({
      relationshipType: 'eor',
      contractType: 'eor',
      payRegime: 'international',
      payrollVia: 'deel',
      separationType: 'contract_end'
    })

    expect(decision.ruleLane).toBe('external_payroll')
    expect(decision.requiresPayrollClosure).toBe(false)
    expect(decision.requiresHrDocuments).toBe(true)
    expect(decision.requiresAssetRecovery).toBe(true)
  })
})
