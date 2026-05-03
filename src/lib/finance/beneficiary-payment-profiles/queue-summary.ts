import 'server-only'

import { query } from '@/lib/db'
import type { BeneficiaryPaymentProfileSafe } from '@/types/payment-profiles'

import { mapProfileRowSafe, type ProfileRow } from './row-mapper'
import {
  getPaymentProfileDriftForActiveObligations,
  type PaymentProfileDriftRow
} from './drift-detector'

export interface PaymentProfileQueueSummary {
  pendingApprovalCount: number
  activeCount: number
  supersededCount: number
  cancelledCount: number
  driftCount: number
  pendingApprovalProfiles: BeneficiaryPaymentProfileSafe[]
  driftRows: PaymentProfileDriftRow[]
}

interface CountRow extends Record<string, unknown> {
  status: string
  total: string
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
 * Snapshot consolidado para la surface ops `/finance/payment-profiles`.
 * En una sola llamada devuelve:
 *   - counts por status
 *   - lista de profiles en pending_approval (top 20)
 *   - drift: beneficiarios con obligaciones vivas sin perfil activo
 */
export async function getPaymentProfileQueueSummary(filters: {
  spaceId?: string | null
} = {}): Promise<PaymentProfileQueueSummary> {
  const conditions: string[] = ['TRUE']
  const params: unknown[] = []
  let i = 1

  if (filters.spaceId) {
    conditions.push(`space_id = $${i++}`)
    params.push(filters.spaceId)
  }

  const whereClause = conditions.join(' AND ')

  const [countRows, pendingRows, driftRows] = await Promise.all([
    query<CountRow>(
      `SELECT status, COUNT(*)::text AS total
         FROM greenhouse_finance.beneficiary_payment_profiles
        WHERE ${whereClause}
        GROUP BY status`,
      params
    ),
    query<ProfileRow>(
      `SELECT * FROM greenhouse_finance.beneficiary_payment_profiles
        WHERE ${whereClause}
          AND status = 'pending_approval'
        ORDER BY created_at ASC
        LIMIT 20`,
      params
    ),
    getPaymentProfileDriftForActiveObligations(filters)
  ])

  const countMap = new Map<string, number>()

  countRows.forEach(row => countMap.set(row.status, toNumber(row.total)))

  return {
    pendingApprovalCount: countMap.get('pending_approval') ?? 0,
    activeCount: countMap.get('active') ?? 0,
    supersededCount: countMap.get('superseded') ?? 0,
    cancelledCount: countMap.get('cancelled') ?? 0,
    driftCount: driftRows.length,
    pendingApprovalProfiles: pendingRows.map(mapProfileRowSafe),
    driftRows
  }
}
