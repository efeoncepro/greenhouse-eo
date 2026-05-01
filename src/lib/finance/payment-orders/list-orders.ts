import 'server-only'

import { query } from '@/lib/db'
import type {
  PaymentOrder,
  PaymentOrderArtifact,
  PaymentOrderBatchKind,
  PaymentOrderLine,
  PaymentOrderState,
  PaymentOrderWithLines
} from '@/types/payment-orders'

import {
  mapOrderArtifactRow,
  mapOrderLineRow,
  mapOrderRow,
  type OrderArtifactRow,
  type OrderLineRow,
  type OrderRow
} from './row-mapper'

export interface ListPaymentOrdersFilters {
  spaceId?: string
  periodId?: string
  batchKind?: PaymentOrderBatchKind
  state?: PaymentOrderState | 'all'
  states?: PaymentOrderState[]
  scheduledFrom?: string
  scheduledTo?: string
  dueFrom?: string
  dueTo?: string
  createdBy?: string
  search?: string
  limit?: number
  offset?: number
}

export async function listPaymentOrders(
  filters: ListPaymentOrdersFilters = {}
): Promise<{ items: PaymentOrder[]; total: number }> {
  const conditions: string[] = ['TRUE']
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

  if (filters.batchKind) {
    conditions.push(`batch_kind = $${i++}`)
    params.push(filters.batchKind)
  }

  if (filters.state && filters.state !== 'all') {
    conditions.push(`state = $${i++}`)
    params.push(filters.state)
  } else if (filters.states && filters.states.length > 0) {
    conditions.push(`state = ANY($${i++}::text[])`)
    params.push(filters.states)
  }

  if (filters.scheduledFrom) {
    conditions.push(`scheduled_for >= $${i++}::date`)
    params.push(filters.scheduledFrom)
  }

  if (filters.scheduledTo) {
    conditions.push(`scheduled_for <= $${i++}::date`)
    params.push(filters.scheduledTo)
  }

  if (filters.dueFrom) {
    conditions.push(`due_date >= $${i++}::date`)
    params.push(filters.dueFrom)
  }

  if (filters.dueTo) {
    conditions.push(`due_date <= $${i++}::date`)
    params.push(filters.dueTo)
  }

  if (filters.createdBy) {
    conditions.push(`created_by = $${i++}`)
    params.push(filters.createdBy)
  }

  if (filters.search) {
    conditions.push(`(title ILIKE $${i} OR description ILIKE $${i} OR external_reference ILIKE $${i})`)
    params.push(`%${filters.search}%`)
    i += 1
  }

  const whereClause = conditions.join(' AND ')

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM greenhouse_finance.payment_orders WHERE ${whereClause}`,
    params
  )

  const total = Number(countRows[0]?.total ?? 0)

  const limit = Math.min(500, Math.max(1, filters.limit ?? 100))
  const offset = Math.max(0, filters.offset ?? 0)

  const rows = await query<OrderRow>(
    `SELECT * FROM greenhouse_finance.payment_orders
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  )

  return {
    items: rows.map(mapOrderRow),
    total
  }
}

export async function getPaymentOrderById(orderId: string): Promise<PaymentOrder | null> {
  const rows = await query<OrderRow>(
    `SELECT * FROM greenhouse_finance.payment_orders WHERE order_id = $1 LIMIT 1`,
    [orderId]
  )

  return rows[0] ? mapOrderRow(rows[0]) : null
}

export async function getPaymentOrderWithLines(
  orderId: string
): Promise<PaymentOrderWithLines | null> {
  const order = await getPaymentOrderById(orderId)

  if (!order) return null

  const [lineRows, artifactRows] = await Promise.all([
    query<OrderLineRow>(
      `SELECT * FROM greenhouse_finance.payment_order_lines
        WHERE order_id = $1
        ORDER BY created_at ASC`,
      [orderId]
    ),
    query<OrderArtifactRow>(
      `SELECT * FROM greenhouse_finance.payment_order_artifacts
        WHERE order_id = $1
        ORDER BY generated_at DESC`,
      [orderId]
    )
  ])

  const lines: PaymentOrderLine[] = lineRows.map(mapOrderLineRow)
  const artifacts: PaymentOrderArtifact[] = artifactRows.map(mapOrderArtifactRow)

  return { ...order, lines, artifacts }
}
