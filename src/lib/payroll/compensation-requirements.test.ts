import { describe, expect, it } from 'vitest'

import {
  hasPayrollVariableBonusExposure,
  requiresPayrollAttendanceSignal,
  requiresPayrollChileTaxTable,
  requiresPayrollKpi
} from './compensation-requirements'

describe('compensation requirements', () => {
  it('requires KPI only when payroll actually pays KPI-driven bonuses', () => {
    expect(
      requiresPayrollKpi({
        bonusOtdMax: 150,
        bonusRpaMax: 0,
        contractType: 'indefinido',
        payRegime: 'international',
        payrollVia: 'deel',
        scheduleRequired: true
      })
    ).toBe(true)

    expect(
      requiresPayrollKpi({
        bonusOtdMax: 0,
        bonusRpaMax: 0,
        contractType: 'indefinido',
        payRegime: 'chile',
        payrollVia: 'internal',
        scheduleRequired: true
      })
    ).toBe(false)

    expect(
      requiresPayrollKpi({
        bonusOtdMax: 200,
        bonusRpaMax: 100,
        contractType: 'honorarios',
        payRegime: 'chile',
        payrollVia: 'internal',
        scheduleRequired: true
      })
    ).toBe(false)
  })

  it('requires attendance only for Chile dependent regime, regardless of the schedule flag', () => {
    // El régimen es autoritativo: solo indefinido/plazo_fijo (dependiente Chile)
    // exigen señal de asistencia; el resto nunca, sin importar scheduleRequired.
    const cases: Array<{
      contractType: 'indefinido' | 'plazo_fijo' | 'honorarios' | 'contractor' | 'eor' | 'international_internal'
      payRegime: 'chile' | 'international'
      payrollVia: 'internal' | 'deel'
      expected: boolean
    }> = [
      { contractType: 'indefinido', payRegime: 'chile', payrollVia: 'internal', expected: true },
      { contractType: 'plazo_fijo', payRegime: 'chile', payrollVia: 'internal', expected: true },
      { contractType: 'honorarios', payRegime: 'chile', payrollVia: 'internal', expected: false },
      { contractType: 'contractor', payRegime: 'international', payrollVia: 'deel', expected: false },
      { contractType: 'eor', payRegime: 'international', payrollVia: 'deel', expected: false },
      { contractType: 'international_internal', payRegime: 'international', payrollVia: 'internal', expected: false }
    ]

    for (const { contractType, payRegime, payrollVia, expected } of cases) {
      for (const scheduleRequired of [true, false, undefined]) {
        expect(
          requiresPayrollAttendanceSignal({
            bonusOtdMax: 0,
            bonusRpaMax: 0,
            contractType,
            payRegime,
            payrollVia,
            scheduleRequired
          }),
          `${contractType} / scheduleRequired=${scheduleRequired}`
        ).toBe(expected)
      }
    }
  })

  it('does not require attendance for international_internal even when daily_required forced the schedule flag on (ISSUE-115)', () => {
    // Regresión directa del incidente: colaborador international_internal con
    // members.daily_required=true → scheduleRequired=true, pero su régimen no usa
    // asistencia Chile, así que NO debe bloquear la nómina.
    expect(
      requiresPayrollAttendanceSignal({
        bonusOtdMax: 0,
        bonusRpaMax: 0,
        contractType: 'international_internal',
        payRegime: 'international',
        payrollVia: 'internal',
        scheduleRequired: true
      })
    ).toBe(false)
  })

  it('tracks Chile tax-table requirement separately from generic compensation presence', () => {
    expect(
      requiresPayrollChileTaxTable({
        bonusOtdMax: 0,
        bonusRpaMax: 0,
        contractType: 'indefinido',
        payRegime: 'chile',
        payrollVia: 'internal',
        scheduleRequired: true
      })
    ).toBe(true)

    expect(
      requiresPayrollChileTaxTable({
        bonusOtdMax: 0,
        bonusRpaMax: 0,
        contractType: 'honorarios',
        payRegime: 'chile',
        payrollVia: 'internal',
        scheduleRequired: true
      })
    ).toBe(false)
  })

  it('detects variable bonus exposure from either KPI lane', () => {
    expect(
      hasPayrollVariableBonusExposure({
        bonusOtdMax: 0,
        bonusRpaMax: 50,
        contractType: 'indefinido',
        payRegime: 'international',
        payrollVia: 'deel',
        scheduleRequired: true
      })
    ).toBe(true)

    expect(
      hasPayrollVariableBonusExposure({
        bonusOtdMax: 0,
        bonusRpaMax: 0,
        contractType: 'indefinido',
        payRegime: 'international',
        payrollVia: 'deel',
        scheduleRequired: true
      })
    ).toBe(false)
  })
})
