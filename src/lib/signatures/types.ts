// TASK-490 — Signature Orchestration Foundation: pure domain types (safe client + server).
// Provider-neutral electronic signature platform (EPIC-001). The ZapSign adapter is TASK-491.

export type SignatureProvider = 'zapsign'

export type SignableFormat = 'pdf' | 'docx'

export type SignatureRequestStatus =
  | 'draft'
  | 'sent'
  | 'partially_signed'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'expired'

export type SignatureSignerStatus = 'pending' | 'signed' | 'declined'

export type SignatureSignerRole = 'employer' | 'worker' | 'witness' | 'counterparty' | 'signer'

/** The initiating domain (polymorphic source_ref, no FK). Extend as new consumers emerge. */
export type SignatureSourceKind = 'contracting_case' | 'master_agreement'

export type SignatureEventKind =
  | 'created'
  | 'sent'
  | 'signer_signed'
  | 'partially_signed'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'expired'
  | 'webhook_received'
  | 'reconciled'

export interface SignatureRequestSignerInput {
  name: string
  email?: string | null
  role: SignatureSignerRole
  orderGroup?: number
}

export interface SignatureRequestSigner {
  signerId: string
  signatureRequestId: string
  name: string
  email: string | null
  role: SignatureSignerRole
  orderGroup: number
  status: SignatureSignerStatus
  providerSignerToken: string | null
  signedAt: string | null
}

export interface SignatureRequest {
  signatureRequestId: string
  provider: SignatureProvider
  providerDocumentToken: string | null
  status: SignatureRequestStatus
  sourceKind: SignatureSourceKind
  sourceRef: string
  documentAssetId: string
  signedDocumentAssetId: string | null
  auditReportAssetId: string | null
  signableFormat: SignableFormat
  title: string | null
  idempotencyKey: string | null
  sentAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  failureReason: string | null
  lastSyncedAt: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export interface SignatureRequestEvent {
  eventId: string
  signatureRequestId: string
  eventKind: SignatureEventKind
  fromStatus: SignatureRequestStatus | null
  toStatus: SignatureRequestStatus | null
  actor: string
  occurredAt: string
}

export class SignatureValidationError extends Error {
  code: string
  statusCode: number

  constructor(code: string, message: string, statusCode = 422) {
    super(message)
    this.name = 'SignatureValidationError'
    this.code = code
    this.statusCode = statusCode
  }
}
