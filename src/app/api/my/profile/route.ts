import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { getPersonProfileByMemberId } from '@/lib/person-360/get-person-profile'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await getPersonProfileByMemberId(memberId)

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      resolvedDisplayName: profile.resolved.displayName,
      resolvedEmail: profile.resolved.email,
      resolvedPhone: profile.resolved.phone,
      resolvedAvatarUrl: profile.resolved.avatarUrl,
      resolvedJobTitle: profile.resolved.jobTitle,
      departmentName: profile.memberFacet?.departmentName ?? null,
      jobLevel: profile.memberFacet?.jobLevel ?? null,
      employmentType: profile.memberFacet?.employmentType ?? null,
      hireDate: profile.memberFacet?.hireDate ?? null,
      hasMemberFacet: profile.hasMemberFacet,
      hasUserFacet: profile.hasUserFacet,
      hasCrmFacet: profile.hasCrmFacet,
      linkedSystems: profile.linkedSystems
    })
  } catch (error) {
    console.error('GET /api/my/profile failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
