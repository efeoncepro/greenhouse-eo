import type {
  ContractorInvoiceArtifactKind,
  ContractorInvoiceAssetRole,
  ContractorInvoiceAssetSource
} from '../invoice-asset-contracts'

export type ContractorSupportDocumentScope =
  | 'current_work_submission'
  | 'other_work_submission'
  | 'engagement'

export type ContractorSupportDocumentWarningCode =
  | 'invoice_attached_to_engagement'
  | 'required_invoice_missing'

export interface ContractorSupportDocument {
  invoiceAssetId: string
  invoiceAssetPublicId: string
  assetId: string
  assetPublicId: string
  filename: string
  mimeType: string
  sizeBytes: number
  assetRole: ContractorInvoiceAssetRole
  artifactKind: ContractorInvoiceArtifactKind
  source: ContractorInvoiceAssetSource
  countryCode: string | null
  contractorWorkSubmissionId: string | null
  scope: ContractorSupportDocumentScope
  previewUrl: string
  createdAt: string
  uploadedAt: string | null
  attachedAt: string | null
}

export interface ContractorSupportDocumentsSummary {
  requiresInvoice: boolean
  totalCount: number
  invoiceCount: number
  evidenceCount: number
  currentSubmissionCount: number
  engagementLevelCount: number
  hasInvoiceDocument: boolean
  invoiceRequirementSatisfied: boolean
  hasCurrentSubmissionEvidence: boolean
  warnings: ContractorSupportDocumentWarningCode[]
}

export interface ContractorSupportDocumentsBundle {
  contractorEngagementId: string
  engagementPublicId: string
  contractorWorkSubmissionId: string | null
  documents: ContractorSupportDocument[]
  summary: ContractorSupportDocumentsSummary
  generatedAt: string
}
