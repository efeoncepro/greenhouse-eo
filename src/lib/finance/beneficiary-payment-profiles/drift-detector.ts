import 'server-only'

import { query } from '@/lib/db'

export interface PaymentProfileDriftRow {
  beneficiaryType: string
  beneficiaryId: string
  beneficiaryName: string | null
  currency: 'CLP' | 'USD'
  obligationCount: number
  totalAmount: number
  oldestObligationDueDate: string | null
}

interface DriftRow extends Record<string, unknown> {
  beneficiary_type: string
  beneficiary_id: string
  beneficiary_name: string | null
  currency: string
  obligation_count: string
  total_amount: string
  oldest_obligation_due_date: string | null
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
 * Detecta drift: beneficiarios con obligaciones vivas (status NOT IN
 * paid/cancelled/superseded/closed) que NO tienen un perfil de pago
 * `active` para esa moneda. Esto bloquea Payment Orders porque el
 * resolver retorna `profile_missing` y no se puede generar la order.
 *
 * Solo aplica a beneficiary_type IN (member, shareholder) — V1 de
 * TASK-749 solo soporta routing automatico para esos.
 */
export async function getPaymentProfileDriftForActiveObligations(filters: {
  spaceId?: string | null
} = {}): Promise<PaymentProfileDriftRow[]> {
  const conditions: string[] = [
    "o.beneficiary_type IN ('member', 'shareholder')",
    "o.status NOT IN ('paid', 'cancelled', 'superseded', 'closed', 'reconciled')"
  ]

  const params: unknown[] = []
  let i = 1

  if (filters.spaceId) {
    conditions.push(`o.space_id = $${i++}`)
    params.push(filters.spaceId)
  }

  const rows = await query<DriftRow>(
    `SELECT
       o.beneficiary_type,
       o.beneficiary_id,
       MAX(o.beneficiary_name) AS beneficiary_name,
       o.currency,
       COUNT(*)::text AS obligation_count,
       COALESCE(SUM(o.amount), 0)::text AS total_amount,
       MIN(o.due_date)::text AS oldest_obligation_due_date
     FROM greenhouse_finance.payment_obligations o
     WHERE ${conditions.join(' AND ')}
       AND NOT EXISTS (
         SELECT 1 FROM greenhouse_finance.beneficiary_payment_profiles p
         WHERE p.beneficiary_type = o.beneficiary_type
           AND p.beneficiary_id = o.beneficiary_id
           AND p.currency = o.currency
           AND p.status = 'active'
           AND COALESCE(p.space_id, '__no_space__') = COALESCE(o.space_id, '__no_space__')
       )
     GROUP BY o.beneficiary_type, o.beneficiary_id, o.currency
     ORDER BY MIN(o.due_date) ASC NULLS LAST, COUNT(*) DESC
     LIMIT 200`,
    params
  )

  return rows.map(row => ({
    beneficiaryType: row.beneficiary_type,
    beneficiaryId: row.beneficiary_id,
    beneficiaryName: row.beneficiary_name,
    currency: row.currency as 'CLP' | 'USD',
    obligationCount: toNumber(row.obligation_count),
    totalAmount: toNumber(row.total_amount),
    oldestObligationDueDate: row.oldest_obligation_due_date
  }))
}
