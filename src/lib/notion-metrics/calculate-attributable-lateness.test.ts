import { describe, expect, it } from 'vitest'

import { calculateAttributableLateness } from './calculate-attributable-lateness'
import type { TaskInputsForAttributableLateness } from './attributable-lateness-types'

const d = (s: string) => new Date(`${s}T00:00:00Z`)

const baseInput = (
  overrides: Partial<TaskInputsForAttributableLateness> = {}
): TaskInputsForAttributableLateness => ({
  originalDueDate: d('2026-05-10'),
  currentDueDate: d('2026-05-10'),
  completedAt: d('2026-05-10'),
  taskStatus: 'Aprobado',
  freezeIntervals: [],
  reschedules: [],
  hasStatusHistory: true,
  asOf: d('2026-05-25'),
  ...overrides
})

describe('calculateAttributableLateness (TASK-922)', () => {
  it('a tiempo (completado en la fecha) → 0 días, on_time', () => {
    const r = calculateAttributableLateness(baseInput())

    expect(r.attributableDaysLate).toBe(0)
    expect(r.bucket).toBe('on_time')
    expect(r.dataStatus).toBe('valid')
    expect(r.fairDeadline).toBe('2026-05-10')
  })

  it('tarde 10 días sin freeze → 10 días, late_drop', () => {
    const r = calculateAttributableLateness(baseInput({ completedAt: d('2026-05-20') }))

    expect(r.attributableDaysLate).toBe(10)
    expect(r.bucket).toBe('late_drop')
  })

  it('freeze posterior descuenta del atraso (10 tarde, 4 freeze → 6)', () => {
    const r = calculateAttributableLateness(
      baseInput({
        completedAt: d('2026-05-20'),
        freezeIntervals: [{ entered: d('2026-05-12'), exited: d('2026-05-16') }]
      })
    )

    expect(r.attributableDaysLate).toBe(6)
    expect(r.frozenDaysExcluded).toBe(4)
    expect(r.bucket).toBe('late_drop')
  })

  it('freeze cubre todo el slip → 0 días, on_time', () => {
    const r = calculateAttributableLateness(
      baseInput({
        completedAt: d('2026-05-20'),
        freezeIntervals: [{ entered: d('2026-05-10'), exited: d('2026-05-20') }]
      })
    )

    expect(r.attributableDaysLate).toBe(0)
    expect(r.bucket).toBe('on_time')
  })

  it('extensión cliente CONFIRMADA mueve la fecha justa (+5 → fairDeadline 05-15)', () => {
    const r = calculateAttributableLateness(
      baseInput({
        completedAt: d('2026-05-20'),
        reschedules: [{ daysDelta: 5, reasonCode: 'client_requested', reasonSource: 'operator_confirmed' }]
      })
    )

    expect(r.fairDeadline).toBe('2026-05-15')
    expect(r.attributableDaysLate).toBe(5) // 05-20 vs 05-15
    expect(r.dataStatus).toBe('valid')
  })

  it('scope_change confirmado también extiende', () => {
    const r = calculateAttributableLateness(
      baseInput({
        completedAt: d('2026-05-20'),
        reschedules: [{ daysDelta: 8, reasonCode: 'scope_change', reasonSource: 'operator_confirmed' }]
      })
    )

    expect(r.fairDeadline).toBe('2026-05-18')
    expect(r.attributableDaysLate).toBe(2)
  })

  it('anti-doble-descuento: external_blocker confirmado NO extiende la fecha justa', () => {
    const r = calculateAttributableLateness(
      baseInput({
        completedAt: d('2026-05-20'),
        reschedules: [{ daysDelta: 5, reasonCode: 'external_blocker', reasonSource: 'operator_confirmed' }]
      })
    )

    expect(r.fairDeadline).toBe('2026-05-10') // sin extensión (lo maneja el freeze)
    expect(r.attributableDaysLate).toBe(10)
  })

  it('internal_not_prioritized confirmado NO extiende (slip de agencia)', () => {
    const r = calculateAttributableLateness(
      baseInput({
        completedAt: d('2026-05-20'),
        reschedules: [{ daysDelta: 5, reasonCode: 'internal_not_prioritized', reasonSource: 'operator_confirmed' }]
      })
    )

    expect(r.fairDeadline).toBe('2026-05-10')
    expect(r.attributableDaysLate).toBe(10)
  })

  it('reprogramación extending SIN confirmar → legacy_unknown (mide vs vigente, no extiende)', () => {
    const r = calculateAttributableLateness(
      baseInput({
        currentDueDate: d('2026-05-15'),
        completedAt: d('2026-05-20'),
        reschedules: [{ daysDelta: 5, reasonCode: 'client_requested', reasonSource: 'inferred' }]
      })
    )

    expect(r.dataStatus).toBe('legacy_unknown')
    expect(r.fairDeadline).toBe('2026-05-15') // vigente, NO la justa especulativa
    expect(r.attributableDaysLate).toBe(5)
  })

  it('sin historial de transiciones → unavailable (no 0 falso)', () => {
    const r = calculateAttributableLateness(
      baseInput({ completedAt: d('2026-05-20'), hasStatusHistory: false })
    )

    expect(r.dataStatus).toBe('unavailable')
  })

  it('sin fecha base (original y vigente null) → unavailable + fairDeadline null', () => {
    const r = calculateAttributableLateness(
      baseInput({ originalDueDate: null, currentDueDate: null, completedAt: d('2026-05-20') })
    )

    expect(r.dataStatus).toBe('unavailable')
    expect(r.fairDeadline).toBeNull()
  })

  it('freeze ANTES de la fecha justa NO cuenta (clamp post-deadline)', () => {
    const r = calculateAttributableLateness(
      baseInput({
        completedAt: d('2026-05-20'),
        // freeze del 05-01 al 05-08, todo antes del deadline 05-10 → no descuenta
        freezeIntervals: [{ entered: d('2026-05-01'), exited: d('2026-05-08') }]
      })
    )

    expect(r.frozenDaysExcluded).toBe(0)
    expect(r.attributableDaysLate).toBe(10)
  })

  it('multi-ciclo: dos intervalos de freeze se suman', () => {
    const r = calculateAttributableLateness(
      baseInput({
        completedAt: d('2026-05-30'),
        freezeIntervals: [
          { entered: d('2026-05-12'), exited: d('2026-05-15') }, // 3 días
          { entered: d('2026-05-20'), exited: d('2026-05-24') } // 4 días
        ]
      })
    )

    expect(r.frozenDaysExcluded).toBe(7)
    expect(r.attributableDaysLate).toBe(13) // 20 crudo − 7 freeze
  })

  it('interval aún abierto (exited null) clampa a end', () => {
    const r = calculateAttributableLateness(
      baseInput({
        completedAt: d('2026-05-20'),
        freezeIntervals: [{ entered: d('2026-05-15'), exited: null }]
      })
    )

    expect(r.frozenDaysExcluded).toBe(5) // 05-15 → 05-20
    expect(r.attributableDaysLate).toBe(5)
  })

  it('tarea abierta (sin completedAt) → atraso vs asOf', () => {
    const r = calculateAttributableLateness(
      baseInput({
        taskStatus: 'En curso',
        completedAt: null,
        asOf: d('2026-05-20')
      })
    )

    expect(r.attributableDaysLate).toBe(10) // 05-20 (asOf) vs 05-10
    expect(r.bucket).toBe('overdue')
  })

  it('idempotente / determinista', () => {
    const input = baseInput({ completedAt: d('2026-05-18') })

    expect(calculateAttributableLateness(input)).toEqual(calculateAttributableLateness(input))
  })
})
