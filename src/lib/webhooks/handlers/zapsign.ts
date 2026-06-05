import 'server-only'

import {
  getMasterAgreementBySignatureDocumentToken,
  syncMasterAgreementSignature
} from '@/lib/commercial/master-agreements-store'
import { applyZapSignStateToSignatureRequest } from '@/lib/integrations/zapsign/apply-state'
import { captureWithDomain } from '@/lib/observability/capture'
import { getSignatureRequestByProviderToken } from '@/lib/signatures/store'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'

import { registerInboundHandler } from '../inbound'

// TASK-491 — Canonical ZapSign signature webhook handler (replaces the one-off
// /api/webhooks/zapsign route). Auth is handled by the bus (auth_mode='bearer'); this handler
// does pure business logic via a DISPATCH CASCADE that preserves coexistence (TASK-490 invariant):
//   1. signature_requests aggregate (TASK-490) — priority.
//   2. master_agreements legacy lane — fallback (logic preserved verbatim from the old route).
//   3. unknown document — ignored.
//
// The aggregate path RE-FETCHES authoritative state from ZapSign via the adapter (single source of
// truth for status mapping) rather than trusting the webhook payload. A failed signed-file download
// throws → the bus marks the inbox event failed → the reconcile job (Slice 3) recovers.

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

const resolveLatestSignedAt = (payload: Record<string, unknown>): string | null => {
  const signers = Array.isArray(payload.signers) ? payload.signers : []

  const signerDates = signers
    .map(item => (item && typeof item === 'object' ? (item as Record<string, unknown>).signed_at : null))
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .sort()

  return signerDates.at(-1) ?? null
}

/**
 * Legacy MSA lane (coexistence). Logic preserved verbatim from the old one-off route: trust the
 * webhook payload, download `signed_file` when present, store as a `master_agreement` asset, sync.
 */
const applyToMasterAgreement = async (
  msa: NonNullable<Awaited<ReturnType<typeof getMasterAgreementBySignatureDocumentToken>>>,
  payload: Record<string, unknown>,
  documentToken: string
): Promise<void> => {
  let signedDocumentAssetId = msa.signedDocumentAssetId
  const signedFileUrl = typeof payload.signed_file === 'string' ? payload.signed_file : null

  if (signedFileUrl) {
    const { bytes, mimeType } = await downloadSignedFile(signedFileUrl)

    const stored = await storeSystemGeneratedPrivateAsset({
      assetId: signedDocumentAssetId,
      ownerAggregateType: 'master_agreement',
      ownerAggregateId: msa.msaId,
      ownerClientId: msa.clientId,
      fileName: `${msa.msaNumber}-signed.pdf`,
      mimeType,
      bytes,
      actorUserId: 'system:zapsign',
      metadata: { source: 'zapsign_webhook', documentToken }
    })

    signedDocumentAssetId = stored.assetId
  }

  await syncMasterAgreementSignature({
    msaId: msa.msaId,
    actorUserId: 'system:zapsign',
    signatureProvider: 'zapsign',
    signatureStatus: typeof payload.status === 'string' ? payload.status : null,
    signatureDocumentToken: documentToken,
    signedAt: resolveLatestSignedAt(payload),
    signedDocumentAssetId,
    signaturePayload: payload
  })
}

registerInboundHandler('zapsign', async (_inboxEvent, _rawBody, parsedPayload) => {
  const payload = (parsedPayload && typeof parsedPayload === 'object' ? parsedPayload : {}) as Record<string, unknown>
  const documentToken = typeof payload.token === 'string' ? payload.token : null

  if (!documentToken) return // nothing to route — ignore (bus marks processed)

  try {
    // 1. Canonical signature_requests aggregate takes priority.
    const signatureRequest = await getSignatureRequestByProviderToken(documentToken)

    if (signatureRequest) {
      await applyZapSignStateToSignatureRequest(signatureRequest)

      return
    }

    // 2. Fallback: legacy MSA lane (coexistence — TASK-490 invariant).
    const msa = await getMasterAgreementBySignatureDocumentToken(documentToken)

    if (msa) {
      await applyToMasterAgreement(msa, payload, documentToken)

      return
    }

    // 3. Unknown document — ignore.
  } catch (error) {
    captureWithDomain(error, 'documents', {
      tags: { source: 'zapsign_webhook' },
      extra: { documentToken }
    })

    throw error // let the bus mark the inbox event failed → reconcile recovers
  }
})
