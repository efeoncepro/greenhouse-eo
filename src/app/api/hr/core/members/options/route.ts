import { NextResponse } from 'next/server'

import { getPeopleList } from '@/lib/people/get-people-list'
import { requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { HrMemberOptionsResponse } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPeopleList()

    const response: HrMemberOptionsResponse = {
      members: payload.items
        .filter(person => person.active)
        .map(person => ({
          memberId: person.memberId,
          displayName: person.displayName,
          roleTitle: person.roleTitle
        }))
    }

    return NextResponse.json(response)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load HR member options.')
  }
}
