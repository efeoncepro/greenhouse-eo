import { describe, expect, it } from 'vitest'

import { isHiringError } from '@/lib/hiring/errors'

import { resolveProposalTransition } from './state'

// TASK-1361 — state machine pura del ledger de propuestas IA. CI-safe (sin PG, sin provider).

describe('resolveProposalTransition', () => {
  it('proposed → confirmed aplica el efecto', () => {
    expect(resolveProposalTransition('proposed', 'confirm')).toEqual({ next: 'confirmed', apply: true })
  })

  it('proposed → rejected aplica el efecto', () => {
    expect(resolveProposalTransition('proposed', 'reject')).toEqual({ next: 'rejected', apply: true })
  })

  it('confirmar de nuevo una propuesta confirmada es idempotente (apply=false)', () => {
    expect(resolveProposalTransition('confirmed', 'confirm')).toEqual({ next: 'confirmed', apply: false })
  })

  it('rechazar de nuevo una propuesta rechazada es idempotente (apply=false)', () => {
    expect(resolveProposalTransition('rejected', 'reject')).toEqual({ next: 'rejected', apply: false })
  })

  it('rechazar una propuesta ya confirmada es terminal-once → error 409', () => {
    try {
      resolveProposalTransition('confirmed', 'reject')
      throw new Error('debió lanzar')
    } catch (error) {
      expect(isHiringError(error)).toBe(true)

      if (isHiringError(error)) {
        expect(error.code).toBe('assessment_ai_proposal_invalid_transition')
        expect(error.statusCode).toBe(409)
      }
    }
  })

  it('confirmar una propuesta ya rechazada es terminal-once → error 409', () => {
    try {
      resolveProposalTransition('rejected', 'confirm')
      throw new Error('debió lanzar')
    } catch (error) {
      expect(isHiringError(error)).toBe(true)
    }
  })
})
