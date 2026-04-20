import { NextResponse } from 'next/server'

import {
  applyQuotationLineCostOverride,
  listQuotationLineCostOverrideHistory,
  QuotationLineCostOverrideValidationError
} from '@/lib/finance/quotation-line-cost-override-store'
import { canOverrideQuoteCost, requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RouteParams {
  id: string
  lineItemId: string
}

/**
 * POST /api/finance/quotes/[id]/lines/[lineItemId]/cost-override
 *
 * Applies a governed manual cost override on a quotation line (TASK-481).
 * Requires `canOverrideQuoteCost` capability (efeonce_admin + finance_admin).
 *
 * Body (JSON):
 *   - category: 'competitive_pressure' | 'strategic_investment' | 'roi_correction'
 *               | 'error_correction' | 'client_negotiation' | 'other'
 *   - reason: string (15-500 chars; 30+ when category='other')
 *   - overrideUnitCostUsd: number (>= 0)
 *   - metadata?: Record<string, unknown>
 *
 * Response: full override result with suggested baseline + delta + history id.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()
  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canOverrideQuoteCost(tenant)) {
    return NextResponse.json(
      { error: 'Permission denied: cost override requires finance_admin or efeonce_admin.' },
      { status: 403 }
    )
  }

  const { id: quotationId, lineItemId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>

  try {
    const result = await applyQuotationLineCostOverride({
      quotationId,
      lineItemId,
      category: payload.category as never,
      reason: typeof payload.reason === 'string' ? payload.reason : '',
      overrideUnitCostUsd: typeof payload.overrideUnitCostUsd === 'number' ? payload.overrideUnitCostUsd : NaN,
      actor: { userId: tenant.userId ?? null },
      metadata:
        payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
          ? (payload.metadata as Record<string, unknown>)
          : undefined
    })

    return NextResponse.json({ override: result }, { status: 201 })
  } catch (error) {
    if (error instanceof QuotationLineCostOverrideValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    console.error('[TASK-481] Failed to apply quotation line cost override', error)
    return NextResponse.json(
      { error: 'Failed to apply cost override.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/finance/quotes/[id]/lines/[lineItemId]/cost-override
 *
 * Returns the last N override history entries for this line.
 * Used by the Quote Builder override dialog to surface "this line was
 * overridden 2 times before" context (TASK-481, spec §4 open question #4).
 *
 * Query params:
 *   - limit: optional integer, 1-50, default 5
 *
 * Requires canViewCostStack (read side — analysts can read history even if
 * they cannot mutate).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()
  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { lineItemId } = await params
  const url = new URL(request.url)
  const rawLimit = url.searchParams.get('limit')
  const parsedLimit = rawLimit ? Number(rawLimit) : undefined

  try {
    const history = await listQuotationLineCostOverrideHistory({
      lineItemId,
      limit: Number.isFinite(parsedLimit) ? (parsedLimit as number) : undefined
    })

    return NextResponse.json({ history })
  } catch (error) {
    console.error('[TASK-481] Failed to list quotation line cost override history', error)
    return NextResponse.json(
      { error: 'Failed to list cost override history.' },
      { status: 500 }
    )
  }
}
