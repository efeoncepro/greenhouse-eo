import { describe, expect, it, vi } from 'vitest'

import {
  assertReopenWindow,
  assertValidReopenReason,
  checkPreviredDeclaredSnapshot,
  REOPEN_REASON_VALUES
} from './reopen-guards'
import { PayrollValidationError } from './shared'

vi.mock('@/lib/calendar/operational-calendar', () => ({
  getOperationalPayrollMonth: vi.fn()
}))

import { getOperationalPayrollMonth } from '@/lib/calendar/operational-calendar'

const mockedGetOperationalPayrollMonth = getOperationalPayrollMonth as unknown as ReturnType<typeof vi.fn>

describe('reopen-guards — TASK-410', () => {
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

  describe('assertReopenWindow', () => {
    it('allows the period when it matches the current operational month', () => {
      mockedGetOperationalPayrollMonth.mockReturnValue({
        operationalYear: 2026,
        operationalMonth: 4
      })

      expect(() => assertReopenWindow(2026, 4)).not.toThrow()
    })

    it('rejects periods outside the current operational window', () => {
      mockedGetOperationalPayrollMonth.mockReturnValue({
        operationalYear: 2026,
        operationalMonth: 4
      })

      expect(() => assertReopenWindow(2026, 3)).toThrowError(PayrollValidationError)
      expect(() => assertReopenWindow(2026, 3)).toThrowError(/mes operativo vigente/)
      expect(() => assertReopenWindow(2025, 4)).toThrowError(PayrollValidationError)
    })
  })

  describe('checkPreviredDeclaredSnapshot — V1 stub', () => {
    it('always returns false in V1 (delegated to operational window)', () => {
      expect(checkPreviredDeclaredSnapshot('2026-04')).toBe(false)
      expect(checkPreviredDeclaredSnapshot('2020-01')).toBe(false)
    })
  })
})
