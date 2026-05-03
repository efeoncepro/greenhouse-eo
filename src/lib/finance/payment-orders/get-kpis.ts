import 'server-only'

import { query } from '@/lib/db'

export interface PaymentOrdersKpis {
  toScheduleCount: number
  toScheduleAmountClp: number
  thisWeekCount: number
  thisWeekAmountClp: number
  overdueCount: number
  overdueAmountClp: number
  paidThisMonthCount: number
  paidThisMonthAmountClp: number
}

interface KpiRow extends Record<string, unknown> {
  to_schedule_count: string
  to_schedule_amount: string
  this_week_count: string
  this_week_amount: string
  overdue_count: string
  overdue_amount: string
  paid_month_count: string
  paid_month_amount: string
}

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

/**
 * Computa los KPIs del header de Payment Orders desde una sola query.
 * Mide obligations vivas (no orders) para que el numero refleje
 * "trabajo pendiente desde la perspectiva financiera", no "orders".
 *
 * "to_schedule": obligations en `generated` (sin order viva atras)
 * "this_week": obligations con due_date dentro de los proximos 7 dias
 * "overdue": obligations con due_date < CURRENT_DATE y status NOT IN paid/closed/cancelled/superseded
 * "paid_month": obligations en `paid` durante el mes en curso
 *
 * Currency note V1: amounts CLP y USD se suman tal cual (raw).
 * Cuando aparezca un FX-aware materializer del header, multiplicaremos
 * USD por exchange_rate del dia. Hoy la metrica primaria es count.
 */
export async function getPaymentOrdersKpis(
  filters: { spaceId?: string; periodId?: string } = {}
): Promise<PaymentOrdersKpis> {
  const conditions: string[] = []
  const params: unknown[] = []
  let i = 1

  if (filters.spaceId) {
    conditions.push(`space_id = $${i++}`)
    params.push(filters.spaceId)
  }

  if (filters.periodId) {
    conditions.push(`period_id = $${i++}`)
    params.push(filters.periodId)
  }

  const whereExtra = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : ''

  const rows = await query<KpiRow>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'generated' ${whereExtra ? '' : ''})
         ::text AS to_schedule_count,
       COALESCE(SUM(amount) FILTER (WHERE status = 'generated'), 0)::text AS to_schedule_amount,
       COUNT(*) FILTER (
         WHERE status NOT IN ('paid', 'closed', 'cancelled', 'superseded')
           AND due_date IS NOT NULL
           AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       )::text AS this_week_count,
       COALESCE(SUM(amount) FILTER (
         WHERE status NOT IN ('paid', 'closed', 'cancelled', 'superseded')
           AND due_date IS NOT NULL
           AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       ), 0)::text AS this_week_amount,
       COUNT(*) FILTER (
         WHERE status NOT IN ('paid', 'closed', 'cancelled', 'superseded')
           AND due_date IS NOT NULL
           AND due_date < CURRENT_DATE
       )::text AS overdue_count,
       COALESCE(SUM(amount) FILTER (
         WHERE status NOT IN ('paid', 'closed', 'cancelled', 'superseded')
           AND due_date IS NOT NULL
           AND due_date < CURRENT_DATE
       ), 0)::text AS overdue_amount,
       COUNT(*) FILTER (
         WHERE status = 'paid'
           AND updated_at >= date_trunc('month', CURRENT_DATE)
           AND updated_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
       )::text AS paid_month_count,
       COALESCE(SUM(amount) FILTER (
         WHERE status = 'paid'
           AND updated_at >= date_trunc('month', CURRENT_DATE)
           AND updated_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
       ), 0)::text AS paid_month_amount
     FROM greenhouse_finance.payment_obligations
     ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`,
    params
  )

  const row = rows[0]

  return {
    toScheduleCount: toNumber(row?.to_schedule_count),
    toScheduleAmountClp: toNumber(row?.to_schedule_amount),
    thisWeekCount: toNumber(row?.this_week_count),
    thisWeekAmountClp: toNumber(row?.this_week_amount),
    overdueCount: toNumber(row?.overdue_count),
    overdueAmountClp: toNumber(row?.overdue_amount),
    paidThisMonthCount: toNumber(row?.paid_month_count),
    paidThisMonthAmountClp: toNumber(row?.paid_month_amount)
  }
}
