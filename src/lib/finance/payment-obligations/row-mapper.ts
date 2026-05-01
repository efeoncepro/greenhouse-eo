import type {
  PaymentObligation,
  PaymentObligationBeneficiaryType,
  PaymentObligationCurrency,
  PaymentObligationKind,
  PaymentObligationSourceKind,
  PaymentObligationStatus
} from '@/types/payment-obligations'

export interface ObligationRow extends Record<string, unknown> {
  obligation_id: string
  space_id: string | null
  source_kind: string
  source_ref: string
  period_id: string | null
  beneficiary_type: string
  beneficiary_id: string
  beneficiary_name: string | null
  beneficiary_avatar_url?: string | null
  obligation_kind: string
  amount: number | string
  currency: string
  status: string
  due_date: string | null
  metadata_json: Record<string, unknown>
  superseded_by: string | null
  cancelled_reason: string | null
  created_at: string
  updated_at: string
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const n = Number(value)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const toIsoString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value

  return new Date().toISOString()
}

export const mapObligationRow = (row: ObligationRow): PaymentObligation => ({
  obligationId: row.obligation_id,
  spaceId: row.space_id,
  sourceKind: row.source_kind as PaymentObligationSourceKind,
  sourceRef: row.source_ref,
  periodId: row.period_id,
  beneficiaryType: row.beneficiary_type as PaymentObligationBeneficiaryType,
  beneficiaryId: row.beneficiary_id,
  beneficiaryName: row.beneficiary_name,
  beneficiaryAvatarUrl: row.beneficiary_avatar_url ?? null,
  obligationKind: row.obligation_kind as PaymentObligationKind,
  amount: toNumber(row.amount),
  currency: row.currency as PaymentObligationCurrency,
  status: row.status as PaymentObligationStatus,
  dueDate: row.due_date,
  metadataJson: row.metadata_json ?? {},
  supersededBy: row.superseded_by,
  cancelledReason: row.cancelled_reason,
  createdAt: toIsoString(row.created_at),
  updatedAt: toIsoString(row.updated_at)
})
