import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { getPersonIcoProfile } from '@/lib/person-360/get-person-ico-profile'
import { getPersonOperationalServing } from '@/lib/person-360/get-person-operational-serving'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [ico, operational] = await Promise.allSettled([
      getPersonIcoProfile(memberId, 6),
      getPersonOperationalServing(memberId)
    ])

    return NextResponse.json({
      ico: ico.status === 'fulfilled' ? ico.value : null,
      operational: operational.status === 'fulfilled' ? operational.value : null,
      memberId
    })
  } catch (error) {
    console.error('GET /api/my/performance failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
