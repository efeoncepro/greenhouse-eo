import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { PersonLeaveFacet, FacetFetchContext } from '@/types/person-complete-360'

type BalanceRow = {
  leave_type_code: string
  leave_type_name: string
  year: number
  total_allowance: string | number
  progressive_extra: string | number
  carried_over: string | number
  adjustments: string | number
  used: string | number
  reserved: string | number
  available: string | number
}

type RequestRow = {
  request_id: string
  leave_type_name: string
  start_date: string
  end_date: string
  requested_days: string | number
  status: string
  start_period: string | null
  end_period: string | null
  reason: string | null
  created_at: string
}

type RequestCountRow = { total: string | number }

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

export const fetchLeaveFacet = async (ctx: FacetFetchContext): Promise<PersonLeaveFacet | null> => {
  if (!ctx.memberId) return null

  const currentYear = ctx.asOf
    ? new Date(ctx.asOf).getFullYear()
    : new Date().getFullYear()

  const limit = ctx.limit ?? 5
  const offset = ctx.offset ?? 0

  const [balanceRows, requestRows, countRows] = await Promise.all([
    runGreenhousePostgresQuery<BalanceRow>(
      `SELECT
        lb.leave_type_code,
        lt.leave_type_name,
        lb.year,
        lb.total_allowance::text,
        COALESCE(lb.progressive_extra, 0)::text AS progressive_extra,
        COALESCE(lb.carried_over, 0)::text AS carried_over,
        COALESCE(lb.adjustments, 0)::text AS adjustments,
        lb.used::text,
        lb.reserved::text,
        lb.available::text
      FROM greenhouse_hr.leave_balances lb
      JOIN greenhouse_hr.leave_types lt ON lt.leave_type_code = lb.leave_type_code
      WHERE lb.member_id = $1
        AND lb.year = $2
      ORDER BY lt.display_order ASC NULLS LAST, lt.leave_type_name ASC`,
      [ctx.memberId, currentYear]
    ).catch(() => [] as BalanceRow[]),

    runGreenhousePostgresQuery<RequestRow>(
      `SELECT
        r.request_id,
        COALESCE(lt.leave_type_name, r.leave_type_code) AS leave_type_name,
        r.start_date::text,
        r.end_date::text,
        r.requested_days::text,
        r.status,
        r.start_period,
        r.end_period,
        r.reason,
        r.created_at::text
      FROM greenhouse_hr.leave_requests r
      LEFT JOIN greenhouse_hr.leave_types lt ON lt.leave_type_code = r.leave_type_code
      WHERE r.member_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3`,
      [ctx.memberId, limit, offset]
    ).catch(() => [] as RequestRow[]),

    runGreenhousePostgresQuery<RequestCountRow>(
      `SELECT COUNT(*)::text AS total
       FROM greenhouse_hr.leave_requests
       WHERE member_id = $1`,
      [ctx.memberId]
    ).catch(() => [{ total: 0 }] as RequestCountRow[])
  ])

  const totalRequests = toNum(countRows[0]?.total)

  // Compute summary from balances
  const vacationBalance = balanceRows.find(b => b.leave_type_code === 'vacation')
  const pendingCount = requestRows.filter(r => r.status === 'pending').length

  return {
    balances: balanceRows.map(r => ({
      leaveTypeCode: r.leave_type_code,
      leaveTypeName: r.leave_type_name,
      year: toNum(r.year),
      allowance: toNum(r.total_allowance),
      progressiveExtra: toNum(r.progressive_extra),
      carriedOver: toNum(r.carried_over),
      adjustments: toNum(r.adjustments),
      used: toNum(r.used),
      reserved: toNum(r.reserved),
      available: toNum(r.available)
    })),
    recentRequests: requestRows.map(r => ({
      requestId: r.request_id,
      leaveTypeName: r.leave_type_name,
      startDate: r.start_date.slice(0, 10),
      endDate: r.end_date.slice(0, 10),
      requestedDays: toNum(r.requested_days),
      status: r.status,
      startPeriod: r.start_period,
      endPeriod: r.end_period,
      reason: r.reason,
      createdAt: r.created_at
    })),
    recentRequestsPagination: {
      total: totalRequests,
      limit,
      offset,
      hasMore: offset + limit < totalRequests
    },
    summary: {
      totalPending: pendingCount,
      totalApproved: requestRows.filter(r => r.status === 'approved').length,
      totalUsedThisYear: vacationBalance ? toNum(vacationBalance.used) : 0,
      totalAvailableVacation: vacationBalance ? toNum(vacationBalance.available) : 0
    }
  }
}
