import { NextResponse } from 'next/server'

import { listUnhealthyHandlers, acknowledgeHandlerDeadLetters } from '@/lib/sync/handler-health'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * Admin endpoint for inspecting and acknowledging unhealthy handlers.
 *
 * GET  → list current unhealthy handlers (degraded/failed/quarantined)
 *        with last_error context for the operator.
 * POST → acknowledge active dead-letters for a handler. Body:
 *        { handler: string, resolutionNote?: string,
 *          transitionToHealthy?: boolean }.
 *        Acknowledged rows stay in the audit log for forensics; the
 *        KPI excludes them. Optionally transitions the handler back
 *        to healthy when the operator confirms the root cause is fixed.
 */
export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const handlers = await listUnhealthyHandlers()

  return NextResponse.json({ handlers })
}

interface AckRequestBody {
  handler?: string
  resolutionNote?: string
  transitionToHealthy?: boolean
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: AckRequestBody
  try {
    body = (await request.json()) as AckRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const handler = body.handler?.trim()

  if (!handler) {
    return NextResponse.json({ error: 'handler is required' }, { status: 400 })
  }

  const acknowledgedBy = tenant.identityProfileId ?? tenant.userId

  const result = await acknowledgeHandlerDeadLetters({
    handler,
    acknowledgedBy,
    resolutionNote: body.resolutionNote ?? null,
    transitionToHealthy: body.transitionToHealthy ?? true
  })

  return NextResponse.json({
    handler,
    acknowledgedBy,
    acknowledgedRows: result.acknowledgedRows,
    newState: result.newState
  })
}
