import type {
  PaymentOrder,
  PaymentOrderArtifact,
  PaymentOrderArtifactKind,
  PaymentOrderBatchKind,
  PaymentOrderCurrency,
  PaymentOrderLine,
  PaymentOrderLineState,
  PaymentOrderPaymentMethod,
  PaymentOrderState
} from '@/types/payment-orders'

export interface OrderRow extends Record<string, unknown> {
  order_id: string
  space_id: string | null
  batch_kind: string
  period_id: string | null
  title: string
  description: string | null
  processor_slug: string | null
  payment_method: string | null
  source_account_id: string | null
  total_amount: number | string
  currency: string
  fx_rate_snapshot: number | string | null
  fx_locked_at: string | Date | null
  scheduled_for: string | Date | null
  due_date: string | Date | null
  submitted_at: string | Date | null
  paid_at: string | Date | null
  state: string
  require_approval: boolean
  created_by: string
  approved_by: string | null
  approved_at: string | Date | null
  cancelled_by: string | null
  cancelled_reason: string | null
  cancelled_at: string | Date | null
  superseded_by: string | null
  external_reference: string | null
  external_status: string | null
  failure_reason: string | null
  metadata_json: Record<string, unknown> | null
  created_at: string | Date
  updated_at: string | Date
}

export interface OrderLineRow extends Record<string, unknown> {
  line_id: string
  order_id: string
  obligation_id: string
  beneficiary_type: string
  beneficiary_id: string
  beneficiary_name: string | null
  obligation_kind: string
  amount: number | string
  currency: string
  is_partial: boolean
  state: string
  failure_reason: string | null
  metadata_json: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface OrderArtifactRow extends Record<string, unknown> {
  artifact_id: string
  order_id: string
  artifact_kind: string
  asset_id: string | null
  content_hash: string | null
  content_hash_algorithm: string
  file_name: string | null
  mime_type: string | null
  byte_size: number | string | null
  download_log_json: unknown
  generated_by: string | null
  generated_at: string
  metadata_json: Record<string, unknown> | null
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const n = Number(value)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const n = toNumber(value)

  return Number.isFinite(n) ? n : null
}

const toIsoString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value

  return new Date().toISOString()
}

const toNullableIsoString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null

  return toIsoString(value)
}

export const mapOrderRow = (row: OrderRow): PaymentOrder => ({
  orderId: row.order_id,
  spaceId: row.space_id,
  batchKind: row.batch_kind as PaymentOrderBatchKind,
  periodId: row.period_id,
  title: row.title,
  description: row.description,
  processorSlug: row.processor_slug,
  paymentMethod: (row.payment_method as PaymentOrderPaymentMethod | null) ?? null,
  sourceAccountId: row.source_account_id,
  totalAmount: toNumber(row.total_amount),
  currency: row.currency as PaymentOrderCurrency,
  fxRateSnapshot: toNullableNumber(row.fx_rate_snapshot),
  fxLockedAt: toNullableIsoString(row.fx_locked_at),
  scheduledFor: toNullableIsoString(row.scheduled_for),
  dueDate: toNullableIsoString(row.due_date),
  submittedAt: toNullableIsoString(row.submitted_at),
  paidAt: toNullableIsoString(row.paid_at),
  state: row.state as PaymentOrderState,
  requireApproval: row.require_approval,
  createdBy: row.created_by,
  approvedBy: row.approved_by,
  approvedAt: toNullableIsoString(row.approved_at),
  cancelledBy: row.cancelled_by,
  cancelledReason: row.cancelled_reason,
  cancelledAt: toNullableIsoString(row.cancelled_at),
  supersededBy: row.superseded_by,
  externalReference: row.external_reference,
  externalStatus: row.external_status,
  failureReason: row.failure_reason,
  metadataJson: row.metadata_json ?? {},
  createdAt: toIsoString(row.created_at),
  updatedAt: toIsoString(row.updated_at)
})

export const mapOrderLineRow = (row: OrderLineRow): PaymentOrderLine => ({
  lineId: row.line_id,
  orderId: row.order_id,
  obligationId: row.obligation_id,
  beneficiaryType: row.beneficiary_type,
  beneficiaryId: row.beneficiary_id,
  beneficiaryName: row.beneficiary_name,
  obligationKind: row.obligation_kind,
  amount: toNumber(row.amount),
  currency: row.currency as PaymentOrderCurrency,
  isPartial: row.is_partial,
  state: row.state as PaymentOrderLineState,
  failureReason: row.failure_reason,
  metadataJson: row.metadata_json ?? {},
  createdAt: toIsoString(row.created_at),
  updatedAt: toIsoString(row.updated_at)
})

export const mapOrderArtifactRow = (row: OrderArtifactRow): PaymentOrderArtifact => {
  const downloadLog = Array.isArray(row.download_log_json)
    ? (row.download_log_json as PaymentOrderArtifact['downloadLogJson'])
    : []

  return {
    artifactId: row.artifact_id,
    orderId: row.order_id,
    artifactKind: row.artifact_kind as PaymentOrderArtifactKind,
    assetId: row.asset_id,
    contentHash: row.content_hash,
    contentHashAlgorithm: 'sha256',
    fileName: row.file_name,
    mimeType: row.mime_type,
    byteSize: toNullableNumber(row.byte_size),
    downloadLogJson: downloadLog,
    generatedBy: row.generated_by,
    generatedAt: toIsoString(row.generated_at),
    metadataJson: row.metadata_json ?? {}
  }
}
