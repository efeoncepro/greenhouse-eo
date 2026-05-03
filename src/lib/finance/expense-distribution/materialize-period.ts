import 'server-only'

import { resolveExpenseDistribution } from './resolver'
import {
  listExpensesForDistributionPeriod,
  persistExpenseDistributionResolution,
  type ExpenseDistributionPeriod
} from './repository'

export interface MaterializeExpenseDistributionPeriodResult {
  period: ExpenseDistributionPeriod
  scanned: number
  inserted: number
  unchanged: number
  supersededAndInserted: number
  blocked: number
  manualRequired: number
}

export const materializeExpenseDistributionPeriod = async (
  period: ExpenseDistributionPeriod
): Promise<MaterializeExpenseDistributionPeriodResult> => {
  const expenses = await listExpensesForDistributionPeriod(period)
  const result: MaterializeExpenseDistributionPeriodResult = {
    period,
    scanned: expenses.length,
    inserted: 0,
    unchanged: 0,
    supersededAndInserted: 0,
    blocked: 0,
    manualRequired: 0
  }

  for (const expense of expenses) {
    const draft = resolveExpenseDistribution(expense)

    if (draft.resolutionStatus === 'blocked') result.blocked += 1
    if (draft.resolutionStatus === 'manual_required') result.manualRequired += 1

    const persisted = await persistExpenseDistributionResolution(draft)

    if (persisted.action === 'inserted') result.inserted += 1
    if (persisted.action === 'unchanged') result.unchanged += 1
    if (persisted.action === 'superseded_and_inserted') result.supersededAndInserted += 1
  }

  return result
}
