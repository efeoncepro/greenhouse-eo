/**
 * TASK-776 — tests para resolveTemporalWindow.
 *
 * Cubre cada modo + edge cases (input incompleto → degrada honestamente
 * a snapshot, NO throw silente).
 */
import { describe, expect, it } from 'vitest'

import { resolveTemporalWindow } from './temporal-window'

const TODAY = new Date(Date.UTC(2026, 4, 3)) // 2026-05-03

describe('resolveTemporalWindow — TASK-776', () => {
  describe('mode=snapshot', () => {
    it('default windowDays=30 desde hoy hacia atras', () => {
      const w = resolveTemporalWindow({ mode: 'snapshot', today: TODAY })

      expect(w.modeResolved).toBe('snapshot')
      expect(w.toDate).toBe('2026-05-03')
      expect(w.fromDate).toBe('2026-04-04') // 30 dias atras inclusive
      expect(w.spanDays).toBe(30)
      expect(w.label).toBe('Últimos 30 días')
    })

    it('windowDays custom (90)', () => {
      const w = resolveTemporalWindow({ mode: 'snapshot', windowDays: 90, today: TODAY })

      expect(w.fromDate).toBe('2026-02-03')
      expect(w.toDate).toBe('2026-05-03')
      expect(w.spanDays).toBe(90)
      expect(w.label).toBe('Últimos 90 días')
    })

    it('windowDays=1 (hoy nada mas)', () => {
      const w = resolveTemporalWindow({ mode: 'snapshot', windowDays: 1, today: TODAY })

      expect(w.fromDate).toBe('2026-05-03')
      expect(w.toDate).toBe('2026-05-03')
      expect(w.spanDays).toBe(1)
    })

    it('windowDays invalido (0/negative) cae a default 30', () => {
      const w0 = resolveTemporalWindow({ mode: 'snapshot', windowDays: 0, today: TODAY })

      expect(w0.spanDays).toBe(30)

      const wNeg = resolveTemporalWindow({ mode: 'snapshot', windowDays: -5, today: TODAY })

      expect(wNeg.spanDays).toBe(30)
    })
  })

  describe('mode=period', () => {
    it('mes completo Mayo 2026', () => {
      const w = resolveTemporalWindow({ mode: 'period', year: 2026, month: 5, today: TODAY })

      expect(w.modeResolved).toBe('period')
      expect(w.fromDate).toBe('2026-05-01')
      expect(w.toDate).toBe('2026-05-31')
      expect(w.label).toBe('Mayo 2026')
      expect(w.spanDays).toBe(31)
    })

    it('mes Febrero (28 dias bisiesto)', () => {
      const w = resolveTemporalWindow({ mode: 'period', year: 2026, month: 2, today: TODAY })

      expect(w.fromDate).toBe('2026-02-01')
      expect(w.toDate).toBe('2026-02-28')
      expect(w.label).toBe('Febrero 2026')
    })

    it('input incompleto (year sin month) degrada a snapshot', () => {
      const w = resolveTemporalWindow({ mode: 'period', year: 2026, today: TODAY })

      expect(w.modeResolved).toBe('snapshot')
      expect(w.label).toBe('Últimos 30 días')
    })
  })

  describe('mode=audit', () => {
    it('desde anchor hasta hoy', () => {
      const w = resolveTemporalWindow({ mode: 'audit', anchorDate: '2026-04-07', today: TODAY })

      expect(w.modeResolved).toBe('audit')
      expect(w.fromDate).toBe('2026-04-07')
      expect(w.toDate).toBe('2026-05-03')
      expect(w.label).toBe('Desde 07/04/2026')
      expect(w.spanDays).toBe(27) // 04-07 a 05-03 inclusive
    })

    it('sin anchorDate degrada a snapshot honesto', () => {
      const w = resolveTemporalWindow({ mode: 'audit', today: TODAY })

      expect(w.modeResolved).toBe('snapshot')
      expect(w.label).toBe('Últimos 30 días')
    })
  })
})
