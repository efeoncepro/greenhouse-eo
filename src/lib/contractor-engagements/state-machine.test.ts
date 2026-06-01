import { describe, expect, it } from 'vitest'

import {
  ContractorEngagementTransitionError,
  assertValidEngagementTransition,
  isPostClosureLockedEngagementStatus,
  isTerminalEngagementStatus,
  isValidEngagementTransition
} from './state-machine'
import { CONTRACTOR_ENGAGEMENT_STATUSES } from './types'

describe('contractor engagement state machine', () => {
  it('allows same-status no-op transitions for every status', () => {
    for (const status of CONTRACTOR_ENGAGEMENT_STATUSES) {
      expect(isValidEngagementTransition(status, status)).toBe(true)
    }
  })

  it('allows the canonical forward transitions', () => {
    expect(isValidEngagementTransition('draft', 'pending_review')).toBe(true)
    expect(isValidEngagementTransition('draft', 'active')).toBe(true)
    expect(isValidEngagementTransition('pending_review', 'active')).toBe(true)
    expect(isValidEngagementTransition('active', 'paused')).toBe(true)
    expect(isValidEngagementTransition('active', 'ending')).toBe(true)
    expect(isValidEngagementTransition('paused', 'active')).toBe(true)
    expect(isValidEngagementTransition('ending', 'ended')).toBe(true)
  })

  it('allows cancellation from any non-terminal state', () => {
    expect(isValidEngagementTransition('draft', 'cancelled')).toBe(true)
    expect(isValidEngagementTransition('pending_review', 'cancelled')).toBe(true)
    expect(isValidEngagementTransition('active', 'cancelled')).toBe(true)
    expect(isValidEngagementTransition('paused', 'cancelled')).toBe(true)
    expect(isValidEngagementTransition('ending', 'cancelled')).toBe(true)
  })

  it('forbids transitions out of terminal states', () => {
    expect(isValidEngagementTransition('ended', 'active')).toBe(false)
    expect(isValidEngagementTransition('cancelled', 'draft')).toBe(false)
    expect(isTerminalEngagementStatus('ended')).toBe(true)
    expect(isTerminalEngagementStatus('cancelled')).toBe(true)
    expect(isTerminalEngagementStatus('active')).toBe(false)
  })

  it('forbids illegal jumps', () => {
    expect(isValidEngagementTransition('draft', 'paused')).toBe(false)
    expect(isValidEngagementTransition('draft', 'ended')).toBe(false)
    expect(isValidEngagementTransition('active', 'draft')).toBe(false)
    expect(isValidEngagementTransition('paused', 'pending_review')).toBe(false)
  })

  it('assertValidEngagementTransition throws a typed error on invalid transition', () => {
    expect(() => assertValidEngagementTransition('ended', 'active')).toThrow(
      ContractorEngagementTransitionError
    )

    try {
      assertValidEngagementTransition('draft', 'ended')
    } catch (error) {
      expect(error).toBeInstanceOf(ContractorEngagementTransitionError)
      expect((error as ContractorEngagementTransitionError).code).toBe(
        'invalid_engagement_transition'
      )
      expect((error as ContractorEngagementTransitionError).from).toBe('draft')
      expect((error as ContractorEngagementTransitionError).to).toBe('ended')
    }
  })

  it('isPostClosureLockedEngagementStatus locks ending + terminals, allows live statuses (TASK-797)', () => {
    expect(isPostClosureLockedEngagementStatus('ending')).toBe(true)
    expect(isPostClosureLockedEngagementStatus('ended')).toBe(true)
    expect(isPostClosureLockedEngagementStatus('cancelled')).toBe(true)

    expect(isPostClosureLockedEngagementStatus('draft')).toBe(false)
    expect(isPostClosureLockedEngagementStatus('pending_review')).toBe(false)
    expect(isPostClosureLockedEngagementStatus('active')).toBe(false)
    expect(isPostClosureLockedEngagementStatus('paused')).toBe(false)

    // Diferencia con isTerminalEngagementStatus: `ending` está locked pero NO terminal.
    expect(isTerminalEngagementStatus('ending')).toBe(false)
  })
})
