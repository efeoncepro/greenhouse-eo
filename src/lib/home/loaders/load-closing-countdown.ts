import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { ClosingTrafficLight, HomeClosingCountdownData, HomeClosingCountdownItem } from '../contract'
import type { HomeLoaderContext } from '../registry'

type FinanceClosingRow = {
  period_year: number | string
  period_month: number | string
  closure_status: string | null
  readiness_pct: number | string | null
  ttl_close_at: string | null
} & Record<string, unknown>

type PayrollClosingRow = {
  period_year: number | string
  period_month: number | string
  status: string | null
  cutoff_at: string | null
  readiness_pct: number | string | null
} & Record<string, unknown>

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const trafficLightFor = (readinessPct: number | null, hoursRemaining: number | null): ClosingTrafficLight => {
  if (readinessPct == null) return 'yellow'
  if (readinessPct >= 95) return 'green'
  if (readinessPct >= 70 || (hoursRemaining != null && hoursRemaining > 48)) return 'yellow'

  return 'red'
}

const hoursBetween = (now: Date, target: string | null): number | null => {
  if (!target) return null
  const targetMs = new Date(target).getTime()

  if (Number.isNaN(targetMs)) return null

  return Math.round((targetMs - now.getTime()) / 36e5)
}

const loadFinanceClosing = async (ctx: HomeLoaderContext): Promise<HomeClosingCountdownItem | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<FinanceClosingRow>(
      `SELECT period_year, period_month, closure_status, readiness_pct,
              NULL::timestamptz AS ttl_close_at
         FROM greenhouse_serving.period_closure_status
        ORDER BY period_year DESC, period_month DESC
        LIMIT 1`
    )

    const row = rows[0]

    if (!row) return null

    const year = Number(row.period_year)
    const month = Number(row.period_month)
    const readinessPct = row.readiness_pct == null ? null : Number(row.readiness_pct)
    const hoursRemaining = hoursBetween(new Date(ctx.now), row.ttl_close_at)

    return {
      closingId: `finance.${year}-${String(month).padStart(2, '0')}`,
      domain: 'finance',
      label: 'Cierre Finanzas',
      periodLabel: `${MONTH_SHORT[month] ?? ''} ${year}`,
      readinessPct,
      hoursRemaining,
      trafficLight: trafficLightFor(readinessPct, hoursRemaining),
      ctaHref: '/finance',
      ctaLabel: 'Continuar cierre'
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[home.loaders.closing] finance closing query failed:',
        error instanceof Error ? error.message : error
      )
    }

    return null
  }
}

const loadPayrollClosing = async (ctx: HomeLoaderContext): Promise<HomeClosingCountdownItem | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<PayrollClosingRow>(
      `SELECT period_year, period_month, status, cutoff_at, readiness_pct
         FROM greenhouse_payroll.payroll_periods
        WHERE status IN ('open','in_review')
        ORDER BY period_year DESC, period_month DESC
        LIMIT 1`
    )

    const row = rows[0]

    if (!row) return null

    const year = Number(row.period_year)
    const month = Number(row.period_month)
    const readinessPct = row.readiness_pct == null ? null : Number(row.readiness_pct)
    const hoursRemaining = hoursBetween(new Date(ctx.now), row.cutoff_at)

    return {
      closingId: `payroll.${year}-${String(month).padStart(2, '0')}`,
      domain: 'payroll',
      label: 'Cierre Nómina',
      periodLabel: `${MONTH_SHORT[month] ?? ''} ${year}`,
      readinessPct,
      hoursRemaining,
      trafficLight: trafficLightFor(readinessPct, hoursRemaining),
      ctaHref: '/hr/payroll',
      ctaLabel: 'Continuar cierre'
    }
  } catch {
    return null
  }
}

export const loadHomeClosingCountdown = async (ctx: HomeLoaderContext): Promise<HomeClosingCountdownData> => {
  const [finance, payroll] = await Promise.all([loadFinanceClosing(ctx), loadPayrollClosing(ctx)])

  return {
    items: [finance, payroll].filter((item): item is HomeClosingCountdownItem => item !== null),
    asOf: ctx.now
  }
}
