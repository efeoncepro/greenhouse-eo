import { describe, expect, it } from 'vitest'

import { calculateCycleTime } from './calculate-cycle-time'
import { CYCLE_TIME_FORMULA_VERSION, type TaskInputsForCycleTime } from './cycle-time-types'

// Helpers para escribir tests legibles con fechas canonical.
const d = (iso: string): Date => new Date(iso)

const baseInputs = (overrides: Partial<TaskInputsForCycleTime> = {}): TaskInputsForCycleTime => ({
  enCursoStartedAt: null,
  completedAt: null,
  blockedIntervals: [],
  createdAt: d('2026-05-01T00:00:00.000Z'),
  ...overrides
})

describe('calculateCycleTime — TASK-908 Slice 1 canonical V1', () => {
  describe('1. Happy canonical (status → En curso start + completedAt)', () => {
    it('cycleTimeDays positivo, sourceMode="canonical"', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-01T00:00:00.000Z'),
          completedAt: d('2026-05-11T00:00:00.000Z')
        })
      )

      expect(result.cycleTimeDays).toBe(10)
      expect(result.sourceMode).toBe('canonical')
      expect(result.blockedDaysExcluded).toBe(0)
      expect(result.formulaVersion).toBe(CYCLE_TIME_FORMULA_VERSION)
    })
  })

  describe('2. Happy fallback (sin enCursoStartedAt, usa createdAt)', () => {
    it('cycleTimeDays positivo, sourceMode="fallback_created_at"', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: null,
          completedAt: d('2026-05-08T00:00:00.000Z'),
          createdAt: d('2026-05-01T00:00:00.000Z')
        })
      )

      expect(result.cycleTimeDays).toBe(7)
      expect(result.sourceMode).toBe('fallback_created_at')
    })
  })

  describe('3. Edge: sin completedAt → unavailable', () => {
    it('cycleTimeDays=null, sourceMode="unavailable"', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-01T00:00:00.000Z'),
          completedAt: null
        })
      )

      expect(result.cycleTimeDays).toBeNull()
      expect(result.sourceMode).toBe('unavailable')
      expect(result.blockedDaysExcluded).toBe(0)
    })
  })

  describe('4. Bloqueado overlap full (descuenta tiempo bloqueado dentro de ventana)', () => {
    it('descuenta correctamente 2 días bloqueado dentro de 10 días totales', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-01T00:00:00.000Z'),
          completedAt: d('2026-05-11T00:00:00.000Z'),
          blockedIntervals: [
            {
              entered: d('2026-05-05T00:00:00.000Z'),
              exited: d('2026-05-07T00:00:00.000Z')
            }
          ]
        })
      )

      expect(result.cycleTimeDays).toBe(8) // 10 - 2 bloqueados
      expect(result.blockedDaysExcluded).toBe(2)
    })
  })

  describe('5. Bloqueado pre-start (entered antes que start) → clamp a start', () => {
    it('descuenta solo tiempo bloqueado dentro de [start, end]', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-05T00:00:00.000Z'),
          completedAt: d('2026-05-11T00:00:00.000Z'),
          blockedIntervals: [
            {
              entered: d('2026-05-01T00:00:00.000Z'), // ANTES de start
              exited: d('2026-05-07T00:00:00.000Z')
            }
          ]
        })
      )

      // raw: 6 días (5/05 → 11/05)
      // bloqueado relevante: 5/05 → 7/05 = 2 días (clamp pre-start a start)
      expect(result.cycleTimeDays).toBe(4)
      expect(result.blockedDaysExcluded).toBe(2)
    })
  })

  describe('6. Bloqueado post-end (exited después de completedAt) → clamp a end', () => {
    it('descuenta solo tiempo bloqueado dentro de [start, end]', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-01T00:00:00.000Z'),
          completedAt: d('2026-05-11T00:00:00.000Z'),
          blockedIntervals: [
            {
              entered: d('2026-05-09T00:00:00.000Z'),
              exited: d('2026-05-15T00:00:00.000Z') // DESPUÉS de completedAt
            }
          ]
        })
      )

      // raw: 10 días
      // bloqueado relevante: 9/05 → 11/05 = 2 días (clamp post-end a end)
      expect(result.cycleTimeDays).toBe(8)
      expect(result.blockedDaysExcluded).toBe(2)
    })
  })

  describe('7. Múltiples intervalos Bloqueado → suma todos', () => {
    it('descuenta correctamente 3 intervals (2 + 1 + 0.5 = 3.5 días)', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-01T00:00:00.000Z'),
          completedAt: d('2026-05-21T00:00:00.000Z'),
          blockedIntervals: [
            { entered: d('2026-05-03T00:00:00.000Z'), exited: d('2026-05-05T00:00:00.000Z') },
            { entered: d('2026-05-10T00:00:00.000Z'), exited: d('2026-05-11T00:00:00.000Z') },
            { entered: d('2026-05-15T00:00:00.000Z'), exited: d('2026-05-15T12:00:00.000Z') }
          ]
        })
      )

      expect(result.cycleTimeDays).toBe(20 - 3.5) // 16.5
      expect(result.blockedDaysExcluded).toBe(3.5)
    })
  })

  describe('8. Bloqueado abierto al cierre (exited=null) → usa completedAt como exit', () => {
    it('descuenta interval hasta completedAt cuando exited=null', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-01T00:00:00.000Z'),
          completedAt: d('2026-05-11T00:00:00.000Z'),
          blockedIntervals: [
            {
              entered: d('2026-05-09T00:00:00.000Z'),
              exited: null // todavía bloqueado al moment de completion
            }
          ]
        })
      )

      // raw: 10 días
      // bloqueado: 9/05 → 11/05 = 2 días (exited=null clamp a completedAt)
      expect(result.cycleTimeDays).toBe(8)
      expect(result.blockedDaysExcluded).toBe(2)
    })
  })

  describe('9. CT 0 días (mismo timestamp start y end) → 0', () => {
    it('cycleTimeDays=0', () => {
      const fixed = d('2026-05-01T10:00:00.000Z')

      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: fixed,
          completedAt: fixed
        })
      )

      expect(result.cycleTimeDays).toBe(0)
      expect(result.sourceMode).toBe('canonical')
    })
  })

  describe('10. CT que daría negativo (bloqueado > raw) → clamp a 0', () => {
    it('cycleTimeDays clamped a 0 (defensive)', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-01T00:00:00.000Z'),
          completedAt: d('2026-05-05T00:00:00.000Z'),
          blockedIntervals: [
            // 6 días bloqueado dentro de 4 días raw → debería ser -2 → clamp a 0
            { entered: d('2026-04-30T00:00:00.000Z'), exited: d('2026-05-10T00:00:00.000Z') }
          ]
        })
      )

      expect(result.cycleTimeDays).toBe(0)
    })
  })

  describe('11. Idempotencia (2 invocaciones consecutivas iguales)', () => {
    it('produce mismo result deterministicamente', () => {
      const inputs = baseInputs({
        enCursoStartedAt: d('2026-05-01T00:00:00.000Z'),
        completedAt: d('2026-05-11T00:00:00.000Z'),
        blockedIntervals: [
          { entered: d('2026-05-05T00:00:00.000Z'), exited: d('2026-05-06T00:00:00.000Z') }
        ]
      })

      const a = calculateCycleTime(inputs)
      const b = calculateCycleTime(inputs)

      expect(a).toEqual(b)
    })
  })

  describe('12. Edge: enCursoStartedAt posterior a completedAt (data inconsistente)', () => {
    it('clamp a 0 (NOT crashea con valor negativo)', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-15T00:00:00.000Z'),
          completedAt: d('2026-05-10T00:00:00.000Z')
        })
      )

      // raw días negativos (-5) → clamp a 0
      expect(result.cycleTimeDays).toBe(0)
      expect(result.sourceMode).toBe('canonical')
    })
  })

  describe('13. Feedback time SE INCLUYE (decisión canonical Delta 2026-05-17)', () => {
    it('tiempo en "Listo para revisión" o "Cambios solicitados" cuenta en CT (NO se pasa como blockedInterval)', () => {
      // El feedback time NO se descuenta. Solo Bloqueado/En pausa/Detenido.
      // El consumer (Slice 4 futuro) NO pasa transitions a/de "Listo para
      // revisión" o "Cambios solicitados" como blockedIntervals.
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-01T00:00:00.000Z'),
          completedAt: d('2026-05-11T00:00:00.000Z'),
          blockedIntervals: [] // intencional: feedback no entra
        })
      )

      expect(result.cycleTimeDays).toBe(10) // full 10 días, feedback incluido
      expect(result.blockedDaysExcluded).toBe(0)
    })
  })

  describe('14. Edge: blockedIntervals vacío → blockedDaysExcluded=0', () => {
    it('blockedDaysExcluded es 0 sin intervals', () => {
      const result = calculateCycleTime(
        baseInputs({
          enCursoStartedAt: d('2026-05-01T00:00:00.000Z'),
          completedAt: d('2026-05-05T00:00:00.000Z'),
          blockedIntervals: []
        })
      )

      expect(result.blockedDaysExcluded).toBe(0)
      expect(result.cycleTimeDays).toBe(4)
    })
  })
})
