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
  // TASK-1023 — labor contracts / offer letters; long retention (5yr+ post-termination).
  | 'workforce_contract'
  // TASK-791 — Contractor invoice / work evidence retention classes. Provider
  // invoice/payout statements reuse the existing `provider_supporting_doc`.
  | 'contractor_invoice'
  | 'contractor_work_evidence'

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
  | 'resignation_letter_ratified_draft'
  | 'resignation_letter_ratified'
  // TASK-791 — Contractor / provider invoice + work evidence asset contexts.
  | 'contractor_invoice_draft'
  | 'contractor_invoice'
  | 'contractor_work_evidence_draft'
  | 'contractor_work_evidence'
  | 'provider_invoice_draft'
  | 'provider_invoice'
  | 'provider_payout_statement'
  // TASK-1023 — Workforce Contracting Studio signable document (offer letter / employment contract).
  | 'workforce_contracting_document'
  // TASK-490 — signed PDF artifact returned by the signature provider (EPIC-001 signature platform).
  | 'signature_signed_document'

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
  | 'resignation_letter_ratified_draft'
  // TASK-791 — contractor self-upload + HR/Finance on-behalf draft contexts.
  | 'contractor_invoice_draft'
  | 'contractor_work_evidence_draft'
  | 'provider_invoice_draft'
>

export interface UploadPrivateAssetInput {
  contextType: DraftUploadContext
  ownerClientId?: string | null
  ownerSpaceId?: string | null
  ownerMemberId?: string | null
}
