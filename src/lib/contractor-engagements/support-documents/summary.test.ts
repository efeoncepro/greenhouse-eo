import { describe, expect, it } from 'vitest'

import {
  resolveContractorSupportDocumentScope,
  summarizeContractorSupportDocuments
} from './summary'
import type { ContractorSupportDocument } from './types'

const documentFixture = (
  overrides: Partial<ContractorSupportDocument>
): ContractorSupportDocument => ({
  invoiceAssetId: 'cia-1',
  invoiceAssetPublicId: 'EO-CIA-0001',
  assetId: 'asset-1',
  assetPublicId: 'EO-AST-0001',
  filename: 'boleta.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1234,
  assetRole: 'invoice_pdf',
  artifactKind: 'human_readable',
  source: 'contractor_upload',
  countryCode: 'CL',
  contractorWorkSubmissionId: null,
  scope: 'engagement',
  previewUrl: '/api/assets/private/asset-1?inline=1',
  createdAt: '2026-06-02T14:37:42.000Z',
  uploadedAt: '2026-06-02T14:37:29.000Z',
  attachedAt: '2026-06-02T14:37:42.000Z',
  ...overrides
})

describe('contractor support documents summary', () => {
  it('classifies document scope relative to the selected work submission', () => {
    expect(resolveContractorSupportDocumentScope(null, 'cws-1')).toBe('engagement')
    expect(resolveContractorSupportDocumentScope('cws-1', 'cws-1')).toBe('current_work_submission')
    expect(resolveContractorSupportDocumentScope('cws-2', 'cws-1')).toBe('other_work_submission')
  })

  it('warns when an invoice-required engagement has no invoice document', () => {
    const summary = summarizeContractorSupportDocuments(
      [documentFixture({ assetRole: 'work_evidence', artifactKind: 'evidence' })],
      { requiresInvoice: true, contractorWorkSubmissionId: 'cws-1' }
    )

    expect(summary.invoiceRequirementSatisfied).toBe(false)
    expect(summary.warnings).toContain('required_invoice_missing')
  })

  it('keeps an engagement-level invoice visible but warns that it is not linked to the selected submission', () => {
    const summary = summarizeContractorSupportDocuments(
      [documentFixture({ scope: 'engagement', contractorWorkSubmissionId: null })],
      { requiresInvoice: true, contractorWorkSubmissionId: 'cws-1' }
    )

    expect(summary.hasInvoiceDocument).toBe(true)
    expect(summary.invoiceRequirementSatisfied).toBe(true)
    expect(summary.warnings).toContain('invoice_attached_to_engagement')
  })

  it('counts current-submission evidence separately from engagement-level invoice documents', () => {
    const summary = summarizeContractorSupportDocuments(
      [
        documentFixture({ invoiceAssetId: 'cia-invoice', scope: 'engagement' }),
        documentFixture({
          invoiceAssetId: 'cia-evidence',
          assetId: 'asset-evidence',
          assetPublicId: 'EO-AST-0002',
          filename: 'evidencia.pdf',
          assetRole: 'work_evidence',
          artifactKind: 'evidence',
          contractorWorkSubmissionId: 'cws-1',
          scope: 'current_work_submission'
        })
      ],
      { requiresInvoice: true, contractorWorkSubmissionId: 'cws-1' }
    )

    expect(summary.invoiceCount).toBe(1)
    expect(summary.evidenceCount).toBe(1)
    expect(summary.currentSubmissionCount).toBe(1)
    expect(summary.engagementLevelCount).toBe(1)
    expect(summary.hasCurrentSubmissionEvidence).toBe(true)
  })
})
