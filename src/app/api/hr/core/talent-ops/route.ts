import { NextResponse } from 'next/server'

import { requireHrTenantContext } from '@/lib/tenant/authorization'
import {
  getTalentOpsMetrics,
  getMemberCompletenessBreakdown,
  getSkillGaps,
  getTalentOpsActionItems
} from '@/lib/hr-core/talent-ops'

export const dynamic = 'force-dynamic'

const VALID_SECTIONS = ['metrics', 'completeness', 'gaps', 'actions', 'all'] as const

type Section = (typeof VALID_SECTIONS)[number]

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const sectionParam = searchParams.get('section') || 'all'

    const section: Section = (VALID_SECTIONS as readonly string[]).includes(sectionParam)
      ? (sectionParam as Section)
      : 'all'

    const includeMetrics = section === 'all' || section === 'metrics'
    const includeCompleteness = section === 'all' || section === 'completeness'
    const includeGaps = section === 'all' || section === 'gaps'
    const includeActions = section === 'all' || section === 'actions'

    const [metrics, completeness, skillGaps, actionItems] = await Promise.all([
      includeMetrics ? getTalentOpsMetrics() : null,
      includeCompleteness ? getMemberCompletenessBreakdown() : null,
      includeGaps ? getSkillGaps() : null,
      includeActions ? getTalentOpsActionItems() : null
    ])

    const response: Record<string, unknown> = {}

    if (metrics !== null) response.metrics = metrics
    if (completeness !== null) response.completeness = completeness
    if (skillGaps !== null) response.skillGaps = skillGaps
    if (actionItems !== null) response.actionItems = actionItems

    return NextResponse.json(response)
  } catch (error) {
    console.error('[hr/core/talent-ops] GET error:', error)

    return NextResponse.json(
      { error: 'Unable to load talent ops analytics.' },
      { status: 500 }
    )
  }
}
