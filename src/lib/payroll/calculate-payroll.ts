import 'server-only'

import type { CompensationVersion, PayrollCalculationResult, PayrollEntry, PayrollKpiSnapshot } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { calculatePayrollTotals } from '@/lib/payroll/calculate-chile-deductions'
import { fetchKpisForPeriod } from '@/lib/payroll/fetch-kpis-for-period'
import { getApplicableCompensationVersionsForPeriod } from '@/lib/payroll/get-compensation'
import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { upsertPayrollEntry } from '@/lib/payroll/persist-entry'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import {
  PayrollValidationError,
  getPeriodRangeFromId,
  runPayrollQuery,
  toNumber
} from '@/lib/payroll/shared'

type BonusConfigRow = {
  otd_threshold: number | string | null
  rpa_threshold: number | string | null
}

const projectId = getBigQueryProjectId()

const getBonusConfigForDate = async (periodEnd: string) => {
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
    otdThreshold: row ? toNumber(row.otd_threshold) : 89,
    rpaThreshold: row ? toNumber(row.rpa_threshold) : 2
  }
}

const buildPayrollEntry = ({
  periodId,
  compensation,
  ufValue,
  bonusConfig,
  kpi
}: {
  periodId: string
  compensation: CompensationVersion
  ufValue: number | null
  bonusConfig: { otdThreshold: number; rpaThreshold: number }
  kpi: PayrollKpiSnapshot | null
}): PayrollEntry => {
  const kpiOtdPercent = kpi?.otdPercent ?? null
  const kpiRpaAvg = kpi?.rpaAvg ?? null
  const kpiOtdQualifies = typeof kpiOtdPercent === 'number' && kpiOtdPercent >= bonusConfig.otdThreshold
  const kpiRpaQualifies = typeof kpiRpaAvg === 'number' && kpiRpaAvg < bonusConfig.rpaThreshold
  const bonusOtdAmount = kpiOtdQualifies ? compensation.bonusOtdMin : 0
  const bonusRpaAmount = kpiRpaQualifies ? compensation.bonusRpaMin : 0

  const totals = calculatePayrollTotals({
    payRegime: compensation.payRegime,
    baseSalary: compensation.baseSalary,
    remoteAllowance: compensation.remoteAllowance,
    bonusOtdAmount,
    bonusRpaAmount,
    bonusOtherAmount: 0,
    afpName: compensation.afpName,
    afpRate: compensation.afpRate,
    healthSystem: compensation.healthSystem,
    healthPlanUf: compensation.healthPlanUf,
    unemploymentRate: compensation.unemploymentRate,
    contractType: compensation.contractType,
    hasApv: compensation.hasApv,
    apvAmount: compensation.apvAmount,
    ufValue,
    taxAmount: 0
  })

  return {
    entryId: `${periodId}_${compensation.memberId}`,
    periodId,
    memberId: compensation.memberId,
    memberName: compensation.memberName,
    memberEmail: compensation.memberEmail,
    memberAvatarUrl: compensation.memberAvatarUrl,
    compensationVersionId: compensation.versionId,
    payRegime: compensation.payRegime,
    currency: compensation.currency,
    baseSalary: compensation.baseSalary,
    remoteAllowance: compensation.remoteAllowance,
    kpiOtdPercent,
    kpiRpaAvg,
    kpiOtdQualifies,
    kpiRpaQualifies,
    kpiTasksCompleted: kpi ? kpi.tasksCompleted : null,
    kpiDataSource: kpi ? 'notion_ops' : 'manual',
    bonusOtdAmount,
    bonusRpaAmount,
    bonusOtherAmount: 0,
    bonusOtherDescription: null,
    grossTotal: totals.grossTotal,
    bonusOtdMin: compensation.bonusOtdMin,
    bonusOtdMax: compensation.bonusOtdMax,
    bonusRpaMin: compensation.bonusRpaMin,
    bonusRpaMax: compensation.bonusRpaMax,
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
    netTotalOverride: null,
    netTotal: totals.netTotalCalculated,
    manualOverride: false,
    manualOverrideNote: null,
    createdAt: null,
    updatedAt: null
  }
}

export const calculatePayroll = async ({
  periodId,
  actorIdentifier
}: {
  periodId: string
  actorIdentifier: string | null
}): Promise<PayrollCalculationResult> => {
  await ensurePayrollInfrastructure()

  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status === 'approved' || period.status === 'exported') {
    throw new PayrollValidationError('Approved payroll periods cannot be recalculated.', 409)
  }

  const range = getPeriodRangeFromId(periodId)
  const compensationRows = await getApplicableCompensationVersionsForPeriod(range.periodStart, range.periodEnd)
  const missingCompensation = compensationRows.filter(row => !row.hasCompensationVersion)

  if (missingCompensation.length > 0) {
    throw new PayrollValidationError('Missing compensation version for one or more active team members.', 400, {
      memberIds: missingCompensation.map(row => row.memberId)
    })
  }

  const requiresUfValue = compensationRows.some(
    row => row.payRegime === 'chile' && row.healthSystem === 'isapre' && (row.healthPlanUf || 0) > 0
  )

  if (requiresUfValue && typeof period.ufValue !== 'number') {
    throw new PayrollValidationError('This payroll period requires ufValue to calculate Isapre deductions.', 400)
  }

  const [bonusConfig, kpiData] = await Promise.all([
    getBonusConfigForDate(range.periodEnd),
    fetchKpisForPeriod({
      periodStart: range.periodStart,
      periodEndExclusive: range.periodEndExclusive
    })
  ])

  const entries: PayrollEntry[] = []
  const missingKpiMemberIds: string[] = []

  for (const compensation of compensationRows) {
    const kpi = compensation.notionUserId ? kpiData.snapshots.get(compensation.notionUserId) || null : null

    if (!kpi) {
      missingKpiMemberIds.push(compensation.memberId)
    }

    const entry = buildPayrollEntry({
      periodId,
      compensation,
      ufValue: period.ufValue,
      bonusConfig,
      kpi
    })

    await upsertPayrollEntry(entry)
    entries.push(entry)
  }

  await runPayrollQuery(
    `
      UPDATE \`${projectId}.greenhouse.payroll_periods\`
      SET
        status = 'calculated',
        calculated_at = CURRENT_TIMESTAMP(),
        calculated_by = @actorIdentifier
      WHERE period_id = @periodId
    `,
    {
      periodId,
      actorIdentifier
    }
  )

  const updatedPeriod = await getPayrollPeriod(periodId)

  if (!updatedPeriod) {
    throw new PayrollValidationError('Unable to read calculated payroll period.', 500)
  }

  return {
    period: updatedPeriod,
    entries: await getPayrollEntries(periodId),
    diagnostics: kpiData.diagnostics,
    missingKpiMemberIds
  }
}
