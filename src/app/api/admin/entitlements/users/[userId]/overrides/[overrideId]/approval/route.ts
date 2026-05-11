import { NextResponse } from 'next/server'

import { approveUserEntitlementOverride } from '@/lib/admin/entitlements-governance'
import { can } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

type ApprovalBody = {
  decision?: 'approve' | 'reject'
  approvalReason?: string | null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string; overrideId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'access.governance.user_overrides.approve', 'approve', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, overrideId } = await params

  try {
    const body = (await request.json().catch(() => null)) as ApprovalBody | null
    const decision = body?.decision
    const approvalReason = typeof body?.approvalReason === 'string' ? body.approvalReason.trim() : ''

    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json({ error: 'decision debe ser approve o reject.' }, { status: 400 })
    }

    const result = await approveUserEntitlementOverride({
      userId,
      overrideId,
      actorUserId: tenant.userId,
      spaceId: tenant.spaceId,
      decision,
      approvalReason
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(`[admin/entitlements/users/${userId}/overrides/${overrideId}/approval] PATCH error:`, error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo registrar la aprobación.' },
      { status: 500 }
    )
  }
}
