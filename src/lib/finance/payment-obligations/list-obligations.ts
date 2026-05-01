import 'server-only'

import { query } from '@/lib/db'
import type { PaymentObligation, PaymentObligationStatus } from '@/types/payment-obligations'

import { mapObligationRow, type ObligationRow } from './row-mapper'

export interface ListObligationsFilters {
  periodId?: string
  beneficiaryId?: string
  beneficiaryType?: string
  obligationKind?: string
  status?: PaymentObligationStatus | 'all'
  sourceKind?: string
  spaceId?: string
  limit?: number
  offset?: number
}

export async function listPaymentObligations(
  filters: ListObligationsFilters = {}
): Promise<{ items: PaymentObligation[]; total: number }> {
  const conditions: string[] = ['TRUE']
  const params: unknown[] = []
  let i = 1

  if (filters.periodId) {
    conditions.push(`period_id = $${i++}`)
    params.push(filters.periodId)
  }

  if (filters.beneficiaryId) {
    conditions.push(`beneficiary_id = $${i++}`)
    params.push(filters.beneficiaryId)
  }

  if (filters.beneficiaryType) {
    conditions.push(`beneficiary_type = $${i++}`)
    params.push(filters.beneficiaryType)
  }

  if (filters.obligationKind) {
    conditions.push(`obligation_kind = $${i++}`)
    params.push(filters.obligationKind)
  }

  if (filters.status && filters.status !== 'all') {
    conditions.push(`status = $${i++}`)
    params.push(filters.status)
  }

  if (filters.sourceKind) {
    conditions.push(`source_kind = $${i++}`)
    params.push(filters.sourceKind)
  }

  if (filters.spaceId) {
    conditions.push(`space_id = $${i++}`)
    params.push(filters.spaceId)
  }

  const whereClause = conditions.join(' AND ')

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM greenhouse_finance.payment_obligations WHERE ${whereClause}`,
    params
  )

  const total = Number(countRows[0]?.total ?? 0)

  const limit = Math.min(500, Math.max(1, filters.limit ?? 100))
  const offset = Math.max(0, filters.offset ?? 0)

  const rows = await query<ObligationRow>(
    `SELECT * FROM greenhouse_finance.payment_obligations
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  )

  return {
    items: rows.map(mapObligationRow),
    total
  }
}

export async function getPaymentObligationById(
  obligationId: string
): Promise<PaymentObligation | null> {
  const rows = await query<ObligationRow>(
    `SELECT * FROM greenhouse_finance.payment_obligations WHERE obligation_id = $1 LIMIT 1`,
    [obligationId]
  )

  return rows[0] ? mapObligationRow(rows[0]) : null
}
