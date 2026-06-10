import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { captureWithDomain } from '@/lib/observability/capture'
import { composeMyPerformance, resolveCurrentSantiagoPeriod } from '@/lib/my-performance/dto'
import { requireMyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parsePeriodParam = (raw: string | null): number | null => {
  if (raw === null) return null
  const trimmed = raw.trim()

  if (trimmed === '') return null
  const n = Number(trimmed)

  return Number.isInteger(n) ? n : NaN
}

/**
 * GET /api/my/performance?year=YYYY&month=M — TASK-1027.
 *
 * Self-service performance surface. The subject is ALWAYS resolved from the
 * session via `requireMyTenantContext()`. Any `memberId`/`identityProfileId`/
 * target param the browser sends is ignored by construction (anti-IDOR).
 * Returns a redacted DTO; cost/compensation fields are never composed in.
 */
export async function GET(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  // Only `year`/`month` are honored — subject is never client-supplied.
  const { searchParams } = new URL(request.url)
  const current = resolveCurrentSantiagoPeriod()
  const yearParam = parsePeriodParam(searchParams.get('year'))
  const monthParam = parsePeriodParam(searchParams.get('month'))

  if (Number.isNaN(yearParam) || Number.isNaN(monthParam)) {
    return canonicalErrorResponse('invalid_period')
  }

  const year = yearParam ?? current.year
  const month = monthParam ?? current.month

  if (year < 2024 || year > 2030 || month < 1 || month > 12) {
    return canonicalErrorResponse('invalid_period')
  }

  try {
    const payload = await composeMyPerformance({ memberId, year, month })

    return NextResponse.json(payload)
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'my_performance_route', stage: 'compose' }
    })

    return canonicalErrorResponse('internal_error')
  }
}
