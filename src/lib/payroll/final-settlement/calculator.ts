import 'server-only'

import type { OffboardingCase } from '@/lib/workforce/offboarding'
import { loadHolidayDateSetForRange } from '@/lib/hr-core/leave-domain'
import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import { calculatePayrollTotals } from '@/lib/payroll/calculate-chile-deductions'
import { computeChileTax } from '@/lib/payroll/compute-chile-tax'
import { resolvePayrollTaxTableVersion } from '@/lib/payroll/tax-table-version'
import { PayrollValidationError } from '@/lib/payroll/shared'

import type {
  FinalSettlementBreakdownLine,
  FinalSettlementExplanation,
  FinalSettlementReadiness,
  FinalSettlementReadinessCheck,
  FinalSettlementSourceSnapshot,
  FinalSettlementTotals
} from './types'

export interface FinalSettlementCompensationSnapshot {
  versionId: string
  memberId: string
  payRegime: 'chile'
  currency: 'CLP'
  baseSalary: number
  remoteAllowance: number
  colacionAmount: number
  movilizacionAmount: number
  fixedBonusLabel: string | null
  fixedBonusAmount: number
  gratificacionLegalMode: 'mensual_25pct' | 'anual_proporcional' | 'ninguna'
  afpName: string | null
  afpRate: number | null
  afpCotizacionRate: number | null
  afpComisionRate: number | null
  healthSystem: 'fonasa' | 'isapre' | null
  healthPlanUf: number | null
  unemploymentRate: number | null
  contractType: 'indefinido' | 'plazo_fijo'
  hasApv: boolean
  apvAmount: number
  effectiveFrom: string
  effectiveTo: string | null
}

export interface FinalSettlementLeaveSnapshot {
  balanceId: string
  year: number
  allowanceDays: number
  progressiveExtraDays: number
  carriedOverDays: number
  adjustmentDays: number
  usedDays: number
  reservedDays: number
  availableDays: number
}

export interface FinalSettlementPayrollOverlapSnapshot {
  covered: boolean
  periodId: string
  status: string | null
  entryId: string | null
  ufValue: number | null
  taxTableVersion: string | null
}

export interface FinalSettlementCalculationContext {
  offboardingCase: OffboardingCase
  compensation: FinalSettlementCompensationSnapshot | null
  leaveBalance: FinalSettlementLeaveSnapshot | null
  payrollOverlap: FinalSettlementPayrollOverlapSnapshot
  hireDate: string | null
  previredEvidence?: Record<string, unknown> | null
  manualDeductions?: Array<{
    componentCode: string
    label: string
    amount: number
    sourceRef: Record<string, unknown>
  }>
}

const roundCurrency = (value: number) => Math.round(value)
const roundTwo = (value: number) => Math.round(value * 100) / 100

const parseDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime())) {
    throw new PayrollValidationError('Invalid final settlement date.', 400, { value })
  }

  return date
}

const addUtcDays = (value: string, days: number) => {
  const date = parseDate(value)

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

const getDaysInMonth = (date: string) => {
  const parsed = parseDate(date)

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0)).getUTCDate()
}

const getDayOfMonth = (date: string) => parseDate(date).getUTCDate()

const isWeekend = (dateKey: string) => {
  const day = parseDate(dateKey).getUTCDay()

  return day === 0 || day === 6
}

const countCompensableCalendarDays = async ({
  businessVacationDays,
  lastWorkingDay,
  countryCode
}: {
  businessVacationDays: number
  lastWorkingDay: string
  countryCode: string | null
}) => {
  if (businessVacationDays <= 0) {
    return {
      calendarDays: 0,
      holidaySource: 'none',
      holidayDates: [] as string[]
    }
  }

  const wholeBusinessDays = Math.floor(businessVacationDays)
  const fractionalBusinessDays = roundTwo(businessVacationDays - wholeBusinessDays)
  const startDate = addUtcDays(lastWorkingDay, 1)
  const maxEndDate = addUtcDays(startDate, 730)

  const { holidayDates, source } = await loadHolidayDateSetForRange({
    startDate,
    endDate: maxEndDate,
    countryCode
  })

  if (wholeBusinessDays === 0) {
    return {
      calendarDays: fractionalBusinessDays,
      holidaySource: source,
      holidayDates: [...holidayDates]
    }
  }

  let cursor = startDate
  let businessCount = 0
  let calendarCount = 0

  while (cursor <= maxEndDate && businessCount < wholeBusinessDays) {
    calendarCount += 1

    if (!isWeekend(cursor) && !holidayDates.has(cursor)) {
      businessCount += 1
    }

    cursor = addUtcDays(cursor, 1)
  }

  if (businessCount < wholeBusinessDays) {
    throw new PayrollValidationError('Unable to resolve proportional vacation calendar days.', 409, {
      businessVacationDays,
      lastWorkingDay
    })
  }

  return {
    calendarDays: roundTwo(calendarCount + fractionalBusinessDays),
    holidaySource: source,
    holidayDates: [...holidayDates]
  }
}

const buildCheck = (
  check: Omit<FinalSettlementReadinessCheck, 'severity'> & { severity?: FinalSettlementReadinessCheck['severity'] }
): FinalSettlementReadinessCheck => ({
  severity: check.status === 'blocked' ? 'blocker' : check.status === 'warning' ? 'warning' : 'info',
  ...check
})

export const buildFinalSettlementReadiness = (context: FinalSettlementCalculationContext): FinalSettlementReadiness => {
  const { offboardingCase, compensation, leaveBalance, payrollOverlap, previredEvidence } = context
  const checks: FinalSettlementReadinessCheck[] = []

  checks.push(buildCheck({
    code: 'offboarding_case_approved',
    status:
      (offboardingCase.status === 'approved' || offboardingCase.status === 'scheduled' || offboardingCase.status === 'executed') &&
      Boolean(offboardingCase.effectiveDate) &&
      Boolean(offboardingCase.lastWorkingDay) &&
      offboardingCase.separationType === 'resignation'
        ? 'passed'
        : 'blocked',
    message: 'El caso debe estar aprobado, agendado o ejecutado para recuperacion, con fecha efectiva, ultimo dia trabajado y causal resignation.',
    evidence: {
      status: offboardingCase.status,
      effectiveDate: offboardingCase.effectiveDate,
      lastWorkingDay: offboardingCase.lastWorkingDay,
      separationType: offboardingCase.separationType
    }
  }))

  checks.push(buildCheck({
    code: 'worker_regime_supported',
    status:
      offboardingCase.ruleLane === 'internal_payroll' &&
      (offboardingCase.contractTypeSnapshot === 'indefinido' || offboardingCase.contractTypeSnapshot === 'plazo_fijo') &&
      offboardingCase.payRegimeSnapshot === 'chile' &&
      offboardingCase.payrollViaSnapshot === 'internal'
        ? 'passed'
        : 'blocked',
    message: 'V1 solo soporta trabajador dependiente Chile con payroll interno.',
    evidence: {
      ruleLane: offboardingCase.ruleLane,
      contractType: offboardingCase.contractTypeSnapshot,
      payRegime: offboardingCase.payRegimeSnapshot,
      payrollVia: offboardingCase.payrollViaSnapshot
    }
  }))

  checks.push(buildCheck({
    code: 'compensation_snapshot_resolved',
    status: compensation ? 'passed' : 'blocked',
    message: 'Debe existir compensacion versionada vigente al ultimo dia trabajado.',
    evidence: compensation ? { compensationVersionId: compensation.versionId, effectiveFrom: compensation.effectiveFrom } : {}
  }))

  checks.push(buildCheck({
    code: 'vacation_balance_resolved',
    status: leaveBalance ? 'passed' : 'blocked',
    message: 'Debe existir saldo de vacaciones auditable para calcular feriado proporcional o pendiente.',
    evidence: leaveBalance ? { balanceId: leaveBalance.balanceId, availableDays: leaveBalance.availableDays } : {}
  }))

  checks.push(buildCheck({
    code: 'payroll_period_overlap_checked',
    status: 'passed',
    message: 'Se reviso si el periodo mensual del ultimo dia trabajado ya cubre remuneracion.',
    evidence: { ...payrollOverlap }
  }))

  checks.push(buildCheck({
    code: 'previred_contributions_checked',
    status: previredEvidence && Object.keys(previredEvidence).length > 0 ? 'passed' : 'warning',
    message: 'Debe conservarse evidencia operacional de cotizaciones previsionales previas al termino.',
    evidence: previredEvidence ?? {}
  }))

  checks.push(buildCheck({
    code: 'tax_and_previsional_treatment_resolved',
    status: compensation ? 'passed' : 'blocked',
    message: 'Cada componente V1 declara tratamiento tributario/previsional; componentes manuales requieren source_ref.',
    evidence: { engine: 'cl-resignation-dependent-v1' }
  }))

  checks.push(buildCheck({
    code: 'legal_review_required',
    status: context.manualDeductions && context.manualDeductions.length > 0 ? 'warning' : 'passed',
    message: 'Ajustes manuales o descuentos acordados deben pasar por revision legal/HR antes de emitir documento.',
    evidence: { manualDeductionCount: context.manualDeductions?.length ?? 0 }
  }))

  const hasBlockers = checks.some(check => check.status === 'blocked')
  const hasWarnings = checks.some(check => check.status === 'warning')

  return {
    status: hasBlockers ? 'blocked' : hasWarnings ? 'needs_review' : 'ready',
    hasBlockers,
    checks
  }
}

export const calculateFinalSettlement = async (context: FinalSettlementCalculationContext) => {
  const { offboardingCase, compensation, leaveBalance, payrollOverlap, hireDate } = context
  const readiness = buildFinalSettlementReadiness(context)

  if (!offboardingCase.effectiveDate || !offboardingCase.lastWorkingDay) {
    throw new PayrollValidationError('Approved offboarding case dates are required.', 409)
  }

  if (!compensation || !leaveBalance) {
    return {
      readiness,
      sourceSnapshot: null,
      breakdown: [] as FinalSettlementBreakdownLine[],
      explanation: buildExplanation([], readiness),
      totals: { grossTotal: 0, deductionTotal: 0, netPayable: 0 } satisfies FinalSettlementTotals
    }
  }

  const daysInMonth = getDaysInMonth(offboardingCase.lastWorkingDay)
  const payableDays = payrollOverlap.covered ? 0 : getDayOfMonth(offboardingCase.lastWorkingDay)
  const prorationFactor = payrollOverlap.covered ? 0 : roundTwo(payableDays / daysInMonth)
  const countryCode = offboardingCase.countryCode ?? 'CL'

  const pendingBaseSalary = roundCurrency(compensation.baseSalary * prorationFactor)
  const pendingRemoteAllowance = roundCurrency(compensation.remoteAllowance * prorationFactor)
  const pendingColacion = roundCurrency(compensation.colacionAmount * prorationFactor)
  const pendingMovilizacion = roundCurrency(compensation.movilizacionAmount * prorationFactor)
  const pendingFixedBonus = roundCurrency(compensation.fixedBonusAmount * prorationFactor)

  const periodYear = Number(offboardingCase.lastWorkingDay.slice(0, 4))
  const periodMonth = Number(offboardingCase.lastWorkingDay.slice(5, 7))
  const periodDate = offboardingCase.lastWorkingDay

  const ufSnapshot = payrollOverlap.ufValue
    ? { value: payrollOverlap.ufValue }
    : await getHistoricalEconomicIndicatorForPeriod({ indicatorCode: 'UF', periodDate })

  const utmSnapshot = await getHistoricalEconomicIndicatorForPeriod({ indicatorCode: 'UTM', periodDate })

  const taxTableVersion =
    payrollOverlap.taxTableVersion ?? await resolvePayrollTaxTableVersion({ year: periodYear, month: periodMonth })

  const preTaxTotals = await calculatePayrollTotals({
    payRegime: 'chile',
    baseSalary: pendingBaseSalary,
    remoteAllowance: pendingRemoteAllowance,
    colacionAmount: pendingColacion,
    movilizacionAmount: pendingMovilizacion,
    fixedBonusAmount: pendingFixedBonus,
    bonusOtdAmount: 0,
    bonusRpaAmount: 0,
    bonusOtherAmount: 0,
    gratificacionLegalMode: compensation.gratificacionLegalMode,
    afpName: compensation.afpName,
    afpRate: compensation.afpRate,
    afpCotizacionRate: compensation.afpCotizacionRate,
    afpComisionRate: compensation.afpComisionRate,
    healthSystem: compensation.healthSystem,
    healthPlanUf: compensation.healthPlanUf,
    unemploymentRate: compensation.unemploymentRate,
    contractType: compensation.contractType,
    hasApv: compensation.hasApv,
    apvAmount: roundCurrency(compensation.apvAmount * prorationFactor),
    ufValue: ufSnapshot?.value ?? null,
    taxAmount: 0,
    periodDate
  })

  const tax = await computeChileTax({
    taxableBaseClp: preTaxTotals.chileTaxableBase ?? 0,
    taxTableVersion,
    utmValue: utmSnapshot?.value ?? null
  })

  const payrollTotals = await calculatePayrollTotals({
    payRegime: 'chile',
    baseSalary: pendingBaseSalary,
    remoteAllowance: pendingRemoteAllowance,
    colacionAmount: pendingColacion,
    movilizacionAmount: pendingMovilizacion,
    fixedBonusAmount: pendingFixedBonus,
    bonusOtdAmount: 0,
    bonusRpaAmount: 0,
    bonusOtherAmount: 0,
    gratificacionLegalMode: compensation.gratificacionLegalMode,
    afpName: compensation.afpName,
    afpRate: compensation.afpRate,
    afpCotizacionRate: compensation.afpCotizacionRate,
    afpComisionRate: compensation.afpComisionRate,
    healthSystem: compensation.healthSystem,
    healthPlanUf: compensation.healthPlanUf,
    unemploymentRate: compensation.unemploymentRate,
    contractType: compensation.contractType,
    hasApv: compensation.hasApv,
    apvAmount: roundCurrency(compensation.apvAmount * prorationFactor),
    ufValue: ufSnapshot?.value ?? null,
    taxAmount: tax.taxAmountClp,
    periodDate
  })

  const vacationDays = Math.max(0, leaveBalance.availableDays)

  const vacationCalendar = await countCompensableCalendarDays({
    businessVacationDays: vacationDays,
    lastWorkingDay: offboardingCase.lastWorkingDay,
    countryCode
  })

  const dailyVacationBase = roundTwo(compensation.baseSalary / 30)
  const vacationAmount = roundCurrency(vacationCalendar.calendarDays * dailyVacationBase)
  const manualDeductions = context.manualDeductions ?? []

  const breakdown: FinalSettlementBreakdownLine[] = [
    {
      componentCode: 'pending_salary',
      label: 'Remuneracion pendiente',
      kind: 'earning' as const,
      amount: pendingBaseSalary,
      basis: { payableDays, daysInMonth, prorationFactor, monthlyBaseSalary: compensation.baseSalary },
      formulaRef: 'cl.final_settlement.pending_salary.v1',
      sourceRef: { ...payrollOverlap },
      taxability: 'taxable_imponible' as const
    },
    {
      componentCode: 'pending_fixed_allowances',
      label: 'Haberes fijos proporcionales',
      kind: 'earning' as const,
      amount: pendingRemoteAllowance + pendingColacion + pendingMovilizacion + pendingFixedBonus,
      basis: {
        remoteAllowance: pendingRemoteAllowance,
        colacion: pendingColacion,
        movilizacion: pendingMovilizacion,
        fixedBonus: pendingFixedBonus,
        prorationFactor
      },
      formulaRef: 'cl.final_settlement.pending_fixed_allowances.v1',
      sourceRef: { compensationVersionId: compensation.versionId, payrollOverlap },
      taxability: 'taxable_non_imponible' as const
    },
    {
      componentCode: 'proportional_vacation',
      label: 'Feriado proporcional o pendiente',
      kind: 'earning' as const,
      amount: vacationAmount,
      basis: {
        businessVacationDays: vacationDays,
        compensatedCalendarDays: vacationCalendar.calendarDays,
        dailyVacationBase,
        holidaySource: vacationCalendar.holidaySource
      },
      formulaRef: 'cl.final_settlement.proportional_vacation.dt.v1',
      sourceRef: { leaveBalanceId: leaveBalance.balanceId, dtUrl: 'https://www.dt.gob.cl/portal/1628/w3-article-60200.html' },
      taxability: 'taxable_imponible' as const
    },
    {
      componentCode: 'statutory_deductions',
      label: 'Descuentos legales remuneraciones finales',
      kind: 'deduction' as const,
      amount: payrollTotals.chileTotalDeductions ?? 0,
      basis: {
        afp: payrollTotals.chileAfpAmount,
        health: payrollTotals.chileHealthAmount,
        unemployment: payrollTotals.chileUnemploymentAmount,
        tax: payrollTotals.chileTaxAmount,
        apv: payrollTotals.chileApvAmount,
        ufValue: ufSnapshot?.value ?? null,
        utmValue: utmSnapshot?.value ?? null,
        taxComputed: tax.computed
      },
      formulaRef: 'cl.payroll.dependent.statutory_deductions.v1',
      sourceRef: { compensationVersionId: compensation.versionId, taxTableVersion },
      taxability: 'deduction_statutory' as const
    },
    ...manualDeductions.map(deduction => ({
      componentCode: deduction.componentCode,
      label: deduction.label,
      kind: 'deduction' as const,
      amount: roundCurrency(deduction.amount),
      basis: { manual: true },
      formulaRef: 'cl.final_settlement.authorized_deduction.v1',
      sourceRef: deduction.sourceRef,
      taxability: 'deduction_authorized' as const
    }))
  ].filter(line => line.amount !== 0)

  const totals = buildTotals(breakdown)

  const sourceSnapshot: FinalSettlementSourceSnapshot = {
    schemaVersion: 1,
    offboardingCaseId: offboardingCase.offboardingCaseId,
    memberId: offboardingCase.memberId ?? compensation.memberId,
    profileId: offboardingCase.profileId,
    personLegalEntityRelationshipId: offboardingCase.personLegalEntityRelationshipId,
    legalEntityOrganizationId: offboardingCase.legalEntityOrganizationId,
    compensationVersionId: compensation.versionId,
    hireDate,
    lastAnnualVacationDate: null,
    effectiveDate: offboardingCase.effectiveDate,
    lastWorkingDay: offboardingCase.lastWorkingDay,
    contractEndDate: offboardingCase.contractEndDateSnapshot,
    separationType: 'resignation',
    contractType: compensation.contractType,
    payRegime: 'chile',
    payrollVia: 'internal'
  }

  return {
    readiness,
    sourceSnapshot,
    breakdown,
    explanation: buildExplanation(breakdown, readiness),
    totals
  }
}

const buildTotals = (breakdown: FinalSettlementBreakdownLine[]): FinalSettlementTotals => {
  const grossTotal = breakdown
    .filter(line => line.kind === 'earning')
    .reduce((sum, line) => sum + line.amount, 0)

  const deductionTotal = breakdown
    .filter(line => line.kind === 'deduction')
    .reduce((sum, line) => sum + line.amount, 0)

  return {
    grossTotal: roundCurrency(grossTotal),
    deductionTotal: roundCurrency(deductionTotal),
    netPayable: roundCurrency(grossTotal - deductionTotal)
  }
}

const buildExplanation = (
  breakdown: FinalSettlementBreakdownLine[],
  readiness: FinalSettlementReadiness
): FinalSettlementExplanation => ({
  schemaVersion: 1,
  engineVersion: 'cl-resignation-dependent-v1',
  generatedAt: new Date().toISOString(),
  summary: 'Finiquito V1 para renuncia de trabajador dependiente Chile, separado de la nomina mensual.',
  formulas: [...new Set(breakdown.map(line => line.formulaRef))].map(formulaRef => ({
    formulaRef,
    description: formulaRef,
    source: formulaRef.includes('proportional_vacation')
      ? 'Direccion del Trabajo: feriado proporcional'
      : 'Greenhouse Payroll Chile runtime'
  })),
  warnings: readiness.checks.filter(check => check.status === 'warning').map(check => check.message)
})
