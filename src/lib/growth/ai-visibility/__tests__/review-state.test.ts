import { describe, expect, it } from 'vitest'

/**
 * TASK-1244 Slice 1 — state machine pura del gate humano de release (review evidence).
 * Cubre la FRONTERA DE TRANSICIÓN: pending→approved|rejected, idempotencia (no-op sin
 * persistir) y el anti-flip terminal (approved↔rejected → ReportReviewError). Es un
 * primitive de SEGURIDAD YMYL: ninguna transición ilegal puede colarse al INSERT.
 */

import {
  ReportReviewError,
  resolveReviewTransition,
  type ReportReviewDecision,
  type ReportReviewState
} from '../review/state'

describe('resolveReviewTransition', () => {
  it('pending → approved persiste (apply=true)', () => {
    expect(resolveReviewTransition('pending', 'approved')).toEqual({ apply: true, nextState: 'approved' })
  })

  it('pending → rejected persiste (apply=true)', () => {
    expect(resolveReviewTransition('pending', 'rejected')).toEqual({ apply: true, nextState: 'rejected' })
  })

  it('approved → approved es idempotente (no-op, apply=false)', () => {
    expect(resolveReviewTransition('approved', 'approved')).toEqual({ apply: false, nextState: 'approved' })
  })

  it('rejected → rejected es idempotente (no-op, apply=false)', () => {
    expect(resolveReviewTransition('rejected', 'rejected')).toEqual({ apply: false, nextState: 'rejected' })
  })

  it('approved → rejected es inválido (anti-flip terminal)', () => {
    expect(() => resolveReviewTransition('approved', 'rejected')).toThrowError(ReportReviewError)

    try {
      resolveReviewTransition('approved', 'rejected')
    } catch (error) {
      expect(error).toBeInstanceOf(ReportReviewError)
      expect((error as ReportReviewError).code).toBe('invalid_transition')
    }
  })

  it('rejected → approved es inválido (anti-flip terminal)', () => {
    try {
      resolveReviewTransition('rejected', 'approved')
      throw new Error('no debió resolver')
    } catch (error) {
      expect(error).toBeInstanceOf(ReportReviewError)
      expect((error as ReportReviewError).code).toBe('invalid_transition')
    }
  })

  it('exhaustivo: sólo las 4 transiciones legales no lanzan', () => {
    const states: ReportReviewState[] = ['pending', 'approved', 'rejected']
    const decisions: ReportReviewDecision[] = ['approved', 'rejected']
    const legal = new Set(['pending|approved', 'pending|rejected', 'approved|approved', 'rejected|rejected'])

    for (const current of states) {
      for (const decision of decisions) {
        const key = `${current}|${decision}`

        if (legal.has(key)) {
          expect(() => resolveReviewTransition(current, decision)).not.toThrow()
        } else {
          expect(() => resolveReviewTransition(current, decision)).toThrowError(ReportReviewError)
        }
      }
    }
  })
})
