import { NextResponse } from 'next/server'

import { getStaffAugPlacementDetail, updateStaffAugPlacement } from '@/lib/staff-augmentation/store'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ placementId: string }> }) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { placementId } = await params
  const detail = await getStaffAugPlacementDetail(placementId)

  if (!detail) {
    return NextResponse.json({ error: 'Placement not found.' }, { status: 404 })
  }

  return NextResponse.json(detail)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ placementId: string }> }) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { placementId } = await params
    const body = await request.json()
    const detail = await updateStaffAugPlacement(placementId, body, tenant.userId)

    return NextResponse.json(detail)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update placement.' },
      { status: 400 }
    )
  }
}
