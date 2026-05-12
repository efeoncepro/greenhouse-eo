import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/hr-core/leave-domain', () => ({
  loadHolidayDateSetForRange: vi.fn(async () => ({
    holidayDates: new Set<string>(['2026-05-21']),
    source: 'nager'
  }))
}))
vi.mock('@/lib/finance/economic-indicators', () => ({
  getHistoricalEconomicIndicatorForPeriod: vi.fn(async ({ indicatorCode }: { indicatorCode: string }) => ({
    value: indicatorCode === 'UF' ? 39000 : indicatorCode === 'IMM' ? 510636 : 68000
  }))
}))
vi.mock('@/lib/payroll/tax-table-version', () => ({
  resolvePayrollTaxTableVersion: vi.fn(async () => '2026-05')
}))
vi.mock('@/lib/payroll/compute-chile-tax', () => ({
  computeChileTax: vi.fn(async () => ({
    taxableBaseClp: 1000000,
    taxableBaseUtm: 14.7,
    utmValue: 68000,
    bracketRate: 0,
    bracketDeductionUtm: 0,
    taxAmountClp: 0,
    taxTableVersion: '2026-05',
    computed: true
  }))
}))
vi.mock('@/lib/payroll/calculate-chile-deductions', () => ({
  calculatePayrollTotals: vi.fn(async ({
    baseSalary,
    remoteAllowance,
    colacionAmount,
    movilizacionAmount,
    fixedBonusAmount,
    taxAmount
  }: {
    baseSalary: number
    remoteAllowance: number
    colacionAmount: number
    movilizacionAmount: number
    fixedBonusAmount: number
    taxAmount?: number
  }) => {
    const imponible = baseSalary + fixedBonusAmount
    const deductions = Math.round(imponible * 0.18 + (taxAmount ?? 0))

    return {
      grossTotal: baseSalary + remoteAllowance + colacionAmount + movilizacionAmount + fixedBonusAmount,
      netTotalCalculated: baseSalary + remoteAllowance + colacionAmount + movilizacionAmount + fixedBonusAmount - deductions,
      chileAfpName: 'modelo',
      chileAfpRate: 0.11,
      chileAfpAmount: Math.round(imponible * 0.11),
      chileAfpCotizacionAmount: Math.round(imponible * 0.1),
      chileAfpComisionAmount: Math.round(imponible * 0.01),
      chileGratificacionLegalAmount: null,
      chileColacionAmount: colacionAmount,
      chileMovilizacionAmount: movilizacionAmount,
      chileHealthSystem: 'fonasa',
      chileHealthAmount: Math.round(imponible * 0.07),
      chileHealthObligatoriaAmount: Math.round(imponible * 0.07),
      chileHealthVoluntariaAmount: null,
      chileEmployerSisAmount: null,
      chileEmployerCesantiaAmount: null,
      chileEmployerMutualAmount: null,
      chileEmployerTotalCost: null,
      chileUnemploymentRate: 0,
      chileUnemploymentAmount: 0,
      chileTaxableBase: Math.round(imponible * 0.82),
      chileTaxAmount: taxAmount ?? 0,
      chileApvAmount: null,
      chileUfValue: null,
      chileTotalDeductions: deductions
    }
  })
}))

import { calculateFinalSettlement } from './calculator'
import type { OffboardingCase } from '@/lib/workforce/offboarding'

const baseCase: OffboardingCase = {
  offboardingCaseId: 'offboarding-case-1',
  publicId: 'EO-OFF-2026-0001',
  profileId: 'profile-1',
  memberId: 'member-1',
  userId: 'user-1',
  personLegalEntityRelationshipId: 'rel-1',
  legalEntityOrganizationId: 'org-1',
  organizationId: 'org-1',
  spaceId: null,
  relationshipType: 'employee',
  employmentType: 'full_time',
  contractTypeSnapshot: 'indefinido',
  payRegimeSnapshot: 'chile',
  payrollViaSnapshot: 'internal',
  deelContractIdSnapshot: null,
  countryCode: 'CL',
  contractEndDateSnapshot: null,
  separationType: 'resignation',
  source: 'manual_hr',
  status: 'approved',
  ruleLane: 'internal_payroll',
  requiresPayrollClosure: true,
  requiresLeaveReconciliation: true,
  requiresHrDocuments: true,
  requiresAccessRevocation: true,
  requiresAssetRecovery: false,
  requiresAssignmentHandoff: true,
  requiresApprovalReassignment: true,
  greenhouseExecutionMode: 'full',
  effectiveDate: '2026-05-15',
  lastWorkingDay: '2026-05-15',
  lastWorkingDayAfterEffectiveReason: null,
  submittedAt: null,
  approvedAt: '2026-05-01T00:00:00.000Z',
  scheduledAt: null,
  executedAt: null,
  cancelledAt: null,
  blockedReason: null,
  reasonCode: null,
  notes: null,
  legacyChecklistRef: {},
  sourceRef: {},
  metadata: {},
  createdByUserId: 'user-1',
  updatedByUserId: 'user-1',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z'
}

const compensation = {
  versionId: 'cv-1',
  memberId: 'member-1',
  payRegime: 'chile' as const,
  currency: 'CLP' as const,
  baseSalary: 1_500_000,
  remoteAllowance: 30_000,
  colacionAmount: 80_000,
  movilizacionAmount: 70_000,
  fixedBonusLabel: null,
  fixedBonusAmount: 100_000,
  gratificacionLegalMode: 'ninguna' as const,
  afpName: 'modelo',
  afpRate: 0.11,
  afpCotizacionRate: 0.1,
  afpComisionRate: 0.01,
  healthSystem: 'fonasa' as const,
  healthPlanUf: null,
  unemploymentRate: 0.006,
  contractType: 'indefinido' as const,
  hasApv: false,
  apvAmount: 0,
  effectiveFrom: '2026-01-01',
  effectiveTo: null
}

describe('final settlement calculator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks unsupported offboarding lanes before approval', async () => {
    const readinessCase = {
      ...baseCase,
      payrollViaSnapshot: 'deel' as const,
      ruleLane: 'external_payroll' as const
    }

    await expect(
      calculateFinalSettlement({
        offboardingCase: readinessCase,
        compensation,
        leaveBalance: {
          balanceId: 'lb-1',
          year: 2026,
          allowanceDays: 15,
          progressiveExtraDays: 0,
          carriedOverDays: 0,
          adjustmentDays: 0,
          usedDays: 10,
          reservedDays: 0,
          availableDays: 5
        },
        payrollOverlap: { covered: false, periodId: '2026-05', status: null, entryId: null, ufValue: null, taxTableVersion: null },
        hireDate: '2024-01-01'
      })
    ).resolves.toMatchObject({
      readiness: {
        status: 'blocked',
        hasBlockers: true
      }
    })
  })

  it('calculates V1 resignation components from case, compensation and leave balance', async () => {
    const result = await calculateFinalSettlement({
      offboardingCase: baseCase,
      compensation,
      leaveBalance: {
        balanceId: 'lb-1',
        year: 2026,
        allowanceDays: 15,
        progressiveExtraDays: 0,
        carriedOverDays: 0,
        adjustmentDays: 0,
        usedDays: 10,
        reservedDays: 0,
        availableDays: 5
      },
      payrollOverlap: { covered: false, periodId: '2026-05', status: null, entryId: null, ufValue: null, taxTableVersion: null },
      hireDate: '2024-01-01',
      previredEvidence: { period: '2026-04', status: 'paid' }
    })

    expect(result.readiness.status).toBe('ready')
    // TASK-862 Slice A — breakdown ahora emite proportional_vacation_current_period (split)
    // y siempre la linea informativa payroll_overlap_adjustment. Carryover=0 => no se emite carryover line.
    // gratificacionLegalMode='ninguna' => no se emite monthly_gratification_due.
    // availableDays>=0 => no se emite used_or_advanced_vacation_adjustment.
    expect(result.breakdown.map(line => line.componentCode)).toEqual([
      'pending_salary',
      'pending_fixed_allowances',
      'proportional_vacation_current_period',
      'statutory_deductions',
      'payroll_overlap_adjustment'
    ])
    expect(result.sourceSnapshot).toMatchObject({
      offboardingCaseId: 'offboarding-case-1',
      effectiveDate: '2026-05-15',
      lastWorkingDay: '2026-05-15',
      contractType: 'indefinido'
    })
    expect(result.totals.grossTotal).toBeGreaterThan(result.totals.deductionTotal)
    expect(result.breakdown.every(line => line.policyCode)).toBe(true)
    // Linea informativa NO afecta totales (kind='informational')
    const informationalLine = result.breakdown.find(line => line.componentCode === 'payroll_overlap_adjustment')

    expect(informationalLine?.kind).toBe('informational')
    expect(informationalLine?.amount).toBe(0)
  })

  it('emite monthly_gratification_due cuando gratificacionLegalMode=anual_proporcional', async () => {
    const result = await calculateFinalSettlement({
      offboardingCase: baseCase,
      compensation: { ...compensation, gratificacionLegalMode: 'anual_proporcional' as const },
      leaveBalance: {
        balanceId: 'lb-1',
        year: 2026,
        allowanceDays: 15,
        progressiveExtraDays: 0,
        carriedOverDays: 0,
        adjustmentDays: 0,
        usedDays: 10,
        reservedDays: 0,
        availableDays: 5
      },
      payrollOverlap: { covered: false, periodId: '2026-05', status: null, entryId: null, ufValue: null, taxTableVersion: null },
      hireDate: '2024-01-01',
      previredEvidence: { period: '2026-04', status: 'paid' }
    })

    const gratificationLine = result.breakdown.find(line => line.componentCode === 'monthly_gratification_due')

    expect(gratificationLine).toBeDefined()
    expect(gratificationLine?.kind).toBe('earning')
    expect(gratificationLine?.amount).toBeGreaterThan(0)
    // Tope art. 50 CT: (4.75 × IMM 510636 / 12) × 12 meses = ~ 2.425.521; basePeriodo: 1.500.000 × 12 × 0.25 = 4.500.000
    // → min(basePeriodo, tope) = tope ~ 2.425.521
    expect(gratificationLine?.amount).toBeLessThan(compensation.baseSalary * 12 * 0.25)
    expect(gratificationLine?.basis).toMatchObject({
      gratificacionLegalMode: 'anual_proporcional',
      formulaSource: 'cl.art_50_CT.4_75_imm_per_12'
    })
  })

  it('emite pending_vacation_carryover + proportional_vacation_current_period cuando hay carryover', async () => {
    const result = await calculateFinalSettlement({
      offboardingCase: baseCase,
      compensation,
      leaveBalance: {
        balanceId: 'lb-1',
        year: 2026,
        allowanceDays: 15,
        progressiveExtraDays: 0,
        carriedOverDays: 5, // saldo de anios anteriores
        adjustmentDays: 0,
        usedDays: 8,
        reservedDays: 0,
        availableDays: 12 // 15 + 5 - 8 = 12
      },
      payrollOverlap: { covered: false, periodId: '2026-05', status: null, entryId: null, ufValue: null, taxTableVersion: null },
      hireDate: '2024-01-01',
      previredEvidence: { period: '2026-04', status: 'paid' }
    })

    const carryoverLine = result.breakdown.find(line => line.componentCode === 'pending_vacation_carryover')
    const currentLine = result.breakdown.find(line => line.componentCode === 'proportional_vacation_current_period')

    expect(carryoverLine).toBeDefined()
    expect(carryoverLine?.amount).toBeGreaterThan(0)
    expect(carryoverLine?.basis).toMatchObject({ businessVacationDays: 5 })
    expect(carryoverLine?.taxability).toBe('not_taxable')

    expect(currentLine).toBeDefined()
    expect(currentLine?.amount).toBeGreaterThan(0)
    expect(currentLine?.basis).toMatchObject({ businessVacationDays: 7 }) // 12 - 5

    // Suma = monto total (split proporcional)
    const totalVacationAmount = (carryoverLine?.amount ?? 0) + (currentLine?.amount ?? 0)

    expect(totalVacationAmount).toBeGreaterThan(0)
  })

  it('emite used_or_advanced_vacation_adjustment cuando availableDays es negativo', async () => {
    const result = await calculateFinalSettlement({
      offboardingCase: baseCase,
      compensation,
      leaveBalance: {
        balanceId: 'lb-1',
        year: 2026,
        allowanceDays: 15,
        progressiveExtraDays: 0,
        carriedOverDays: 0,
        adjustmentDays: 0,
        usedDays: 18, // 3 dias por adelantado
        reservedDays: 0,
        availableDays: -3
      },
      payrollOverlap: { covered: false, periodId: '2026-05', status: null, entryId: null, ufValue: null, taxTableVersion: null },
      hireDate: '2024-01-01',
      previredEvidence: { period: '2026-04', status: 'paid' }
    })

    const advancedLine = result.breakdown.find(line => line.componentCode === 'used_or_advanced_vacation_adjustment')

    expect(advancedLine).toBeDefined()
    expect(advancedLine?.kind).toBe('deduction')
    expect(advancedLine?.amount).toBeGreaterThan(0)
    expect(advancedLine?.basis).toMatchObject({
      advancedBusinessDays: 3,
      leaveBalanceNet: -3
    })

    // No deberia haber feriado a indemnizar cuando availableDays<0
    const carryoverLine = result.breakdown.find(line => line.componentCode === 'pending_vacation_carryover')
    const currentLine = result.breakdown.find(line => line.componentCode === 'proportional_vacation_current_period')

    expect(carryoverLine).toBeUndefined()
    expect(currentLine).toBeUndefined()
  })

  it('payroll_overlap_adjustment es informational con amount=0 incluso cuando overlap.covered=true', async () => {
    const result = await calculateFinalSettlement({
      offboardingCase: baseCase,
      compensation,
      leaveBalance: {
        balanceId: 'lb-1',
        year: 2026,
        allowanceDays: 15,
        progressiveExtraDays: 0,
        carriedOverDays: 0,
        adjustmentDays: 0,
        usedDays: 10,
        reservedDays: 0,
        availableDays: 5
      },
      payrollOverlap: {
        covered: true,
        periodId: '2026-05',
        status: 'exported',
        entryId: 'entry-1',
        ufValue: 39000,
        taxTableVersion: '2026-05'
      },
      hireDate: '2024-01-01',
      previredEvidence: { period: '2026-04', status: 'paid' }
    })

    const overlapLine = result.breakdown.find(line => line.componentCode === 'payroll_overlap_adjustment')

    expect(overlapLine).toBeDefined()
    expect(overlapLine?.kind).toBe('informational')
    expect(overlapLine?.amount).toBe(0)
    expect(overlapLine?.basis).toMatchObject({ coveredByMonthlyPayroll: true, periodId: '2026-05' })
  })

  it('does not deduct monthly statutory amounts from proportional vacation already covered by exported payroll', async () => {
    const result = await calculateFinalSettlement({
      offboardingCase: {
        ...baseCase,
        status: 'executed',
        effectiveDate: '2026-04-30',
        lastWorkingDay: '2026-04-30'
      },
      compensation: {
        ...compensation,
        baseSalary: 539_658,
        remoteAllowance: 0,
        colacionAmount: 0,
        movilizacionAmount: 0,
        fixedBonusAmount: 0,
        healthSystem: 'isapre',
        healthPlanUf: 4.05
      },
      leaveBalance: {
        balanceId: 'valentina-hoyos-2026-vacation',
        year: 2026,
        allowanceDays: 15,
        progressiveExtraDays: 0,
        carriedOverDays: 0,
        adjustmentDays: 0,
        usedDays: 10.22,
        reservedDays: 0,
        availableDays: 4.78
      },
      payrollOverlap: {
        covered: true,
        periodId: '2026-04',
        status: 'exported',
        entryId: '2026-04_valentina-hoyos',
        ufValue: 40120.2,
        taxTableVersion: 'gael-2026-04',
        ledger: {
          schemaVersion: 1,
          periodId: '2026-04',
          periodStatus: 'exported',
          periodExportedAt: '2026-05-01T17:32:23.355Z',
          entryId: '2026-04_valentina-hoyos',
          entryIsActive: true,
          coveredByMonthlyPayroll: true,
          ufValue: 40120.2,
          taxTableVersion: 'gael-2026-04',
          coveredAmounts: {
            grossTotal: 832121,
            taxableBase: 620000,
            afp: 68200,
            health: 162475,
            unemployment: 3720,
            tax: 0,
            apv: 0,
            statutoryDeductions: 234395,
            netTotal: 596257
          }
        }
      },
      hireDate: '2024-01-01',
      previredEvidence: { period: '2026-04', status: 'paid' }
    })

    // TASK-862 Slice A — antes 'proportional_vacation'; ahora dividido en
    // pending_vacation_carryover + proportional_vacation_current_period. Sin
    // carryover en este caso, sigue siendo una sola linea (current_period).
    const vacationLine = result.breakdown.find(line => line.componentCode === 'proportional_vacation_current_period')

    expect(vacationLine).toMatchObject({
      taxTreatment: 'non_income',
      previsionalTreatment: 'not_contribution_base',
      taxability: 'not_taxable'
    })
    expect(result.breakdown.some(line => line.componentCode === 'statutory_deductions')).toBe(false)
    expect(result.totals.deductionTotal).toBe(0)
    expect(result.totals.netPayable).toBeGreaterThan(0)
  })

  it('allows calculating an already executed case for recovery when canonical dates are present', async () => {
    const result = await calculateFinalSettlement({
      offboardingCase: {
        ...baseCase,
        status: 'executed',
        executedAt: '2026-05-16T00:00:00.000Z'
      },
      compensation,
      leaveBalance: {
        balanceId: 'lb-1',
        year: 2026,
        allowanceDays: 15,
        progressiveExtraDays: 0,
        carriedOverDays: 0,
        adjustmentDays: 0,
        usedDays: 10,
        reservedDays: 0,
        availableDays: 5
      },
      payrollOverlap: { covered: false, periodId: '2026-05', status: null, entryId: null, ufValue: null, taxTableVersion: null },
      hireDate: '2024-01-01',
      previredEvidence: { period: '2026-04', status: 'paid' }
    })

    expect(result.readiness.status).toBe('ready')
    expect(result.sourceSnapshot?.offboardingCaseId).toBe('offboarding-case-1')
  })
})
