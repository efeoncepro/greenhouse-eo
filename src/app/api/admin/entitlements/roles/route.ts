import { NextResponse } from 'next/server'

import type { RoleEntitlementDefaultInput } from '@/lib/admin/entitlements-governance'
import { saveRoleEntitlementDefaults } from '@/lib/admin/entitlements-governance'
import { can } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

type SaveRoleDefaultsBody = {
  roleCode?: string
  defaults?: Array<{
    capability?: string
    action?: string
    scope?: string
    effect?: 'grant' | 'revoke'
    reason?: string | null
  }>
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'access.governance.role_defaults.update', 'update', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = (await request.json().catch(() => null)) as SaveRoleDefaultsBody | null
    const roleCode = typeof body?.roleCode === 'string' ? body.roleCode.trim() : ''

    if (!roleCode) {
      return NextResponse.json({ error: 'roleCode es obligatorio.' }, { status: 400 })
    }

    const defaults: RoleEntitlementDefaultInput[] =
      body?.defaults
        ?.filter(
          row =>
            typeof row.capability === 'string' &&
            typeof row.action === 'string' &&
            typeof row.scope === 'string' &&
            (row.effect === 'grant' || row.effect === 'revoke')
        )
        .map(row => ({
          capability: row.capability!.trim() as RoleEntitlementDefaultInput['capability'],
          action: row.action!.trim() as RoleEntitlementDefaultInput['action'],
          scope: row.scope!.trim() as RoleEntitlementDefaultInput['scope'],
          effect: row.effect as 'grant' | 'revoke',
          reason: typeof row.reason === 'string' && row.reason.trim().length > 0 ? row.reason.trim() : null
        })) ?? []

    const result = await saveRoleEntitlementDefaults({
      roleCode,
      defaults,
      actorUserId: tenant.userId,
      spaceId: tenant.spaceId
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[admin/entitlements/roles] POST error:', error)

    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la política por rol.' }, { status: 500 })
  }
}
