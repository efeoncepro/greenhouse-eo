import 'server-only'

import type { PoolClient } from 'pg'

import { captureWithDomain } from '@/lib/observability/capture'
import { computeBytesSha256 } from '@/lib/payroll/final-settlement/document-hash'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'

import type {
  ContractingDocumentLanguage,
  ContractingDocumentKind,
  ContractingPdfSnapshot
} from './contracting-document-types'
import { buildContractingPdfSnapshot } from './contracting-document-snapshot'
import {
  CONTRACTING_DOCUMENT_TEMPLATE_VERSION,
  renderContractingDocumentPdf
} from './contracting-document-pdf'
import type { WorkforceContractingStructuredContent } from '../types'

interface CaseRenderRow {
  case_kind: ContractingDocumentKind
  jurisdiction_pack_code: string
  authoritative_language: ContractingDocumentLanguage
  member_id: string | null
  pdf_facts_snapshot: ContractingPdfSnapshot | null
}

interface ApprovedDraftRow {
  structured_content_json: WorkforceContractingStructuredContent
  captured_facts_json: Record<string, unknown> | null
}

/**
 * TASK-1023 — atomic PDF (re)render for a contracting case at a given status. Mirror of the
 * finiquito `regenerateDocumentPdfForStatus` (TASK-863 V1.5.2): render → store private asset
 * (metadata.documentStatusAtRender) → UPDATE case pdf_asset_id + content_hash + status_at_render.
 * The immutable pdf_facts_snapshot is captured on the FIRST render and reused for every re-render
 * (OQ1), so a status transition only changes the watermark — never the approved content.
 *
 * Soft-fail: the state transition is the SSOT and already committed; a render failure is captured
 * to Sentry (domain=workforce) and returns null so the caller can recover via re-render.
 */
export const regenerateContractingPdfForStatus = async (
  client: PoolClient,
  caseId: string,
  newStatus: string,
  actorUserId: string
): Promise<{ pdfAssetId: string; contentHash: string } | null> => {
  try {
    const caseResult = await client.query<CaseRenderRow>(
      `SELECT case_kind, jurisdiction_pack_code, authoritative_language, member_id, pdf_facts_snapshot
       FROM greenhouse_hr.workforce_contracting_cases
       WHERE case_id = $1
       FOR UPDATE`,
      [caseId]
    )

    const caseRow = caseResult.rows[0]

    if (!caseRow) return null

    // Reuse the immutable snapshot if present (re-render only changes the watermark); else build it
    // once from the approved draft + live employer identity and persist it.
    let snapshot = caseRow.pdf_facts_snapshot

    if (!snapshot) {
      const draftResult = await client.query<ApprovedDraftRow>(
        `SELECT structured_content_json, captured_facts_json
         FROM greenhouse_hr.workforce_contracting_drafts
         WHERE case_id = $1 AND status = 'approved_for_pdf'
         ORDER BY draft_version DESC
         LIMIT 1`,
        [caseId]
      )

      const draftRow = draftResult.rows[0]

      if (!draftRow) return null

      snapshot = await buildContractingPdfSnapshot({
        caseKind: caseRow.case_kind,
        jurisdictionPackCode: caseRow.jurisdiction_pack_code,
        authoritativeLanguage: caseRow.authoritative_language,
        structuredContent: draftRow.structured_content_json,
        capturedFacts: draftRow.captured_facts_json,
        renderedAt: new Date()
      })
    }

    const pdfBytes = await renderContractingDocumentPdf(snapshot, { documentStatus: newStatus })
    const contentHash = computeBytesSha256(pdfBytes)
    const fileName = `${snapshot.caseKind}-${caseId}-${newStatus}.pdf`

    const asset = await storeSystemGeneratedPrivateAsset({
      ownerAggregateType: 'workforce_contracting_document',
      ownerAggregateId: caseId,
      ownerMemberId: caseRow.member_id,
      fileName,
      mimeType: 'application/pdf',
      bytes: pdfBytes,
      actorUserId,
      metadata: {
        caseKind: snapshot.caseKind,
        jurisdictionPackCode: snapshot.jurisdictionPackCode,
        documentStatusAtRender: newStatus,
        templateVersion: CONTRACTING_DOCUMENT_TEMPLATE_VERSION,
        contentHash
      }
    })

    await client.query(
      `UPDATE greenhouse_hr.workforce_contracting_cases
       SET pdf_asset_id = $2,
           pdf_content_hash = $3,
           pdf_template_version = $4,
           pdf_status_at_render = $5,
           pdf_generated_at = now(),
           pdf_facts_snapshot = COALESCE(pdf_facts_snapshot, $6::jsonb),
           updated_at = now()
       WHERE case_id = $1`,
      [caseId, asset.assetId, contentHash, CONTRACTING_DOCUMENT_TEMPLATE_VERSION, newStatus, JSON.stringify(snapshot)]
    )

    return { pdfAssetId: asset.assetId, contentHash }
  } catch (error) {
    captureWithDomain(error, 'workforce', {
      tags: { source: 'contracting_pdf_regen', stage: newStatus },
      extra: { caseId }
    })
    
return null
  }
}
