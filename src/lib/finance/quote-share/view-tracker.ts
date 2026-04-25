import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-631 Fase 2 — Append-only view audit log for share links.
 *
 * Each render of /public/quote/[id]/[v]/[token] inserts a row in
 * greenhouse_commercial.quote_share_views for sales rep analytics.
 * Best-effort: failures don't block the page render.
 *
 * NOTE: this is separate from `trackShortLinkAccess` in short-link.ts which
 * just increments the access counter on the short link itself. The audit
 * log here gives per-view detail (IP, UA, referer, timestamp).
 */

interface RecordShareViewInput {
  quotationId: string
  versionNumber: number
  shortCode?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  referer?: string | null
}

export const recordShareView = async (input: RecordShareViewInput): Promise<void> => {
  try {
    await query(
      `INSERT INTO greenhouse_commercial.quote_share_views
         (short_code, quotation_id, version_number, ip_address, user_agent, referer)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.shortCode ?? 'direct-link',
        input.quotationId,
        input.versionNumber,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        input.referer ?? null
      ]
    )
  } catch (error) {
    console.warn(
      '[quote-share] Failed to record share view:',
      error instanceof Error ? error.message : error
    )
  }
}

interface ViewAggregateRow extends Record<string, unknown> {
  view_count: string | number
  last_view: string | Date | null
  unique_ips: string | number
}

interface ViewAggregate {
  viewCount: number
  lastView: string | null
  uniqueIps: number
}

export const getShareViewAggregate = async (
  quotationId: string,
  versionNumber: number
): Promise<ViewAggregate> => {
  const rows = await query<ViewAggregateRow>(
    `SELECT
       COUNT(*) AS view_count,
       MAX(viewed_at) AS last_view,
       COUNT(DISTINCT ip_address) FILTER (WHERE ip_address IS NOT NULL) AS unique_ips
     FROM greenhouse_commercial.quote_share_views
     WHERE quotation_id = $1 AND version_number = $2`,
    [quotationId, versionNumber]
  )

  const row = rows[0]

  if (!row) {
    return { viewCount: 0, lastView: null, uniqueIps: 0 }
  }

  return {
    viewCount: Number(row.view_count ?? 0),
    lastView:
      row.last_view instanceof Date
        ? row.last_view.toISOString()
        : (row.last_view as string | null),
    uniqueIps: Number(row.unique_ips ?? 0)
  }
}
