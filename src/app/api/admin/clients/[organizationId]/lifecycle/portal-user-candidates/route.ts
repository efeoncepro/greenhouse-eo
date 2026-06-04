import { NextResponse } from 'next/server'

import { authorizeLifecycle } from '@/lib/client-lifecycle/api-helpers'
import { listClientPortalPersonCandidates } from '@/lib/client-onboarding/client-portal-person-candidates'

export const dynamic = 'force-dynamic'

/**
 * TASK-1001 — GET /api/admin/clients/[organizationId]/lifecycle/portal-user-candidates
 *
 * Read API (CQRS-lite): candidatos a usuario de portal sembrados desde los contactos
 * HubSpot ya capturados, con rol sugerido por cargo + marca alreadyInvited. Read-only
 * (capability client.lifecycle.case.read). Degrada honesto (sin lista vacía silenciosa).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.read')

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'No autorizado', code: 'unauthorized', actionable: false }, { status: 401 })
  }

  const result = await listClientPortalPersonCandidates(organizationId)

  return NextResponse.json(result)
}
