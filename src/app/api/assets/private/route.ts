import { NextResponse } from 'next/server'

import type { GreenhouseAssetContext, PrivateAssetUploadResponse } from '@/types/assets'
import { createPrivatePendingAsset } from '@/lib/storage/greenhouse-assets'
import { hasRoleCode, hasRouteGroup, requireTenantContext } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'

export const dynamic = 'force-dynamic'

const isDraftContext = (value: string): value is Extract<GreenhouseAssetContext, 'leave_request_draft' | 'purchase_order_draft'> =>
  value === 'leave_request_draft' || value === 'purchase_order_draft'

const canUploadForContext = ({
  contextType,
  tenant
}: {
  contextType: Extract<GreenhouseAssetContext, 'leave_request_draft' | 'purchase_order_draft'>
  tenant: Awaited<ReturnType<typeof requireTenantContext>>['tenant']
}) => {
  if (!tenant) {
    return false
  }

  if (contextType === 'leave_request_draft') {
    return Boolean(tenant.memberId) || hasRouteGroup(tenant, 'hr') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)
  }

  return hasRouteGroup(tenant, 'finance') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)
}

export async function POST(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const contextTypeValue = String(formData.get('contextType') || '').trim()

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 })
    }

    if (!isDraftContext(contextTypeValue)) {
      return NextResponse.json({ error: 'Unsupported asset context.' }, { status: 400 })
    }

    if (!canUploadForContext({ contextType: contextTypeValue, tenant })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ownerClientIdRaw = String(formData.get('ownerClientId') || '').trim()
    const ownerSpaceIdRaw = String(formData.get('ownerSpaceId') || '').trim()
    const ownerMemberIdRaw = String(formData.get('ownerMemberId') || '').trim()
    const metadataLabelRaw = String(formData.get('metadataLabel') || '').trim()

    const ownerClientId = ownerClientIdRaw || tenant.clientId || null
    const ownerSpaceId = ownerSpaceIdRaw || tenant.spaceId || null

    const ownerMemberId =
      contextTypeValue === 'leave_request_draft'
        ? ownerMemberIdRaw || tenant.memberId || null
        : ownerMemberIdRaw || null

    if (contextTypeValue === 'purchase_order_draft' && !ownerClientId) {
      return NextResponse.json({ error: 'ownerClientId is required for purchase order drafts.' }, { status: 400 })
    }

    if (contextTypeValue === 'leave_request_draft' && !ownerMemberId) {
      return NextResponse.json({ error: 'ownerMemberId is required for leave drafts.' }, { status: 400 })
    }

    const uploaded = await createPrivatePendingAsset({
      contextType: contextTypeValue,
      uploadedByUserId: tenant.userId,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      bytes: await file.arrayBuffer(),
      ownerClientId,
      ownerSpaceId,
      ownerMemberId,
      metadata: metadataLabelRaw ? { label: metadataLabelRaw } : undefined
    })

    const payload: PrivateAssetUploadResponse = {
      asset: uploaded,
      downloadUrl: `/api/assets/private/${encodeURIComponent(uploaded.assetId)}`
    }

    return NextResponse.json(payload, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to upload file.'

    if (message === 'unsupported_type') {
      return NextResponse.json({ error: 'Tipo de archivo no soportado.' }, { status: 400 })
    }

    if (message === 'file_too_large') {
      return NextResponse.json({ error: 'El archivo supera el tamaño permitido.' }, { status: 400 })
    }

    console.error('POST /api/assets/private failed:', error)

    return NextResponse.json({ error: 'Unable to upload private asset.' }, { status: 500 })
  }
}
