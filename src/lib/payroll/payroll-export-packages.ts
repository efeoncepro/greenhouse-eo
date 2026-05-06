import 'server-only'

import { Buffer } from 'node:buffer'

import type { CurrencyBreakdown } from '@/emails/PayrollExportReadyEmail'
import { query } from '@/lib/db'
import { sendEmail } from '@/lib/email/delivery'
import { formatCurrency } from '@/lib/format'
import { generatePayrollCsv } from '@/lib/payroll/export-payroll'
import { generatePayrollPeriodPdf } from '@/lib/payroll/generate-payroll-pdf'
import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import {
  buildPayrollExportPackageDownloadFilename,
  buildPayrollExportPackageStoragePath,
  getPayrollExportPackageByPeriodId,
  PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION,
  recordPayrollExportPackageDelivery,
  upsertPayrollExportPackageArtifacts,
  type PayrollExportPackageRecord
} from '@/lib/payroll/payroll-export-packages-store'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { downloadGreenhouseMediaAsset, uploadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'
import { getGreenhousePrivateAssetsBucket, upsertSystemGeneratedAsset } from '@/lib/storage/greenhouse-assets'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const formatMoney = (value: number, currency: string) =>
  formatCurrency(
    value,
    currency as 'CLP' | 'USD',
    currency === 'USD' ? { currencySymbol: 'US$' } : {},
    currency === 'USD' ? 'en-US' : undefined
  )

const buildBreakdowns = (
  entries: Awaited<ReturnType<typeof getPayrollEntries>>
): CurrencyBreakdown[] => {
  const grouped = new Map<string, { currency: string; regimeLabel: string; gross: number; net: number; count: number }>()

  for (const entry of entries) {
    const currency = entry.currency || 'CLP'
    const existing = grouped.get(currency)

    if (existing) {
      existing.gross += entry.grossTotal
      existing.net += entry.netTotal
      existing.count++
    } else {
      grouped.set(currency, {
        currency,
        regimeLabel: entry.payRegime === 'chile' ? 'Chile' : 'Internacional',
        gross: entry.grossTotal,
        net: entry.netTotal,
        count: 1
      })
    }
  }

  return Array.from(grouped.values()).map(g => ({
    currency: g.currency,
    regimeLabel: g.regimeLabel,
    grossTotal: formatMoney(g.gross, g.currency),
    netTotal: formatMoney(g.net, g.currency),
    entryCount: g.count
  }))
}

const buildNetTotalDisplay = (breakdowns: CurrencyBreakdown[]) =>
  breakdowns.map(b => b.netTotal).join(' + ') || '—'

export interface PayrollExportPackageAssets {
  periodId: string
  periodYear: number
  periodMonth: number
  entries: Awaited<ReturnType<typeof getPayrollEntries>>
  pdfBuffer: Buffer
  csvBuffer: Buffer
  record: PayrollExportPackageRecord
  wasGenerated: boolean
}

export interface PayrollExportArtifactDelivery {
  buffer: Buffer
  contentType: string
  filename: string
  record: PayrollExportPackageRecord
  wasGenerated: boolean
}

export const buildPayrollExportArtifactFilename = (periodId: string, kind: 'pdf' | 'csv') =>
  buildPayrollExportPackageDownloadFilename(periodId, kind)

const readStoredArtifact = async (storagePath: string) =>
  Buffer.from((await downloadGreenhouseMediaAsset(storagePath)).arrayBuffer)

// TASK-409 hotfix 2026-04-15 — content-freshness cache invariant.
//
// The package record carries a `generatedAt` timestamp that marks when
// the PDF/CSV files in storage were materialized. Before trusting a
// cached package, we compare it against the most recent `updated_at`
// across the currently-active payroll entries for the period. If any
// active entry was touched after the package was generated (e.g. a
// reliquidación created a v2 row via supersede, or a manual edit
// landed), the stored files are stale and MUST be regenerated.
//
// Without this check, the cache would only invalidate on template
// version bumps and storage path drops — the observed bug on Marzo
// 2026 was exactly that: post-reliquidación, `canReuseStoredPackage`
// returned true, the email attached the v1 PDF/CSV, and the operator
// received a report that no longer matched the live Finance state.
//
// The query is one cheap SELECT over the partial unique index
// `payroll_entries_period_member_active_unique` which covers
// (period_id, member_id) WHERE is_active=TRUE.
const getLatestActiveEntryTimestamp = async (periodId: string): Promise<string | null> => {
  const rows = await query<{ latest: Date | string | null }>(
    `
      SELECT MAX(updated_at) AS latest
      FROM greenhouse_payroll.payroll_entries
      WHERE period_id = $1
        AND is_active = TRUE
    `,
    [periodId]
  )

  const latest = rows[0]?.latest

  if (!latest) return null

  return latest instanceof Date ? latest.toISOString() : String(latest)
}

export const canReuseStoredPackage = (
  record: PayrollExportPackageRecord,
  latestEntryTimestamp: string | null
) => {
  if (record.pdfTemplateVersion !== PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION) return false
  if (record.csvTemplateVersion !== PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION) return false
  if (!record.pdfStoragePath || !record.csvStoragePath) return false

  if (!record.generatedAt) return false

  // If we can't read the entry freshness for any reason, regenerate
  // rather than serve a possibly-stale package. Fail-safe default.
  if (!latestEntryTimestamp) return false

  const generatedAtMs = Date.parse(record.generatedAt)
  const latestEntryMs = Date.parse(latestEntryTimestamp)

  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(latestEntryMs)) return false

  // Entries newer than the package → regenerate.
  return latestEntryMs <= generatedAtMs
}

const generateAndPersistPackage = async (params: {
  periodId: string
  generatedBy?: string | null
  existingRecord?: PayrollExportPackageRecord | null
}) => {
  const pdfBuffer = await generatePayrollPeriodPdf(params.periodId)
  const csvText = await generatePayrollCsv(params.periodId)
  const csvBuffer = Buffer.from(csvText, 'utf8')
  const storageBucket = getGreenhousePrivateAssetsBucket()
  const pdfStoragePath = buildPayrollExportPackageStoragePath(params.periodId, 'pdf')
  const csvStoragePath = buildPayrollExportPackageStoragePath(params.periodId, 'csv')

  const [pdfUploadedPath, csvUploadedPath] = await Promise.all([
    uploadGreenhouseStorageObject({
      bucketName: storageBucket,
      objectName: pdfStoragePath,
      contentType: 'application/pdf',
      bytes: pdfBuffer,
      cacheControl: 'private, max-age=0, must-revalidate'
    }),
    uploadGreenhouseStorageObject({
      bucketName: storageBucket,
      objectName: csvStoragePath,
      contentType: 'text/csv; charset=utf-8',
      bytes: csvBuffer,
      cacheControl: 'private, max-age=0, must-revalidate'
    })
  ])

  const [pdfAsset, csvAsset] = await Promise.all([
    upsertSystemGeneratedAsset({
      assetId: params.existingRecord?.pdfAssetId ?? null,
      ownerAggregateType: 'payroll_export_pdf',
      ownerAggregateId: params.periodId,
      bucketName: storageBucket,
      objectPath: pdfStoragePath,
      fileName: buildPayrollExportArtifactFilename(params.periodId, 'pdf'),
      mimeType: 'application/pdf',
      sizeBytes: pdfBuffer.byteLength,
      actorUserId: params.generatedBy ?? null,
      metadata: {
        periodId: params.periodId,
        kind: 'pdf'
      }
    }),
    upsertSystemGeneratedAsset({
      assetId: params.existingRecord?.csvAssetId ?? null,
      ownerAggregateType: 'payroll_export_csv',
      ownerAggregateId: params.periodId,
      bucketName: storageBucket,
      objectPath: csvStoragePath,
      fileName: buildPayrollExportArtifactFilename(params.periodId, 'csv'),
      mimeType: 'text/csv; charset=utf-8',
      sizeBytes: csvBuffer.byteLength,
      actorUserId: params.generatedBy ?? null,
      metadata: {
        periodId: params.periodId,
        kind: 'csv'
      }
    })
  ])

  const record = await upsertPayrollExportPackageArtifacts({
    periodId: params.periodId,
    storageBucket,
    pdfAssetId: pdfAsset.assetId,
    csvAssetId: csvAsset.assetId,
    pdfStoragePath: pdfUploadedPath,
    csvStoragePath: csvUploadedPath,
    pdfFileSizeBytes: pdfBuffer.byteLength,
    csvFileSizeBytes: csvBuffer.byteLength,
    pdfTemplateVersion: PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION,
    csvTemplateVersion: PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy: params.generatedBy ?? null
  })

  if (!record) {
    throw new Error('Unable to persist payroll export package.')
  }

  return {
    pdfBuffer,
    csvBuffer,
    record,
    wasGenerated: true
  }
}

export const getOrCreatePayrollExportPackageAssets = async (
  periodId: string,
  generatedBy?: string | null
): Promise<PayrollExportPackageAssets> => {
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved or exported periods can generate reports.', 409)
  }

  const entries = await getPayrollEntries(periodId)

  const [existing, latestEntryTimestamp] = await Promise.all([
    getPayrollExportPackageByPeriodId(periodId),
    getLatestActiveEntryTimestamp(periodId)
  ])

  if (existing && canReuseStoredPackage(existing, latestEntryTimestamp)) {
    try {
      const [pdfBuffer, csvBuffer] = await Promise.all([
        readStoredArtifact(existing.pdfStoragePath as string),
        readStoredArtifact(existing.csvStoragePath as string)
      ])

      return {
        periodId,
        periodYear: period.year,
        periodMonth: period.month,
        entries,
        pdfBuffer,
        csvBuffer,
        record: existing,
        wasGenerated: false
      }
    } catch {
      // Fall through to regeneration if either artifact is missing or stale.
    }
  }

  const generated = await generateAndPersistPackage({
    periodId,
    generatedBy,
    existingRecord: existing
  })

  return {
    periodId,
    periodYear: period.year,
    periodMonth: period.month,
    entries,
    pdfBuffer: generated.pdfBuffer,
    csvBuffer: generated.csvBuffer,
    record: generated.record,
    wasGenerated: generated.wasGenerated
  }
}

export const getPayrollExportArtifact = async (
  periodId: string,
  kind: 'pdf' | 'csv',
  generatedBy?: string | null
): Promise<PayrollExportArtifactDelivery> => {
  const assets = await getOrCreatePayrollExportPackageAssets(periodId, generatedBy)
  const buffer = kind === 'pdf' ? assets.pdfBuffer : assets.csvBuffer
  const contentType = kind === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8'

  return {
    buffer,
    contentType,
    filename: buildPayrollExportArtifactFilename(periodId, kind),
    record: assets.record,
    wasGenerated: assets.wasGenerated
  }
}

export const sendPayrollExportReadyNotification = async (periodId: string, actorEmail?: string | null) => {
  const assets = await getOrCreatePayrollExportPackageAssets(periodId, actorEmail)
  const periodLabel = `${MONTH_NAMES[assets.periodMonth - 1] ?? String(assets.periodMonth)} ${assets.periodYear}`

  const breakdowns = buildBreakdowns(assets.entries)
  const netTotalDisplay = buildNetTotalDisplay(breakdowns)

  try {
    const result = await sendEmail({
      emailType: 'payroll_export',
      domain: 'payroll',
      context: {
        periodLabel,
        entryCount: assets.entries.length,
        breakdowns,
        netTotalDisplay,
        exportedBy: actorEmail ?? null,
        exportedAt: new Date().toISOString()
      },
      attachments: [
        {
          filename: buildPayrollExportArtifactFilename(periodId, 'pdf'),
          content: assets.pdfBuffer,
          contentType: 'application/pdf'
        },
        {
          filename: buildPayrollExportArtifactFilename(periodId, 'csv'),
          content: assets.csvBuffer,
          contentType: 'text/csv; charset=utf-8'
        }
      ],
      sourceEntity: periodId,
      actorEmail: actorEmail ?? undefined
    })

    if (result.status === 'sent') {
      await recordPayrollExportPackageDelivery({
        periodId,
        deliveryStatus: 'sent',
        deliveryAttemptsDelta: 1,
        lastSentAt: new Date().toISOString(),
        lastSentBy: actorEmail ?? null,
        lastEmailDeliveryId: result.resendId,
        lastSendError: null
      })

      return result.resendId
    }

    await recordPayrollExportPackageDelivery({
      periodId,
      deliveryStatus: 'failed',
      deliveryAttemptsDelta: result.status === 'failed' ? 1 : 0,
      lastSentAt: null,
      lastSentBy: actorEmail ?? null,
      lastEmailDeliveryId: null,
      lastSendError: result.error ?? 'Email delivery skipped.'
    })

    return null
  } catch (error) {
    await recordPayrollExportPackageDelivery({
      periodId,
      deliveryStatus: 'failed',
      deliveryAttemptsDelta: 1,
      lastSentAt: null,
      lastSentBy: actorEmail ?? null,
      lastEmailDeliveryId: null,
      lastSendError: error instanceof Error ? error.message : 'Failed to send payroll export ready email.'
    })

    throw error
  }
}
