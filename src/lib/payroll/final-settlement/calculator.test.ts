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
    value: indicatorCode === 'UF' ? 39000 : 68000
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

  it('blocks unsupported offboarding lanes before approval', () => {
    const readinessCase = {
      ...baseCase,
      payrollViaSnapshot: 'deel' as const,
      ruleLane: 'external_payroll' as const
    }

    expect(
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
    expect(result.breakdown.map(line => line.componentCode)).toEqual([
      'pending_salary',
      'pending_fixed_allowances',
      'proportional_vacation',
      'statutory_deductions'
    ])
    expect(result.sourceSnapshot).toMatchObject({
      offboardingCaseId: 'offboarding-case-1',
      effectiveDate: '2026-05-15',
      lastWorkingDay: '2026-05-15',
      contractType: 'indefinido'
    })
    expect(result.totals.grossTotal).toBeGreaterThan(result.totals.deductionTotal)
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
