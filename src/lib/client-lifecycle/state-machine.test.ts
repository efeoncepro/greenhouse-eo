import { describe, expect, it } from 'vitest'

import {
  assertCaseTransition,
  assertItemTransition,
  isCaseTransitionAllowed,
  isItemTransitionAllowed,
  isTerminalCaseStatus,
  isTerminalItemStatus
} from './state-machine'
import { ClientLifecycleValidationError, DEFAULT_TEMPLATE_BY_KIND } from './types'

describe('client lifecycle case state machine', () => {
  it('allows the canonical onboarding transitions', () => {
    expect(isCaseTransitionAllowed('draft', 'in_progress')).toBe(true)
    expect(isCaseTransitionAllowed('draft', 'cancelled')).toBe(true)
    expect(isCaseTransitionAllowed('in_progress', 'blocked')).toBe(true)
    expect(isCaseTransitionAllowed('in_progress', 'completed')).toBe(true)
    expect(isCaseTransitionAllowed('in_progress', 'cancelled')).toBe(true)
    expect(isCaseTransitionAllowed('blocked', 'in_progress')).toBe(true)
    expect(isCaseTransitionAllowed('blocked', 'completed')).toBe(true)
  })

  it('rejects illegal case transitions (matrix §6.3)', () => {
    expect(isCaseTransitionAllowed('draft', 'completed')).toBe(false)
    expect(isCaseTransitionAllowed('draft', 'blocked')).toBe(false)
    expect(isCaseTransitionAllowed('completed', 'in_progress')).toBe(false)
    expect(isCaseTransitionAllowed('completed', 'draft')).toBe(false)
    expect(isCaseTransitionAllowed('cancelled', 'in_progress')).toBe(false)
  })

  it('throws ClientLifecycleValidationError on an illegal transition', () => {
    expect(() => assertCaseTransition('completed', 'in_progress')).toThrowError(ClientLifecycleValidationError)

    try {
      assertCaseTransition('draft', 'completed')
    } catch (error) {
      expect(error).toBeInstanceOf(ClientLifecycleValidationError)
      expect((error as ClientLifecycleValidationError).code).toBe('invalid_case_transition')
      expect((error as ClientLifecycleValidationError).statusCode).toBe(409)
    }
  })

  it('treats identical from/to as a no-op (idempotent)', () => {
    expect(() => assertCaseTransition('in_progress', 'in_progress')).not.toThrow()
  })

  it('marks completed and cancelled as terminal', () => {
    expect(isTerminalCaseStatus('completed')).toBe(true)
    expect(isTerminalCaseStatus('cancelled')).toBe(true)
    expect(isTerminalCaseStatus('in_progress')).toBe(false)
    expect(isTerminalCaseStatus('blocked')).toBe(false)
  })
})

describe('client lifecycle checklist item state machine', () => {
  it('allows the canonical item transitions (§6.2)', () => {
    expect(isItemTransitionAllowed('pending', 'in_progress')).toBe(true)
    expect(isItemTransitionAllowed('pending', 'completed')).toBe(true)
    expect(isItemTransitionAllowed('in_progress', 'completed')).toBe(true)
    expect(isItemTransitionAllowed('blocked', 'in_progress')).toBe(true)
    expect(isItemTransitionAllowed('pending', 'not_applicable')).toBe(true)
  })

  it('rejects transitions out of terminal item states', () => {
    expect(isItemTransitionAllowed('completed', 'in_progress')).toBe(false)
    expect(isItemTransitionAllowed('skipped', 'pending')).toBe(false)
    expect(isItemTransitionAllowed('not_applicable', 'completed')).toBe(false)
  })

  it('throws on illegal item transition', () => {
    expect(() => assertItemTransition('completed', 'in_progress')).toThrowError(ClientLifecycleValidationError)
  })

  it('marks completed/skipped/not_applicable as terminal', () => {
    expect(isTerminalItemStatus('completed')).toBe(true)
    expect(isTerminalItemStatus('skipped')).toBe(true)
    expect(isTerminalItemStatus('not_applicable')).toBe(true)
    expect(isTerminalItemStatus('pending')).toBe(false)
    expect(isTerminalItemStatus('blocked')).toBe(false)
  })
})

describe('default template mapping', () => {
  it('maps onboarding to standard_onboarding_v1', () => {
    expect(DEFAULT_TEMPLATE_BY_KIND.onboarding).toBe('standard_onboarding_v1')
  })
})
