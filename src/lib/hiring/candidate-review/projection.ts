import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { readCleanHiringApplicationCvForProjection } from '@/lib/storage/greenhouse-assets'

import { candidateReviewFlags } from './config'
import {
  CANDIDATE_REVIEW_EXTRACTION_VERSION,
  CANDIDATE_REVIEW_REDACTION_VERSION,
  hashCandidateDocument,
  parseCandidatePdf
} from './parser'

export const invalidateCandidateReviewProjection = async (assetId: string) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_hiring.candidate_document_review_projection
        SET status='stale', text_content=NULL, updated_at=NOW()
      WHERE asset_id=$1 AND status<>'stale'`,
    [assetId]
  )
}

export const materializeCandidateReviewProjection = async (assetId: string) => {
  if (!candidateReviewFlags().projection) return { outcome: 'disabled' as const }

  const { asset, file } = await readCleanHiringApplicationCvForProjection(assetId)
  const bytes = new Uint8Array(file.arrayBuffer)
  const contentHash = hashCandidateDocument(bytes)
  let parsed:
    | Awaited<ReturnType<typeof parseCandidatePdf>>
    | { status: 'blocked'; text: null; pageCount: null }

  try {
    parsed = await parseCandidatePdf(bytes)
  } catch {
    parsed = { status: 'blocked', text: null, pageCount: null }
  }

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_hiring.candidate_document_review_projection
        SET status='stale', text_content=NULL, updated_at=NOW()
      WHERE application_id=$1 AND asset_id<>$2 AND status<>'stale'`,
    [asset.ownerAggregateId, asset.assetId]
  )
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_hiring.candidate_document_review_projection (
       asset_id,application_id,content_hash,extraction_version,redaction_policy_version,
       status,text_content,page_count,source_updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (asset_id,content_hash,extraction_version,redaction_policy_version)
     DO UPDATE SET status=EXCLUDED.status,text_content=EXCLUDED.text_content,
       page_count=EXCLUDED.page_count,source_updated_at=EXCLUDED.source_updated_at,
       extracted_at=NOW(),updated_at=NOW()`,
    [
      asset.assetId,
      asset.ownerAggregateId,
      contentHash,
      CANDIDATE_REVIEW_EXTRACTION_VERSION,
      CANDIDATE_REVIEW_REDACTION_VERSION,
      parsed.status,
      parsed.text,
      parsed.pageCount,
      asset.attachedAt ?? asset.uploadedAt ?? asset.createdAt
    ]
  )

  return { outcome: parsed.status, applicationId: asset.ownerAggregateId, contentHash }
}
