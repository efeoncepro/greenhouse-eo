import { describe, expect, it } from 'vitest'

import {
  ContractorWorkSubmissionTransitionError,
  REVIEW_ACTION_TARGET,
  assertValidWorkSubmissionTransition,
  isTerminalWorkSubmissionStatus,
  isValidWorkSubmissionTransition
} from './state-machine'
import { CONTRACTOR_WORK_SUBMISSION_STATUSES } from './types'

describe('contractor work submission state machine (TASK-792)', () => {
  it('allows same-status no-op for every status', () => {
    for (const status of CONTRACTOR_WORK_SUBMISSION_STATUSES) {
      expect(isValidWorkSubmissionTransition(status, status)).toBe(true)
    }
  })

  it('allows the canonical forward transitions', () => {
    expect(isValidWorkSubmissionTransition('draft', 'submitted')).toBe(true)
    expect(isValidWorkSubmissionTransition('submitted', 'approved')).toBe(true)
    expect(isValidWorkSubmissionTransition('submitted', 'disputed')).toBe(true)
    expect(isValidWorkSubmissionTransition('submitted', 'rejected')).toBe(true)
    expect(isValidWorkSubmissionTransition('disputed', 'submitted')).toBe(true)
    expect(isValidWorkSubmissionTransition('disputed', 'rejected')).toBe(true)
    expect(isValidWorkSubmissionTransition('approved', 'cancelled')).toBe(true)
  })

  it('allows cancellation from every non-terminal state', () => {
    expect(isValidWorkSubmissionTransition('draft', 'cancelled')).toBe(true)
    expect(isValidWorkSubmissionTransition('submitted', 'cancelled')).toBe(true)
    expect(isValidWorkSubmissionTransition('disputed', 'cancelled')).toBe(true)
    expect(isValidWorkSubmissionTransition('approved', 'cancelled')).toBe(true)
  })

  it('forbids transitions out of terminal states', () => {
    expect(isValidWorkSubmissionTransition('rejected', 'submitted')).toBe(false)
    expect(isValidWorkSubmissionTransition('cancelled', 'draft')).toBe(false)
    expect(isTerminalWorkSubmissionStatus('rejected')).toBe(true)
    expect(isTerminalWorkSubmissionStatus('cancelled')).toBe(true)
    expect(isTerminalWorkSubmissionStatus('approved')).toBe(false)
  })

  it('forbids illegal jumps', () => {
    expect(isValidWorkSubmissionTransition('draft', 'approved')).toBe(false)
    expect(isValidWorkSubmissionTransition('draft', 'disputed')).toBe(false)
    expect(isValidWorkSubmissionTransition('approved', 'submitted')).toBe(false)
    expect(isValidWorkSubmissionTransition('approved', 'disputed')).toBe(false)
    expect(isValidWorkSubmissionTransition('submitted', 'draft')).toBe(false)
  })

  it('assertValidWorkSubmissionTransition throws typed error on invalid transition', () => {
    expect(() => assertValidWorkSubmissionTransition('rejected', 'approved')).toThrow(
      ContractorWorkSubmissionTransitionError
    )

    try {
      assertValidWorkSubmissionTransition('approved', 'submitted')
    } catch (error) {
      expect(error).toBeInstanceOf(ContractorWorkSubmissionTransitionError)
      expect((error as ContractorWorkSubmissionTransitionError).code).toBe(
        'invalid_work_submission_transition'
      )
    }
  })

  it('maps review actions to canonical target statuses', () => {
    expect(REVIEW_ACTION_TARGET.approve).toBe('approved')
    expect(REVIEW_ACTION_TARGET.dispute).toBe('disputed')
    expect(REVIEW_ACTION_TARGET.reject).toBe('rejected')
  })
})
