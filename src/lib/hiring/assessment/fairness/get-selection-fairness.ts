import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { HiringValidationError } from '@/lib/hiring/errors'

import { requireHiringFairnessPolicy } from './config'
import {
  FAIRNESS_REPORTABLE_STAGES,
  type FairnessReportableStage,
  type GetSelectionFairnessInput,
  type SelectionFairnessReport,
} from './contracts'
import { buildSelectionFairnessReport, type FairnessAggregate } from './stats'

interface FairnessViewRow extends Record<string, unknown> {
  cohort_month: Date | string
  dimension_key: string
  category_key: string
  eligible_count: number | string
  advanced_count: number | string
}
const startOfUtcMonth = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))

const addUtcMonths = (date: Date, months: number): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

const toAggregate = (row: FairnessViewRow): FairnessAggregate => ({
  dimensionKey: row.dimension_key,
  categoryKey: row.category_key,
  eligibleCount: Number(row.eligible_count),
  advancedCount: Number(row.advanced_count),
})

export const getSelectionFairness = async (
  input: GetSelectionFairnessInput = {},
  now = new Date(),
): Promise<SelectionFairnessReport> => {
  requireHiringFairnessPolicy()

  const stage = input.stage ?? 'selected'

  if (!FAIRNESS_REPORTABLE_STAGES.includes(stage as FairnessReportableStage)) {
    throw new HiringValidationError('La etapa de fairness no es válida.', 'hiring_fairness_stage_invalid', 400)
  }

  const windowMonths = Math.min(Math.max(Math.trunc(input.windowMonths ?? 3), 1), 24)
  const templateId = input.templateId?.trim() || null
  const currentTo = addUtcMonths(startOfUtcMonth(now), 1)
  const currentFrom = addUtcMonths(currentTo, -windowMonths)
  const previousFrom = addUtcMonths(currentFrom, -windowMonths)

  const rows = await runGreenhousePostgresQuery<FairnessViewRow>(
    `SELECT cohort_month, dimension_key, category_key, eligible_count, advanced_count
     FROM greenhouse_hiring.assessment_fairness
     WHERE stage = $1
       AND template_id IS NOT DISTINCT FROM $2
       AND cohort_month >= $3::date
       AND cohort_month < $4::date
     ORDER BY cohort_month, dimension_key, category_key`,
    [stage, templateId, isoDate(previousFrom), isoDate(currentTo)],
  )

  const current: FairnessAggregate[] = []
  const previous: FairnessAggregate[] = []

  for (const row of rows) {
    const cohort = new Date(row.cohort_month)

    if (cohort >= currentFrom) current.push(toAggregate(row))
    else previous.push(toAggregate(row))
  }

  return buildSelectionFairnessReport({
    stage,
    templateId,
    windowMonths,
    currentFrom: isoDate(currentFrom),
    currentTo: isoDate(currentTo),
    previousFrom: isoDate(previousFrom),
    previousTo: isoDate(currentFrom),
    current,
    previous,
  })
}
