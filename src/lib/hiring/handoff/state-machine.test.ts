import { describe, expect, it } from 'vitest'

import {
  COMMAND_ACTION_TARGET,
  isPostApprovalState,
  isValidCommandTransition,
  isValidSystemTransition,
} from './state-machine'
import { HIRING_HANDOFF_STATES } from './types'

describe('hiring handoff state-machine (command plane)', () => {
  it('permite el camino feliz pending → approved → in_setup → completed', () => {
    expect(isValidCommandTransition('pending', 'approved')).toBe(true)
    expect(isValidCommandTransition('approved', 'in_setup')).toBe(true)
    expect(isValidCommandTransition('in_setup', 'completed')).toBe(true)
  })

  it('permite completar directo desde approved (in_setup es opcional)', () => {
    expect(isValidCommandTransition('approved', 'completed')).toBe(true)
  })

  it('permite cancelar desde pending, approved y blocked — nunca desde completed', () => {
    expect(isValidCommandTransition('pending', 'cancelled')).toBe(true)
    expect(isValidCommandTransition('approved', 'cancelled')).toBe(true)
    expect(isValidCommandTransition('blocked', 'cancelled')).toBe(true)
    expect(isValidCommandTransition('completed', 'cancelled')).toBe(false)
  })

  it('NUNCA permite blocked por command (solo el materializer bloquea, con código)', () => {
    for (const from of HIRING_HANDOFF_STATES) {
      expect(isValidCommandTransition(from, 'blocked')).toBe(false)
    }
  })

  it('rechaza transiciones inválidas (skip de aprobación, revivir cancelled/completed)', () => {
    expect(isValidCommandTransition('pending', 'in_setup')).toBe(false)
    expect(isValidCommandTransition('pending', 'completed')).toBe(false)
    expect(isValidCommandTransition('cancelled', 'approved')).toBe(false)
    expect(isValidCommandTransition('completed', 'approved')).toBe(false)
    expect(isValidCommandTransition('blocked', 'approved')).toBe(false)
  })

  it('mapea cada acción del command a su estado target', () => {
    expect(COMMAND_ACTION_TARGET).toEqual({
      approve: 'approved',
      setup: 'in_setup',
      complete: 'completed',
      cancel: 'cancelled',
    })
  })
})

describe('hiring handoff state-machine (system plane)', () => {
  it('post-aprobación solo puede bloquearse (nunca sobrescribirse en silencio)', () => {
    for (const from of ['approved', 'in_setup', 'completed'] as const) {
      expect(isPostApprovalState(from)).toBe(true)
      expect(isValidSystemTransition(from, 'blocked')).toBe(true)
      expect(isValidSystemTransition(from, 'pending')).toBe(false)
      expect(isValidSystemTransition(from, 'cancelled')).toBe(false)
    }
  })

  it('pre-aprobación se re-deriva o cancela ante supersede/revocación', () => {
    for (const from of ['pending', 'blocked'] as const) {
      expect(isPostApprovalState(from)).toBe(false)
      expect(isValidSystemTransition(from, 'pending')).toBe(true)
      expect(isValidSystemTransition(from, 'blocked')).toBe(true)
      expect(isValidSystemTransition(from, 'cancelled')).toBe(true)
    }
  })

  it('cancelled puede reabrirse por una nueva decisión selected (reusa la fila UNIQUE)', () => {
    expect(isValidSystemTransition('cancelled', 'pending')).toBe(true)
    expect(isValidSystemTransition('cancelled', 'blocked')).toBe(true)
  })
})
