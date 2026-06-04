import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import { listLifecycleCases } from '@/lib/client-lifecycle/store'
import type { ClientLifecycleCaseKind } from '@/lib/client-lifecycle/types'

export const dynamic = 'force-dynamic'

const VALID_STATUS = new Set(['draft', 'in_progress', 'blocked', 'completed', 'cancelled'])
const VALID_KIND = new Set(['onboarding', 'offboarding', 'reactivation'])

// GET /api/admin/clients/lifecycle/cases?status=&caseKind=&overdue=&cursor=&pageSize=
export async function GET(request: Request) {
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.read')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const kindParam = searchParams.get('caseKind')
    const pageSize = Number(searchParams.get('pageSize') ?? '25')

    const result = await listLifecycleCases({
      status: statusParam && VALID_STATUS.has(statusParam) ? (statusParam as never) : undefined,
      caseKind: kindParam && VALID_KIND.has(kindParam) ? (kindParam as ClientLifecycleCaseKind) : undefined,
      overdueOnly: searchParams.get('overdue') === 'true',
      cursor: searchParams.get('cursor'),
      limit: Number.isFinite(pageSize) ? pageSize : 25
    })

    return NextResponse.json(result)
  } catch (error) {
    return mapLifecycleError(error, 'list_cases')
  }
}
