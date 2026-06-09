import { NextResponse } from 'next/server'

import {
  attachOrganizationLogoAsset,
  canUpdateOrganizationBrandAsset,
  OrganizationBrandAssetError
} from '@/lib/account-360/organization-brand-assets'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const toErrorResponse = (error: unknown) => {
  if (error instanceof OrganizationBrandAssetError) {
    switch (error.code) {
      case 'organization_not_found':
        return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
      case 'operating_entity_forbidden':
        return NextResponse.json(
          { error: 'Los logos institucionales o legales de Efeonce no se modifican desde este flujo.' },
          { status: 403 }
        )
      case 'asset_not_found':
        return NextResponse.json({ error: 'Asset not found.' }, { status: 404 })
      case 'unsupported_asset_context':
        return NextResponse.json({ error: 'Asset context is not valid for organization logos.' }, { status: 400 })
      case 'candidate_not_found':
        return NextResponse.json({ error: 'Logo candidate not found.' }, { status: 404 })
      case 'candidate_asset_mismatch':
        return NextResponse.json({ error: 'Logo candidate does not match the supplied asset.' }, { status: 409 })
    }
  }

  console.error('POST /api/organizations/[id]/brand-assets/logo failed:', error)

  return NextResponse.json({ error: 'Unable to update organization logo.' }, { status: 500 })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canUpdateOrganizationBrandAsset(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : ''
  const candidateId = typeof body.candidateId === 'string' ? body.candidateId.trim() : null
  const reason = typeof body.reason === 'string' ? body.reason.trim() : null

  if (!assetId) {
    return NextResponse.json({ error: 'assetId is required.' }, { status: 400 })
  }

  try {
    const result = await attachOrganizationLogoAsset({
      organizationId: id,
      assetId,
      candidateId,
      reason,
      actorUserId: tenant.userId
    })

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
