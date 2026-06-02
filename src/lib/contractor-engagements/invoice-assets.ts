import 'server-only'

import { randomUUID } from 'crypto'

import type { PoolClient } from 'pg'

import { query, withGreenhousePostgresTransaction } from '@/lib/db'
import { attachAssetToAggregate, getAssetById } from '@/lib/storage/greenhouse-assets'
import type { DraftUploadContext, GreenhouseAssetContext } from '@/types/assets'

import { ContractorEngagementValidationError } from './errors'
import {
  isContractorInvoiceArtifactKind,
  isContractorInvoiceAssetRole,
  isContractorInvoiceAssetSource,
  resolveFinalAttachContext
} from './invoice-asset-contracts'
import type {
  AttachContractorInvoiceAssetInput,
  ContractorInvoiceAsset
} from './invoice-asset-contracts'

interface ContractorInvoiceAssetRow {
  invoice_asset_id: string
  public_id: string
  contractor_engagement_id: string
  contractor_invoice_id: string | null
  contractor_work_submission_id: string | null
  asset_id: string
  asset_role: string
  artifact_kind: string
  source: string
  country_code: string | null
  uploaded_by_user_id: string | null
  metadata_json: unknown
  created_at: string | Date
  [column: string]: unknown
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const toTimestamp = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : String(value)

const SELECT_COLUMNS = `
  invoice_asset_id, public_id, contractor_engagement_id, contractor_invoice_id,
  contractor_work_submission_id, asset_id, asset_role, artifact_kind, source,
  country_code, uploaded_by_user_id, metadata_json, created_at
`

export const mapContractorInvoiceAsset = (
  row: ContractorInvoiceAssetRow
): ContractorInvoiceAsset => ({
  invoiceAssetId: row.invoice_asset_id,
  publicId: row.public_id,
  contractorEngagementId: row.contractor_engagement_id,
  contractorInvoiceId: row.contractor_invoice_id,
  contractorWorkSubmissionId: row.contractor_work_submission_id,
  assetId: row.asset_id,
  assetRole: row.asset_role as ContractorInvoiceAsset['assetRole'],
  artifactKind: row.artifact_kind as ContractorInvoiceAsset['artifactKind'],
  source: row.source as ContractorInvoiceAsset['source'],
  countryCode: row.country_code,
  uploadedByUserId: row.uploaded_by_user_id,
  metadata: toRecord(row.metadata_json),
  createdAt: toTimestamp(row.created_at)
})

// ── Readers ─────────────────────────────────────────────────────────────────

export const listContractorInvoiceAssetsByEngagement = async (
  contractorEngagementId: string
): Promise<ContractorInvoiceAsset[]> => {
  const rows = await query<ContractorInvoiceAssetRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_invoice_assets
     WHERE contractor_engagement_id = $1
     ORDER BY created_at DESC`,
    [contractorEngagementId]
  )

  return rows.map(mapContractorInvoiceAsset)
}

// ── Command ───────────────────────────────────────────────────────────────────

/**
 * TASK-791 — Attach a private asset as a contractor invoice/evidence/provider doc.
 *
 * Canonical pattern (mirror TASK-721 `declareReconciliationSnapshot`): validate
 * the asset + engagement OUTSIDE the tx, then INSERT the link row + flip the
 * asset pending→attached via `attachAssetToAggregate` in ONE transaction. The
 * link table is append-only; replacing a document = upload a new asset + a new row.
 */
export const attachContractorInvoiceAsset = async (
  input: AttachContractorInvoiceAssetInput
): Promise<ContractorInvoiceAsset> => {
  if (!isContractorInvoiceAssetRole(input.assetRole)) {
    throw new ContractorEngagementValidationError(
      'asset_role inválido.',
      'invalid_asset_role'
    )
  }

  if (!isContractorInvoiceArtifactKind(input.artifactKind)) {
    throw new ContractorEngagementValidationError(
      'artifact_kind inválido.',
      'invalid_artifact_kind'
    )
  }

  if (!isContractorInvoiceAssetSource(input.source)) {
    throw new ContractorEngagementValidationError('source inválido.', 'invalid_source')
  }

  // Pre-flight: engagement must exist; asset must exist, not deleted, and be in a
  // contractor invoice context.
  const engagementRows = await query<{ contractor_engagement_id: string }>(
    `SELECT contractor_engagement_id
     FROM greenhouse_hr.contractor_engagements
     WHERE contractor_engagement_id = $1`,
    [input.contractorEngagementId]
  )

  if (!engagementRows[0]) {
    throw new ContractorEngagementValidationError(
      'El engagement contractor no existe.',
      'engagement_not_found',
      404
    )
  }

  const asset = await getAssetById(input.assetId)

  if (!asset) {
    throw new ContractorEngagementValidationError(
      'El asset no existe.',
      'asset_not_found',
      404
    )
  }

  if (asset.status === 'deleted') {
    throw new ContractorEngagementValidationError(
      'El asset está eliminado y no puede adjuntarse.',
      'asset_deleted',
      409
    )
  }

  const finalContext = resolveFinalAttachContext(asset.ownerAggregateType)

  if (!finalContext) {
    throw new ContractorEngagementValidationError(
      'El asset no pertenece a un contexto de invoice/evidencia contractor.',
      'asset_context_not_contractor',
      409
    )
  }

  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    const result = await client.query<ContractorInvoiceAssetRow>(
      `INSERT INTO greenhouse_hr.contractor_invoice_assets (
         invoice_asset_id, public_id, contractor_engagement_id, contractor_invoice_id,
         contractor_work_submission_id, asset_id, asset_role, artifact_kind, source,
         country_code, uploaded_by_user_id, metadata_json
       ) VALUES (
         $1,
         'EO-CIA-' || LPAD(nextval('greenhouse_hr.seq_contractor_invoice_asset_public_id')::text, 4, '0'),
         $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb
       )
       RETURNING ${SELECT_COLUMNS}`,
      [
        `cia-${randomUUID()}`,
        input.contractorEngagementId,
        input.contractorInvoiceId ?? null,
        input.contractorWorkSubmissionId ?? null,
        input.assetId,
        input.assetRole,
        input.artifactKind,
        input.source,
        input.countryCode ?? null,
        input.actorUserId,
        JSON.stringify(input.metadata ?? {})
      ]
    )

    const invoiceAsset = mapContractorInvoiceAsset(result.rows[0])

    // Flip asset pending→attached, anchored to this link row, in the same tx.
    await attachAssetToAggregate({
      assetId: input.assetId,
      ownerAggregateType: finalContext as Exclude<GreenhouseAssetContext, DraftUploadContext>,
      ownerAggregateId: invoiceAsset.invoiceAssetId,
      actorUserId: input.actorUserId,
      metadata: {
        contractorEngagementId: input.contractorEngagementId,
        assetRole: input.assetRole,
        artifactKind: input.artifactKind,
        source: input.source
      },
      client
    })

    return invoiceAsset
  })
}
