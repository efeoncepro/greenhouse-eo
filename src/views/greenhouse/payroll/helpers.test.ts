import { describe, expect, it } from 'vitest'

import type { PayrollEntry } from '@/types/payroll'
import { buildPayrollCurrencySummary } from './helpers'

const buildEntry = (overrides: Partial<PayrollEntry>): PayrollEntry => ({
  entryId: 'entry-1',
  periodId: '2026-03',
  memberId: 'member-1',
  memberName: 'Member',
  memberEmail: 'member@example.com',
  memberAvatarUrl: null,
  compensationVersionId: 'cv-1',
  payRegime: 'international',
  currency: 'USD',
  baseSalary: 1000,
  remoteAllowance: 100,
  colacionAmount: 0,
  movilizacionAmount: 0,
  fixedBonusLabel: 'Responsabilidad',
  fixedBonusAmount: 50,
  kpiOtdPercent: null,
  kpiRpaAvg: null,
  kpiOtdQualifies: false,
  kpiRpaQualifies: false,
  kpiTasksCompleted: null,
  kpiDataSource: 'ico',
  bonusOtdMin: 0,
  bonusOtdMax: 0,
  bonusRpaMin: 0,
  bonusRpaMax: 0,
  bonusOtdAmount: 0,
  bonusRpaAmount: 0,
  bonusOtherAmount: 0,
  bonusOtherDescription: null,
  grossTotal: 1100,
  chileGratificacionLegalAmount: null,
  chileColacionAmount: null,
  chileMovilizacionAmount: null,
  chileAfpName: null,
  chileAfpRate: null,
  chileAfpAmount: 0,
  chileAfpCotizacionAmount: 0,
  chileAfpComisionAmount: 0,
  chileHealthSystem: null,
  chileHealthAmount: 0,
  chileUnemploymentRate: null,
  chileUnemploymentAmount: 0,
  chileTaxableBase: 0,
  chileTaxAmount: 0,
  chileApvAmount: 0,
  chileUfValue: null,
  chileTotalDeductions: 0,
  netTotalCalculated: 1100,
  netTotalOverride: null,
  netTotal: 1100,
  manualOverride: false,
  manualOverrideNote: null,
  bonusOtdProrationFactor: 1,
  bonusRpaProrationFactor: 1,
  workingDaysInPeriod: 20,
  daysPresent: 20,
  daysAbsent: 0,
  daysOnLeave: 0,
  daysOnUnpaidLeave: 0,
  adjustedBaseSalary: 1000,
  adjustedRemoteAllowance: 100,
  adjustedColacionAmount: 0,
  adjustedMovilizacionAmount: 0,
  adjustedFixedBonusAmount: 50,
  version: 1,
  isActive: true,
  supersededBy: null,
  reopenAuditId: null,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: null,
  ...overrides,
  chileEmployerSisAmount: overrides.chileEmployerSisAmount ?? 0,
  chileEmployerCesantiaAmount: overrides.chileEmployerCesantiaAmount ?? 0,
  chileEmployerMutualAmount: overrides.chileEmployerMutualAmount ?? 0,
  chileEmployerTotalCost: overrides.chileEmployerTotalCost ?? 0,
  chileHealthObligatoriaAmount: overrides.chileHealthObligatoriaAmount ?? 0,
  chileHealthVoluntariaAmount: overrides.chileHealthVoluntariaAmount ?? 0
})

describe('buildPayrollCurrencySummary', () => {
  it('returns a single-currency total when all entries share the same currency', () => {
    const summary = buildPayrollCurrencySummary(
      [buildEntry({ grossTotal: 1100 }), buildEntry({ entryId: 'entry-2', grossTotal: 900 })],
      entry => entry.grossTotal
    )

    expect(summary.hasMixedCurrency).toBe(false)
    expect(summary.primaryCurrency).toBe('USD')
    expect(summary.totals.USD).toBe(2000)
    expect(summary.summaryLabel).toContain('$2,000.00')
  })

  it('returns split totals when the period mixes CLP and USD entries', () => {
    const summary = buildPayrollCurrencySummary(
      [
        buildEntry({ currency: 'CLP', payRegime: 'chile', grossTotal: 1200000 }),
        buildEntry({ entryId: 'entry-2', currency: 'USD', grossTotal: 2500 })
      ],
      entry => entry.grossTotal
    )

    expect(summary.hasMixedCurrency).toBe(true)
    expect(summary.totals.CLP).toBe(1200000)
    expect(summary.totals.USD).toBe(2500)
    expect(summary.summaryLabel).toContain('CLP:')
    expect(summary.summaryLabel).toContain('USD:')
  })
})
