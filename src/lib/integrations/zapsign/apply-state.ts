import 'server-only'

import { applyProviderSignatureUpdate } from '@/lib/signatures/commands'
import { getSignatureRequestById } from '@/lib/signatures/store'
import { SignatureValidationError, type SignatureRequest } from '@/lib/signatures/types'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'

import { zapSignSignatureAdapter } from './signature-adapter'

// TASK-491 — Shared "apply authoritative ZapSign state to a signature_request" primitive, used by
// BOTH the webhook handler (Slice 2) and the reconcile path (Slice 3). Keeping it in one place
// guarantees the recovery path is byte-identical to the live path — critically, it downloads the
// signed PDF into the vault BEFORE applying `completed` (the DB CHECK rejects a completed request
// without `signed_document_asset_id`, so a bare generic reconcile would fail).

const downloadSignedFile = async (url: string): Promise<{ bytes: Buffer; mimeType: string }> => {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30_000) })

  if (!response.ok) {
    const body = await response.text().catch(() => '')

    throw new Error(`zapsign_signed_file_download_failed:${response.status}:${body.slice(0, 180)}`)
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get('content-type') || 'application/pdf'
  }
}

/**
 * Re-fetch authoritative ZapSign state, persist the signed PDF into the private vault
 * (`signature_signed_document`) when present + not yet stored, and apply the status monotonically
 * via `applyProviderSignatureUpdate`. Idempotent + safe to re-run (reconcile semantics).
 */
export const applyZapSignStateToSignatureRequest = async (request: SignatureRequest): Promise<void> => {
  if (!request.providerDocumentToken) {
    throw new SignatureValidationError('not_sent', 'La solicitud de firma aún no fue enviada al provider.', 422)
  }

  const state = await zapSignSignatureAdapter.getDocumentState(request.providerDocumentToken)

  let signedDocumentAssetId = request.signedDocumentAssetId

  if (state.signedFileUrl && !signedDocumentAssetId) {
    const { bytes, mimeType } = await downloadSignedFile(state.signedFileUrl)

    const stored = await storeSystemGeneratedPrivateAsset({
      ownerAggregateType: 'signature_signed_document',
      ownerAggregateId: request.signatureRequestId,
      fileName: `${request.signatureRequestId}-signed.pdf`,
      mimeType,
      bytes,
      actorUserId: 'system:zapsign',
      metadata: {
        source: 'zapsign',
        documentToken: request.providerDocumentToken,
        sourceKind: request.sourceKind,
        sourceRef: request.sourceRef
      }
    })

    signedDocumentAssetId = stored.assetId
  }

  await applyProviderSignatureUpdate({
    signatureRequestId: request.signatureRequestId,
    providerStatus: state.status,
    signers: state.signers,
    signedDocumentAssetId,
    providerPayload: state.rawPayload,
    actor: 'system:zapsign'
  })
}

/**
 * Reconcile a single ZapSign signature request by id (recovery / safety-net for a webhook that
 * failed or never arrived). Loads the request, asserts it's a ZapSign request that was sent, and
 * applies the authoritative provider state. Returns the refreshed request.
 */
export const reconcileZapSignSignatureRequest = async (signatureRequestId: string): Promise<SignatureRequest> => {
  const request = await getSignatureRequestById(signatureRequestId)

  if (!request) {
    throw new SignatureValidationError('signature_request_not_found', 'Solicitud de firma no encontrada.', 404)
  }

  if (request.provider !== 'zapsign') {
    throw new SignatureValidationError(
      'unsupported_provider',
      `Reconciliación ZapSign no aplica al provider '${request.provider}'.`,
      422
    )
  }

  await applyZapSignStateToSignatureRequest(request)

  const refreshed = await getSignatureRequestById(signatureRequestId)

  return refreshed ?? request
}
