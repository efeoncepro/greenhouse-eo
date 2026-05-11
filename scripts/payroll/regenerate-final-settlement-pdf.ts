/**
 * TASK-863 V1.2 — One-shot regenerador de PDF para final_settlement_documents legacy.
 *
 * Caso de uso: documentos que ya estan en estado `issued` o `signed_or_ratified`
 * pero cuyo PDF asset persiste con watermark "PROYECTO" porque fueron generados
 * cuando estaban en `rendered` (pre-V1.1 auto-regen).
 *
 * Idempotente: re-correr para el mismo documentId genera otro asset PDF nuevo
 * y reemplaza el pdf_asset_id. El asset viejo NO se borra (audit trail).
 *
 * Uso:
 *   pnpm tsx scripts/payroll/regenerate-final-settlement-pdf.ts <documentId>
 *   pnpm tsx scripts/payroll/regenerate-final-settlement-pdf.ts --offboarding-case <caseId>
 */

import 'server-only'

import { withTransaction } from '@/lib/db'
import { renderFinalSettlementDocumentPdf } from '@/lib/payroll/final-settlement/document-pdf'
import { computeBytesSha256 } from '@/lib/payroll/final-settlement/document-hash'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'

import type { FinalSettlementDocumentSnapshot } from '@/lib/payroll/final-settlement/document-types'

type Args = { documentId?: string; offboardingCaseId?: string }

const parseArgs = (argv: string[]): Args => {
  const out: Args = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--offboarding-case') {
      out.offboardingCaseId = argv[++i]
    } else if (!arg.startsWith('--')) {
      out.documentId = arg
    }
  }

  return out
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (!args.documentId && !args.offboardingCaseId) {
    console.error('Usage: pnpm tsx scripts/payroll/regenerate-final-settlement-pdf.ts <documentId>')
    console.error('   or: pnpm tsx scripts/payroll/regenerate-final-settlement-pdf.ts --offboarding-case <caseId>')
    process.exit(1)
  }

  const result = await withTransaction(async client => {
    const docQuery = args.documentId
      ? client.query<Record<string, unknown>>(
          `SELECT * FROM greenhouse_payroll.final_settlement_documents
           WHERE final_settlement_document_id = $1 LIMIT 1`,
          [args.documentId]
        )
      : client.query<Record<string, unknown>>(
          `SELECT * FROM greenhouse_payroll.final_settlement_documents
           WHERE offboarding_case_id = $1
             AND document_status NOT IN ('voided','rejected','cancelled','superseded')
           ORDER BY document_version DESC, created_at DESC
           LIMIT 1`,
          [args.offboardingCaseId]
        )

    const { rows } = await docQuery

    if (!rows[0]) {
      throw new Error('Document not found')
    }

    const row = rows[0]
    const documentId = String(row.final_settlement_document_id)
    const memberId = String(row.member_id)
    const documentStatus = String(row.document_status)
    const documentVersion = Number(row.document_version)
    const settlementVersion = Number(row.settlement_version)
    const offboardingCaseId = String(row.offboarding_case_id)
    const finalSettlementId = String(row.final_settlement_id)
    const snapshot = row.snapshot_json as FinalSettlementDocumentSnapshot

    console.log(`Regenerating PDF for ${documentId}`)
    console.log(`  member=${memberId} status=${documentStatus} version=${documentVersion}`)

    const pdfBytes = await renderFinalSettlementDocumentPdf(snapshot, { documentStatus })
    const contentHash = computeBytesSha256(pdfBytes)
    const fileName = `finiquito-${memberId}-v${settlementVersion}-d${documentVersion}-${documentStatus}-regen.pdf`

    const asset = await storeSystemGeneratedPrivateAsset({
      ownerAggregateType: 'final_settlement_document',
      ownerAggregateId: documentId,
      ownerMemberId: memberId,
      fileName,
      mimeType: 'application/pdf',
      bytes: pdfBytes,
      actorUserId: 'system-regenerate-v1.2',
      metadata: {
        finalSettlementId,
        offboardingCaseId,
        documentVersion,
        regeneratedFor: documentStatus,
        contentHash,
        source: 'task-863-v1.2-regenerate-script'
      }
    })

    await client.query(
      `UPDATE greenhouse_payroll.final_settlement_documents
       SET pdf_asset_id = $2, content_hash = $3, updated_at = now(),
           updated_by_user_id = 'system-regenerate-v1.2'
       WHERE final_settlement_document_id = $1`,
      [documentId, asset.assetId, contentHash]
    )

    return {
      documentId,
      previousAssetId: row.pdf_asset_id ? String(row.pdf_asset_id) : null,
      newAssetId: asset.assetId,
      contentHash,
      documentStatus
    }
  })

  console.log(`OK previousAssetId=${result.previousAssetId}`)
  console.log(`OK newAssetId=${result.newAssetId}`)
  console.log(`OK contentHash=${result.contentHash}`)
  console.log(`OK documentStatus=${result.documentStatus}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
