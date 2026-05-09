import { NextResponse } from 'next/server'

import { listEligibleDealsForSampleSprint } from '@/lib/commercial/eligible-deals-reader'

import { requireSampleSprintEntitlement } from '../access'

export const dynamic = 'force-dynamic'

/**
 * TASK-837 Slice 1 — Eligible Deal Source endpoint for Sample Sprint wizard.
 *
 * GET /api/agency/sample-sprints/eligible-deals?spaceId=...&search=...&limit=50
 *
 * Returns deals from the local mirror filtered to:
 * - is_closed = FALSE
 * - is_deleted = FALSE
 * - enriched with company + contact context (for inheritance display)
 *
 * Each deal includes `isEligible` + `ineligibilityReasons[]` so the wizard
 * can render disabled rows with explicit reason tooltips. Server-side
 * revalidation at submit-time uses `getEligibleDealForRevalidation` (Slice 3)
 * which bypasses the cache.
 *
 * Cache: TTL 60s in-memory keyed by (subjectId, params). Sliced from runtime
 * polling pressure; stays fresh enough that a deal closed in HubSpot becomes
 * unselectable in <1min after the next cron sync.
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireSampleSprintEntitlement(
    'commercial.engagement.read',
    'read'
  )

  if (!tenant) return errorResponse

  const { searchParams } = new URL(request.url)
  const spaceId = searchParams.get('spaceId')?.trim() || undefined
  const organizationId = searchParams.get('organizationId')?.trim() || undefined
  const clientId = searchParams.get('clientId')?.trim() || undefined
  const search = searchParams.get('search')?.trim() || undefined
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200) : 50

  const items = await listEligibleDealsForSampleSprint({
    spaceId,
    organizationId,
    clientId,
    search,
    limit,
    cacheKey: tenant.userId
  })

  // Eligible-only count is what the wizard cares about; total includes
  // ineligible deals so the UI can render disabled rows with reasons.
  const eligibleCount = items.filter(d => d.isEligible).length

  return NextResponse.json({
    items,
    count: items.length,
    eligibleCount
  })
}
