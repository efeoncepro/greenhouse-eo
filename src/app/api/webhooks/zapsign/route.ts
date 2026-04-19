import { NextResponse } from 'next/server'

import {
  getMasterAgreementBySignatureDocumentToken,
  syncMasterAgreementSignature
} from '@/lib/commercial/master-agreements-store'
import { resolveSecret } from '@/lib/secrets/secret-manager'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'

export const dynamic = 'force-dynamic'

const getWebhookSecret = async () => {
  const { value } = await resolveSecret({
    envVarName: 'ZAPSIGN_WEBHOOK_SHARED_SECRET'
  })

  return value?.trim() || null
}

const getBearerToken = (request: Request) => {
  const authorization = request.headers.get('authorization') || ''

  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7).trim()
  }

  return request.headers.get('x-zapsign-webhook-secret')?.trim() || ''
}

const resolveLatestSignedAt = (payload: Record<string, unknown>) => {
  const signers = Array.isArray(payload.signers) ? payload.signers : []

  const signerDates = signers
    .map(item => (item && typeof item === 'object' ? (item as Record<string, unknown>).signed_at : null))
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .sort()

  return signerDates.at(-1) ?? null
}

export async function POST(request: Request) {
  const webhookSecret = await getWebhookSecret()
  const providedSecret = getBearerToken(request)

  if (webhookSecret && providedSecret !== webhookSecret) {
    return NextResponse.json({ error: 'Invalid webhook secret.' }, { status: 401 })
  }

  let payload: Record<string, unknown>

  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const documentToken = typeof payload.token === 'string' ? payload.token : null

  if (!documentToken) {
    return NextResponse.json({ received: true, ignored: true, reason: 'missing_token' })
  }

  const msa = await getMasterAgreementBySignatureDocumentToken(documentToken)

  if (!msa) {
    return NextResponse.json({ received: true, ignored: true, reason: 'unknown_document' })
  }

  let signedDocumentAssetId = msa.signedDocumentAssetId
  const signedFileUrl = typeof payload.signed_file === 'string' ? payload.signed_file : null

  if (signedFileUrl) {
    const response = await fetch(signedFileUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000)
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')

      return NextResponse.json(
        {
          error: `No pudimos descargar el PDF firmado de ZapSign (${response.status}). ${body.slice(0, 180)}`
        },
        { status: 502 }
      )
    }

    const fileBytes = Buffer.from(await response.arrayBuffer())

    const storedAsset = await storeSystemGeneratedPrivateAsset({
      assetId: signedDocumentAssetId,
      ownerAggregateType: 'master_agreement',
      ownerAggregateId: msa.msaId,
      ownerClientId: msa.clientId,
      fileName: `${msa.msaNumber}-signed.pdf`,
      mimeType: response.headers.get('content-type') || 'application/pdf',
      bytes: fileBytes,
      actorUserId: 'system:zapsign',
      metadata: {
        source: 'zapsign_webhook',
        documentToken
      }
    })

    signedDocumentAssetId = storedAsset.assetId
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

  return NextResponse.json({ received: true, msaId: msa.msaId })
}
