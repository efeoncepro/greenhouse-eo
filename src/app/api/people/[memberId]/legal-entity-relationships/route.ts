import { NextResponse } from 'next/server'

import { listPersonLegalEntityRelationshipsByProfile } from '@/lib/account-360/person-legal-entity-relationships'
import {
  assertMemberVisibleInPeopleScope,
  assertPeopleCapability,
  getPersonAccessForTenant
} from '@/lib/people/access-scope'
import { toPeopleErrorResponse } from '@/lib/people/shared'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface MemberProfileRow extends Record<string, unknown> {
  identity_profile_id: string | null
}

const resolveProfileId = async (memberId: string): Promise<string | null> => {
  const rows = await query<MemberProfileRow>(
    `SELECT identity_profile_id
     FROM greenhouse_core.members
     WHERE member_id = $1
     LIMIT 1`,
    [memberId]
  )

  return rows[0]?.identity_profile_id?.trim() || null
}

export async function GET(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, accessContext, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params
    const access = getPersonAccessForTenant(tenant, accessContext)

    assertPeopleCapability({ allowed: access.canViewMemberships })
    await assertMemberVisibleInPeopleScope({
      memberId,
      organizationId: null,
      accessContext
    })

    const profileId = await resolveProfileId(memberId)

    if (!profileId) {
      return NextResponse.json({ items: [], total: 0 })
    }

    const relationships = await listPersonLegalEntityRelationshipsByProfile({
      profileId,
      spaceId: tenant.spaceId ?? null
    })

    return NextResponse.json({ items: relationships, total: relationships.length })
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load person legal entity relationships.')
  }
}
