import { NextResponse } from 'next/server'

import {
  CapabilityDeprecationError,
  markCapabilityDeprecated
} from '@/lib/capabilities-registry/deprecate'
import { can } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

type DeprecateCapabilityBody = {
  reason?: string | null
}

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ capabilityKey: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'access.governance.capability.deprecate', 'manage', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { capabilityKey } = await params

  try {
    const body = (await request.json().catch(() => null)) as DeprecateCapabilityBody | null
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

    const result = await markCapabilityDeprecated({
      capabilityKey: decodeURIComponent(capabilityKey),
      reason,
      actorUserId: tenant.userId,
      spaceId: tenant.spaceId
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof CapabilityDeprecationError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.statusCode }
      )
    }

    console.error(`[admin/entitlements/capabilities/${capabilityKey}/deprecate] POST error:`, error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo deprecar la capability.' },
      { status: 500 }
    )
  }
}
