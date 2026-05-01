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

  it('requires attendance only when attendance can change the payroll amount', () => {
    expect(
      requiresPayrollAttendanceSignal({
        bonusOtdMax: 0,
        bonusRpaMax: 0,
        contractType: 'indefinido',
        payRegime: 'chile',
        payrollVia: 'internal',
        scheduleRequired: true
      })
    ).toBe(true)

    expect(
      requiresPayrollAttendanceSignal({
        bonusOtdMax: 175,
        bonusRpaMax: 50,
        contractType: 'indefinido',
        payRegime: 'international',
        payrollVia: 'deel',
        scheduleRequired: true
      })
    ).toBe(false)

    expect(
      requiresPayrollAttendanceSignal({
        bonusOtdMax: 0,
        bonusRpaMax: 0,
        contractType: 'honorarios',
        payRegime: 'chile',
        payrollVia: 'internal',
        scheduleRequired: true
      })
    ).toBe(false)

    expect(
      requiresPayrollAttendanceSignal({
        bonusOtdMax: 0,
        bonusRpaMax: 0,
        contractType: 'indefinido',
        payRegime: 'international',
        payrollVia: 'internal',
        scheduleRequired: false
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
