import { NextResponse } from 'next/server'

import {
  buildTenantEntitlementSubject,
  runPartyLifecycleInactivitySweep
} from '@/lib/commercial/party'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

interface SweepBody {
  dryRun?: unknown
  limit?: unknown
  inactivityMonths?: unknown
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SweepBody = {}

  try {
    body = (await request.json()) as SweepBody
  } catch {
    body = {}
  }

  const dryRun = body.dryRun !== false

  if (
    !dryRun &&
    !hasEntitlement(buildTenantEntitlementSubject(tenant), 'commercial.party.override_lifecycle', 'update')
  ) {
    return NextResponse.json(
      { error: 'Missing capability commercial.party.override_lifecycle.' },
      { status: 403 }
    )
  }

  const limit = typeof body.limit === 'number' ? body.limit : undefined
  const inactivityMonths = typeof body.inactivityMonths === 'number' ? body.inactivityMonths : undefined

  if (limit != null && (!Number.isFinite(limit) || limit <= 0)) {
    return NextResponse.json({ error: 'limit must be a positive number.' }, { status: 400 })
  }

  if (inactivityMonths != null && (!Number.isFinite(inactivityMonths) || inactivityMonths <= 0)) {
    return NextResponse.json(
      { error: 'inactivityMonths must be a positive number.' },
      { status: 400 }
    )
  }

  const result = await runPartyLifecycleInactivitySweep({
    dryRun,
    limit,
    inactivityMonths
  })

  return NextResponse.json(result)
}
