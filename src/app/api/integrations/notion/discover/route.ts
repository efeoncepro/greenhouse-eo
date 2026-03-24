import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const NOTION_PIPELINE_URL = (process.env.NOTION_PIPELINE_URL || 'https://notion-bq-sync-183008134038.us-central1.run.app').replace(/\/$/, '')

/**
 * GET /api/integrations/notion/discover
 *
 * Proxies to the Notion pipeline Cloud Run service /discover endpoint.
 * The pipeline owns the NOTION_TOKEN — the portal never touches it.
 *
 * Query params:
 *   ?q=keyword       — filter databases by title
 *   ?sample=DB_ID    — include sample records for a specific database
 *   ?sampleLimit=5   — max records in sample (1-20, default 5)
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('q') || ''
    const sampleDbId = searchParams.get('sample') || ''
    const sampleLimit = Math.min(20, Math.max(1, Number(searchParams.get('sampleLimit') || '5')))

    // 1. Discover databases via Cloud Run
    const discoverUrl = keyword
      ? `${NOTION_PIPELINE_URL}/discover?q=${encodeURIComponent(keyword)}`
      : `${NOTION_PIPELINE_URL}/discover`

    const discoverRes = await fetch(discoverUrl, { signal: AbortSignal.timeout(30_000) })

    if (!discoverRes.ok) {
      const text = await discoverRes.text().catch(() => '')


return NextResponse.json(
        { error: `Pipeline discovery failed (${discoverRes.status}): ${text}` },
        { status: discoverRes.status >= 500 ? 502 : discoverRes.status }
      )
    }

    const raw = await discoverRes.json()

    // Normalize snake_case from Cloud Run to camelCase for frontend
    const discovery = {
      totalDatabases: raw.total_databases ?? raw.totalDatabases ?? 0,
      filter: raw.filter ?? null,
      groups: ((raw.groups ?? []) as Array<Record<string, unknown>>).map((g: Record<string, unknown>) => ({
        parentKey: g.parent_key ?? g.parentKey ?? '',
        groupLabel: g.group_label ?? g.groupLabel ?? '',
        hasCoreDatabases: g.has_core_databases ?? g.hasCoreDatabases ?? false,
        classificationsFound: g.classifications_found ?? g.classificationsFound ?? [],
        databases: ((g.databases ?? []) as Array<Record<string, unknown>>).map((d: Record<string, unknown>) => ({
          databaseId: d.database_id ?? d.databaseId ?? '',
          title: d.title ?? '',
          classification: d.classification ?? null,
          parentType: d.parent_type ?? d.parentType ?? '',
          parentId: d.parent_id ?? d.parentId ?? '',
          parentName: d.parent_name ?? d.parentName ?? null,
          url: d.url ?? '',
          createdTime: d.created_time ?? d.createdTime ?? '',
          lastEditedTime: d.last_edited_time ?? d.lastEditedTime ?? ''
        }))
      }))
    }

    // 2. Optionally sample a specific database
    let sample = undefined

    if (sampleDbId) {
      try {
        const sampleRes = await fetch(
          `${NOTION_PIPELINE_URL}/discover/${encodeURIComponent(sampleDbId)}/sample?limit=${sampleLimit}`,
          { signal: AbortSignal.timeout(15_000) }
        )

        if (sampleRes.ok) {
          sample = await sampleRes.json()
        } else {
          sample = {
            databaseId: sampleDbId,
            error: `Sample failed (${sampleRes.status})`,
            records: [],
            count: 0
          }
        }
      } catch (err) {
        sample = {
          databaseId: sampleDbId,
          error: err instanceof Error ? err.message : 'Failed to fetch sample',
          records: [],
          count: 0
        }
      }
    }

    return NextResponse.json({
      ...discovery,
      sample
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Discovery failed'


return NextResponse.json({ error: message }, { status: 502 })
  }
}
