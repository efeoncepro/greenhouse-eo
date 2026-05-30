/**
 * TASK-791 — Contractor invoice asset pure contracts (NOT server-only).
 *
 * Enums + the canonical mapping from an uploaded asset's draft/final context to
 * the FINAL attach context used by `attachAssetToAggregate`. Pure so it is
 * unit-testable and shared by the server store + API validation.
 */
import type { GreenhouseAssetContext } from '@/types/assets'

export const CONTRACTOR_INVOICE_ASSET_ROLES = [
  'invoice_pdf',
  'tax_xml',
  'tax_certificate',
  'work_evidence',
  'provider_statement',
  'payout_receipt',
  'fx_receipt',
  'other_supporting_doc'
] as const
export type ContractorInvoiceAssetRole = (typeof CONTRACTOR_INVOICE_ASSET_ROLES)[number]

export const CONTRACTOR_INVOICE_ARTIFACT_KINDS = [
  'human_readable',
  'tax_structured',
  'provider_report',
  'payment_proof',
  'evidence'
] as const
export type ContractorInvoiceArtifactKind = (typeof CONTRACTOR_INVOICE_ARTIFACT_KINDS)[number]

export const CONTRACTOR_INVOICE_ASSET_SOURCES = [
  'contractor_upload',
  'hr_upload_on_behalf',
  'finance_upload_on_behalf',
  'provider_import',
  'system_generated'
] as const
export type ContractorInvoiceAssetSource = (typeof CONTRACTOR_INVOICE_ASSET_SOURCES)[number]

/** Contexts (draft or final) an asset must be in to attach as a contractor invoice asset. */
export const CONTRACTOR_INVOICE_ASSET_CONTEXTS = [
  'contractor_invoice_draft',
  'contractor_invoice',
  'contractor_work_evidence_draft',
  'contractor_work_evidence',
  'provider_invoice_draft',
  'provider_invoice',
  'provider_payout_statement'
] as const
export type ContractorInvoiceAssetContext = (typeof CONTRACTOR_INVOICE_ASSET_CONTEXTS)[number]

/**
 * Maps the asset's current context to the FINAL (non-draft) attach context.
 * `attachAssetToAggregate` only accepts non-draft contexts as the owner type.
 * Returns null when the asset's context is not a contractor invoice context.
 */
const DRAFT_TO_FINAL_CONTEXT: Record<ContractorInvoiceAssetContext, GreenhouseAssetContext> = {
  contractor_invoice_draft: 'contractor_invoice',
  contractor_invoice: 'contractor_invoice',
  contractor_work_evidence_draft: 'contractor_work_evidence',
  contractor_work_evidence: 'contractor_work_evidence',
  provider_invoice_draft: 'provider_invoice',
  provider_invoice: 'provider_invoice',
  provider_payout_statement: 'provider_payout_statement'
}

export const isContractorInvoiceAssetContext = (
  value: string
): value is ContractorInvoiceAssetContext =>
  (CONTRACTOR_INVOICE_ASSET_CONTEXTS as readonly string[]).includes(value)

export const resolveFinalAttachContext = (
  assetContext: string
): GreenhouseAssetContext | null =>
  isContractorInvoiceAssetContext(assetContext)
    ? DRAFT_TO_FINAL_CONTEXT[assetContext]
    : null

export const isContractorInvoiceAssetRole = (value: string): value is ContractorInvoiceAssetRole =>
  (CONTRACTOR_INVOICE_ASSET_ROLES as readonly string[]).includes(value)

export const isContractorInvoiceArtifactKind = (
  value: string
): value is ContractorInvoiceArtifactKind =>
  (CONTRACTOR_INVOICE_ARTIFACT_KINDS as readonly string[]).includes(value)

export const isContractorInvoiceAssetSource = (
  value: string
): value is ContractorInvoiceAssetSource =>
  (CONTRACTOR_INVOICE_ASSET_SOURCES as readonly string[]).includes(value)

export interface ContractorInvoiceAsset {
  invoiceAssetId: string
  publicId: string
  contractorEngagementId: string
  contractorInvoiceId: string | null
  contractorWorkSubmissionId: string | null
  assetId: string
  assetRole: ContractorInvoiceAssetRole
  artifactKind: ContractorInvoiceArtifactKind
  source: ContractorInvoiceAssetSource
  countryCode: string | null
  uploadedByUserId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AttachContractorInvoiceAssetInput {
  contractorEngagementId: string
  contractorInvoiceId?: string | null
  /** TASK-792 — link the evidence asset to a work submission (e.g. work_evidence). */
  contractorWorkSubmissionId?: string | null
  assetId: string
  assetRole: ContractorInvoiceAssetRole
  artifactKind: ContractorInvoiceArtifactKind
  source: ContractorInvoiceAssetSource
  countryCode?: string | null
  metadata?: Record<string, unknown>
  actorUserId: string
}
