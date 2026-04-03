import 'server-only'

import { roundCurrency } from '@/lib/finance/shared'

const FINANCE_TIMEZONE = 'America/Santiago'

export type MonthlyAmountEntry = {
  period: string
  amountClp: number
  count?: number
}

/** Returns { year, month } based on the business timezone (America/Santiago). */
export const getFinanceCurrentPeriod = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: FINANCE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const year = Number(parts.find(p => p.type === 'year')!.value)
  const month = Number(parts.find(p => p.type === 'month')!.value)

  return { year, month }
}

export const getMonthKey = (date: string | null) => (date ? date.slice(0, 7) : null)

export const getRecentMonthKeys = (months: number) => {
  const totalMonths = Math.max(1, months)
  const keys: string[] = []
  const { year, month } = getFinanceCurrentPeriod()

  const cursor = new Date(Date.UTC(year, month - 1, 1))

  cursor.setUTCMonth(cursor.getUTCMonth() - (totalMonths - 1))

  for (let index = 0; index < totalMonths; index += 1) {
    const y = cursor.getUTCFullYear()
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0')

    keys.push(`${y}-${m}`)
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return keys
}

export const aggregateMonthlyEntries = (entries: MonthlyAmountEntry[], monthKeys: string[]) => {
  const totals = new Map<string, { totalAmountClp: number; count: number }>()

  for (const key of monthKeys) {
    totals.set(key, { totalAmountClp: 0, count: 0 })
  }

  for (const entry of entries) {
    const bucket = totals.get(entry.period)

    if (!bucket) {
      continue
    }

    bucket.totalAmountClp = roundCurrency(bucket.totalAmountClp + entry.amountClp)
    bucket.count += entry.count ?? 1
  }

  return monthKeys.map(period => ({
    period,
    year: Number(period.slice(0, 4)),
    month: Number(period.slice(5, 7)),
    totalAmountClp: roundCurrency(totals.get(period)?.totalAmountClp ?? 0),
    recordCount: totals.get(period)?.count ?? 0
  }))
}

export const buildCurrentMonthMetrics = (series: Array<{ totalAmountClp: number; recordCount: number }>) => {
  const current = series.at(-1) ?? { totalAmountClp: 0, recordCount: 0 }
  const previous = series.at(-2) ?? { totalAmountClp: 0, recordCount: 0 }

  const changePercent = previous.totalAmountClp > 0
    ? Math.round(((current.totalAmountClp - previous.totalAmountClp) / previous.totalAmountClp) * 100)
    : 0

  return {
    totalAmountClp: current.totalAmountClp,
    recordCount: current.recordCount,
    previousTotalAmountClp: previous.totalAmountClp,
    changePercent
  }
}
