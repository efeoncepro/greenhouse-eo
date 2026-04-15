import { afterEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_REOPEN_WINDOW_DAYS,
  REOPEN_REASON_VALUES,
  assertReopenWindow,
  assertValidReopenReason,
  checkPreviredDeclaredSnapshot,
  evaluateReopenWindow,
  resolveReopenWindowDays
} from './reopen-guards'
import { PayrollValidationError } from './shared'

describe('reopen-guards — TASK-410 + hotfix 2026-04-15', () => {
  describe('assertValidReopenReason', () => {
    it('accepts every taxonomy value', () => {
      REOPEN_REASON_VALUES.forEach(reason => {
        if (reason === 'otro') {
          const result = assertValidReopenReason(reason, 'detalle obligatorio')

          expect(result.reason).toBe('otro')
          expect(result.reasonDetail).toBe('detalle obligatorio')

          return
        }

        const result = assertValidReopenReason(reason, null)

        expect(result.reason).toBe(reason)
        expect(result.reasonDetail).toBeNull()
      })
    })

    it('rejects unknown reasons with 400', () => {
      expect(() => assertValidReopenReason('hack', null)).toThrowError(PayrollValidationError)
    })

    it('rejects "otro" without detail', () => {
      expect(() => assertValidReopenReason('otro', null)).toThrowError(/detalle/)
      expect(() => assertValidReopenReason('otro', '   ')).toThrowError(/detalle/)
    })

    it('trims whitespace from detail for non-otro reasons', () => {
      const result = assertValidReopenReason('error_calculo', '  bug en bono RPA  ')

      expect(result.reasonDetail).toBe('bug en bono RPA')
    })
  })

  describe('resolveReopenWindowDays', () => {
    const previous = process.env.PAYROLL_REOPEN_WINDOW_DAYS

    afterEach(() => {
      if (previous === undefined) {
        delete process.env.PAYROLL_REOPEN_WINDOW_DAYS
      } else {
        process.env.PAYROLL_REOPEN_WINDOW_DAYS = previous
      }
    })

    it('defaults to 45 days when env var is unset', () => {
      delete process.env.PAYROLL_REOPEN_WINDOW_DAYS
      expect(resolveReopenWindowDays()).toBe(DEFAULT_REOPEN_WINDOW_DAYS)
    })

    it('respects positive overrides from env', () => {
      process.env.PAYROLL_REOPEN_WINDOW_DAYS = '90'
      expect(resolveReopenWindowDays()).toBe(90)
    })

    it('falls back to default on invalid overrides', () => {
      process.env.PAYROLL_REOPEN_WINDOW_DAYS = 'not-a-number'
      expect(resolveReopenWindowDays()).toBe(DEFAULT_REOPEN_WINDOW_DAYS)

      process.env.PAYROLL_REOPEN_WINDOW_DAYS = '-5'
      expect(resolveReopenWindowDays()).toBe(DEFAULT_REOPEN_WINDOW_DAYS)
    })
  })

  describe('evaluateReopenWindow', () => {
    it('reports ok when elapsed days are within the window', () => {
      const exportedAt = new Date('2026-03-31T12:00:00Z')
      const reference = new Date('2026-04-15T12:00:00Z')

      const result = evaluateReopenWindow({ exported_at: exportedAt }, reference, 45)

      expect(result.withinWindow).toBe(true)
      expect(result.reason).toBe('ok')
      expect(result.daysSinceExport).toBeCloseTo(15, 1)
      expect(result.windowDays).toBe(45)
    })

    it('reports outside_window when elapsed days exceed the threshold', () => {
      const exportedAt = new Date('2026-01-01T00:00:00Z')
      const reference = new Date('2026-04-15T00:00:00Z')

      const result = evaluateReopenWindow({ exported_at: exportedAt }, reference, 45)

      expect(result.withinWindow).toBe(false)
      expect(result.reason).toBe('outside_window')
      expect(result.daysSinceExport).toBeGreaterThan(45)
    })

    it('reports not_exported when exported_at is null', () => {
      const result = evaluateReopenWindow({ exported_at: null }, new Date(), 45)

      expect(result.withinWindow).toBe(false)
      expect(result.reason).toBe('not_exported')
      expect(result.daysSinceExport).toBeNull()
    })

    it('accepts ISO strings in the snapshot field', () => {
      const result = evaluateReopenWindow(
        { exported_at: '2026-04-10T00:00:00Z' },
        new Date('2026-04-15T00:00:00Z'),
        45
      )

      expect(result.withinWindow).toBe(true)
      expect(result.reason).toBe('ok')
    })
  })

  describe('assertReopenWindow (throwing)', () => {
    it('does not throw when within the window', () => {
      expect(() =>
        assertReopenWindow({ exported_at: new Date('2026-04-10T00:00:00Z') }, new Date('2026-04-15T00:00:00Z'))
      ).not.toThrow()
    })

    it('throws PayrollValidationError when outside the window', () => {
      expect(() =>
        assertReopenWindow({ exported_at: new Date('2026-01-01T00:00:00Z') }, new Date('2026-04-15T00:00:00Z'))
      ).toThrowError(PayrollValidationError)
    })

    it('throws when exported_at is null', () => {
      expect(() => assertReopenWindow({ exported_at: null })).toThrowError(/no tiene fecha de exportación/)
    })
  })

  describe('checkPreviredDeclaredSnapshot — V1 stub', () => {
    it('always returns false in V1 (delegated to reopen window guard)', () => {
      expect(checkPreviredDeclaredSnapshot('2026-04')).toBe(false)
      expect(checkPreviredDeclaredSnapshot('2020-01')).toBe(false)
    })
  })
})
