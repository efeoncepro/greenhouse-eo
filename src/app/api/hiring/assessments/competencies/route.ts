import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { toHiringErrorResponse } from '@/lib/hiring'
import { listCompetencies } from '@/lib/hiring/assessment'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { CompetencyCategory } from '@/types/hiring-assessment'

/** TASK-1360 — `GET /api/hiring/assessments/competencies` (catálogo, read). `?category=` opcional. */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.read' } })
  }

  try {
    const category = new URL(request.url).searchParams.get('category')
    const items = await listCompetencies((category as CompetencyCategory) || undefined)

    
return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_competencies_list')
  }
}
