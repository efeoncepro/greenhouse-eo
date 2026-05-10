import { describe, expect, it } from 'vitest'

import {
  ACTIVE_RELEASE_STATES,
  InvalidReleaseStateTransitionError,
  RELEASE_STATES,
  RELEASE_TRANSITION_MATRIX,
  TERMINAL_RELEASE_STATES,
  assertValidReleaseStateTransition,
  isActiveReleaseState,
  isReleaseState,
  isTerminalReleaseState,
  isValidReleaseStateTransition
} from './state-machine'

/**
 * TASK-848 — Production Release Control Plane: tests del state machine TS.
 *
 * Estos tests son ANTI-REGRESION del contrato canonico TS↔SQL. Si el migration
 * cambia la CHECK constraint del enum, estos tests rompen build hasta que el
 * TS se sincronice.
 *
 * Para verificar paridad TS↔SQL en ambientes con DB conectada, usar
 * `state-machine.live.test.ts` (V1.1 cuando exista — query real
 * pg_constraint y diff).
 */

describe('release state machine — canonical states', () => {
  it('exports the 8 canonical states matching DB CHECK constraint', () => {
    expect(RELEASE_STATES).toEqual([
      'preflight',
      'ready',
      'deploying',
      'verifying',
      'released',
      'degraded',
      'rolled_back',
      'aborted'
    ])
  })

  it('terminal states are released | rolled_back | aborted', () => {
    expect([...TERMINAL_RELEASE_STATES].sort()).toEqual(
      ['aborted', 'released', 'rolled_back']
    )
  })

  it('active states (partial UNIQUE INDEX) are preflight | ready | deploying | verifying', () => {
    expect([...ACTIVE_RELEASE_STATES].sort()).toEqual([
      'deploying',
      'preflight',
      'ready',
      'verifying'
    ])
  })

  it('terminal and active states are disjoint (mutually exclusive)', () => {
    for (const terminal of TERMINAL_RELEASE_STATES) {
      expect(isActiveReleaseState(terminal as never)).toBe(false)
    }

    for (const active of ACTIVE_RELEASE_STATES) {
      expect(isTerminalReleaseState(active as never)).toBe(false)
    }
  })
})

describe('release state machine — transition matrix', () => {
  it('preflight allows ready and aborted only', () => {
    expect([...RELEASE_TRANSITION_MATRIX.preflight].sort()).toEqual(['aborted', 'ready'])
  })

  it('ready allows deploying and aborted only', () => {
    expect([...RELEASE_TRANSITION_MATRIX.ready].sort()).toEqual(['aborted', 'deploying'])
  })

  it('deploying allows verifying and aborted only', () => {
    expect([...RELEASE_TRANSITION_MATRIX.deploying].sort()).toEqual([
      'aborted',
      'verifying'
    ])
  })

  it('verifying allows released, degraded, aborted (3 outcomes)', () => {
    expect([...RELEASE_TRANSITION_MATRIX.verifying].sort()).toEqual([
      'aborted',
      'degraded',
      'released'
    ])
  })

  it('released allows rolled_back only (no re-deploy)', () => {
    expect(RELEASE_TRANSITION_MATRIX.released).toEqual(['rolled_back'])
  })

  it('degraded allows rolled_back and released (recovery without rollback)', () => {
    expect([...RELEASE_TRANSITION_MATRIX.degraded].sort()).toEqual([
      'released',
      'rolled_back'
    ])
  })

  it('rolled_back is terminal — no allowed transitions', () => {
    expect(RELEASE_TRANSITION_MATRIX.rolled_back).toEqual([])
  })

  it('aborted is terminal — no allowed transitions', () => {
    expect(RELEASE_TRANSITION_MATRIX.aborted).toEqual([])
  })
})

describe('isValidReleaseStateTransition', () => {
  it('returns true for canonical happy path: preflight → ready → deploying → verifying → released', () => {
    expect(isValidReleaseStateTransition('preflight', 'ready')).toBe(true)
    expect(isValidReleaseStateTransition('ready', 'deploying')).toBe(true)
    expect(isValidReleaseStateTransition('deploying', 'verifying')).toBe(true)
    expect(isValidReleaseStateTransition('verifying', 'released')).toBe(true)
  })

  it('returns true for degraded recovery path: verifying → degraded → released', () => {
    expect(isValidReleaseStateTransition('verifying', 'degraded')).toBe(true)
    expect(isValidReleaseStateTransition('degraded', 'released')).toBe(true)
  })

  it('returns true for rollback paths', () => {
    expect(isValidReleaseStateTransition('released', 'rolled_back')).toBe(true)
    expect(isValidReleaseStateTransition('degraded', 'rolled_back')).toBe(true)
  })

  it('returns false for forbidden transitions enforced by spec V1 §2.3', () => {
    // released → deploying (no re-deploy del mismo release)
    expect(isValidReleaseStateTransition('released', 'deploying')).toBe(false)
    // aborted → * (terminal)
    expect(isValidReleaseStateTransition('aborted', 'released')).toBe(false)
    expect(isValidReleaseStateTransition('aborted', 'rolled_back')).toBe(false)
    // rolled_back → released (no re-flip)
    expect(isValidReleaseStateTransition('rolled_back', 'released')).toBe(false)
    // skip-ahead transitions
    expect(isValidReleaseStateTransition('preflight', 'deploying')).toBe(false)
    expect(isValidReleaseStateTransition('ready', 'released')).toBe(false)
  })

  it('returns false for self-transitions', () => {
    for (const state of RELEASE_STATES) {
      expect(isValidReleaseStateTransition(state, state)).toBe(false)
    }
  })
})

describe('assertValidReleaseStateTransition', () => {
  it('does not throw for valid transitions', () => {
    expect(() =>
      assertValidReleaseStateTransition('preflight', 'ready', 'abc123def456-uuid')
    ).not.toThrow()
  })

  it('throws InvalidReleaseStateTransitionError for invalid transitions', () => {
    expect(() =>
      assertValidReleaseStateTransition('aborted', 'released', 'abc123def456-uuid')
    ).toThrow(InvalidReleaseStateTransitionError)
  })

  it('error message includes from, to, releaseId, and allowed transitions', () => {
    try {
      assertValidReleaseStateTransition('aborted', 'released', 'sample-release-id')
      throw new Error('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidReleaseStateTransitionError)

      const err = error as InvalidReleaseStateTransitionError

      expect(err.fromState).toBe('aborted')
      expect(err.toState).toBe('released')
      expect(err.releaseId).toBe('sample-release-id')
      expect(err.message).toContain("from='aborted'")
      expect(err.message).toContain("to='released'")
      expect(err.message).toContain('sample-release-id')
      expect(err.message).toContain('(none, terminal)')
    }
  })

  it('error message lists allowed transitions for non-terminal source', () => {
    try {
      assertValidReleaseStateTransition('preflight', 'released')
      throw new Error('should have thrown')
    } catch (error) {
      const err = error as InvalidReleaseStateTransitionError

      expect(err.message).toContain('ready')
      expect(err.message).toContain('aborted')
    }
  })
})

describe('type guards', () => {
  it('isReleaseState accepts canonical states only', () => {
    expect(isReleaseState('preflight')).toBe(true)
    expect(isReleaseState('released')).toBe(true)
    expect(isReleaseState('unknown_legacy')).toBe(false)
    expect(isReleaseState('')).toBe(false)
    expect(isReleaseState(null)).toBe(false)
    expect(isReleaseState(123)).toBe(false)
  })
})

describe('matrix completeness invariant', () => {
  it('every canonical state has an entry in the transition matrix', () => {
    for (const state of RELEASE_STATES) {
      expect(RELEASE_TRANSITION_MATRIX[state]).toBeDefined()
    }
  })

  it('every transition target is itself a canonical state', () => {
    for (const targets of Object.values(RELEASE_TRANSITION_MATRIX)) {
      for (const target of targets) {
        expect(RELEASE_STATES).toContain(target)
      }
    }
  })
})
