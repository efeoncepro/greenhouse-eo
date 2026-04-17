import { NextResponse } from 'next/server'

import { getAgencyTeamCapacity } from '@/lib/agency/team-capacity-store'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache'
}

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getAgencyTeamCapacity()

    return NextResponse.json(payload, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('GET /api/agency/team failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
