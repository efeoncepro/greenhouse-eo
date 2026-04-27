import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { HomeRecentItem, HomeRecentsRailData } from '../contract'
import type { HomeLoaderContext } from '../registry'

type RecentRow = {
  id: string | number
  user_id: string
  entity_kind: string
  entity_id: string
  tenant_id: string | null
  view_code: string | null
  title: string | null
  href: string | null
  visit_count: number | string | null
  last_seen_at: string
  snapshot_jsonb: Record<string, unknown> | null
} & Record<string, unknown>

const RECENTS_LIMIT = 8
const DRAFT_ENTITY_KINDS = new Set(['quote.draft', 'invoice.draft', 'expense.draft', 'project.draft', 'task.draft'])

const fallbackHref = (kind: string, entityId: string): string => {
  if (kind === 'project') return `/proyectos/${entityId}`
  if (kind === 'quote') return `/commercial/quotes/${entityId}`
  if (kind === 'client') return `/agency/spaces/${entityId}`
  if (kind === 'invoice') return `/finance/income/${entityId}`
  if (kind === 'payroll_period') return `/hr/payroll/periods/${entityId}`
  if (kind === 'task') return `/proyectos?task=${entityId}`
  if (kind === 'space') return `/agency/spaces/${entityId}`

  return `/${kind}/${entityId}`
}

const fallbackTitle = (kind: string, entityId: string): string => {
  return `${kind.replace(/_/g, ' ')} ${entityId}`
}

const mapRow = (row: RecentRow): HomeRecentItem => ({
  recentId: String(row.id),
  entityKind: row.entity_kind,
  entityId: row.entity_id,
  title: row.title?.trim() || fallbackTitle(row.entity_kind, row.entity_id),
  href: row.href ?? fallbackHref(row.entity_kind, row.entity_id),
  badge: typeof row.snapshot_jsonb?.badge === 'string' ? (row.snapshot_jsonb.badge as string) : null,
  lastSeenAt: row.last_seen_at,
  visitCount: Number(row.visit_count ?? 1)
})

export const loadHomeRecentsRail = async (ctx: HomeLoaderContext): Promise<HomeRecentsRailData> => {
  let rows: RecentRow[] = []

  try {
    const tenantClause = ctx.tenantId ? ' AND (tenant_id IS NULL OR tenant_id = $2)' : ''
    const params: unknown[] = [ctx.userId]

    if (ctx.tenantId) params.push(ctx.tenantId)

    rows = await runGreenhousePostgresQuery<RecentRow>(
      `SELECT id, user_id, entity_kind, entity_id, tenant_id, view_code,
              title, href, visit_count, last_seen_at, snapshot_jsonb
         FROM greenhouse_serving.user_recent_items
        WHERE user_id = $1${tenantClause}
        ORDER BY last_seen_at DESC
        LIMIT ${RECENTS_LIMIT * 2}`,
      params
    )
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[home.loaders.recents] recents lookup failed:',
        error instanceof Error ? error.message : error
      )
    }
  }

  const items = rows.filter(row => !DRAFT_ENTITY_KINDS.has(row.entity_kind)).map(mapRow).slice(0, RECENTS_LIMIT)
  const draftItems = rows.filter(row => DRAFT_ENTITY_KINDS.has(row.entity_kind)).map(mapRow).slice(0, 4)

  return { items, draftItems }
}
