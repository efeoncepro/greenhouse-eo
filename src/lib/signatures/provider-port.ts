import 'server-only'

import type {
  SignableFormat,
  SignatureProvider,
  SignatureRequestSignerInput,
  SignatureRequestStatus,
  SignatureSignerStatus,
  SignatureValidationError
} from './types'

// TASK-490 — provider-neutral signature adapter PORT (hexagonal). The orchestration (commands)
// depends on this interface, never on a concrete provider. TASK-491 ships the ZapSign adapter;
// tests inject a mock. This keeps the aggregate + runtime testable in isolation.

export interface SignatureProviderCreateInput {
  signatureRequestId: string
  title: string | null
  signableFormat: SignableFormat
  /** The unsigned document asset to send for signature (the adapter resolves the bytes). */
  documentAssetId: string
  signers: SignatureRequestSignerInput[]
  metadata?: Record<string, unknown>
}

export interface SignatureProviderSignerResult {
  /** Echoes the signer email (or role) so the command can map the token back to the signer row. */
  email: string | null
  role: SignatureRequestSignerInput['role']
  providerSignerToken: string | null
}

export interface SignatureProviderCreateResult {
  providerDocumentToken: string
  signers: SignatureProviderSignerResult[]
  rawPayload: Record<string, unknown>
}

export interface SignatureProviderSignerState {
  providerSignerToken: string | null
  email: string | null
  status: SignatureSignerStatus
  signedAt: string | null
}

export interface SignatureProviderStateResult {
  /** Provider status already mapped to the canonical SignatureRequestStatus. */
  status: SignatureRequestStatus
  signers: SignatureProviderSignerState[]
  signedFileUrl: string | null
  auditFileUrl: string | null
  rawPayload: Record<string, unknown>
}

export interface SignatureProviderAdapter {
  provider: SignatureProvider
  /** Send the document to the provider; returns the external document token + per-signer tokens. */
  createDocument(input: SignatureProviderCreateInput): Promise<SignatureProviderCreateResult>
  /** Fetch the current provider state (for reconcile / recovery). */
  getDocumentState(providerDocumentToken: string): Promise<SignatureProviderStateResult>
}

/**
 * Default adapter for TASK-490 (foundation): not implemented. The real ZapSign adapter is TASK-491;
 * until then `sendSignatureRequest` / `reconcileSignatureRequest` throw with a clear, actionable
 * error rather than silently no-op. The aggregate + create/cancel/applyProviderUpdate work without it.
 */
export const notImplementedSignatureAdapter: SignatureProviderAdapter = {
  provider: 'zapsign',
  createDocument: async () => {
    const { SignatureValidationError: Err } = await import('./types')

    throw new Err(
      'signature_provider_not_implemented',
      'El adapter de firma (ZapSign) aún no está disponible (TASK-491).',
      503
    ) as SignatureValidationError
  },
  getDocumentState: async () => {
    const { SignatureValidationError: Err } = await import('./types')

    throw new Err(
      'signature_provider_not_implemented',
      'El adapter de firma (ZapSign) aún no está disponible (TASK-491).',
      503
    ) as SignatureValidationError
  }
}
