import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getClientIcoSyncStatus } from '@/lib/ico-engine/get-client-ico-sync-status'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * GET /api/delivery/ico/sync-status?clientId=...  (o ?spaceId=...)
 *
 * TASK-1171 Slice 5 — verify-ICO preflight gobernado ("¿está calculando ICO el
 * cliente X?", configurado ≠ fluyendo). Dual-gate: `requireInternalTenantContext`
 * + `can('delivery.ico.sync.read')` (dentro del reader). Read-only, Nexa-operable.
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const { searchParams } = new URL(request.url)

  const outcome = await getClientIcoSyncStatus({
    tenant,
    clientId: searchParams.get('clientId'),
    spaceId: searchParams.get('spaceId')
  })

  if (!outcome.ok) {
    return canonicalErrorResponse(outcome.errorCode, outcome.extra ? { extra: outcome.extra } : undefined)
  }

  return NextResponse.json(outcome)
}
