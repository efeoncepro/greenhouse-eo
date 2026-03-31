import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { assertPayrollReceiptsReady } from '@/lib/payroll/postgres-store'
import { normalizeNullableString, toNumber, toTimestampString } from '@/lib/payroll/shared'

export type PayrollReceiptStatus = 'generated' | 'generation_failed' | 'email_sent' | 'email_failed'

export interface PayrollReceiptRecord {
  receiptId: string
  entryId: string
  periodId: string
  memberId: string
  payRegime: 'chile' | 'international'
  revision: number
  sourceEventId: string
  status: PayrollReceiptStatus
  assetId: string | null
  storageBucket: string | null
  storagePath: string | null
  fileSizeBytes: number | null
  generatedAt: string | null
  generatedBy: string | null
  generationError: string | null
  emailRecipient: string | null
  emailSentAt: string | null
  emailDeliveryId: string | null
  emailError: string | null
  templateVersion: string | null
  createdAt: string | null
  updatedAt: string | null
}

type PayrollReceiptRow = {
  receipt_id: string
  entry_id: string
  period_id: string
  member_id: string
  pay_regime: string
  revision: number | string
  source_event_id: string
  status: string
  asset_id: string | null
  storage_bucket: string | null
  storage_path: string | null
  file_size_bytes: number | string | null
  generated_at: { value?: string } | string | null
  generated_by: string | null
  generation_error: string | null
  email_recipient: string | null
  email_sent_at: { value?: string } | string | null
  email_delivery_id: string | null
  email_error: string | null
  template_version: string | null
  created_at: { value?: string } | string | null
  updated_at: { value?: string } | string | null
}

const normalizeReceiptStatus = (value: string | null): PayrollReceiptStatus => {
  if (value === 'generation_failed') return 'generation_failed'
  if (value === 'email_sent') return 'email_sent'
  if (value === 'email_failed') return 'email_failed'

  return 'generated'
}

const mapReceipt = (row: PayrollReceiptRow): PayrollReceiptRecord => ({
  receiptId: row.receipt_id,
  entryId: row.entry_id,
  periodId: row.period_id,
  memberId: row.member_id,
  payRegime: row.pay_regime === 'international' ? 'international' : 'chile',
  revision: toNumber(row.revision),
  sourceEventId: row.source_event_id,
  status: normalizeReceiptStatus(row.status),
  assetId: normalizeNullableString(row.asset_id),
  storageBucket: normalizeNullableString(row.storage_bucket),
  storagePath: normalizeNullableString(row.storage_path),
  fileSizeBytes: row.file_size_bytes == null ? null : toNumber(row.file_size_bytes),
  generatedAt: toTimestampString(row.generated_at),
  generatedBy: normalizeNullableString(row.generated_by),
  generationError: normalizeNullableString(row.generation_error),
  emailRecipient: normalizeNullableString(row.email_recipient),
  emailSentAt: toTimestampString(row.email_sent_at),
  emailDeliveryId: normalizeNullableString(row.email_delivery_id),
  emailError: normalizeNullableString(row.email_error),
  templateVersion: normalizeNullableString(row.template_version),
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

export const buildPayrollReceiptId = (entryId: string, revision: number) => `receipt_${entryId}_r${revision}`

export const buildPayrollReceiptStoragePath = (periodId: string, memberId: string, revision: number) =>
  `payroll-receipts/${periodId}/${memberId}-r${revision}.pdf`

export const getLatestPayrollReceiptRevision = async (periodId: string): Promise<number> => {
  await assertPayrollReceiptsReady()

  const rows = await runGreenhousePostgresQuery<{ revision: number | string | null }>(
    `
      SELECT MAX(revision) AS revision
      FROM greenhouse_payroll.payroll_receipts
      WHERE period_id = $1
    `,
    [periodId]
  )

  return toNumber(rows[0]?.revision ?? 0) + 1
}

export const getPayrollReceiptByEntryId = async (entryId: string): Promise<PayrollReceiptRecord | null> => {
  await assertPayrollReceiptsReady()

  const rows = await runGreenhousePostgresQuery<PayrollReceiptRow>(
    `
      SELECT *
      FROM greenhouse_payroll.payroll_receipts
      WHERE entry_id = $1
      ORDER BY revision DESC, created_at DESC
      LIMIT 1
    `,
    [entryId]
  )

  return rows[0] ? mapReceipt(rows[0]) : null
}

export const getPayrollReceiptRowsBySourceEvent = async (sourceEventId: string): Promise<PayrollReceiptRecord[]> => {
  await assertPayrollReceiptsReady()

  const rows = await runGreenhousePostgresQuery<PayrollReceiptRow>(
    `
      SELECT *
      FROM greenhouse_payroll.payroll_receipts
      WHERE source_event_id = $1
      ORDER BY created_at ASC, entry_id ASC
    `,
    [sourceEventId]
  )

  return rows.map(mapReceipt)
}

export const savePayrollReceipt = async (input: {
  receiptId: string
  entryId: string
  periodId: string
  memberId: string
  payRegime: 'chile' | 'international'
  revision: number
  sourceEventId: string
  status: PayrollReceiptStatus
  assetId?: string | null
  storageBucket?: string | null
  storagePath?: string | null
  fileSizeBytes?: number | null
  generatedAt?: string | null
  generatedBy?: string | null
  generationError?: string | null
  emailRecipient?: string | null
  emailSentAt?: string | null
  emailDeliveryId?: string | null
  emailError?: string | null
  templateVersion?: string | null
}) => {
  await assertPayrollReceiptsReady()

  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_payroll.payroll_receipts (
        receipt_id,
        entry_id,
        period_id,
        member_id,
        pay_regime,
        revision,
        source_event_id,
        status,
        asset_id,
        storage_bucket,
        storage_path,
        file_size_bytes,
        generated_at,
        generated_by,
        generation_error,
        email_recipient,
        email_sent_at,
        email_delivery_id,
        email_error,
        template_version,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (entry_id, revision) DO UPDATE SET
        source_event_id = EXCLUDED.source_event_id,
        status = EXCLUDED.status,
        asset_id = COALESCE(EXCLUDED.asset_id, greenhouse_payroll.payroll_receipts.asset_id),
        storage_bucket = COALESCE(EXCLUDED.storage_bucket, greenhouse_payroll.payroll_receipts.storage_bucket),
        storage_path = COALESCE(EXCLUDED.storage_path, greenhouse_payroll.payroll_receipts.storage_path),
        file_size_bytes = COALESCE(EXCLUDED.file_size_bytes, greenhouse_payroll.payroll_receipts.file_size_bytes),
        generated_at = COALESCE(EXCLUDED.generated_at, greenhouse_payroll.payroll_receipts.generated_at),
        generated_by = COALESCE(EXCLUDED.generated_by, greenhouse_payroll.payroll_receipts.generated_by),
        generation_error = EXCLUDED.generation_error,
        email_recipient = COALESCE(EXCLUDED.email_recipient, greenhouse_payroll.payroll_receipts.email_recipient),
        email_sent_at = COALESCE(EXCLUDED.email_sent_at, greenhouse_payroll.payroll_receipts.email_sent_at),
        email_delivery_id = COALESCE(EXCLUDED.email_delivery_id, greenhouse_payroll.payroll_receipts.email_delivery_id),
        email_error = EXCLUDED.email_error,
        template_version = COALESCE(EXCLUDED.template_version, greenhouse_payroll.payroll_receipts.template_version),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      input.receiptId,
      input.entryId,
      input.periodId,
      input.memberId,
      input.payRegime,
      input.revision,
      input.sourceEventId,
      input.status,
      input.assetId ?? null,
      input.storageBucket ?? null,
      input.storagePath ?? null,
      input.fileSizeBytes ?? null,
      input.generatedAt ?? null,
      input.generatedBy ?? null,
      input.generationError ?? null,
      input.emailRecipient ?? null,
      input.emailSentAt ?? null,
      input.emailDeliveryId ?? null,
      input.emailError ?? null,
      input.templateVersion ?? null
    ]
  )
}

/**
 * Update the template version, storage path, and file size after a lazy
 * regeneration of a stale cached PDF.
 */
export const updateReceiptAfterRegeneration = async (input: {
  receiptId: string
  assetId?: string | null
  storagePath: string
  storageBucket: string
  fileSizeBytes: number
  templateVersion: string
}) => {
  await assertPayrollReceiptsReady()

  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_payroll.payroll_receipts
      SET asset_id = COALESCE($2, asset_id),
          storage_path = $3,
          storage_bucket = $4,
          file_size_bytes = $5,
          template_version = $6,
          generated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE receipt_id = $1
    `,
    [input.receiptId, input.assetId ?? null, input.storagePath, input.storageBucket, input.fileSizeBytes, input.templateVersion]
  )
}
