import 'server-only'

import type { PayrollEntry, UpdatePayrollEntryInput } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { calculatePayrollTotals } from '@/lib/payroll/calculate-chile-deductions'
import { getCompensationVersionById } from '@/lib/payroll/get-compensation'
import { getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { upsertPayrollEntry } from '@/lib/payroll/persist-entry'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import { PayrollValidationError, getPeriodRangeFromId, runPayrollQuery, toNumber } from '@/lib/payroll/shared'

type BonusConfigRow = {
  otd_threshold: number | string | null
  rpa_threshold: number | string | null
}

const projectId = getBigQueryProjectId()

const assertOptionalNumericInput = ({
  value,
  fieldName,
  min,
  max,
  integer = false,
  allowNull = false
}: {
  value: number | null | undefined
  fieldName: string
  min?: number
  max?: number
  integer?: boolean
  allowNull?: boolean
}) => {
  if (value === undefined) {
    return
  }

  if (value === null) {
    if (allowNull) {
      return
    }

    throw new PayrollValidationError(`${fieldName} cannot be null.`, 400)
  }

  if (!Number.isFinite(value)) {
    throw new PayrollValidationError(`${fieldName} must be a valid number.`, 400)
  }

  if (integer && !Number.isInteger(value)) {
    throw new PayrollValidationError(`${fieldName} must be an integer.`, 400)
  }

  if (min !== undefined && value < min) {
    throw new PayrollValidationError(`${fieldName} must be greater than or equal to ${min}.`, 400)
  }

  if (max !== undefined && value > max) {
    throw new PayrollValidationError(`${fieldName} must be less than or equal to ${max}.`, 400)
  }
}

const getBonusConfigForPeriod = async (periodId: string) => {
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  const { periodEnd } = getPeriodRangeFromId(periodId)

  const [row] = await runPayrollQuery<BonusConfigRow>(
    `
      SELECT otd_threshold, rpa_threshold
      FROM \`${projectId}.greenhouse.payroll_bonus_config\`
      WHERE effective_from <= DATE(@periodEnd)
      ORDER BY effective_from DESC
      LIMIT 1
    `,
    { periodEnd }
  )

  return {
    period,
    otdThreshold: row ? toNumber(row.otd_threshold) : 89,
    rpaThreshold: row ? toNumber(row.rpa_threshold) : 2
  }
}

const validateBonusAmount = ({
  qualifies,
  amount,
  min,
  max,
  label
}: {
  qualifies: boolean
  amount: number
  min: number
  max: number
  label: string
}) => {
  if (!qualifies && amount > 0) {
    throw new PayrollValidationError(`${label} cannot be assigned when KPI threshold is not met.`, 400)
  }

  if (qualifies && (amount < min || amount > max)) {
    throw new PayrollValidationError(`${label} must stay within the configured compensation range.`, 400, {
      min,
      max
    })
  }
}

export const recalculatePayrollEntry = async ({
  entryId,
  input
}: {
  entryId: string
  input: UpdatePayrollEntryInput
}): Promise<PayrollEntry> => {
  await ensurePayrollInfrastructure()

  assertOptionalNumericInput({ value: input.bonusOtdAmount, fieldName: 'bonusOtdAmount', min: 0 })
  assertOptionalNumericInput({ value: input.bonusRpaAmount, fieldName: 'bonusRpaAmount', min: 0 })
  assertOptionalNumericInput({ value: input.bonusOtherAmount, fieldName: 'bonusOtherAmount', min: 0 })
  assertOptionalNumericInput({ value: input.chileTaxAmount, fieldName: 'chileTaxAmount', min: 0, allowNull: true })
  assertOptionalNumericInput({ value: input.netTotal, fieldName: 'netTotal', min: 0 })
  assertOptionalNumericInput({ value: input.kpiOtdPercent, fieldName: 'kpiOtdPercent', min: 0, max: 100, allowNull: true })
  assertOptionalNumericInput({ value: input.kpiRpaAvg, fieldName: 'kpiRpaAvg', min: 0, allowNull: true })
  assertOptionalNumericInput({
    value: input.kpiTasksCompleted,
    fieldName: 'kpiTasksCompleted',
    min: 0,
    integer: true,
    allowNull: true
  })

  const entry = await getPayrollEntryById(entryId)

  if (!entry) {
    throw new PayrollValidationError('Payroll entry not found.', 404)
  }

  const compensation = await getCompensationVersionById(entry.compensationVersionId)

  if (!compensation) {
    throw new PayrollValidationError('Compensation version not found for payroll entry.', 500)
  }

  const { period, otdThreshold, rpaThreshold } = await getBonusConfigForPeriod(entry.periodId)

  if (period.status === 'approved' || period.status === 'exported') {
    throw new PayrollValidationError('Approved payroll entries cannot be edited.', 409)
  }

  const forceManualKpi = input.kpiDataSource === 'manual' || entry.kpiDataSource === 'manual'

  const isEditingManualKpi =
    input.kpiOtdPercent !== undefined || input.kpiRpaAvg !== undefined || input.kpiTasksCompleted !== undefined

  if (isEditingManualKpi && !forceManualKpi) {
    throw new PayrollValidationError('Manual KPI updates are only allowed for entries using manual KPI source.', 400)
  }

  const nextKpiDataSource = forceManualKpi ? 'manual' : entry.kpiDataSource
  const nextKpiOtdPercent = input.kpiOtdPercent !== undefined ? input.kpiOtdPercent : entry.kpiOtdPercent
  const nextKpiRpaAvg = input.kpiRpaAvg !== undefined ? input.kpiRpaAvg : entry.kpiRpaAvg
  const nextKpiTasksCompleted = input.kpiTasksCompleted !== undefined ? input.kpiTasksCompleted : entry.kpiTasksCompleted
  const nextKpiOtdQualifies = typeof nextKpiOtdPercent === 'number' && nextKpiOtdPercent >= otdThreshold
  const nextKpiRpaQualifies = typeof nextKpiRpaAvg === 'number' && nextKpiRpaAvg < rpaThreshold
  const nextBonusOtdAmount = input.bonusOtdAmount ?? entry.bonusOtdAmount
  const nextBonusRpaAmount = input.bonusRpaAmount ?? entry.bonusRpaAmount
  const nextBonusOtherAmount = input.bonusOtherAmount ?? entry.bonusOtherAmount
  const nextTaxAmount = input.chileTaxAmount ?? entry.chileTaxAmount ?? 0

  validateBonusAmount({
    qualifies: nextKpiOtdQualifies,
    amount: nextBonusOtdAmount,
    min: compensation.bonusOtdMin,
    max: compensation.bonusOtdMax,
    label: 'OTD bonus'
  })
  validateBonusAmount({
    qualifies: nextKpiRpaQualifies,
    amount: nextBonusRpaAmount,
    min: compensation.bonusRpaMin,
    max: compensation.bonusRpaMax,
    label: 'RpA bonus'
  })

  const totals = calculatePayrollTotals({
    payRegime: compensation.payRegime,
    baseSalary: compensation.baseSalary,
    remoteAllowance: compensation.remoteAllowance,
    bonusOtdAmount: nextBonusOtdAmount,
    bonusRpaAmount: nextBonusRpaAmount,
    bonusOtherAmount: nextBonusOtherAmount,
    afpName: compensation.afpName,
    afpRate: compensation.afpRate,
    healthSystem: compensation.healthSystem,
    healthPlanUf: compensation.healthPlanUf,
    unemploymentRate: compensation.unemploymentRate,
    contractType: compensation.contractType,
    hasApv: compensation.hasApv,
    apvAmount: compensation.apvAmount,
    ufValue: period.ufValue,
    taxAmount: nextTaxAmount
  })

  const nextManualOverride = input.manualOverride ?? entry.manualOverride
  const nextNetTotalOverride = nextManualOverride ? input.netTotal ?? entry.netTotalOverride ?? entry.netTotal : null
  const nextNetTotal = nextManualOverride ? Number(nextNetTotalOverride) : totals.netTotalCalculated

  const updatedEntry: PayrollEntry = {
    ...entry,
    kpiOtdPercent: nextKpiOtdPercent,
    kpiRpaAvg: nextKpiRpaAvg,
    kpiTasksCompleted: nextKpiTasksCompleted,
    kpiDataSource: nextKpiDataSource,
    kpiOtdQualifies: nextKpiOtdQualifies,
    kpiRpaQualifies: nextKpiRpaQualifies,
    bonusOtdAmount: nextBonusOtdAmount,
    bonusRpaAmount: nextBonusRpaAmount,
    bonusOtherAmount: nextBonusOtherAmount,
    bonusOtherDescription: input.bonusOtherDescription !== undefined ? input.bonusOtherDescription : entry.bonusOtherDescription,
    grossTotal: totals.grossTotal,
    chileAfpName: totals.chileAfpName,
    chileAfpRate: totals.chileAfpRate,
    chileAfpAmount: totals.chileAfpAmount,
    chileHealthSystem: totals.chileHealthSystem,
    chileHealthAmount: totals.chileHealthAmount,
    chileUnemploymentRate: totals.chileUnemploymentRate,
    chileUnemploymentAmount: totals.chileUnemploymentAmount,
    chileTaxableBase: totals.chileTaxableBase,
    chileTaxAmount: totals.chileTaxAmount,
    chileApvAmount: totals.chileApvAmount,
    chileUfValue: totals.chileUfValue,
    chileTotalDeductions: totals.chileTotalDeductions,
    netTotalCalculated: totals.netTotalCalculated,
    netTotalOverride: nextManualOverride ? Number(nextNetTotalOverride) : null,
    netTotal: nextNetTotal,
    manualOverride: nextManualOverride,
    manualOverrideNote: input.manualOverrideNote !== undefined ? input.manualOverrideNote : entry.manualOverrideNote
  }

  await upsertPayrollEntry(updatedEntry)

  const persisted = await getPayrollEntryById(entryId)

  if (!persisted) {
    throw new PayrollValidationError('Unable to reload updated payroll entry.', 500)
  }

  return persisted
}
