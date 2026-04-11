export type GreenhouseAssetVisibility = 'public' | 'private'

export type GreenhouseAssetStatus = 'pending' | 'attached' | 'orphaned' | 'deleted'

export type GreenhouseAssetRetentionClass =
  | 'public_media'
  | 'hr_leave'
  | 'finance_purchase_order'
  | 'payroll_receipt'
  | 'payroll_export'
  | 'document_vault'
  | 'expense_report'
  | 'provider_supporting_doc'
  | 'tooling_supporting_doc'
  | 'hr_certification'

export type GreenhouseAssetContext =
  | 'leave_request_draft'
  | 'leave_request'
  | 'purchase_order_draft'
  | 'purchase_order'
  | 'payroll_receipt'
  | 'payroll_export_pdf'
  | 'payroll_export_csv'
  | 'certification_draft'
  | 'certification'

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
  'leave_request_draft' | 'purchase_order_draft' | 'certification_draft'
>

export interface UploadPrivateAssetInput {
  contextType: DraftUploadContext
  ownerClientId?: string | null
  ownerSpaceId?: string | null
  ownerMemberId?: string | null
}
