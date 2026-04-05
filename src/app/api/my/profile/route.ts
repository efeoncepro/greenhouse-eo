import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { requireTenantContext } from '@/lib/tenant/authorization'
import {
  getPersonProfileByMemberId,
  toPersonProfileSummary,
  toPersonProfileSummaryFromSession
} from '@/lib/person-360/get-person-profile'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse
  }

  try {
    // Try person_360 if memberId is available
    if (tenant.memberId) {
      const profile = await getPersonProfileByMemberId(tenant.memberId)

      if (profile) {
        return NextResponse.json(toPersonProfileSummary(profile))
      }
    }

    // Fallback: session always has name, email, avatar for authenticated users
    const session = await getServerSession(authOptions)

    return NextResponse.json(toPersonProfileSummaryFromSession(session!.user))
  } catch (error) {
    console.error('GET /api/my/profile failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
