import { describe, expect, it } from 'vitest'

import {
  ACTIVE_TENDER_STATES,
  assertValidTenderStateTransition,
  HUMAN_GATE_TRANSITIONS,
  InvalidTenderStateTransitionError,
  isActiveTenderState,
  isTenderState,
  isTerminalTenderState,
  isValidTenderStateTransition,
  requiresHumanGate,
  TENDER_STATES,
  TENDER_TRANSITION_MATRIX,
  TERMINAL_TENDER_STATES,
  type TenderState
} from '../tender-state-machine'

describe('Tender state machine — invariantes canónicos', () => {
  it('cada estado tiene una entrada en la matriz de transiciones', () => {
    for (const state of TENDER_STATES) {
      expect(TENDER_TRANSITION_MATRIX[state]).toBeDefined()
    }
  })

  it('los estados terminales no admiten transición de salida', () => {
    for (const state of TERMINAL_TENDER_STATES) {
      expect(TENDER_TRANSITION_MATRIX[state]).toEqual([])
    }
  })

  it('activos + terminales cubren todos los estados sin solaparse', () => {
    const active = new Set<string>(ACTIVE_TENDER_STATES)
    const terminal = new Set<string>(TERMINAL_TENDER_STATES)

    expect(active.size + terminal.size).toBe(TENDER_STATES.length)

    for (const s of TENDER_STATES) {
      expect(active.has(s) !== terminal.has(s)).toBe(true) // XOR: exactamente uno
    }
  })

  it('toda transición declarada apunta a un estado válido (no hay destinos huérfanos)', () => {
    for (const [, targets] of Object.entries(TENDER_TRANSITION_MATRIX)) {
      for (const to of targets) {
        expect(isTenderState(to)).toBe(true)
      }
    }
  })
})

describe('Tender state machine — camino real SKY (validación con caso)', () => {
  // El camino feliz que recorrió la licitación Blog SKY (bid ganado o no, la ruta es la misma).
  const HAPPY_PATH: TenderState[] = [
    'intake',
    'analyzing',
    'analyzed',
    'fit_review',
    'producing',
    'base_ready',
    'packaging',
    'ready_to_submit',
    'submitted',
    'awarded'
  ]

  it('el camino completo del bid es una secuencia de transiciones válidas', () => {
    for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
      expect(isValidTenderStateTransition(HAPPY_PATH[i], HAPPY_PATH[i + 1])).toBe(true)
    }
  })

  it('la rama no-bid (fit_review → declined) es válida y terminal', () => {
    expect(isValidTenderStateTransition('fit_review', 'declined')).toBe(true)
    expect(isTerminalTenderState('declined')).toBe(true)
  })

  it('la rama perdida (submitted → not_awarded) es válida y terminal', () => {
    expect(isValidTenderStateTransition('submitted', 'not_awarded')).toBe(true)
    expect(isTerminalTenderState('not_awarded')).toBe(true)
  })
})

describe('Tender state machine — transiciones ilegales fallan loud', () => {
  it('saltarse fases es inválido (intake → producing)', () => {
    expect(isValidTenderStateTransition('intake', 'producing')).toBe(false)
  })

  it('retroceder es inválido (base_ready → analyzing)', () => {
    expect(isValidTenderStateTransition('base_ready', 'analyzing')).toBe(false)
  })

  it('assertValidTenderStateTransition throw con detalle', () => {
    expect(() => assertValidTenderStateTransition('intake', 'submitted', 'TND-0001')).toThrow(
      InvalidTenderStateTransitionError
    )

    try {
      assertValidTenderStateTransition('intake', 'submitted', 'TND-0001')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTenderStateTransitionError)
      expect((error as InvalidTenderStateTransitionError).message).toContain('TND-0001')
      expect((error as InvalidTenderStateTransitionError).fromState).toBe('intake')
    }
  })

  it('una transición válida NO throw', () => {
    expect(() => assertValidTenderStateTransition('intake', 'analyzing')).not.toThrow()
  })
})

describe('Tender state machine — gates humanos (propose → confirm → execute)', () => {
  it('las 3 transiciones sensibles requieren confirmación humana', () => {
    expect(requiresHumanGate('fit_review', 'producing')).toBe(true)
    expect(requiresHumanGate('fit_review', 'declined')).toBe(true)
    expect(requiresHumanGate('ready_to_submit', 'submitted')).toBe(true)
    expect(HUMAN_GATE_TRANSITIONS.size).toBe(3)
  })

  it('las transiciones automáticas NO son gates humanos', () => {
    expect(requiresHumanGate('intake', 'analyzing')).toBe(false)
    expect(requiresHumanGate('producing', 'base_ready')).toBe(false)
  })

  it('todo gate humano es además una transición válida', () => {
    for (const key of HUMAN_GATE_TRANSITIONS) {
      const [from, to] = key.split('→') as [TenderState, TenderState]

      expect(isValidTenderStateTransition(from, to)).toBe(true)
    }
  })
})

describe('Tender state machine — type guards', () => {
  it('isTenderState valida strings', () => {
    expect(isTenderState('producing')).toBe(true)
    expect(isTenderState('nope')).toBe(false)
    expect(isTenderState(42)).toBe(false)
  })

  it('isActiveTenderState / isTerminalTenderState son excluyentes', () => {
    expect(isActiveTenderState('producing')).toBe(true)
    expect(isTerminalTenderState('producing')).toBe(false)
    expect(isTerminalTenderState('awarded')).toBe(true)
    expect(isActiveTenderState('awarded')).toBe(false)
  })
})
