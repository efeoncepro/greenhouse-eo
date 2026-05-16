import { describe, expect, it } from 'vitest'

import { resolveOnboardingLane } from './lane'

describe('resolveOnboardingLane', () => {
  it('routes internal Chile payroll onboarding to the full lane', () => {
    const result = resolveOnboardingLane({
      relationshipType: 'employee',
      contractType: 'indefinido',
      payRegime: 'chile',
      payrollVia: 'internal',
      startType: 'new_hire'
    })

    expect(result.ruleLane).toBe('internal_payroll')
    expect(result.requiresPayrollReadiness).toBe(true)
    expect(result.requiresLeavePolicyBootstrap).toBe(true)
    expect(result.greenhouseExecutionMode).toBe('full')
  })

  it('keeps identity-only onboarding informational', () => {
    const result = resolveOnboardingLane({
      relationshipType: 'employee',
      contractType: 'unknown',
      payRegime: 'unknown',
      payrollVia: 'unknown',
      startType: 'identity_only'
    })

    expect(result.ruleLane).toBe('identity_only')
    expect(result.requiresManagerAssignment).toBe(false)
    expect(result.greenhouseExecutionMode).toBe('informational')
  })

  it('routes international internal onboarding through internal payroll without Chile leave bootstrap', () => {
    const result = resolveOnboardingLane({
      relationshipType: 'employee',
      contractType: 'international_internal',
      payRegime: 'international',
      payrollVia: 'internal',
      startType: 'new_hire'
    })

    expect(result.ruleLane).toBe('internal_payroll')
    expect(result.requiresPayrollReadiness).toBe(true)
    expect(result.requiresLeavePolicyBootstrap).toBe(false)
    expect(result.greenhouseExecutionMode).toBe('partial')
  })
})
