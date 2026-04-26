import { NextResponse } from 'next/server'

import { getUntitledPagesOverview } from '@/lib/delivery/get-untitled-pages-overview'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * GET /api/admin/data-quality/notion-titles
 *
 * Lists Notion-sourced delivery entities (tasks, projects, sprints) whose
 * canonical title is currently NULL — the queue the admin uses to clean them
 * up directly in Notion. Once fixed at source, the next conformed sync drops
 * the row off this list automatically.
 *
 * Auth: admin tenant context. No CRON_SECRET required so the dashboard view
 * can hit it as a normal page fetch.
 *
 * Query params:
 *   - `recentLimit` (number, default 50, max 500): cap on the recent rows list.
 *     Aggregate counts (`bySpace`, `totals`) always reflect the full dataset.
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const recentLimit = Number.parseInt(searchParams.get('recentLimit') ?? '50', 10)

  try {
    const overview = await getUntitledPagesOverview({
      recentLimit: Number.isFinite(recentLimit) ? recentLimit : 50
    })

    return NextResponse.json(overview)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load untitled pages overview' },
      { status: 502 }
    )
  }
}
