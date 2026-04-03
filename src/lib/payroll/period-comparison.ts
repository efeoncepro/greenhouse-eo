import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ──

export interface OfficialPeriodSummary {
  periodId: string
  grossByCurrency: Record<string, number>
  netByCurrency: Record<string, number>
  entryCount: number
}

interface PeriodEntryRow extends Record<string, unknown> {
  period_id: string
  currency: string
  gross_total: number | string
  net_total: number | string
}

// ── Queries ──

/**
 * Fetch the most recent official payroll period BEFORE the given periodId.
 * Returns aggregated gross/net totals by currency for comparison.
 *
 * Official = status IN ('approved', 'exported').
 * Returns null if no previous official period exists.
 */
export const getPreviousOfficialPeriodTotals = async (
  beforePeriodId: string
): Promise<OfficialPeriodSummary | null> => {
  const rows = await runGreenhousePostgresQuery<PeriodEntryRow>(
    `SELECT e.currency, e.gross_total, e.net_total, p.period_id
     FROM greenhouse_payroll.payroll_entries e
     INNER JOIN greenhouse_payroll.payroll_periods p ON p.period_id = e.period_id
     WHERE p.period_id < $1
       AND p.status IN ('approved', 'exported')
     ORDER BY p.period_id DESC`,
    [beforePeriodId]
  ).catch(() => [] as PeriodEntryRow[])

  if (rows.length === 0) return null

  const periodId = rows[0].period_id
  const grossByCurrency: Record<string, number> = {}
  const netByCurrency: Record<string, number> = {}
  let entryCount = 0

  for (const row of rows) {
    // Only aggregate entries from the most recent period
    if (row.period_id !== periodId) break

    grossByCurrency[row.currency] = (grossByCurrency[row.currency] ?? 0) + Number(row.gross_total)
    netByCurrency[row.currency] = (netByCurrency[row.currency] ?? 0) + Number(row.net_total)
    entryCount++
  }

  return { periodId, grossByCurrency, netByCurrency, entryCount }
}

/**
 * Fetch the official payroll period for the given periodId.
 * Returns null if no official period exists for this exact period.
 */
export const getOfficialPeriodTotals = async (
  periodId: string
): Promise<OfficialPeriodSummary | null> => {
  const rows = await runGreenhousePostgresQuery<PeriodEntryRow>(
    `SELECT e.currency, e.gross_total, e.net_total, p.period_id
     FROM greenhouse_payroll.payroll_entries e
     INNER JOIN greenhouse_payroll.payroll_periods p ON p.period_id = e.period_id
     WHERE p.period_id = $1
       AND p.status IN ('calculated', 'approved', 'exported')`,
    [periodId]
  ).catch(() => [] as PeriodEntryRow[])

  if (rows.length === 0) return null

  const grossByCurrency: Record<string, number> = {}
  const netByCurrency: Record<string, number> = {}

  for (const row of rows) {
    grossByCurrency[row.currency] = (grossByCurrency[row.currency] ?? 0) + Number(row.gross_total)
    netByCurrency[row.currency] = (netByCurrency[row.currency] ?? 0) + Number(row.net_total)
  }

  return { periodId, grossByCurrency, netByCurrency, entryCount: rows.length }
}
