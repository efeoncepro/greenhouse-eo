import 'server-only'

import { query } from '@/lib/db'

import { getContractorEngagementById } from '../store'
import type {
  ContractorSupportDocument,
  ContractorSupportDocumentsBundle,
} from './types'
import {
  resolveContractorSupportDocumentScope,
  summarizeContractorSupportDocuments
} from './summary'

interface ContractorSupportDocumentRow {
  invoice_asset_id: string
  invoice_asset_public_id: string
  contractor_engagement_id: string
  contractor_work_submission_id: string | null
  asset_id: string
  asset_public_id: string
  filename: string
  mime_type: string
  size_bytes: string | number
  asset_role: string
  artifact_kind: string
  source: string
  country_code: string | null
  invoice_asset_created_at: string | Date
  asset_uploaded_at: string | Date | null
  asset_attached_at: string | Date | null
  [column: string]: unknown
}

const toTimestamp = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : String(value)

const toNullableTimestamp = (value: string | Date | null): string | null =>
  value === null ? null : toTimestamp(value)

const toNumber = (value: string | number): number => {
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const buildAssetPreviewUrl = (assetId: string): string =>
  `/api/assets/private/${encodeURIComponent(assetId)}?inline=1`

const mapSupportDocument = (
  row: ContractorSupportDocumentRow,
  currentSubmissionId: string | null
): ContractorSupportDocument => ({
  invoiceAssetId: row.invoice_asset_id,
  invoiceAssetPublicId: row.invoice_asset_public_id,
  assetId: row.asset_id,
  assetPublicId: row.asset_public_id,
  filename: row.filename,
  mimeType: row.mime_type,
  sizeBytes: toNumber(row.size_bytes),
  assetRole: row.asset_role as ContractorSupportDocument['assetRole'],
  artifactKind: row.artifact_kind as ContractorSupportDocument['artifactKind'],
  source: row.source as ContractorSupportDocument['source'],
  countryCode: row.country_code,
  contractorWorkSubmissionId: row.contractor_work_submission_id,
  scope: resolveContractorSupportDocumentScope(row.contractor_work_submission_id, currentSubmissionId),
  previewUrl: buildAssetPreviewUrl(row.asset_id),
  createdAt: toTimestamp(row.invoice_asset_created_at),
  uploadedAt: toNullableTimestamp(row.asset_uploaded_at),
  attachedAt: toNullableTimestamp(row.asset_attached_at)
})

export const getContractorSupportDocumentsBundle = async (input: {
  contractorEngagementId: string
  contractorWorkSubmissionId?: string | null
}): Promise<ContractorSupportDocumentsBundle | null> => {
  const engagement = await getContractorEngagementById(input.contractorEngagementId)

  if (!engagement) return null

  const contractorWorkSubmissionId = input.contractorWorkSubmissionId ?? null

  const rows = await query<ContractorSupportDocumentRow>(
    `SELECT
       cia.invoice_asset_id,
       cia.public_id AS invoice_asset_public_id,
       cia.contractor_engagement_id,
       cia.contractor_work_submission_id,
       cia.asset_id,
       cia.asset_role,
       cia.artifact_kind,
       cia.source,
       cia.country_code,
       cia.created_at AS invoice_asset_created_at,
       a.public_id AS asset_public_id,
       a.filename,
       a.mime_type,
       a.size_bytes,
       a.uploaded_at AS asset_uploaded_at,
       a.attached_at AS asset_attached_at
     FROM greenhouse_hr.contractor_invoice_assets cia
     JOIN greenhouse_core.assets a
       ON a.asset_id = cia.asset_id
      AND a.status <> 'deleted'
     WHERE cia.contractor_engagement_id = $1
     ORDER BY cia.created_at DESC, cia.public_id DESC`,
    [input.contractorEngagementId]
  )

  const documents = rows.map(row => mapSupportDocument(row, contractorWorkSubmissionId))

  return {
    contractorEngagementId: engagement.contractorEngagementId,
    engagementPublicId: engagement.publicId,
    contractorWorkSubmissionId,
    documents,
    summary: summarizeContractorSupportDocuments(documents, {
      requiresInvoice: engagement.requiresInvoice,
      contractorWorkSubmissionId
    }),
    generatedAt: new Date().toISOString()
  }
}
