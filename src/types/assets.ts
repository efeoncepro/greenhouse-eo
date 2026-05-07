export type GreenhouseAssetVisibility = 'public' | 'private'

export type GreenhouseAssetStatus = 'pending' | 'attached' | 'orphaned' | 'deleted'

export type GreenhouseAssetRetentionClass =
  | 'public_media'
  | 'hr_leave'
  | 'finance_purchase_order'
  | 'finance_reconciliation_evidence'
  | 'payroll_receipt'
  | 'payroll_export'
  | 'final_settlement_document'
  | 'document_vault'
  | 'commercial_engagement_report'
  | 'expense_report'
  | 'provider_supporting_doc'
  | 'tooling_supporting_doc'
  | 'hr_certification'
  | 'hr_evidence'

export type GreenhouseAssetContext =
  | 'leave_request_draft'
  | 'leave_request'
  | 'purchase_order_draft'
  | 'purchase_order'
  | 'master_agreement_draft'
  | 'master_agreement'
  | 'payroll_receipt'
  | 'payroll_export_pdf'
  | 'payroll_export_csv'
  | 'final_settlement_document'
  | 'certification_draft'
  | 'certification'
  | 'evidence_draft'
  | 'evidence'
  | 'quote_pdf'
  | 'finance_reconciliation_evidence_draft'
  | 'finance_reconciliation_evidence'
  | 'sample_sprint_report_draft'
  | 'sample_sprint_report'

export interface GreenhouseAssetRecord {
  assetId: string
  publicId: string
  visibility: GreenhouseAssetVisibility
  status: GreenhouseAssetStatus
  bucketName: string
  objectPath: string
  filename: string
  mimeType: string
  sizeBytes: number
  retentionClass: GreenhouseAssetRetentionClass
  ownerAggregateType: GreenhouseAssetContext
  ownerAggregateId: string | null
  ownerClientId: string | null
  ownerSpaceId: string | null
  ownerMemberId: string | null
  uploadedByUserId: string | null
  attachedByUserId: string | null
  deletedByUserId: string | null
  uploadSource: 'user' | 'system'
  downloadCount: number
  metadata: Record<string, unknown>
  /** TASK-721 — SHA-256 hex del binario para dedup idempotente. */
  contentHash: string | null
  createdAt: string | null
  uploadedAt: string | null
  attachedAt: string | null
  deletedAt: string | null
  lastDownloadedAt: string | null
}

export interface PrivateAssetUploadResponse {
  asset: GreenhouseAssetRecord
  downloadUrl: string
}

export type DraftUploadContext = Extract<
  GreenhouseAssetContext,
  | 'leave_request_draft'
  | 'purchase_order_draft'
  | 'master_agreement_draft'
  | 'certification_draft'
  | 'evidence_draft'
  | 'finance_reconciliation_evidence_draft'
  | 'sample_sprint_report_draft'
>

export interface UploadPrivateAssetInput {
  contextType: DraftUploadContext
  ownerClientId?: string | null
  ownerSpaceId?: string | null
  ownerMemberId?: string | null
}
