import { NextResponse } from 'next/server'

import type { UserEntitlementOverrideInput } from '@/lib/admin/entitlements-governance'
import { saveUserEntitlementOverrides } from '@/lib/admin/entitlements-governance'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

type SaveOverridesBody = {
  overrides?: Array<{
    capability?: string
    action?: string
    scope?: string
    effect?: 'grant' | 'revoke'
    reason?: string | null
    expiresAt?: string | null
  }>
}

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await params

  try {
    const body = (await request.json().catch(() => null)) as SaveOverridesBody | null

    const overrides: UserEntitlementOverrideInput[] =
      body?.overrides
        ?.filter(
          override =>
            typeof override.capability === 'string' &&
            typeof override.action === 'string' &&
            typeof override.scope === 'string' &&
            (override.effect === 'grant' || override.effect === 'revoke') &&
            typeof override.reason === 'string' &&
            override.reason.trim().length > 0
        )
        .map(override => ({
          capability: override.capability!.trim() as UserEntitlementOverrideInput['capability'],
          action: override.action!.trim() as UserEntitlementOverrideInput['action'],
          scope: override.scope!.trim() as UserEntitlementOverrideInput['scope'],
          effect: override.effect as 'grant' | 'revoke',
          reason: override.reason!.trim(),
          expiresAt: typeof override.expiresAt === 'string' && override.expiresAt.trim().length > 0 ? override.expiresAt.trim() : null
        })) ?? []

    const result = await saveUserEntitlementOverrides({
      userId,
      overrides,
      actorUserId: tenant.userId,
      spaceId: tenant.spaceId
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(`[admin/entitlements/users/${userId}/overrides] POST error:`, error)

    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron guardar las excepciones.' }, { status: 500 })
  }
}
