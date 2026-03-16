import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { getPersonMemberships } from '@/lib/account-360/organization-store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

interface MemberProfileRow extends Record<string, unknown> {
  identity_profile_id: string | null
}

export async function GET(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await params

  // Look up identity_profile_id from the member record
  const rows = await runGreenhousePostgresQuery<MemberProfileRow>(`
    SELECT identity_profile_id
    FROM greenhouse_core.members
    WHERE member_id = $1
    LIMIT 1
  `, [memberId])

  const profileId = rows[0]?.identity_profile_id

  if (!profileId) {
    return NextResponse.json({ items: [], total: 0 })
  }

  const memberships = await getPersonMemberships(profileId)

  return NextResponse.json({ items: memberships, total: memberships.length })
}
