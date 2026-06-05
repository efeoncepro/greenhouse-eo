import { describe, expect, it } from 'vitest'

import {
  applyProviderStatus,
  assertSignatureOperatorTransition,
  isOperatorTransitionAllowed,
  TERMINAL_SIGNATURE_STATUSES
} from './state-machine'
import { SignatureValidationError } from './types'

describe('signature operator transitions (strict)', () => {
  it('allows send (draft → sent) and cancel from non-terminal', () => {
    expect(isOperatorTransitionAllowed('draft', 'sent')).toBe(true)
    expect(isOperatorTransitionAllowed('draft', 'cancelled')).toBe(true)
    expect(isOperatorTransitionAllowed('sent', 'cancelled')).toBe(true)
    expect(isOperatorTransitionAllowed('partially_signed', 'cancelled')).toBe(true)
  })

  it('forbids operator-driving provider-only statuses', () => {
    expect(isOperatorTransitionAllowed('sent', 'completed')).toBe(false)
    expect(isOperatorTransitionAllowed('draft', 'partially_signed')).toBe(false)
    expect(isOperatorTransitionAllowed('sent', 'failed')).toBe(false)
  })

  it('forbids transitions out of terminal statuses', () => {
    for (const terminal of TERMINAL_SIGNATURE_STATUSES) {
      expect(isOperatorTransitionAllowed(terminal, 'sent')).toBe(false)
      expect(isOperatorTransitionAllowed(terminal, 'cancelled')).toBe(false)
    }
  })

  it('assert throws SignatureValidationError (409) on illegal transition', () => {
    expect(() => assertSignatureOperatorTransition('completed', 'sent')).toThrow(SignatureValidationError)

    try {
      assertSignatureOperatorTransition('completed', 'sent')
    } catch (error) {
      expect((error as SignatureValidationError).statusCode).toBe(409)
      expect((error as SignatureValidationError).code).toBe('invalid_signature_transition')
    }
  })
})

describe('provider status (monotonic, out-of-order tolerant)', () => {
  it('advances monotonically sent → partially_signed → completed', () => {
    expect(applyProviderStatus('sent', 'partially_signed')).toBe('partially_signed')
    expect(applyProviderStatus('partially_signed', 'completed')).toBe('completed')
    expect(applyProviderStatus('sent', 'completed')).toBe('completed')
  })

  it('never regresses: a late lower-rank event after completed is a no-op', () => {
    expect(applyProviderStatus('completed', 'partially_signed')).toBe('completed')
    expect(applyProviderStatus('completed', 'sent')).toBe('completed')
    expect(applyProviderStatus('partially_signed', 'sent')).toBe('partially_signed')
  })

  it('terminal current is immutable (completed/cancelled/failed/expired)', () => {
    expect(applyProviderStatus('cancelled', 'completed')).toBe('cancelled')
    expect(applyProviderStatus('failed', 'completed')).toBe('failed')
    expect(applyProviderStatus('expired', 'partially_signed')).toBe('expired')
  })

  it('first terminal wins (completed before a late failed)', () => {
    const afterCompleted = applyProviderStatus('sent', 'completed')

    expect(applyProviderStatus(afterCompleted, 'failed')).toBe('completed')
  })
})
