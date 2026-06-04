import type {
  ContractorSupportDocument,
  ContractorSupportDocumentsSummary,
  ContractorSupportDocumentScope,
  ContractorSupportDocumentWarningCode
} from './types'

const INVOICE_ASSET_ROLES = new Set(['invoice_pdf', 'tax_xml', 'provider_statement'])

export const resolveContractorSupportDocumentScope = (
  documentSubmissionId: string | null,
  currentSubmissionId: string | null
): ContractorSupportDocumentScope => {
  if (!documentSubmissionId) return 'engagement'
  if (currentSubmissionId && documentSubmissionId === currentSubmissionId) return 'current_work_submission'

  return 'other_work_submission'
}

export const summarizeContractorSupportDocuments = (
  documents: ContractorSupportDocument[],
  input: {
    requiresInvoice: boolean
    contractorWorkSubmissionId?: string | null
  }
): ContractorSupportDocumentsSummary => {
  const invoiceDocuments = documents.filter(document => INVOICE_ASSET_ROLES.has(document.assetRole))
  const evidenceDocuments = documents.filter(document => document.assetRole === 'work_evidence')
  const currentSubmissionDocuments = documents.filter(document => document.scope === 'current_work_submission')
  const engagementLevelDocuments = documents.filter(document => document.scope === 'engagement')
  const warnings: ContractorSupportDocumentWarningCode[] = []
  const hasInvoiceDocument = invoiceDocuments.length > 0
  const invoiceRequirementSatisfied = !input.requiresInvoice || hasInvoiceDocument

  if (!invoiceRequirementSatisfied) {
    warnings.push('required_invoice_missing')
  }

  if (
    input.contractorWorkSubmissionId &&
    invoiceDocuments.some(document => document.scope === 'engagement') &&
    !invoiceDocuments.some(document => document.scope === 'current_work_submission')
  ) {
    warnings.push('invoice_attached_to_engagement')
  }

  return {
    requiresInvoice: input.requiresInvoice,
    totalCount: documents.length,
    invoiceCount: invoiceDocuments.length,
    evidenceCount: evidenceDocuments.length,
    currentSubmissionCount: currentSubmissionDocuments.length,
    engagementLevelCount: engagementLevelDocuments.length,
    hasInvoiceDocument,
    invoiceRequirementSatisfied,
    hasCurrentSubmissionEvidence: evidenceDocuments.some(document => document.scope === 'current_work_submission'),
    warnings
  }
}
