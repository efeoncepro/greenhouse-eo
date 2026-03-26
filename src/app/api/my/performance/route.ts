import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { getPersonIcoProfile } from '@/lib/person-360/get-person-ico-profile'
import { getPersonOperationalServing } from '@/lib/person-360/get-person-operational-serving'
import { readPersonIntelligence, readPersonIntelligenceTrend } from '@/lib/person-intelligence/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    const [ico, operational, intelligence, trend] = await Promise.allSettled([
      getPersonIcoProfile(memberId, 6),
      getPersonOperationalServing(memberId),
      readPersonIntelligence(memberId, now.getFullYear(), now.getMonth() + 1),
      readPersonIntelligenceTrend(memberId, 6)
    ])

    return NextResponse.json({
      ico: ico.status === 'fulfilled' ? ico.value : null,
      operational: operational.status === 'fulfilled' ? operational.value : null,
      intelligence: intelligence.status === 'fulfilled' ? intelligence.value : null,
      intelligenceTrend: trend.status === 'fulfilled' ? trend.value : [],
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
