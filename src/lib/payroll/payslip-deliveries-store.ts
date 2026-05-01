import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-759 V2 — Append-only ledger de envíos de comunicaciones de nómina.
 *
 * Una `payroll_receipts` (artefacto PDF) puede tener N `payslip_deliveries`
 * (envíos de mensajes con kind diferenciado): committed (promesa pre-pago),
 * paid (recibo final), cancelled (notificación), revised (ajuste),
 * manual_resend (operativo).
 *
 * Idempotency: partial unique index `(entry_id, delivery_kind)` cuando
 * `superseded_by IS NULL AND status IN ('sent','queued')`. El conflicto
 * lo manejamos en el helper `recordPayslipDelivery` con upsert ON CONFLICT.
 */

export type PayslipDeliveryKind =
  | 'period_exported'
  | 'payment_committed'
  | 'payment_paid'
  | 'payment_cancelled'
  | 'payment_revised'
  | 'manual_resend'

export type PayslipDeliveryStatus = 'queued' | 'sent' | 'failed' | 'skipped' | 'superseded'

export interface PayslipDeliveryRecord {
  deliveryId: string
  receiptId: string
  entryId: string
  memberId: string
  periodId: string
  deliveryKind: PayslipDeliveryKind
  paymentOrderId: string | null
  paymentOrderLineId: string | null
  sourceEventId: string | null
  triggeredByUserId: string | null
  status: PayslipDeliveryStatus
  emailRecipient: string | null
  emailSubject: string | null
  emailProviderId: string | null
  errorMessage: string | null
  templateVersion: string | null
  scheduledFor: string | null
  sentAt: string | null
  failedAt: string | null
  supersededBy: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

interface PayslipDeliveryRow extends Record<string, unknown> {
  delivery_id: string
  receipt_id: string
  entry_id: string
  member_id: string
  period_id: string
  delivery_kind: string
  payment_order_id: string | null
  payment_order_line_id: string | null
  source_event_id: string | null
  triggered_by_user_id: string | null
  status: string
  email_recipient: string | null
  email_subject: string | null
  email_provider_id: string | null
  error_message: string | null
  template_version: string | null
  scheduled_for: string | null
  sent_at: string | null
  failed_at: string | null
  superseded_by: string | null
  metadata_json: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

const VALID_KINDS = new Set<PayslipDeliveryKind>([
  'period_exported',
  'payment_committed',
  'payment_paid',
  'payment_cancelled',
  'payment_revised',
  'manual_resend'
])

const VALID_STATUSES = new Set<PayslipDeliveryStatus>(['queued', 'sent', 'failed', 'skipped', 'superseded'])

const normalizeKind = (raw: string): PayslipDeliveryKind => {
  if (VALID_KINDS.has(raw as PayslipDeliveryKind)) return raw as PayslipDeliveryKind

  return 'period_exported'
}

const normalizeStatus = (raw: string): PayslipDeliveryStatus => {
  if (VALID_STATUSES.has(raw as PayslipDeliveryStatus)) return raw as PayslipDeliveryStatus

  return 'queued'
}

const mapRow = (row: PayslipDeliveryRow): PayslipDeliveryRecord => ({
  deliveryId: row.delivery_id,
  receiptId: row.receipt_id,
  entryId: row.entry_id,
  memberId: row.member_id,
  periodId: row.period_id,
  deliveryKind: normalizeKind(row.delivery_kind),
  paymentOrderId: row.payment_order_id,
  paymentOrderLineId: row.payment_order_line_id,
  sourceEventId: row.source_event_id,
  triggeredByUserId: row.triggered_by_user_id,
  status: normalizeStatus(row.status),
  emailRecipient: row.email_recipient,
  emailSubject: row.email_subject,
  emailProviderId: row.email_provider_id,
  errorMessage: row.error_message,
  templateVersion: row.template_version,
  scheduledFor: row.scheduled_for,
  sentAt: row.sent_at,
  failedAt: row.failed_at,
  supersededBy: row.superseded_by,
  metadata: row.metadata_json ?? {},
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

/**
 * Inserta o actualiza una delivery row.
 *
 * Para kinds idempotentes (committed/paid/cancelled/revised/period_exported),
 * la partial UNIQUE constraint asegura que solo una delivery activa
 * (superseded_by NULL, status sent/queued) existe por (entry_id, kind).
 *
 * Si conflict: hace UPDATE del status/error/timestamp en la row existente.
 *
 * `manual_resend` siempre crea row nueva (no entra en partial unique).
 */
export interface RecordPayslipDeliveryInput {
  deliveryId: string
  receiptId: string
  entryId: string
  memberId: string
  periodId: string
  deliveryKind: PayslipDeliveryKind
  paymentOrderId?: string | null
  paymentOrderLineId?: string | null
  sourceEventId?: string | null
  triggeredByUserId?: string | null
  status: PayslipDeliveryStatus
  emailRecipient?: string | null
  emailSubject?: string | null
  emailProviderId?: string | null
  errorMessage?: string | null
  templateVersion?: string | null
  scheduledFor?: string | null
  sentAt?: string | null
  failedAt?: string | null
  metadata?: Record<string, unknown>
}

export const recordPayslipDelivery = async (input: RecordPayslipDeliveryInput): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_payroll.payslip_deliveries (
       delivery_id, receipt_id, entry_id, member_id, period_id,
       delivery_kind, payment_order_id, payment_order_line_id,
       source_event_id, triggered_by_user_id,
       status, email_recipient, email_subject, email_provider_id, error_message,
       template_version, scheduled_for, sent_at, failed_at,
       metadata_json, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8,
       $9, $10,
       $11, $12, $13, $14, $15,
       $16, $17, $18, $19,
       $20::jsonb, NOW(), NOW()
     )
     ON CONFLICT (delivery_id) DO UPDATE SET
       status = EXCLUDED.status,
       email_provider_id = COALESCE(EXCLUDED.email_provider_id, greenhouse_payroll.payslip_deliveries.email_provider_id),
       error_message = EXCLUDED.error_message,
       sent_at = COALESCE(EXCLUDED.sent_at, greenhouse_payroll.payslip_deliveries.sent_at),
       failed_at = COALESCE(EXCLUDED.failed_at, greenhouse_payroll.payslip_deliveries.failed_at),
       template_version = COALESCE(EXCLUDED.template_version, greenhouse_payroll.payslip_deliveries.template_version),
       metadata_json = greenhouse_payroll.payslip_deliveries.metadata_json || EXCLUDED.metadata_json,
       updated_at = NOW()`,
    [
      input.deliveryId,
      input.receiptId,
      input.entryId,
      input.memberId,
      input.periodId,
      input.deliveryKind,
      input.paymentOrderId ?? null,
      input.paymentOrderLineId ?? null,
      input.sourceEventId ?? null,
      input.triggeredByUserId ?? null,
      input.status,
      input.emailRecipient ?? null,
      input.emailSubject ?? null,
      input.emailProviderId ?? null,
      input.errorMessage ?? null,
      input.templateVersion ?? null,
      input.scheduledFor ?? null,
      input.sentAt ?? null,
      input.failedAt ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  )
}

/**
 * Verifica si ya existe una delivery activa (no superseded, status sent/queued)
 * para (entry, kind). Usado para idempotency check antes de enviar.
 */
export const hasActivePayslipDelivery = async (
  entryId: string,
  kind: PayslipDeliveryKind
): Promise<PayslipDeliveryRecord | null> => {
  const rows = await runGreenhousePostgresQuery<PayslipDeliveryRow>(
    `SELECT *
       FROM greenhouse_payroll.payslip_deliveries
      WHERE entry_id = $1
        AND delivery_kind = $2
        AND superseded_by IS NULL
        AND status IN ('sent', 'queued')
      ORDER BY created_at DESC
      LIMIT 1`,
    [entryId, kind]
  )

  return rows[0] ? mapRow(rows[0]) : null
}

/**
 * Lista todas las deliveries para un entry, ordenadas cronológicamente.
 * Usado para el timeline en UI (drawer de obligation, /my/payroll, ops resend).
 */
export const getPayslipDeliveriesForEntry = async (entryId: string): Promise<PayslipDeliveryRecord[]> => {
  const rows = await runGreenhousePostgresQuery<PayslipDeliveryRow>(
    `SELECT *
       FROM greenhouse_payroll.payslip_deliveries
      WHERE entry_id = $1
      ORDER BY created_at ASC`,
    [entryId]
  )

  return rows.map(mapRow)
}

/**
 * Lista todas las deliveries para una payment_order, agrupadas por entry.
 * Usado para el drawer de payment_order (sección "Comunicaciones a colaboradores").
 */
export const getPayslipDeliveriesForOrder = async (orderId: string): Promise<PayslipDeliveryRecord[]> => {
  const rows = await runGreenhousePostgresQuery<PayslipDeliveryRow>(
    `SELECT *
       FROM greenhouse_payroll.payslip_deliveries
      WHERE payment_order_id = $1
      ORDER BY created_at ASC`,
    [orderId]
  )

  return rows.map(mapRow)
}

/**
 * Marca deliveries existentes como superseded por una nueva (e.g. cuando una
 * orden se cancela, las deliveries 'committed' previas quedan superseded por
 * la nueva 'cancelled'). Audit chain preservado.
 */
export const supersedePayslipDeliveries = async (input: {
  entryId: string
  kindToSupersede: PayslipDeliveryKind
  newDeliveryId: string
}): Promise<number> => {
  const result = await runGreenhousePostgresQuery<{ delivery_id: string }>(
    `UPDATE greenhouse_payroll.payslip_deliveries
        SET superseded_by = $1, status = 'superseded', updated_at = NOW()
      WHERE entry_id = $2
        AND delivery_kind = $3
        AND superseded_by IS NULL
        AND status IN ('sent', 'queued')
      RETURNING delivery_id`,
    [input.newDeliveryId, input.entryId, input.kindToSupersede]
  )

  return result.length
}

export const buildPayslipDeliveryId = (entryId: string, kind: PayslipDeliveryKind, qualifier?: string): string => {
  const seed = qualifier ?? `${Date.now()}`

  return `pdv-${entryId}-${kind}-${seed.slice(0, 12)}`
}
