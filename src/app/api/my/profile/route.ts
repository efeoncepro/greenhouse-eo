import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { requireMyTenantContext } from '@/lib/tenant/authorization'
import {
  getPersonProfileByMemberId,
  toPersonProfileSummary,
  toPersonProfileSummaryFromSession
} from '@/lib/person-360/get-person-profile'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await getPersonProfileByMemberId(memberId)

    if (profile) {
      return NextResponse.json(toPersonProfileSummary(profile))
    }

    // Fallback: session always has basic identity data
    const session = await getServerSession(authOptions)

    if (session?.user) {
      return NextResponse.json(toPersonProfileSummaryFromSession(session.user))
    }

    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  } catch (error) {
    console.error('GET /api/my/profile failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
