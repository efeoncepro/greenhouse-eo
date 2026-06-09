import { NextResponse } from 'next/server'

import {
  canReviewOrganizationBrandAsset,
  createManualOrganizationLogoCandidate,
  OrganizationBrandAssetError
} from '@/lib/account-360/organization-brand-assets'
import { createOperatorUrlOrganizationLogoCandidate } from '@/lib/account-360/organization-brand-assets-discovery'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const toErrorResponse = (error: unknown) => {
  if (error instanceof OrganizationBrandAssetError) {
    if (error.code === 'operating_entity_forbidden') {
      return NextResponse.json(
        { error: 'Los logos institucionales o legales de Efeonce no se modifican desde este flujo.' },
        { status: 403 }
      )
    }

    if (error.code === 'organization_not_found') {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
    }

    if (error.code === 'asset_not_found') {
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 })
    }

    if (error.code === 'unsupported_asset_context') {
      return NextResponse.json({ error: 'Asset context is not valid for organization logos.' }, { status: 400 })
    }

    if (error.code === 'invalid_source_url') {
      return NextResponse.json({ error: 'Ingresa una URL válida del sitio o de una imagen.' }, { status: 400 })
    }

    if (error.code === 'no_supported_logo_candidate') {
      return NextResponse.json(
        { error: 'No encontramos un logo PNG, JPG o WebP en esa URL. Prueba con la URL directa de una imagen.' },
        { status: 422 }
      )
    }
  }

  console.error('POST /api/admin/data-quality/organization-logos/candidates failed:', error)

  return NextResponse.json({ error: 'Unable to create organization logo candidate.' }, { status: 500 })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canReviewOrganizationBrandAsset(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId.trim() : ''
  const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : ''
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : ''
  const mode = body.mode === 'operator_url' ? 'operator_url' : 'manual_upload'

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required.' }, { status: 400 })
  }

  if (mode === 'operator_url') {
    if (!sourceUrl) {
      return NextResponse.json({ error: 'sourceUrl is required.' }, { status: 400 })
    }

    try {
      const result = await createOperatorUrlOrganizationLogoCandidate({
        organizationId,
        sourceUrl,
        actorUserId: tenant.userId
      })

      return NextResponse.json(result, { status: 201 })
    } catch (error) {
      return toErrorResponse(error)
    }
  }

  if (!assetId) {
    return NextResponse.json({ error: 'assetId is required.' }, { status: 400 })
  }

  try {
    const result = await createManualOrganizationLogoCandidate({
      organizationId,
      assetId,
      actorUserId: tenant.userId,
      sourceUrl: sourceUrl || null,
      metadata: { route: '/admin/data-quality/organization-logos' }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
