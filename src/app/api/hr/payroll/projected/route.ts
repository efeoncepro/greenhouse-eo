import { NextResponse } from 'next/server'

import type { ProjectionMode } from '@/types/payroll'

import { requireHrTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveExchangeRateToClp, roundCurrency, invertExchangeRate } from '@/lib/finance/shared'
import { projectPayrollForPeriod } from '@/lib/payroll/project-payroll'
import {
  pgGetLatestProjectedPayrollPromotion
} from '@/lib/payroll/projected-payroll-promotion-store'
import { isPayrollPostgresEnabled } from '@/lib/payroll/postgres-store'

export const dynamic = 'force-dynamic'

type OfficialEntryRow = {
  member_id: string
  currency: string
  gross_total: number | string
  net_total: number | string
  kpi_otd_percent: number | string | null
  kpi_rpa_avg: number | string | null
  kpi_tasks_completed: number | string | null
  working_days_in_period: number | string | null
  days_present: number | string | null
  days_absent: number | string | null
  days_on_leave: number | string | null
  chile_uf_value: number | string | null
  base_salary: number | string | null
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
    const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

    const year = Number(searchParams.get('year')) || (match ? Number(match[1]) : new Date().getFullYear())
    const month = Number(searchParams.get('month')) || (match ? Number(match[2]) : new Date().getMonth() + 1)
    const mode = (searchParams.get('mode') || 'projected_month_end') as ProjectionMode

    if (mode !== 'actual_to_date' && mode !== 'projected_month_end') {
      return NextResponse.json({ error: 'Invalid mode. Use actual_to_date or projected_month_end.' }, { status: 400 })
    }

    // Fetch projection + official entries in parallel
    const periodId = `${year}-${String(month).padStart(2, '0')}`

    const [result, officialRows, latestPromotion] = await Promise.all([
      projectPayrollForPeriod({ year, month, mode }),
      runGreenhousePostgresQuery<OfficialEntryRow>(
        `SELECT e.member_id, e.currency, e.gross_total, e.net_total,
                e.kpi_otd_percent, e.kpi_rpa_avg, e.kpi_tasks_completed,
                e.working_days_in_period, e.days_present, e.days_absent, e.days_on_leave,
                e.chile_uf_value, e.base_salary
         FROM greenhouse_payroll.payroll_entries e
         INNER JOIN greenhouse_payroll.payroll_periods p ON p.period_id = e.period_id
         WHERE p.period_id = $1
           AND p.status IN ('calculated', 'approved', 'exported')`,
        [periodId]
      ).catch(() => [] as OfficialEntryRow[])
      ,
      isPayrollPostgresEnabled()
        ? pgGetLatestProjectedPayrollPromotion({ year, month, mode }).catch(() => null)
        : Promise.resolve(null)
    ])

    // Build official map with inputs for variance
    const toNum = (v: unknown) => v != null ? Number(v) : null
    const round2 = (n: number) => Math.round(n * 100) / 100

    type OfficialSnapshot = {
      grossTotal: number
      netTotal: number
      kpiOtdPercent: number | null
      kpiRpaAvg: number | null
      kpiTasksCompleted: number | null
      workingDays: number | null
      daysPresent: number | null
      daysAbsent: number | null
      daysOnLeave: number | null
      ufValue: number | null
      baseSalary: number | null
    }

    const officialByMember = new Map<string, OfficialSnapshot>()

    for (const row of officialRows) {
      officialByMember.set(row.member_id, {
        grossTotal: Number(row.gross_total),
        netTotal: Number(row.net_total),
        kpiOtdPercent: toNum(row.kpi_otd_percent),
        kpiRpaAvg: toNum(row.kpi_rpa_avg),
        kpiTasksCompleted: toNum(row.kpi_tasks_completed),
        workingDays: toNum(row.working_days_in_period),
        daysPresent: toNum(row.days_present),
        daysAbsent: toNum(row.days_absent),
        daysOnLeave: toNum(row.days_on_leave),
        ufValue: toNum(row.chile_uf_value),
        baseSalary: toNum(row.base_salary)
      })
    }

    // Compute totals delta
    const officialGrossByCurrency: Record<string, number> = {}
    const officialNetByCurrency: Record<string, number> = {}

    for (const row of officialRows) {
      officialGrossByCurrency[row.currency] = (officialGrossByCurrency[row.currency] ?? 0) + Number(row.gross_total)
      officialNetByCurrency[row.currency] = (officialNetByCurrency[row.currency] ?? 0) + Number(row.net_total)
    }

    const hasOfficial = officialRows.length > 0

    // Enrich entries with output delta + input variance
    const entriesWithDelta = result.entries.map(entry => {
      const official = officialByMember.get(entry.memberId)

      const inputVariance = official ? {
        kpiOtdChanged: official.kpiOtdPercent != null && entry.kpiOtdPercent != null && official.kpiOtdPercent !== entry.kpiOtdPercent,
        kpiRpaChanged: official.kpiRpaAvg != null && entry.kpiRpaAvg != null && official.kpiRpaAvg !== entry.kpiRpaAvg,
        attendanceChanged: official.daysPresent != null && entry.daysPresent != null && official.daysPresent !== entry.daysPresent,
        ufChanged: official.ufValue != null && entry.chileUfValue != null && official.ufValue !== entry.chileUfValue,
        baseSalaryChanged: official.baseSalary != null && entry.baseSalary != null && official.baseSalary !== entry.baseSalary,
        officialInputs: {
          kpiOtdPercent: official.kpiOtdPercent,
          kpiRpaAvg: official.kpiRpaAvg,
          workingDays: official.workingDays,
          daysPresent: official.daysPresent,
          daysAbsent: official.daysAbsent,
          ufValue: official.ufValue
        }
      } : null

      return {
        ...entry,
        officialGrossTotal: official?.grossTotal ?? null,
        officialNetTotal: official?.netTotal ?? null,
        deltaGross: official ? round2(entry.grossTotal - official.grossTotal) : null,
        deltaNet: official ? round2(entry.netTotal - official.netTotal) : null,
        inputVariance
      }
    })

    // Consolidated currency equivalents via canonical finance helpers
    let clpEquivalent: { grossClp: number; netClp: number; fxRate: number } | null = null
    let usdEquivalent: { grossUsd: number; netUsd: number; fxRate: number } | null = null

    const hasUsd = (result.totals.grossByCurrency.USD ?? 0) > 0
    const hasClp = (result.totals.grossByCurrency.CLP ?? 0) > 0
    const isMultiCurrency = hasUsd && hasClp

    if (hasUsd) {
      try {
        const usdToClp = await resolveExchangeRateToClp({ currency: 'USD' })
        const clpToUsd = invertExchangeRate({ rate: usdToClp })

        const grossUsd = result.totals.grossByCurrency.USD ?? 0
        const grossClp = result.totals.grossByCurrency.CLP ?? 0
        const netUsd = result.totals.netByCurrency.USD ?? 0
        const netClp = result.totals.netByCurrency.CLP ?? 0

        clpEquivalent = {
          grossClp: Math.round(grossUsd * usdToClp + grossClp),
          netClp: Math.round(netUsd * usdToClp + netClp),
          fxRate: usdToClp
        }

        if (isMultiCurrency) {
          usdEquivalent = {
            grossUsd: roundCurrency(grossUsd + grossClp * clpToUsd),
            netUsd: roundCurrency(netUsd + netClp * clpToUsd),
            fxRate: usdToClp
          }
        }
      } catch {
        // FX not available — skip equivalents
      }
    }

    return NextResponse.json(
      {
        ...result,
        entries: entriesWithDelta,
        official: hasOfficial ? {
          grossByCurrency: officialGrossByCurrency,
          netByCurrency: officialNetByCurrency,
          entryCount: officialRows.length
        } : null,
        latestPromotion,
        clpEquivalent,
        usdEquivalent
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  } catch (error) {
    console.error('GET /api/hr/payroll/projected failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
