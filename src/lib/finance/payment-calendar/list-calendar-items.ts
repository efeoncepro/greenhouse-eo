import 'server-only'

import { query } from '@/lib/db'

export type PaymentCalendarItemKind = 'obligation' | 'order'

export type PaymentCalendarItemState =
  | 'due'
  | 'ready_to_schedule'
  | 'scheduled'
  | 'submission_due'
  | 'awaiting_confirmation'
  | 'awaiting_reconciliation'
  | 'overdue'
  | 'closed'

export interface PaymentCalendarItem {
  itemKind: PaymentCalendarItemKind
  itemId: string
  // Identificador del registro fuente (obligation_id o order_id)
  sourceId: string
  spaceId: string | null
  // Display
  title: string
  beneficiaryType: string | null
  beneficiaryName: string | null
  obligationKind: string | null
  batchKind: string | null
  // Money
  amount: number
  currency: 'CLP' | 'USD'
  // Calendar dates
  dueDate: string | null
  scheduledFor: string | null
  // Calendar state derivado
  calendarState: PaymentCalendarItemState
  // Source metadata
  rawState: string
  periodId: string | null
}

export interface ListCalendarFilters {
  spaceId?: string
  periodId?: string
  fromDate?: string
  toDate?: string
  currency?: 'CLP' | 'USD'
  beneficiaryType?: string
  calendarStates?: PaymentCalendarItemState[]
  itemKinds?: PaymentCalendarItemKind[]
}

interface CalendarRow extends Record<string, unknown> {
  item_kind: string
  item_id: string
  source_id: string
  space_id: string | null
  title: string
  beneficiary_type: string | null
  beneficiary_name: string | null
  obligation_kind: string | null
  batch_kind: string | null
  amount: number | string
  currency: string
  due_date: string | null
  scheduled_for: string | null
  calendar_state: string
  raw_state: string
  period_id: string | null
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
 * Lista items unificados del calendario de pagos. Compone obligations
 * y orders sin recalcular montos. El `calendar_state` se deriva en SQL
 * para manener la regla en un solo lugar.
 *
 * Reglas de derivacion:
 *   obligation:
 *     - status='generated' AND due<today  → 'overdue'
 *     - status='generated'                 → 'ready_to_schedule'
 *     - status='scheduled'                 → 'scheduled' (espera order para programar fecha real)
 *     - status='partially_paid'            → 'awaiting_reconciliation'
 *     - status='paid'                      → 'awaiting_reconciliation' (hasta closed)
 *     - status='reconciled'                → 'closed'
 *     - status='closed'                    → 'closed'
 *
 *   order:
 *     - state='draft'                      → 'ready_to_schedule'
 *     - state='pending_approval'           → 'ready_to_schedule'
 *     - state='approved' AND scheduled_for IS NULL → 'ready_to_schedule'
 *     - state='approved' AND scheduled_for IS NOT NULL → 'scheduled'
 *     - state='scheduled' AND scheduled_for < today → 'submission_due'
 *     - state='scheduled'                  → 'scheduled'
 *     - state='submitted'                  → 'awaiting_confirmation'
 *     - state='paid'                       → 'awaiting_reconciliation'
 *     - state='settled' / 'closed'         → 'closed'
 *     - state='cancelled' / 'failed'       → no aparecen en calendar
 */
export async function listPaymentCalendarItems(
  filters: ListCalendarFilters = {}
): Promise<PaymentCalendarItem[]> {
  const obligationConditions: string[] = ["status NOT IN ('cancelled', 'superseded')"]
  const orderConditions: string[] = ["state NOT IN ('cancelled', 'failed')"]
  const params: unknown[] = []
  let i = 1

  if (filters.spaceId) {
    obligationConditions.push(`space_id = $${i}`)
    orderConditions.push(`space_id = $${i}`)
    params.push(filters.spaceId)
    i += 1
  }

  if (filters.periodId) {
    obligationConditions.push(`period_id = $${i}`)
    orderConditions.push(`period_id = $${i}`)
    params.push(filters.periodId)
    i += 1
  }

  if (filters.currency) {
    obligationConditions.push(`currency = $${i}`)
    orderConditions.push(`currency = $${i}`)
    params.push(filters.currency)
    i += 1
  }

  if (filters.fromDate) {
    obligationConditions.push(`(due_date IS NULL OR due_date >= $${i}::date)`)
    orderConditions.push(
      `(scheduled_for IS NULL OR scheduled_for >= $${i}::date OR due_date >= $${i}::date)`
    )
    params.push(filters.fromDate)
    i += 1
  }

  if (filters.toDate) {
    obligationConditions.push(`(due_date IS NULL OR due_date <= $${i}::date)`)
    orderConditions.push(
      `(scheduled_for IS NULL OR scheduled_for <= $${i}::date OR due_date <= $${i}::date)`
    )
    params.push(filters.toDate)
    i += 1
  }

  if (filters.beneficiaryType) {
    obligationConditions.push(`beneficiary_type = $${i}`)
    params.push(filters.beneficiaryType)
    i += 1
  }

  const obligationsSql = `
    SELECT
      'obligation'::text AS item_kind,
      obligation_id AS item_id,
      obligation_id AS source_id,
      space_id,
      COALESCE(beneficiary_name, beneficiary_id) || ' · ' || obligation_kind AS title,
      beneficiary_type,
      beneficiary_name,
      obligation_kind,
      NULL::text AS batch_kind,
      amount,
      currency,
      due_date,
      NULL::date AS scheduled_for,
      CASE
        WHEN status = 'closed' THEN 'closed'
        WHEN status = 'reconciled' THEN 'closed'
        WHEN status = 'paid' THEN 'awaiting_reconciliation'
        WHEN status = 'partially_paid' THEN 'awaiting_reconciliation'
        WHEN status = 'scheduled' THEN 'scheduled'
        WHEN status = 'generated' AND due_date IS NOT NULL AND due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'ready_to_schedule'
      END AS calendar_state,
      status AS raw_state,
      period_id
    FROM greenhouse_finance.payment_obligations
    WHERE ${obligationConditions.join(' AND ')}
  `

  const ordersSql = `
    SELECT
      'order'::text AS item_kind,
      order_id AS item_id,
      order_id AS source_id,
      space_id,
      title,
      NULL::text AS beneficiary_type,
      NULL::text AS beneficiary_name,
      NULL::text AS obligation_kind,
      batch_kind,
      total_amount AS amount,
      currency,
      due_date,
      scheduled_for,
      CASE
        WHEN state IN ('settled', 'closed') THEN 'closed'
        WHEN state = 'paid' THEN 'awaiting_reconciliation'
        WHEN state = 'submitted' THEN 'awaiting_confirmation'
        WHEN state = 'scheduled' AND scheduled_for IS NOT NULL AND scheduled_for < CURRENT_DATE THEN 'submission_due'
        WHEN state = 'scheduled' THEN 'scheduled'
        WHEN state = 'approved' AND scheduled_for IS NOT NULL THEN 'scheduled'
        ELSE 'ready_to_schedule'
      END AS calendar_state,
      state AS raw_state,
      period_id
    FROM greenhouse_finance.payment_orders
    WHERE ${orderConditions.join(' AND ')}
  `

  let unionSql = ''
  const wantsObligations = !filters.itemKinds || filters.itemKinds.includes('obligation')
  const wantsOrders = !filters.itemKinds || filters.itemKinds.includes('order')

  if (wantsObligations && wantsOrders) {
    unionSql = `${obligationsSql} UNION ALL ${ordersSql}`
  } else if (wantsObligations) {
    unionSql = obligationsSql
  } else if (wantsOrders) {
    unionSql = ordersSql
  } else {
    return []
  }

  let finalSql = `SELECT * FROM (${unionSql}) calendar`

  if (filters.calendarStates && filters.calendarStates.length > 0) {
    finalSql += ` WHERE calendar_state = ANY($${i}::text[])`
    params.push(filters.calendarStates)
    i += 1
  }

  finalSql += ` ORDER BY COALESCE(scheduled_for, due_date, '9999-12-31'::date) ASC, amount DESC LIMIT 500`

  const rows = await query<CalendarRow>(finalSql, params)

  return rows.map(row => ({
    itemKind: row.item_kind as PaymentCalendarItemKind,
    itemId: row.item_id,
    sourceId: row.source_id,
    spaceId: row.space_id,
    title: row.title,
    beneficiaryType: row.beneficiary_type,
    beneficiaryName: row.beneficiary_name,
    obligationKind: row.obligation_kind,
    batchKind: row.batch_kind,
    amount: toNumber(row.amount),
    currency: row.currency as 'CLP' | 'USD',
    dueDate: row.due_date,
    scheduledFor: row.scheduled_for,
    calendarState: row.calendar_state as PaymentCalendarItemState,
    rawState: row.raw_state,
    periodId: row.period_id
  }))
}
