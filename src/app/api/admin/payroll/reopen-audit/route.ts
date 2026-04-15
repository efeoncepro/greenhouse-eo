import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { PeriodStatus } from '@/types/payroll'

// TASK-412 — GET /api/admin/payroll/reopen-audit
//
// Lists payroll period reopen audit rows for the admin audit view. The
// backing table `greenhouse_payroll.payroll_period_reopen_audit` records
// every reopen event with operator, reason, and the previous status at
// the moment of the transition.

export const dynamic = 'force-dynamic'

type QueryParams = {
  month: string | null
  actorUserId: string | null
  limit: number
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

const parseQuery = (url: URL): QueryParams => {
  const monthRaw = url.searchParams.get('month')
  const actorRaw = url.searchParams.get('actorUserId')
  const limitRaw = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT)

  const month =
    monthRaw && /^\d{4}-\d{2}$/.test(monthRaw.trim()) ? monthRaw.trim() : null

  const actorUserId = actorRaw && actorRaw.trim().length > 0 ? actorRaw.trim() : null
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT

  return { month, actorUserId, limit }
}

type ReopenAuditRow = {
  audit_id: string
  period_id: string
  period_year: number | string | null
  period_month: number | string | null
  reopened_by_user_id: string
  reopened_by_name: string | null
  reopened_by_email: string | null
  reopened_at: string | Date
  reason: string
  reason_detail: string | null
  previred_declared_check: boolean
  operational_month: string | Date
  previous_status: PeriodStatus
  locked_at: string | Date | null
} & Record<string, unknown>

interface ReopenAuditResponseRow {
  auditId: string
  periodId: string
  periodYear: number | null
  periodMonth: number | null
  periodLabel: string | null
  reopenedByUserId: string
  reopenedByName: string | null
  reopenedByEmail: string | null
  reopenedAt: string
  reason: string
  reasonDetail: string | null
  previredDeclaredCheck: boolean
  operationalMonth: string
  previousStatus: PeriodStatus
  lockedAt: string | null
}

const toIsoString = (value: string | Date | null): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const formatMonthKey = (year: number | null, month: number | null) => {
  if (year == null || month == null) return null

  return `${year}-${String(month).padStart(2, '0')}`
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const { month, actorUserId, limit } = parseQuery(url)

  const conditions: string[] = []
  const values: Array<string | number> = []

  if (month) {
    values.push(`${month}-01`)
    conditions.push(`a.operational_month = $${values.length}::date`)
  }

  if (actorUserId) {
    values.push(actorUserId)
    conditions.push(`a.reopened_by_user_id = $${values.length}`)
  }

  values.push(limit)
  const limitPlaceholder = `$${values.length}`

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const rows = await runGreenhousePostgresQuery<ReopenAuditRow>(
      `
        SELECT
          a.audit_id,
          a.period_id,
          p.year AS period_year,
          p.month AS period_month,
          a.reopened_by_user_id,
          cu.full_name AS reopened_by_name,
          cu.email AS reopened_by_email,
          a.reopened_at,
          a.reason,
          a.reason_detail,
          a.previred_declared_check,
          a.operational_month,
          a.previous_status,
          a.locked_at
        FROM greenhouse_payroll.payroll_period_reopen_audit AS a
        LEFT JOIN greenhouse_payroll.payroll_periods AS p ON p.period_id = a.period_id
        LEFT JOIN greenhouse_core.client_users AS cu ON cu.user_id = a.reopened_by_user_id
        ${whereClause}
        ORDER BY a.reopened_at DESC
        LIMIT ${limitPlaceholder}
      `,
      values
    )

    const response: ReopenAuditResponseRow[] = rows.map(row => {
      const periodYear = row.period_year != null ? Number(row.period_year) : null
      const periodMonth = row.period_month != null ? Number(row.period_month) : null

      return {
        auditId: row.audit_id,
        periodId: row.period_id,
        periodYear,
        periodMonth,
        periodLabel: formatMonthKey(periodYear, periodMonth),
        reopenedByUserId: row.reopened_by_user_id,
        reopenedByName: row.reopened_by_name,
        reopenedByEmail: row.reopened_by_email,
        reopenedAt: toIsoString(row.reopened_at) ?? '',
        reason: row.reason,
        reasonDetail: row.reason_detail,
        previredDeclaredCheck: Boolean(row.previred_declared_check),
        operationalMonth: toIsoString(row.operational_month) ?? '',
        previousStatus: row.previous_status,
        lockedAt: toIsoString(row.locked_at)
      }
    })

    return NextResponse.json({
      rows: response,
      count: response.length,
      filters: { month, actorUserId, limit }
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo cargar la auditoría de reaperturas.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
