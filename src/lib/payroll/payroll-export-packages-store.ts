import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { normalizeNullableString, toNumber, toTimestampString } from '@/lib/payroll/shared'

export type PayrollExportPackageDeliveryStatus = 'pending' | 'sent' | 'failed'

export interface PayrollExportPackageRecord {
  periodId: string
  storageBucket: string | null
  pdfAssetId: string | null
  csvAssetId: string | null
  pdfStoragePath: string | null
  csvStoragePath: string | null
  pdfFileSizeBytes: number | null
  csvFileSizeBytes: number | null
  pdfTemplateVersion: string | null
  csvTemplateVersion: string | null
  generatedAt: string | null
  generatedBy: string | null
  deliveryStatus: PayrollExportPackageDeliveryStatus
  deliveryAttempts: number
  lastSentAt: string | null
  lastSentBy: string | null
  lastEmailDeliveryId: string | null
  lastSendError: string | null
  createdAt: string | null
  updatedAt: string | null
}

type PayrollExportPackageRow = {
  period_id: string
  storage_bucket: string | null
  pdf_asset_id: string | null
  csv_asset_id: string | null
  pdf_storage_path: string | null
  csv_storage_path: string | null
  pdf_file_size_bytes: number | string | null
  csv_file_size_bytes: number | string | null
  pdf_template_version: string | null
  csv_template_version: string | null
  generated_at: { value?: string } | string | null
  generated_by: string | null
  delivery_status: string | null
  delivery_attempts: number | string | null
  last_sent_at: { value?: string } | string | null
  last_sent_by: string | null
  last_email_delivery_id: string | null
  last_send_error: string | null
  created_at: { value?: string } | string | null
  updated_at: { value?: string } | string | null
}

const normalizeDeliveryStatus = (value: string | null): PayrollExportPackageDeliveryStatus => {
  if (value === 'sent') return 'sent'
  if (value === 'failed') return 'failed'

  return 'pending'
}

const mapPackage = (row: PayrollExportPackageRow): PayrollExportPackageRecord => ({
  periodId: row.period_id,
  storageBucket: normalizeNullableString(row.storage_bucket),
  pdfAssetId: normalizeNullableString(row.pdf_asset_id),
  csvAssetId: normalizeNullableString(row.csv_asset_id),
  pdfStoragePath: normalizeNullableString(row.pdf_storage_path),
  csvStoragePath: normalizeNullableString(row.csv_storage_path),
  pdfFileSizeBytes: row.pdf_file_size_bytes == null ? null : toNumber(row.pdf_file_size_bytes),
  csvFileSizeBytes: row.csv_file_size_bytes == null ? null : toNumber(row.csv_file_size_bytes),
  pdfTemplateVersion: normalizeNullableString(row.pdf_template_version),
  csvTemplateVersion: normalizeNullableString(row.csv_template_version),
  generatedAt: toTimestampString(row.generated_at),
  generatedBy: normalizeNullableString(row.generated_by),
  deliveryStatus: normalizeDeliveryStatus(row.delivery_status),
  deliveryAttempts: toNumber(row.delivery_attempts),
  lastSentAt: toTimestampString(row.last_sent_at),
  lastSentBy: normalizeNullableString(row.last_sent_by),
  lastEmailDeliveryId: normalizeNullableString(row.last_email_delivery_id),
  lastSendError: normalizeNullableString(row.last_send_error),
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

export const PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION = '2026-03-28.v1'

let ensureSchemaPromise: Promise<void> | null = null

const ensureSchema = async () => {
  if (ensureSchemaPromise) return ensureSchemaPromise

  ensureSchemaPromise = (async () => {
    await runGreenhousePostgresQuery(`
      CREATE SCHEMA IF NOT EXISTS greenhouse_payroll
    `)

    await runGreenhousePostgresQuery(`
      CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_export_packages (
        period_id TEXT PRIMARY KEY REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
        storage_bucket TEXT,
        pdf_asset_id TEXT,
        csv_asset_id TEXT,
        pdf_storage_path TEXT,
        csv_storage_path TEXT,
        pdf_file_size_bytes INTEGER,
        csv_file_size_bytes INTEGER,
        pdf_template_version TEXT,
        csv_template_version TEXT,
        generated_at TIMESTAMPTZ,
        generated_by TEXT,
        delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
        delivery_attempts INTEGER NOT NULL DEFAULT 0,
        last_sent_at TIMESTAMPTZ,
        last_sent_by TEXT,
        last_email_delivery_id TEXT,
        last_send_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await runGreenhousePostgresQuery(`
      CREATE INDEX IF NOT EXISTS payroll_export_packages_delivery_status_idx
        ON greenhouse_payroll.payroll_export_packages (delivery_status, updated_at DESC)
    `)

    await runGreenhousePostgresQuery(`
      CREATE INDEX IF NOT EXISTS payroll_export_packages_last_sent_idx
        ON greenhouse_payroll.payroll_export_packages (last_sent_at DESC, updated_at DESC)
    `)
  })().catch(error => {
    ensureSchemaPromise = null
    throw error
  })

  return ensureSchemaPromise.finally(() => {
    ensureSchemaPromise = null
  })
}

export const buildPayrollExportPackageStoragePath = (periodId: string, kind: 'pdf' | 'csv') =>
  `payroll-export-packages/${periodId}/payroll-${periodId}.${kind}`

export const buildPayrollExportPackageDownloadFilename = (periodId: string, kind: 'pdf' | 'csv') =>
  `payroll-${periodId}.${kind}`

export const getPayrollExportPackageByPeriodId = async (periodId: string): Promise<PayrollExportPackageRecord | null> => {
  await ensureSchema()

  const rows = await runGreenhousePostgresQuery<PayrollExportPackageRow>(
    `
      SELECT *
      FROM greenhouse_payroll.payroll_export_packages
      WHERE period_id = $1
      LIMIT 1
    `,
    [periodId]
  )

  return rows[0] ? mapPackage(rows[0]) : null
}

export const upsertPayrollExportPackageArtifacts = async (input: {
  periodId: string
  storageBucket: string
  pdfAssetId?: string | null
  csvAssetId?: string | null
  pdfStoragePath: string
  csvStoragePath: string
  pdfFileSizeBytes: number
  csvFileSizeBytes: number
  pdfTemplateVersion: string
  csvTemplateVersion: string
  generatedAt?: string | null
  generatedBy?: string | null
}) => {
  await ensureSchema()

  const rows = await runGreenhousePostgresQuery<PayrollExportPackageRow>(
    `
      INSERT INTO greenhouse_payroll.payroll_export_packages (
        period_id,
        storage_bucket,
        pdf_asset_id,
        csv_asset_id,
        pdf_storage_path,
        csv_storage_path,
        pdf_file_size_bytes,
        csv_file_size_bytes,
        pdf_template_version,
        csv_template_version,
        generated_at,
        generated_by,
        delivery_status,
        delivery_attempts,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, 'pending', 0,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (period_id) DO UPDATE SET
        storage_bucket = EXCLUDED.storage_bucket,
        pdf_asset_id = COALESCE(EXCLUDED.pdf_asset_id, greenhouse_payroll.payroll_export_packages.pdf_asset_id),
        csv_asset_id = COALESCE(EXCLUDED.csv_asset_id, greenhouse_payroll.payroll_export_packages.csv_asset_id),
        pdf_storage_path = EXCLUDED.pdf_storage_path,
        csv_storage_path = EXCLUDED.csv_storage_path,
        pdf_file_size_bytes = EXCLUDED.pdf_file_size_bytes,
        csv_file_size_bytes = EXCLUDED.csv_file_size_bytes,
        pdf_template_version = EXCLUDED.pdf_template_version,
        csv_template_version = EXCLUDED.csv_template_version,
        generated_at = COALESCE(EXCLUDED.generated_at, greenhouse_payroll.payroll_export_packages.generated_at),
        generated_by = COALESCE(EXCLUDED.generated_by, greenhouse_payroll.payroll_export_packages.generated_by),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [
      input.periodId,
      input.storageBucket,
      input.pdfAssetId ?? null,
      input.csvAssetId ?? null,
      input.pdfStoragePath,
      input.csvStoragePath,
      input.pdfFileSizeBytes,
      input.csvFileSizeBytes,
      input.pdfTemplateVersion,
      input.csvTemplateVersion,
      input.generatedAt ?? null,
      input.generatedBy ?? null
    ]
  )

  return rows[0] ? mapPackage(rows[0]) : null
}

export const recordPayrollExportPackageDelivery = async (input: {
  periodId: string
  deliveryStatus: PayrollExportPackageDeliveryStatus
  deliveryAttemptsDelta?: number
  lastSentAt?: string | null
  lastSentBy?: string | null
  lastEmailDeliveryId?: string | null
  lastSendError?: string | null
}) => {
  await ensureSchema()

  const rows = await runGreenhousePostgresQuery<PayrollExportPackageRow>(
    `
      UPDATE greenhouse_payroll.payroll_export_packages
      SET
        delivery_status = $2,
        delivery_attempts = COALESCE(delivery_attempts, 0) + $3,
        last_sent_at = $4,
        last_sent_by = $5,
        last_email_delivery_id = $6,
        last_send_error = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE period_id = $1
      RETURNING *
    `,
    [
      input.periodId,
      input.deliveryStatus,
      input.deliveryAttemptsDelta ?? 1,
      input.lastSentAt ?? null,
      input.lastSentBy ?? null,
      input.lastEmailDeliveryId ?? null,
      input.lastSendError ?? null
    ]
  )

  return rows[0] ? mapPackage(rows[0]) : null
}
