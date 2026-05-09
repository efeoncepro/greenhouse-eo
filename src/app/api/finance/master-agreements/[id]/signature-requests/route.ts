import { NextResponse } from 'next/server'

import {
  getMasterAgreementDetail,
  MasterAgreementValidationError,
  syncMasterAgreementSignature
} from '@/lib/commercial/master-agreements-store'
import {
  createZapSignDocument,
  getZapSignDocument,
  isZapSignConfigured,
  type ZapSignSignerInput
} from '@/lib/integrations/zapsign/client'
import {
  downloadPrivateAsset,
  getAssetById
} from '@/lib/storage/greenhouse-assets'
import {
  canAdministerPricingCatalog,
  requireCommercialTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface CreateSignatureRequestBody {
  draftAssetId?: string
  name?: string
  language?: 'es' | 'en'
  disableSignerEmails?: boolean
  signatureOrderActive?: boolean
  folderPath?: string
  dateLimitToSign?: string
  observers?: string[]
  signers?: ZapSignSignerInput[]
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const msa = await getMasterAgreementDetail({ tenant, msaId: id })

  if (!msa) {
    return NextResponse.json({ error: 'MSA not found.' }, { status: 404 })
  }

  if (!msa.signatureDocumentToken) {
    return NextResponse.json({
      configured: await isZapSignConfigured(),
      msaId: msa.msaId,
      status: msa.signatureStatus,
      document: null
    })
  }

  if (!(await isZapSignConfigured())) {
    return NextResponse.json(
      { error: 'ZapSign no está configurado en este ambiente.' },
      { status: 503 }
    )
  }

  const document = await getZapSignDocument(msa.signatureDocumentToken)

  return NextResponse.json({
    configured: true,
    msaId: msa.msaId,
    status: msa.signatureStatus,
    document
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden enviar un MSA a firma.' },
      { status: 403 }
    )
  }

  if (!(await isZapSignConfigured())) {
    return NextResponse.json(
      { error: 'ZapSign no está configurado en este ambiente.' },
      { status: 503 }
    )
  }

  const { id } = await params
  const msa = await getMasterAgreementDetail({ tenant, msaId: id })

  if (!msa) {
    return NextResponse.json({ error: 'MSA not found.' }, { status: 404 })
  }

  let body: CreateSignatureRequestBody

  try {
    body = (await request.json()) as CreateSignatureRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!body.draftAssetId?.trim()) {
    return NextResponse.json({ error: 'draftAssetId es requerido.' }, { status: 400 })
  }

  if (!Array.isArray(body.signers) || body.signers.length === 0) {
    return NextResponse.json(
      { error: 'Debes enviar al menos un firmante para ZapSign.' },
      { status: 400 }
    )
  }

  const asset = await getAssetById(body.draftAssetId)

  if (!asset || asset.status === 'deleted') {
    return NextResponse.json({ error: 'Draft asset not found.' }, { status: 404 })
  }

  const download = await downloadPrivateAsset({
    assetId: body.draftAssetId,
    actorUserId: tenant.userId
  })

  const base64Pdf = Buffer.from(download.file.arrayBuffer).toString('base64')
  const documentName = body.name?.trim() || `${msa.msaNumber} - ${msa.title}`

  try {
    const document = await createZapSignDocument({
      name: documentName,
      base64Pdf,
      signers: body.signers,
      language: body.language ?? 'es',
      disableSignerEmails: body.disableSignerEmails,
      signatureOrderActive: body.signatureOrderActive,
      folderPath: body.folderPath || '/greenhouse/master-agreements/',
      dateLimitToSign: body.dateLimitToSign,
      observers: body.observers,
      externalId: msa.msaId,
      metadata: [
        { key: 'msa_id', value: msa.msaId },
        { key: 'msa_number', value: msa.msaNumber }
      ]
    })

    await syncMasterAgreementSignature({
      msaId: msa.msaId,
      actorUserId: tenant.userId,
      signatureProvider: 'zapsign',
      signatureStatus: document.status,
      signatureDocumentToken: document.token,
      signaturePayload: document
    })

    return NextResponse.json(
      {
        msaId: msa.msaId,
        documentToken: document.token,
        status: document.status,
        signers: document.signers ?? []
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof MasterAgreementValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const message = error instanceof Error ? error.message : 'No pudimos crear el request en ZapSign.'

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
