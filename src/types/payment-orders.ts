// TASK-750 — Payment Orders domain types.
// Spec: docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md.

export const PAYMENT_ORDER_BATCH_KINDS = [
  'payroll',
  'supplier',
  'tax',
  'mixed',
  'manual'
] as const

export type PaymentOrderBatchKind = (typeof PAYMENT_ORDER_BATCH_KINDS)[number]

export const PAYMENT_ORDER_STATES = [
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'submitted',
  'paid',
  'settled',
  'closed',
  'failed',
  'cancelled'
] as const

export type PaymentOrderState = (typeof PAYMENT_ORDER_STATES)[number]

export const PAYMENT_ORDER_PAYMENT_METHODS = [
  'bank_transfer',
  'wire',
  'paypal',
  'wise',
  'deel',
  'global66',
  'manual_cash',
  'check',
  'sii_pec',
  'other'
] as const

export type PaymentOrderPaymentMethod = (typeof PAYMENT_ORDER_PAYMENT_METHODS)[number]

export const PAYMENT_ORDER_LINE_STATES = [
  'pending',
  'submitted',
  'paid',
  'failed',
  'cancelled'
] as const

export type PaymentOrderLineState = (typeof PAYMENT_ORDER_LINE_STATES)[number]

export const PAYMENT_ORDER_ARTIFACT_KINDS = [
  'batch_csv',
  'batch_xml',
  'submission_proof',
  'payment_receipt',
  'reconciliation_evidence',
  'other'
] as const

export type PaymentOrderArtifactKind = (typeof PAYMENT_ORDER_ARTIFACT_KINDS)[number]

export type PaymentOrderCurrency = 'CLP' | 'USD'

export interface PaymentOrder {
  orderId: string
  spaceId: string | null
  batchKind: PaymentOrderBatchKind
  periodId: string | null
  title: string
  description: string | null
  processorSlug: string | null
  paymentMethod: PaymentOrderPaymentMethod | null
  sourceAccountId: string | null
  totalAmount: number
  currency: PaymentOrderCurrency
  fxRateSnapshot: number | null
  fxLockedAt: string | null
  scheduledFor: string | null
  dueDate: string | null
  submittedAt: string | null
  paidAt: string | null
  state: PaymentOrderState
  requireApproval: boolean
  createdBy: string
  approvedBy: string | null
  approvedAt: string | null
  cancelledBy: string | null
  cancelledReason: string | null
  cancelledAt: string | null
  supersededBy: string | null
  externalReference: string | null
  externalStatus: string | null
  failureReason: string | null
  metadataJson: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface PaymentOrderLine {
  lineId: string
  orderId: string
  obligationId: string
  beneficiaryType: string
  beneficiaryId: string
  beneficiaryName: string | null
  obligationKind: string
  amount: number
  currency: PaymentOrderCurrency
  isPartial: boolean
  state: PaymentOrderLineState
  failureReason: string | null
  metadataJson: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface PaymentOrderArtifact {
  artifactId: string
  orderId: string
  artifactKind: PaymentOrderArtifactKind
  assetId: string | null
  contentHash: string | null
  contentHashAlgorithm: 'sha256'
  fileName: string | null
  mimeType: string | null
  byteSize: number | null
  downloadLogJson: Array<{
    downloadedAt: string
    downloadedByUserId: string
    ip?: string
    userAgent?: string
  }>
  generatedBy: string | null
  generatedAt: string
  metadataJson: Record<string, unknown>
}

/**
 * TASK-765 Slice 7 — settlement_blocked outbox events surface for the
 * OrderDetailDrawer banner. The reader pulls the last 5 events of type
 * `finance.payment_order.settlement_blocked` for this aggregate (last 7
 * days). Slice 4 will start emitting these events from the loud resolver;
 * slice 8 consumes them to drive the recovery CTA.
 */
export type PaymentOrderBlockedReason =
  | 'expense_unresolved'
  | 'account_missing'
  | 'cutover_violation'
  | 'materializer_dead_letter'
  | 'out_of_scope_v1'

export interface PaymentOrderBlockedEvent {
  reason: PaymentOrderBlockedReason | string
  detail: string
  blockedAt: string
}

export interface PaymentOrderWithLines extends PaymentOrder {
  lines: PaymentOrderLine[]
  artifacts: PaymentOrderArtifact[]

  /**
   * Últimos 5 eventos `finance.payment_order.settlement_blocked` de los últimos
   * 7 días para esta orden, ordenados más reciente primero. Vacío en steady
   * state. El drawer pinta un Alert rojo con CTA "Recuperar orden" cuando
   * length > 0.
   */
  recentBlockedEvents: PaymentOrderBlockedEvent[]
}
