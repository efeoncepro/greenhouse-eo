import { describe, expect, it } from 'vitest'

import { INSIGHT_EDITION_STATES } from './contracts/states'
import {
  INSIGHT_EDITION_TRANSITION_MATRIX,
  InsightEditionTransitionError,
  assertValidInsightEditionTransition,
  isTerminalInsightEditionState,
  isValidInsightEditionTransition,
  listInsightEditionTransitions,
  recoveryPhaseForTransition,
  requiresInsightHumanGate
} from './edition-state-machine'

describe('TASK-1845 — edition state machine', () => {
  it('cubre los 8 estados y sólo withdrawn es terminal', () => {
    expect(Object.keys(INSIGHT_EDITION_TRANSITION_MATRIX).sort()).toEqual([...INSIGHT_EDITION_STATES].sort())
    expect(INSIGHT_EDITION_STATES.filter(isTerminalInsightEditionState)).toEqual(['withdrawn'])
  })

  it('el camino feliz es draft → collecting → composing → validating → ready_for_review → issued', () => {
    const path = ['draft', 'collecting', 'composing', 'validating', 'ready_for_review', 'issued'] as const

    for (let index = 0; index < path.length - 1; index += 1) {
      expect(isValidInsightEditionTransition(path[index]!, path[index + 1]!)).toBe(true)
    }
  })

  it('una edición emitida no vuelve al ciclo: sólo puede retirarse', () => {
    expect(INSIGHT_EDITION_TRANSITION_MATRIX.issued).toEqual(['withdrawn'])
    expect(() => assertValidInsightEditionTransition('issued', 'composing', 'insed-x')).toThrow(InsightEditionTransitionError)
    expect(() => assertValidInsightEditionTransition('issued', 'draft', 'insed-x')).toThrow(InsightEditionTransitionError)
  })

  it('failed se recupera POR FASE y nunca salta a ready_for_review/issued', () => {
    expect(recoveryPhaseForTransition('failed', 'collecting')).toBe('collecting')
    expect(recoveryPhaseForTransition('failed', 'validating')).toBe('validating')
    expect(recoveryPhaseForTransition('composing', 'validating')).toBeNull()
    expect(isValidInsightEditionTransition('failed', 'ready_for_review')).toBe(false)
    expect(isValidInsightEditionTransition('failed', 'issued')).toBe(false)
  })

  it('emitir y retirar exigen gate humano; el resto no', () => {
    expect(requiresInsightHumanGate('ready_for_review', 'issued')).toBe(true)
    expect(requiresInsightHumanGate('issued', 'withdrawn')).toBe(true)
    expect(requiresInsightHumanGate('draft', 'withdrawn')).toBe(true)
    expect(requiresInsightHumanGate('ready_for_review', 'withdrawn')).toBe(true)
    expect(requiresInsightHumanGate('draft', 'collecting')).toBe(false)
    expect(requiresInsightHumanGate('failed', 'composing')).toBe(false)
    expect(listInsightEditionTransitions()).toHaveLength(14)
  })
})
