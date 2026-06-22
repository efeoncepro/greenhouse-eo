import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { enableClientIcoSync } from '@/lib/ico-engine/enable-client-ico-sync'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * POST /api/delivery/ico/enable-sync
 *
 * TASK-1171 Slice 3 — Activar el sync Notion->ICO de un cliente (Full API Parity).
 * Dual-gate canónico: `requireInternalTenantContext` (route_group broad) +
 * `can('delivery.ico.sync.enable')` (capability fina, dentro del command).
 *
 * Body: { clientId?: string, spaceId?: string, reason?: string }  (clientId o spaceId).
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>

  const outcome = await enableClientIcoSync({
    tenant,
    clientId: typeof body.clientId === 'string' ? body.clientId : null,
    spaceId: typeof body.spaceId === 'string' ? body.spaceId : null,
    reason: typeof body.reason === 'string' ? body.reason : null
  })

  if (!outcome.ok) {
    return canonicalErrorResponse(outcome.errorCode, outcome.extra ? { extra: outcome.extra } : undefined)
  }

  return NextResponse.json(outcome, { status: 200 })
}
