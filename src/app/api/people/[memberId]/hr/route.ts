import { NextResponse } from 'next/server'

import { getPersonHrContext } from '@/lib/person-360/get-person-hr'
import { toPeopleErrorResponse } from '@/lib/people/shared'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params

    const result = await getPersonHrContext(memberId)

    if (!result) {
      return NextResponse.json({ error: 'Person not found.' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load person HR context.')
  }
}
