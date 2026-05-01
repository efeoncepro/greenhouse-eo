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
  /** Si true, excluye obligations en status='cancelled' o 'superseded' (default false). */
  excludeCancelled?: boolean
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
    conditions.push(`o.period_id = $${i++}`)
    params.push(filters.periodId)
  }

  if (filters.beneficiaryId) {
    conditions.push(`o.beneficiary_id = $${i++}`)
    params.push(filters.beneficiaryId)
  }

  if (filters.beneficiaryType) {
    conditions.push(`o.beneficiary_type = $${i++}`)
    params.push(filters.beneficiaryType)
  }

  if (filters.obligationKind) {
    conditions.push(`o.obligation_kind = $${i++}`)
    params.push(filters.obligationKind)
  }

  if (filters.status && filters.status !== 'all') {
    conditions.push(`o.status = $${i++}`)
    params.push(filters.status)
  }

  if (filters.sourceKind) {
    conditions.push(`o.source_kind = $${i++}`)
    params.push(filters.sourceKind)
  }

  if (filters.spaceId) {
    conditions.push(`o.space_id = $${i++}`)
    params.push(filters.spaceId)
  }

  if (filters.excludeCancelled) {
    conditions.push(`o.status NOT IN ('cancelled', 'superseded')`)
  }

  const whereClause = conditions.join(' AND ')

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
       FROM greenhouse_finance.payment_obligations AS o
       LEFT JOIN greenhouse_core.members AS m
         ON o.beneficiary_type = 'member' AND m.member_id = o.beneficiary_id
      WHERE ${whereClause}`,
    params
  )

  const total = Number(countRows[0]?.total ?? 0)

  const limit = Math.min(500, Math.max(1, filters.limit ?? 100))
  const offset = Math.max(0, filters.offset ?? 0)

  // LEFT JOIN with members ONLY for member-type beneficiaries to fetch avatar_url.
  // Other beneficiary types (supplier, tax_authority, processor) don't have avatars.
  const rows = await query<ObligationRow>(
    `SELECT o.*,
            CASE
              WHEN o.beneficiary_type = 'member' THEN m.avatar_url
              ELSE NULL
            END AS beneficiary_avatar_url
       FROM greenhouse_finance.payment_obligations AS o
       LEFT JOIN greenhouse_core.members AS m
         ON o.beneficiary_type = 'member' AND m.member_id = o.beneficiary_id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
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
