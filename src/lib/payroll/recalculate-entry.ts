import 'server-only'

import type { BonusProrationConfig, PayrollEntry, UpdatePayrollEntryInput } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import { DEFAULT_BONUS_PRORATION_CONFIG, normalizeBonusProrationConfig } from '@/lib/payroll/bonus-config'
import { calculateOtdBonus, calculateRpaBonus } from '@/lib/payroll/bonus-proration'
import { calculatePayrollTotals } from '@/lib/payroll/calculate-chile-deductions'
import { computeChileTax } from '@/lib/payroll/compute-chile-tax'
import { getCompensationVersionById } from '@/lib/payroll/get-compensation'
import { getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { canEditPayrollEntries, shouldReopenApprovedPayrollPeriod } from '@/lib/payroll/period-lifecycle'
import { upsertPayrollEntry } from '@/lib/payroll/persist-entry'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import { PayrollValidationError, getPeriodRangeFromId, runPayrollQuery, toNumber } from '@/lib/payroll/shared'
import { isPayrollPostgresEnabled, pgGetActiveBonusConfig, pgSetPeriodCalculated } from '@/lib/payroll/postgres-store'

type BonusConfigRow = {
  otd_threshold: number | string | null
  rpa_threshold: number | string | null
  otd_floor: number | string | null
  rpa_full_payout_threshold: number | string | null
  rpa_soft_band_end: number | string | null
  rpa_soft_band_floor_factor: number | string | null
}

const getProjectId = () => getBigQueryProjectId()

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

  const projectId = getProjectId()
  const { periodEnd } = getPeriodRangeFromId(periodId)

  if (isPayrollPostgresEnabled()) {
    const config = await pgGetActiveBonusConfig(periodEnd)

    return {
      period,
      ...normalizeBonusProrationConfig(config)
    }
  }

  const [row] = await runPayrollQuery<BonusConfigRow>(
    `
      SELECT
        otd_threshold,
        rpa_threshold,
        otd_floor,
        rpa_full_payout_threshold,
        rpa_soft_band_end,
        rpa_soft_band_floor_factor
      FROM \`${projectId}.greenhouse.payroll_bonus_config\`
      WHERE effective_from <= DATE(@periodEnd)
      ORDER BY effective_from DESC
      LIMIT 1
    `,
    { periodEnd }
  )

  return {
    period,
    ...normalizeBonusProrationConfig(
      row
        ? {
            otdThreshold: toNumber(row.otd_threshold),
            otdFloor: row.otd_floor != null ? toNumber(row.otd_floor) : DEFAULT_BONUS_PRORATION_CONFIG.otdFloor,
            rpaThreshold: toNumber(row.rpa_threshold),
            rpaFullPayoutThreshold:
              row.rpa_full_payout_threshold != null
                ? toNumber(row.rpa_full_payout_threshold)
                : DEFAULT_BONUS_PRORATION_CONFIG.rpaFullPayoutThreshold,
            rpaSoftBandEnd:
              row.rpa_soft_band_end != null
                ? toNumber(row.rpa_soft_band_end)
                : DEFAULT_BONUS_PRORATION_CONFIG.rpaSoftBandEnd,
            rpaSoftBandFloorFactor:
              row.rpa_soft_band_floor_factor != null
                ? toNumber(row.rpa_soft_band_floor_factor)
                : DEFAULT_BONUS_PRORATION_CONFIG.rpaSoftBandFloorFactor
          }
        : undefined
    )
  }
}

const validateBonusAmount = ({
  qualifies,
  amount,
  max,
  label
}: {
  qualifies: boolean
  amount: number
  max: number
  label: string
}) => {
  if (!qualifies && amount > 0) {
    throw new PayrollValidationError(`${label} cannot be assigned when KPI threshold is not met.`, 400)
  }

  if (qualifies && (amount < 0 || amount > max)) {
    throw new PayrollValidationError(`${label} must stay within the configured compensation range.`, 400, {
      min: 0,
      max
    })
  }
}

export const recalculatePayrollEntry = async ({
  entryId,
  input,
  actorIdentifier
}: {
  entryId: string
  input: UpdatePayrollEntryInput
  actorIdentifier?: string | null
}): Promise<PayrollEntry> => {
  if (!isPayrollPostgresEnabled()) {
    await ensurePayrollInfrastructure()
  }

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

  const {
    period,
    otdThreshold,
    otdFloor,
    rpaThreshold,
    rpaFullPayoutThreshold,
    rpaSoftBandEnd,
    rpaSoftBandFloorFactor
  } = await getBonusConfigForPeriod(entry.periodId)

  if (!canEditPayrollEntries(period.status)) {
    throw new PayrollValidationError('Exported payroll entries cannot be edited.', 409)
  }

  const bonusConfig: BonusProrationConfig = {
    otdThreshold,
    otdFloor,
    rpaThreshold,
    rpaFullPayoutThreshold,
    rpaSoftBandEnd,
    rpaSoftBandFloorFactor
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

  const otdResult = calculateOtdBonus(nextKpiOtdPercent, compensation.bonusOtdMax, bonusConfig)
  const rpaResult = calculateRpaBonus(nextKpiRpaAvg, compensation.bonusRpaMax, bonusConfig)

  const nextBonusOtdAmount = input.bonusOtdAmount ?? entry.bonusOtdAmount
  const nextBonusRpaAmount = input.bonusRpaAmount ?? entry.bonusRpaAmount
  const nextBonusOtherAmount = input.bonusOtherAmount ?? entry.bonusOtherAmount
  const { periodEnd } = getPeriodRangeFromId(entry.periodId)

  const resolvedUfValue = typeof period.ufValue === 'number'
    ? period.ufValue
    : (await getHistoricalEconomicIndicatorForPeriod({
        indicatorCode: 'UF',
        periodDate: periodEnd
      }))?.value ?? null

  const resolvedUtmValue = period.taxTableVersion
    ? (await getHistoricalEconomicIndicatorForPeriod({
        indicatorCode: 'UTM',
        periodDate: periodEnd
      }))?.value ?? null
    : null

  if (compensation.payRegime === 'chile' && !period.taxTableVersion) {
    throw new PayrollValidationError('This payroll period requires taxTableVersion to recalculate Chile payroll taxes.', 400)
  }

  if (compensation.payRegime === 'chile' && period.taxTableVersion && typeof resolvedUtmValue !== 'number') {
    throw new PayrollValidationError('This payroll period requires a historical UTM value to recalculate Chile payroll taxes.', 400)
  }

  validateBonusAmount({
    qualifies: otdResult.qualifies,
    amount: nextBonusOtdAmount,
    max: compensation.bonusOtdMax,
    label: 'OTD bonus'
  })
  validateBonusAmount({
    qualifies: rpaResult.qualifies,
    amount: nextBonusRpaAmount,
    max: compensation.bonusRpaMax,
    label: 'RpA bonus'
  })

  // Use adjusted base/remote from the entry if attendance was already computed
  const effectiveBaseSalary = entry.adjustedBaseSalary ?? compensation.baseSalary
  const effectiveRemoteAllowance = entry.adjustedRemoteAllowance ?? compensation.remoteAllowance
  const effectiveColacionAmount = entry.adjustedColacionAmount ?? compensation.colacionAmount ?? 0
  const effectiveMovilizacionAmount = entry.adjustedMovilizacionAmount ?? compensation.movilizacionAmount ?? 0
  const effectiveFixedBonusAmount = entry.adjustedFixedBonusAmount ?? compensation.fixedBonusAmount

  const provisionalTotals = await calculatePayrollTotals({
    payRegime: compensation.payRegime,
    baseSalary: effectiveBaseSalary,
    remoteAllowance: effectiveRemoteAllowance,
    colacionAmount: effectiveColacionAmount,
    movilizacionAmount: effectiveMovilizacionAmount,
    fixedBonusAmount: effectiveFixedBonusAmount,
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
    ufValue: resolvedUfValue,
    taxAmount: 0,
    periodDate: periodEnd
  })

  const autoTaxAmount = compensation.payRegime === 'chile' && period.taxTableVersion
    ? (await computeChileTax({
        taxableBaseClp: provisionalTotals.chileTaxableBase ?? 0,
        taxTableVersion: period.taxTableVersion,
        utmValue: resolvedUtmValue
      })).taxAmountClp
    : 0

  const nextTaxAmount = input.chileTaxAmount ?? autoTaxAmount

  const totals = await calculatePayrollTotals({
    payRegime: compensation.payRegime,
    baseSalary: effectiveBaseSalary,
    remoteAllowance: effectiveRemoteAllowance,
    colacionAmount: effectiveColacionAmount,
    movilizacionAmount: effectiveMovilizacionAmount,
    fixedBonusAmount: effectiveFixedBonusAmount,
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
    ufValue: resolvedUfValue,
    taxAmount: nextTaxAmount,
    periodDate: periodEnd
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
    kpiOtdQualifies: otdResult.qualifies,
    kpiRpaQualifies: rpaResult.qualifies,
    bonusOtdAmount: nextBonusOtdAmount,
    bonusRpaAmount: nextBonusRpaAmount,
    bonusOtherAmount: nextBonusOtherAmount,
    bonusOtherDescription: input.bonusOtherDescription !== undefined ? input.bonusOtherDescription : entry.bonusOtherDescription,
    grossTotal: totals.grossTotal,
    bonusOtdProrationFactor: otdResult.prorationFactor,
    bonusRpaProrationFactor: rpaResult.prorationFactor,
    chileAfpName: totals.chileAfpName,
    chileAfpRate: totals.chileAfpRate,
    chileAfpAmount: totals.chileAfpAmount,
    chileColacionAmount: totals.chileColacionAmount,
    chileMovilizacionAmount: totals.chileMovilizacionAmount,
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
    manualOverrideNote: input.manualOverrideNote !== undefined ? input.manualOverrideNote : entry.manualOverrideNote,
    adjustedColacionAmount: entry.adjustedColacionAmount ?? compensation.colacionAmount,
    adjustedMovilizacionAmount: entry.adjustedMovilizacionAmount ?? compensation.movilizacionAmount
  }

  await upsertPayrollEntry(updatedEntry)

  if (shouldReopenApprovedPayrollPeriod(period.status)) {
    if (isPayrollPostgresEnabled()) {
      await pgSetPeriodCalculated(entry.periodId, actorIdentifier ?? null)
    } else {
      await runPayrollQuery(
        `
          UPDATE \`${getProjectId()}.greenhouse.payroll_periods\`
          SET
            status = 'calculated',
            calculated_at = CURRENT_TIMESTAMP(),
            calculated_by = @actorIdentifier,
            approved_at = NULL,
            approved_by = NULL
          WHERE period_id = @periodId
        `,
        {
          periodId: entry.periodId,
          actorIdentifier: actorIdentifier ?? null
        }
      )
    }
  }

  const persisted = await getPayrollEntryById(entryId)

  if (!persisted) {
    throw new PayrollValidationError('Unable to reload updated payroll entry.', 500)
  }

  return persisted
}
