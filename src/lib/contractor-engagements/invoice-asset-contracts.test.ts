import { describe, expect, it } from 'vitest'

import {
  CONTRACTOR_INVOICE_ASSET_CONTEXTS,
  isContractorInvoiceArtifactKind,
  isContractorInvoiceAssetContext,
  isContractorInvoiceAssetRole,
  isContractorInvoiceAssetSource,
  resolveFinalAttachContext
} from './invoice-asset-contracts'

describe('contractor invoice asset contracts (TASK-791)', () => {
  it('recognizes the 7 contractor invoice asset contexts', () => {
    expect(CONTRACTOR_INVOICE_ASSET_CONTEXTS).toHaveLength(7)

    for (const ctx of CONTRACTOR_INVOICE_ASSET_CONTEXTS) {
      expect(isContractorInvoiceAssetContext(ctx)).toBe(true)
    }

    expect(isContractorInvoiceAssetContext('payroll_receipt')).toBe(false)
    expect(isContractorInvoiceAssetContext('leave_request')).toBe(false)
  })

  it('maps draft + final contexts to the canonical FINAL (non-draft) attach context', () => {
    expect(resolveFinalAttachContext('contractor_invoice_draft')).toBe('contractor_invoice')
    expect(resolveFinalAttachContext('contractor_invoice')).toBe('contractor_invoice')
    expect(resolveFinalAttachContext('contractor_work_evidence_draft')).toBe(
      'contractor_work_evidence'
    )
    expect(resolveFinalAttachContext('contractor_work_evidence')).toBe('contractor_work_evidence')
    expect(resolveFinalAttachContext('provider_invoice_draft')).toBe('provider_invoice')
    expect(resolveFinalAttachContext('provider_invoice')).toBe('provider_invoice')
    expect(resolveFinalAttachContext('provider_payout_statement')).toBe(
      'provider_payout_statement'
    )
  })

  it('never resolves a non-draft final context to a draft', () => {
    for (const ctx of CONTRACTOR_INVOICE_ASSET_CONTEXTS) {
      const final = resolveFinalAttachContext(ctx)

      expect(final).not.toBeNull()
      expect(String(final).endsWith('_draft')).toBe(false)
    }
  })

  it('returns null for non-contractor contexts (cannot attach payroll/leave as contractor invoice)', () => {
    expect(resolveFinalAttachContext('payroll_receipt')).toBeNull()
    expect(resolveFinalAttachContext('final_settlement_document')).toBeNull()
    expect(resolveFinalAttachContext('leave_request_draft')).toBeNull()
    expect(resolveFinalAttachContext('')).toBeNull()
  })

  it('validates asset role enum', () => {
    expect(isContractorInvoiceAssetRole('invoice_pdf')).toBe(true)
    expect(isContractorInvoiceAssetRole('tax_xml')).toBe(true)
    expect(isContractorInvoiceAssetRole('provider_statement')).toBe(true)
    expect(isContractorInvoiceAssetRole('not_a_role')).toBe(false)
  })

  it('validates artifact kind enum', () => {
    expect(isContractorInvoiceArtifactKind('human_readable')).toBe(true)
    expect(isContractorInvoiceArtifactKind('tax_structured')).toBe(true)
    expect(isContractorInvoiceArtifactKind('bogus')).toBe(false)
  })

  it('validates source enum', () => {
    expect(isContractorInvoiceAssetSource('contractor_upload')).toBe(true)
    expect(isContractorInvoiceAssetSource('provider_import')).toBe(true)
    expect(isContractorInvoiceAssetSource('hr')).toBe(false)
  })
})
