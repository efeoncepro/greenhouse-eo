import { NextResponse } from 'next/server'

import { requirePeopleTenantContext } from '@/lib/tenant/authorization'
import { readPersonIntelligence, readPersonIntelligenceTrend } from '@/lib/person-intelligence/store'
import type { PersonIntelligenceResponse } from '@/lib/person-intelligence/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { memberId } = await params
  const { searchParams } = new URL(request.url)
  const trendMonths = Math.min(24, Math.max(1, Number(searchParams.get('trend') || '6')))

  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // Parallel: current period + trend
    const [current, trend] = await Promise.all([
      readPersonIntelligence(memberId, year, month),
      readPersonIntelligenceTrend(memberId, trendMonths)
    ])

    const response: PersonIntelligenceResponse = {
      memberId,
      current,
      trend,
      meta: {
        source: current?.source ?? 'person_intelligence',
        materializedAt: current?.materializedAt ?? null,
        engineVersion: current?.engineVersion ?? 'v2.0.0-person-intelligence'
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error(`GET /api/people/${memberId}/intelligence failed:`, error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
