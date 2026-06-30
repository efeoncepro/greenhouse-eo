import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { listPendingReportReviews } from '@/lib/growth/ai-visibility/review/queries'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1244 — `GET /api/admin/growth/ai-visibility/reviews`
 *
 * Cola del gate humano de release YMYL (EPIC-020 F): los runs cuyo score más reciente es
 * `review_required` y aún no tienen decisión (pending), con sus `reviewReasons` (scoring
 * TASK-1227 + exactitud de marca TASK-1238). Capability `growth.ai_visibility.report.review`
 * (todo el surface de revisión va detrás de la misma capability). Full API parity: delega
 * 100% en el reader canónico.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.report.review', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.report.review' }
    })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limitRaw = Number(searchParams.get('limit'))
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : undefined

    const items = await listPendingReportReviews(limit)

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_reviews_route', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
