import { describe, expect, it } from 'vitest'

import {
  isTerminalItemStatus,
  isTerminalRunStatus,
  resolveItemTransition,
  resolveRunTransition,
} from './state'

// TASK-1734 — State machine pura del run/items (ADR D1): transiciones legales, terminal-once
// idempotente y rechazo 409 de toda transición ilegal. Sin DB.

describe('resolveRunTransition', () => {
  it('recorre el camino feliz created → enumerating → scoring → awaiting_review → confirmable → confirmed', () => {
    expect(resolveRunTransition('created', 'enumerating')).toEqual({ next: 'enumerating', apply: true })
    expect(resolveRunTransition('enumerating', 'scoring')).toEqual({ next: 'scoring', apply: true })
    expect(resolveRunTransition('scoring', 'awaiting_review')).toEqual({ next: 'awaiting_review', apply: true })
    expect(resolveRunTransition('awaiting_review', 'confirmable')).toEqual({ next: 'confirmable', apply: true })
    expect(resolveRunTransition('confirmable', 'confirmed')).toEqual({ next: 'confirmed', apply: true })
  })

  it('permite enumerating → awaiting_review (run sin items elegibles)', () => {
    expect(resolveRunTransition('enumerating', 'awaiting_review').apply).toBe(true)
  })

  it('permite confirmable → awaiting_review (reapertura por digest stale, Slice 4)', () => {
    expect(resolveRunTransition('confirmable', 'awaiting_review').apply).toBe(true)
  })

  it('todo estado no terminal puede cancelarse o fallar', () => {
    for (const from of ['created', 'enumerating', 'scoring', 'awaiting_review', 'confirmable'] as const) {
      expect(resolveRunTransition(from, 'cancelled').apply).toBe(true)
      expect(resolveRunTransition(from, 'failed').apply).toBe(true)
    }
  })

  it('terminal-once: pedir el MISMO estado terminal es no-op idempotente', () => {
    expect(resolveRunTransition('cancelled', 'cancelled')).toEqual({ next: 'cancelled', apply: false })
    expect(resolveRunTransition('confirmed', 'confirmed')).toEqual({ next: 'confirmed', apply: false })
    expect(resolveRunTransition('failed', 'failed')).toEqual({ next: 'failed', apply: false })
  })

  it('rechaza 409 salir de un estado terminal hacia otro estado', () => {
    expect(() => resolveRunTransition('confirmed', 'cancelled')).toThrowError(
      expect.objectContaining({ code: 'assessment_ai_run_invalid_transition', statusCode: 409 }),
    )
    expect(() => resolveRunTransition('cancelled', 'scoring')).toThrowError(
      expect.objectContaining({ code: 'assessment_ai_run_invalid_transition' }),
    )
  })

  it('rechaza saltos ilegales (created → scoring, scoring → confirmed)', () => {
    expect(() => resolveRunTransition('created', 'scoring')).toThrow()
    expect(() => resolveRunTransition('scoring', 'confirmed')).toThrow()
    // Un run no terminal NO es idempotente consigo mismo (no hay self-loop).
    expect(() => resolveRunTransition('scoring', 'scoring')).toThrow()
  })

  it('clasifica terminales correctamente', () => {
    expect(isTerminalRunStatus('confirmed')).toBe(true)
    expect(isTerminalRunStatus('cancelled')).toBe(true)
    expect(isTerminalRunStatus('failed')).toBe(true)
    expect(isTerminalRunStatus('scoring')).toBe(false)
  })
})

describe('resolveItemTransition', () => {
  it('camino del drain: pending → claimed → proposed → confirmed', () => {
    expect(resolveItemTransition('pending', 'claimed').apply).toBe(true)
    expect(resolveItemTransition('claimed', 'proposed').apply).toBe(true)
    expect(resolveItemTransition('proposed', 'confirmed').apply).toBe(true)
  })

  it('claimed puede abstenerse, fallar o devolverse a pending (retry del lease)', () => {
    expect(resolveItemTransition('claimed', 'abstained').apply).toBe(true)
    expect(resolveItemTransition('claimed', 'failed').apply).toBe(true)
    expect(resolveItemTransition('claimed', 'pending').apply).toBe(true)
  })

  it('todo item no terminal puede caer a superseded_by_manual (reconciliación D3)', () => {
    for (const from of ['pending', 'claimed', 'proposed'] as const) {
      expect(resolveItemTransition(from, 'superseded_by_manual').apply).toBe(true)
    }
  })

  it('terminal-once: mismo terminal → no-op; salir de terminal → 409', () => {
    expect(resolveItemTransition('superseded_by_manual', 'superseded_by_manual').apply).toBe(false)
    expect(resolveItemTransition('cancelled', 'cancelled').apply).toBe(false)
    expect(() => resolveItemTransition('confirmed', 'cancelled')).toThrowError(
      expect.objectContaining({ code: 'assessment_ai_run_item_invalid_transition', statusCode: 409 }),
    )
    expect(() => resolveItemTransition('abstained', 'claimed')).toThrow()
  })

  it('clasifica terminales correctamente', () => {
    expect(isTerminalItemStatus('superseded_by_manual')).toBe(true)
    expect(isTerminalItemStatus('stale')).toBe(true)
    expect(isTerminalItemStatus('pending')).toBe(false)
    expect(isTerminalItemStatus('claimed')).toBe(false)
  })
})
