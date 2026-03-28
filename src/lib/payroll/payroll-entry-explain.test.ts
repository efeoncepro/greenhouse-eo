import { describe, expect, it } from 'vitest'

import type { CompensationVersion, PayrollEntry, PayrollPeriod } from '@/types/payroll'

import { buildPayrollEntryExplain } from './payroll-entry-explain'

const period: PayrollPeriod = {
  periodId: '2026-03',
  year: 2026,
  month: 3,
  status: 'calculated',
  calculatedAt: null,
  calculatedBy: null,
  approvedAt: null,
  approvedBy: null,
  exportedAt: null,
  ufValue: 39990,
  taxTableVersion: 'SII-2026-03',
  notes: null,
  createdAt: null
}

const compensationVersion: CompensationVersion = {
  versionId: 'member-1_v1',
  memberId: 'member-1',
  memberName: 'Andres Carlosama',
  memberEmail: 'andres@efeoncepro.com',
  memberAvatarUrl: null,
  notionUserId: null,
  version: 1,
  payRegime: 'international',
  currency: 'USD',
  baseSalary: 675,
  remoteAllowance: 50,
  colacionAmount: 0,
  movilizacionAmount: 0,
  fixedBonusLabel: 'Responsabilidad',
  fixedBonusAmount: 75,
  bonusOtdMin: 0,
  bonusOtdMax: 150,
  bonusRpaMin: 0,
  bonusRpaMax: 75,
  gratificacionLegalMode: 'ninguna',
  afpName: null,
  afpRate: null,
  afpCotizacionRate: null,
  afpComisionRate: null,
  healthSystem: null,
  healthPlanUf: null,
  unemploymentRate: 0,
  contractType: 'indefinido',
  hasApv: false,
  apvAmount: 0,
  effectiveFrom: '2026-03-15',
  effectiveTo: null,
  isCurrent: true,
  changeReason: 'Nómina Marzo',
  desiredNetClp: null,
  createdBy: null,
  createdAt: null
}

const entry: PayrollEntry = {
  entryId: '2026-03_member-1',
  periodId: '2026-03',
  memberId: 'member-1',
  memberName: 'Andres Carlosama',
  memberEmail: 'andres@efeoncepro.com',
  memberAvatarUrl: null,
  compensationVersionId: compensationVersion.versionId,
  payRegime: 'international',
  currency: 'USD',
  baseSalary: 675,
  remoteAllowance: 50,
  colacionAmount: 0,
  movilizacionAmount: 0,
  fixedBonusLabel: 'Responsabilidad',
  fixedBonusAmount: 75,
  kpiOtdPercent: 58.3,
  kpiRpaAvg: 2,
  kpiOtdQualifies: false,
  kpiRpaQualifies: true,
  kpiTasksCompleted: 16,
  kpiDataSource: 'ico',
  bonusOtdAmount: 0,
  bonusRpaAmount: 25,
  bonusOtherAmount: 10,
  bonusOtherDescription: 'Ajuste puntual',
  grossTotal: 710,
  chileGratificacionLegalAmount: null,
  chileColacionAmount: null,
  chileMovilizacionAmount: null,
  bonusOtdMin: 0,
  bonusOtdMax: 150,
  bonusRpaMin: 0,
  bonusRpaMax: 75,
  chileAfpName: null,
  chileAfpRate: null,
  chileAfpAmount: null,
  chileAfpCotizacionAmount: null,
  chileAfpComisionAmount: null,
  chileHealthSystem: null,
  chileHealthAmount: null,
  chileHealthObligatoriaAmount: null,
  chileHealthVoluntariaAmount: null,
  chileEmployerSisAmount: null,
  chileEmployerCesantiaAmount: null,
  chileEmployerMutualAmount: null,
  chileEmployerTotalCost: null,
  chileUnemploymentRate: null,
  chileUnemploymentAmount: null,
  chileTaxableBase: null,
  chileTaxAmount: null,
  chileApvAmount: null,
  chileUfValue: null,
  chileTotalDeductions: null,
  netTotalCalculated: 710,
  netTotalOverride: 720,
  netTotal: 720,
  manualOverride: true,
  manualOverrideNote: 'Ajuste RRHH',
  bonusOtdProrationFactor: 0,
  bonusRpaProrationFactor: 0.3333,
  workingDaysInPeriod: 20,
  daysPresent: 18,
  daysAbsent: 1,
  daysOnLeave: 0,
  daysOnUnpaidLeave: 1,
  adjustedBaseSalary: 607.5,
  adjustedRemoteAllowance: 45,
  adjustedColacionAmount: 0,
  adjustedMovilizacionAmount: 0,
  adjustedFixedBonusAmount: 67.5,
  createdAt: null,
  updatedAt: null
}

describe('buildPayrollEntryExplain', () => {
  it('summarizes the snapshot and derives attendance and bonus context', () => {
    const explain = buildPayrollEntryExplain({
      entry,
      period,
      compensationVersion
    })

    expect(explain.calculation.deductibleDays).toBe(2)
    expect(explain.calculation.attendanceRatio).toBe(0.9)
    expect(explain.calculation.effectiveBaseSalary).toBe(607.5)
    expect(explain.calculation.effectiveRemoteAllowance).toBe(45)
    expect(explain.calculation.effectiveFixedBonusAmount).toBe(67.5)
    expect(explain.calculation.totalVariableBonus).toBe(35)
    expect(explain.calculation.hasAttendanceAdjustment).toBe(true)
    expect(explain.compensationVersion?.versionId).toBe('member-1_v1')
  })

  it('adds warnings for ICO source mode gap and manual overrides', () => {
    const explain = buildPayrollEntryExplain({
      entry,
      period,
      compensationVersion
    })

    expect(explain.calculation.kpiSourceModeAvailable).toBe(false)
    expect(explain.calculation.warnings).toContain(
      'El snapshot actual conserva la fuente ICO, pero no si el KPI vino materializado o live.'
    )
    expect(explain.calculation.warnings).toContain('La entry tiene override manual de neto activo.')
  })
})
