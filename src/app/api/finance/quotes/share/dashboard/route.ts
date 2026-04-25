import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { buildShortQuoteUrl } from '@/lib/finance/quote-share/url-builder'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface DashboardRow extends Record<string, unknown> {
  short_code: string
  quotation_id: string
  quotation_number: string
  version_number: number
  client_name_cache: string | null
  total_price: string | number | null
  tax_amount_snapshot: string | number | null
  currency: string
  valid_until: string | Date | null
  accepted_at: string | Date | null
  accepted_by_name: string | null
  created_at: string | Date
  expires_at: string | Date | null
  last_accessed_at: string | Date | null
  access_count: number
  view_count: string | number
}

const toIso = (value: string | Date | null): string | null => {
  if (!value) return null

  return value instanceof Date ? value.toISOString() : value
}

/**
 * GET /api/finance/quotes/share/dashboard
 *
 * Cross-quote share analytics dashboard for sales reps.
 * Lists every active short link the rep has access to, with view + acceptance
 * stats. Sorted by most-recently-accessed.
 *
 * Query params:
 *   ?status=accepted|pending|all  (default: all)
 *   ?limit=50  (default: 50, max: 200)
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'all'
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)))

  const filters: string[] = ['l.revoked_at IS NULL']

  if (status === 'accepted') filters.push('q.accepted_at IS NOT NULL')
  if (status === 'pending') filters.push('q.accepted_at IS NULL')

  const rows = await query<DashboardRow>(
    `SELECT l.short_code,
            l.quotation_id,
            q.quotation_number,
            l.version_number,
            q.client_name_cache,
            q.total_price,
            q.tax_amount_snapshot,
            q.currency,
            q.valid_until,
            q.accepted_at,
            q.accepted_by_name,
            l.created_at,
            l.expires_at,
            l.last_accessed_at,
            l.access_count,
            (SELECT COUNT(*) FROM greenhouse_commercial.quote_share_views v
              WHERE v.quotation_id = l.quotation_id
                AND v.version_number = l.version_number) AS view_count
       FROM greenhouse_commercial.quote_short_links l
       INNER JOIN greenhouse_commercial.quotations q
         ON q.quotation_id = l.quotation_id
       WHERE ${filters.join(' AND ')}
       ORDER BY COALESCE(l.last_accessed_at, l.created_at) DESC
       LIMIT $1`,
    [limit]
  )

  const items = rows.map(row => {
    const totalNet = Number(row.total_price ?? 0)
    const taxAmount = Number(row.tax_amount_snapshot ?? 0)

    return {
      shortCode: row.short_code,
      shortUrl: buildShortQuoteUrl(row.short_code),
      quotationId: row.quotation_id,
      quotationNumber: row.quotation_number,
      versionNumber: Number(row.version_number),
      clientName: row.client_name_cache,
      total: totalNet + taxAmount,
      currency: String(row.currency || 'CLP').toUpperCase(),
      validUntil: toIso(row.valid_until)?.slice(0, 10) ?? null,
      acceptedAt: toIso(row.accepted_at),
      acceptedByName: row.accepted_by_name,
      createdAt: toIso(row.created_at) ?? new Date().toISOString(),
      expiresAt: toIso(row.expires_at),
      lastAccessedAt: toIso(row.last_accessed_at),
      accessCount: Number(row.access_count ?? 0),
      viewCount: Number(row.view_count ?? 0)
    }
  })

  // Aggregate counters
  const totals = {
    total: items.length,
    accepted: items.filter(i => i.acceptedAt).length,
    viewed: items.filter(i => i.viewCount > 0).length,
    pending: items.filter(i => !i.acceptedAt && i.viewCount > 0).length,
    notViewed: items.filter(i => i.viewCount === 0).length
  }

  return NextResponse.json({ items, totals })
}
