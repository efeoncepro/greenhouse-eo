import 'server-only'

import type {
  SignatureProviderAdapter,
  SignatureProviderCreateInput,
  SignatureProviderCreateResult,
  SignatureProviderStateResult
} from '@/lib/signatures/provider-port'
import { SignatureValidationError } from '@/lib/signatures/types'
import { getAssetById } from '@/lib/storage/greenhouse-assets'
import { downloadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'

import { createZapSignDocument, getZapSignDocument } from './client'
import { mapZapSignDocumentStatus, mapZapSignSignerStatus } from './status-map'

// TASK-491 — Concrete ZapSign implementation of the provider-neutral signature port (TASK-490).
// The orchestration commands (`sendSignatureRequest`, `reconcileSignatureRequest`) depend on the
// `SignatureProviderAdapter` interface; this is the first real adapter. ZapSign-specific details
// (API shape, status vocabulary, base64 upload) live here and never leak into the aggregate.

const ZAPSIGN_SIGNATURE_FOLDER = '/greenhouse/signatures/'

/**
 * Resolve the unsigned document asset bytes → base64 WITHOUT the read side effects of
 * `downloadPrivateAsset` (which inflates download_count + emits `asset.downloaded`). Sending a
 * document to a provider is an internal mechanical read, not a human download.
 */
const resolveDocumentBase64 = async (assetId: string): Promise<string> => {
  const asset = await getAssetById(assetId)

  if (!asset || asset.status === 'deleted') {
    throw new SignatureValidationError('document_asset_not_found', 'El documento a firmar no está disponible.', 404)
  }

  const { arrayBuffer } = await downloadGreenhouseStorageObject({
    bucketName: asset.bucketName,
    objectName: asset.objectPath
  })

  return Buffer.from(arrayBuffer).toString('base64')
}

export const zapSignSignatureAdapter: SignatureProviderAdapter = {
  provider: 'zapsign',

  createDocument: async (input: SignatureProviderCreateInput): Promise<SignatureProviderCreateResult> => {
    const base64 = await resolveDocumentBase64(input.documentAssetId)
    const isDocx = input.signableFormat === 'docx'

    const document = await createZapSignDocument({
      name: input.title?.trim() || 'Documento Greenhouse',
      ...(isDocx ? { base64Docx: base64 } : { base64Pdf: base64 }),
      signers: input.signers.map(signer => ({
        name: signer.name,
        ...(signer.email ? { email: signer.email } : {}),
        ...(signer.orderGroup ? { orderGroup: signer.orderGroup } : {})
      })),
      language: 'es',
      folderPath: ZAPSIGN_SIGNATURE_FOLDER,
      externalId: input.signatureRequestId,
      metadata: Object.entries(input.metadata ?? {}).map(([key, value]) => ({
        key,
        value: String(value)
      }))
    })

    return {
      providerDocumentToken: document.token,
      // ZapSign returns signers in the same order they were sent → zip by index to preserve our
      // canonical role; the command maps the provider token back to the row by email.
      signers: (document.signers ?? []).map((signer, index) => ({
        email: signer.email ?? input.signers[index]?.email ?? null,
        role: input.signers[index]?.role ?? 'signer',
        providerSignerToken: signer.token ?? null
      })),
      rawPayload: document as Record<string, unknown>
    }
  },

  getDocumentState: async (providerDocumentToken: string): Promise<SignatureProviderStateResult> => {
    const document = await getZapSignDocument(providerDocumentToken)

    return {
      status: mapZapSignDocumentStatus(document),
      signers: (document.signers ?? []).map(signer => ({
        providerSignerToken: signer.token ?? null,
        email: signer.email ?? null,
        status: mapZapSignSignerStatus(signer.status),
        signedAt: signer.signed_at ?? null
      })),
      signedFileUrl: document.signed_file ?? null,
      auditFileUrl: null,
      rawPayload: document as Record<string, unknown>
    }
  }
}
