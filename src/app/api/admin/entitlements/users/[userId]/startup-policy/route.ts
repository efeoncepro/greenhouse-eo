import { NextResponse } from 'next/server'

import { updateUserStartupPolicy } from '@/lib/admin/entitlements-governance'
import { can } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

type SaveStartupPolicyBody = {
  portalHomePath?: string | null
  reason?: string | null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'access.governance.startup_policy.update', 'update', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params

  try {
    const body = (await request.json().catch(() => null)) as SaveStartupPolicyBody | null
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

    if (!reason) {
      return NextResponse.json({ error: 'Debes registrar una razón breve para cambiar la política de inicio.' }, { status: 400 })
    }

    const portalHomePath =
      typeof body?.portalHomePath === 'string' && body.portalHomePath.trim().length > 0 ? body.portalHomePath.trim() : null

    const result = await updateUserStartupPolicy({
      userId,
      portalHomePath,
      actorUserId: tenant.userId,
      reason,
      spaceId: tenant.spaceId
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(`[admin/entitlements/users/${userId}/startup-policy] PATCH error:`, error)

    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la política de inicio.' }, { status: 500 })
  }
}
