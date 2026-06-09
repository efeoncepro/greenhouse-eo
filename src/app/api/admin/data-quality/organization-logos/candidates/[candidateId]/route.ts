import { NextResponse } from 'next/server'

import {
  canReviewOrganizationBrandAsset,
  OrganizationBrandAssetError,
  rejectOrganizationLogoCandidate
} from '@/lib/account-360/organization-brand-assets'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const toErrorResponse = (error: unknown) => {
  if (error instanceof OrganizationBrandAssetError) {
    if (error.code === 'candidate_not_found') {
      return NextResponse.json({ error: 'Logo candidate not found.' }, { status: 404 })
    }

    if (error.code === 'operating_entity_forbidden') {
      return NextResponse.json(
        { error: 'Los logos institucionales o legales de Efeonce no se modifican desde este flujo.' },
        { status: 403 }
      )
    }
  }

  console.error('PATCH /api/admin/data-quality/organization-logos/candidates/[candidateId] failed:', error)

  return NextResponse.json({ error: 'Unable to update organization logo candidate.' }, { status: 500 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ candidateId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canReviewOrganizationBrandAsset(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { candidateId } = await params
  const body = await request.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action.trim() : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : null

  if (action !== 'reject') {
    return NextResponse.json({ error: 'Unsupported candidate action.' }, { status: 400 })
  }

  try {
    const result = await rejectOrganizationLogoCandidate({
      candidateId,
      actorUserId: tenant.userId,
      reason
    })

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
