import { describe, expect, it } from 'vitest'

import {
  assertCaseTransition,
  isCaseTransitionAllowed,
  isTerminalStatus
} from './state-machine'
import {
  APPROVE_STATUS_BY_KIND,
  INITIAL_STATUS_BY_KIND,
  VOID_STATUS_BY_KIND,
  WorkforceContractingValidationError
} from './types'

describe('workforce contracting state machine', () => {
  describe('offer_letter', () => {
    it('allows the canonical happy path', () => {
      const path: Array<[string, string]> = [
        ['draft', 'ai_drafted'],
        ['ai_drafted', 'pending_internal_review'],
        ['pending_internal_review', 'approved'],
        ['approved', 'sent'],
        ['sent', 'viewed'],
        ['viewed', 'accepted'],
        ['accepted', 'converted_to_contract']
      ]

      for (const [from, to] of path) {
        expect(isCaseTransitionAllowed('offer_letter', from as never, to as never)).toBe(true)
      }
    })

    it('rejects invalid transitions', () => {
      expect(isCaseTransitionAllowed('offer_letter', 'draft', 'approved')).toBe(false)
      expect(isCaseTransitionAllowed('offer_letter', 'accepted', 'draft')).toBe(false)
      expect(() => assertCaseTransition('offer_letter', 'draft', 'approved')).toThrow(
        WorkforceContractingValidationError
      )
    })

    it('flags terminal states', () => {
      expect(isTerminalStatus('offer_letter', 'accepted')).toBe(true)
      expect(isTerminalStatus('offer_letter', 'withdrawn')).toBe(true)
      expect(isTerminalStatus('offer_letter', 'converted_to_contract')).toBe(true)
      expect(isTerminalStatus('offer_letter', 'draft')).toBe(false)
    })

    it('can withdraw from non-terminal states', () => {
      for (const from of ['draft', 'ai_drafted', 'pending_internal_review', 'approved', 'sent', 'viewed']) {
        expect(isCaseTransitionAllowed('offer_letter', from as never, 'withdrawn')).toBe(true)
      }
    })
  })

  describe('employment_contract', () => {
    it('allows the canonical happy path to active', () => {
      const path: Array<[string, string]> = [
        ['intake_pending', 'ai_drafted'],
        ['ai_drafted', 'pending_review'],
        ['pending_review', 'legal_review'],
        ['legal_review', 'internal_approved'],
        ['internal_approved', 'ready_for_pdf'],
        ['ready_for_pdf', 'ready_for_signature'],
        ['ready_for_signature', 'sent_for_signature'],
        ['sent_for_signature', 'fully_signed'],
        ['fully_signed', 'registered_external'],
        ['registered_external', 'active']
      ]

      for (const [from, to] of path) {
        expect(isCaseTransitionAllowed('employment_contract', from as never, to as never)).toBe(true)
      }
    })

    it('allows signature_failed retry + amendment loop', () => {
      expect(isCaseTransitionAllowed('employment_contract', 'signature_failed', 'sent_for_signature')).toBe(true)
      expect(isCaseTransitionAllowed('employment_contract', 'active', 'needs_amendment')).toBe(true)
      expect(isCaseTransitionAllowed('employment_contract', 'needs_amendment', 'ai_drafted')).toBe(true)
    })

    it('rejects invalid transitions and offer statuses', () => {
      expect(isCaseTransitionAllowed('employment_contract', 'intake_pending', 'active')).toBe(false)
      // Offer-only statuses are not reachable for a contract case.
      expect(isCaseTransitionAllowed('employment_contract', 'intake_pending', 'withdrawn' as never)).toBe(false)
      expect(() => assertCaseTransition('employment_contract', 'active', 'intake_pending')).toThrow(
        WorkforceContractingValidationError
      )
    })

    it('flags terminal states', () => {
      for (const status of ['active', 'rejected', 'voided', 'expired', 'superseded']) {
        expect(isTerminalStatus('employment_contract', status as never)).toBe(true)
      }

      expect(isTerminalStatus('employment_contract', 'ai_drafted')).toBe(false)
    })
  })

  it('same-status transition is a no-op (allowed)', () => {
    expect(isCaseTransitionAllowed('offer_letter', 'draft', 'draft')).toBe(true)
    expect(() => assertCaseTransition('employment_contract', 'active', 'active')).not.toThrow()
  })

  it('canonical kind constants are coherent', () => {
    expect(INITIAL_STATUS_BY_KIND.offer_letter).toBe('draft')
    expect(INITIAL_STATUS_BY_KIND.employment_contract).toBe('intake_pending')
    expect(APPROVE_STATUS_BY_KIND.offer_letter).toBe('approved')
    expect(APPROVE_STATUS_BY_KIND.employment_contract).toBe('internal_approved')
    expect(VOID_STATUS_BY_KIND.offer_letter).toBe('withdrawn')
    expect(VOID_STATUS_BY_KIND.employment_contract).toBe('voided')
    // The approval path must be reachable from the initial drafted state.
    expect(isCaseTransitionAllowed('offer_letter', 'draft', INITIAL_STATUS_BY_KIND.offer_letter)).toBe(true)
  })
})
