import { NextResponse } from 'next/server'

import { updateStaffAugOnboardingItem } from '@/lib/staff-augmentation/store'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ placementId: string; itemId: string }> }
) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { placementId, itemId } = await params
    const body = await request.json()
    const onboardingItems = await updateStaffAugOnboardingItem(placementId, itemId, body, tenant.userId)

    return NextResponse.json({ placementId, onboardingItems })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update onboarding item.' },
      { status: 400 }
    )
  }
}
