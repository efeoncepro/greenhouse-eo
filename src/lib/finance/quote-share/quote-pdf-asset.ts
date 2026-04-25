import 'server-only'

import { query } from '@/lib/db'
import { renderQuotationPdf } from '@/lib/finance/pdf/render-quotation-pdf'
import {
  downloadGreenhouseStorageObject
} from '@/lib/storage/greenhouse-media'
import {
  storeSystemGeneratedPrivateAsset
} from '@/lib/storage/greenhouse-assets'

import { loadInternalPdfInputForQuote } from './load-quote-for-pdf-internal'

/**
 * TASK-631 Fase 4 — PDF asset cache layer.
 *
 * Pattern mirrors `payroll-export-packages.ts`:
 * - First call → renders via @react-pdf, uploads to GCS bucket
 *   (private-assets), persists row in `quote_pdf_assets` + asset record
 * - Subsequent calls → checks `canReuseStoredQuotePdf` (template version
 *   match + quote not updated since generation) → downloads buffer from
 *   GCS, returns it
 *
 * If quote is updated after the cached PDF was generated, regeneration
 * happens automatically on the next access.
 */

/**
 * Bumped whenever the visual design of the PDF changes (e.g. TASK-629 v2 → v3).
 * Mismatch forces lazy regeneration on next access — distributes load over time
 * instead of a deploy-day spike.
 */
export const QUOTE_PDF_TEMPLATE_VERSION = '1'

export interface QuotePdfAssetRecord {
  quotationId: string
  versionNumber: number
  assetId: string
  storageBucket: string
  storagePath: string
  fileName: string
  fileSizeBytes: number
  templateVersion: string
  generatedAt: string
  generatedBy: string | null
}

interface QuotePdfAssetRow extends Record<string, unknown> {
  quotation_id: string
  version_number: number
  asset_id: string
  storage_bucket: string
  storage_path: string
  file_name: string
  file_size_bytes: number
  template_version: string
  generated_at: string | Date
  generated_by: string | null
}

const normalizeRow = (row: QuotePdfAssetRow): QuotePdfAssetRecord => ({
  quotationId: row.quotation_id,
  versionNumber: Number(row.version_number),
  assetId: row.asset_id,
  storageBucket: row.storage_bucket,
  storagePath: row.storage_path,
  fileName: row.file_name,
  fileSizeBytes: Number(row.file_size_bytes),
  templateVersion: row.template_version,
  generatedAt:
    row.generated_at instanceof Date ? row.generated_at.toISOString() : row.generated_at,
  generatedBy: row.generated_by
})

export const getQuotePdfAssetRecord = async (
  quotationId: string,
  versionNumber: number
): Promise<QuotePdfAssetRecord | null> => {
  const rows = await query<QuotePdfAssetRow>(
    `SELECT * FROM greenhouse_commercial.quote_pdf_assets
       WHERE quotation_id = $1 AND version_number = $2`,
    [quotationId, versionNumber]
  )

  return rows[0] ? normalizeRow(rows[0]) : null
}

interface QuoteFreshness {
  quoteUpdatedAt: string | null
  latestLineItemUpdatedAt: string | null
}

const getQuoteFreshness = async (
  quotationId: string,
  versionNumber: number
): Promise<QuoteFreshness> => {
  const headerRows = await query<{ updated_at: string | Date | null }>(
    `SELECT updated_at FROM greenhouse_commercial.quotations WHERE quotation_id = $1`,
    [quotationId]
  )

  const lineRows = await query<{ max_updated: string | Date | null }>(
    `SELECT MAX(updated_at) AS max_updated
       FROM greenhouse_commercial.quotation_line_items
       WHERE quotation_id = $1 AND version_number = $2`,
    [quotationId, versionNumber]
  )

  const toIso = (v: string | Date | null): string | null =>
    v instanceof Date ? v.toISOString() : v

  return {
    quoteUpdatedAt: toIso(headerRows[0]?.updated_at ?? null),
    latestLineItemUpdatedAt: toIso(lineRows[0]?.max_updated ?? null)
  }
}

export const canReuseStoredQuotePdf = (
  record: QuotePdfAssetRecord,
  freshness: QuoteFreshness
): boolean => {
  if (record.templateVersion !== QUOTE_PDF_TEMPLATE_VERSION) return false

  const generatedMs = Date.parse(record.generatedAt)

  if (!Number.isFinite(generatedMs)) return false

  const candidates = [freshness.quoteUpdatedAt, freshness.latestLineItemUpdatedAt]

  for (const candidate of candidates) {
    if (!candidate) continue
    const candidateMs = Date.parse(candidate)

    if (Number.isFinite(candidateMs) && candidateMs > generatedMs) return false
  }

  return true
}

export interface GetOrCreateInput {
  quotationId: string
  versionNumber: number
  generatedBy?: string | null
}

export interface QuotePdfBufferResult {
  buffer: Buffer
  fileName: string
  fileSizeBytes: number
  wasGenerated: boolean
  assetId: string
  generatedAt: string
}

const upsertAssetRow = async (input: {
  quotationId: string
  versionNumber: number
  assetId: string
  storageBucket: string
  storagePath: string
  fileName: string
  fileSizeBytes: number
  generatedBy: string | null
}): Promise<void> => {
  await query(
    `INSERT INTO greenhouse_commercial.quote_pdf_assets
         (quotation_id, version_number, asset_id, storage_bucket, storage_path,
          file_name, file_size_bytes, template_version, generated_at, generated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9)
     ON CONFLICT (quotation_id, version_number) DO UPDATE SET
       asset_id = EXCLUDED.asset_id,
       storage_bucket = EXCLUDED.storage_bucket,
       storage_path = EXCLUDED.storage_path,
       file_name = EXCLUDED.file_name,
       file_size_bytes = EXCLUDED.file_size_bytes,
       template_version = EXCLUDED.template_version,
       generated_at = EXCLUDED.generated_at,
       generated_by = EXCLUDED.generated_by`,
    [
      input.quotationId,
      input.versionNumber,
      input.assetId,
      input.storageBucket,
      input.storagePath,
      input.fileName,
      input.fileSizeBytes,
      QUOTE_PDF_TEMPLATE_VERSION,
      input.generatedBy
    ]
  )
}

const generateAndPersist = async (
  input: GetOrCreateInput,
  existing: QuotePdfAssetRecord | null
): Promise<QuotePdfBufferResult> => {
  const pdfInput = await loadInternalPdfInputForQuote(input.quotationId, input.versionNumber, {
    actorUserId: input.generatedBy ?? null
  })

  const buffer = await renderQuotationPdf(pdfInput)
  const fileName = `${pdfInput.quotationNumber}-v${pdfInput.versionNumber}.pdf`

  const asset = await storeSystemGeneratedPrivateAsset({
    assetId: existing?.assetId ?? null,
    ownerAggregateType: 'quote_pdf',
    ownerAggregateId: `${input.quotationId}:v${input.versionNumber}`,
    fileName,
    mimeType: 'application/pdf',
    bytes: buffer,
    actorUserId: input.generatedBy ?? null,
    metadata: {
      quotationId: input.quotationId,
      versionNumber: input.versionNumber,
      templateVersion: QUOTE_PDF_TEMPLATE_VERSION
    }
  })

  await upsertAssetRow({
    quotationId: input.quotationId,
    versionNumber: input.versionNumber,
    assetId: asset.assetId,
    storageBucket: asset.bucketName,
    storagePath: asset.objectPath,
    fileName,
    fileSizeBytes: buffer.byteLength,
    generatedBy: input.generatedBy ?? null
  })

  return {
    buffer,
    fileName,
    fileSizeBytes: buffer.byteLength,
    wasGenerated: true,
    assetId: asset.assetId,
    generatedAt: new Date().toISOString()
  }
}

/**
 * Returns the PDF buffer for a quote+version, generating + persisting if
 * needed, or downloading from GCS if a fresh cached copy exists.
 */
export const getOrCreateQuotePdfBuffer = async (
  input: GetOrCreateInput
): Promise<QuotePdfBufferResult> => {
  const existing = await getQuotePdfAssetRecord(input.quotationId, input.versionNumber)

  if (existing) {
    const freshness = await getQuoteFreshness(input.quotationId, input.versionNumber)

    if (canReuseStoredQuotePdf(existing, freshness)) {
      try {
        const downloaded = await downloadGreenhouseStorageObject({
          bucketName: existing.storageBucket,
          objectName: existing.storagePath
        })

        return {
          buffer: Buffer.from(downloaded.arrayBuffer),
          fileName: existing.fileName,
          fileSizeBytes: existing.fileSizeBytes,
          wasGenerated: false,
          assetId: existing.assetId,
          generatedAt: existing.generatedAt
        }
      } catch (error) {
        console.warn(
          '[quote-pdf-asset] Cached PDF download failed; regenerating',
          error instanceof Error ? error.message : error
        )

        // Fall through to regeneration — bucket object may have been
        // lifecycle-deleted or moved to COLDLINE with cold restore needed
      }
    }
  }

  return generateAndPersist(input, existing)
}
