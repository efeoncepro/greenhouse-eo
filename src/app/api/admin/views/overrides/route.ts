import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import {
  saveUserViewOverrides,
  ViewAccessStoreError,
  type PersistedUserViewOverrideInput
} from '@/lib/admin/view-access-store'

type SaveOverridesBody = {
  userId?: string
  overrides?: Array<{
    viewCode?: string
    overrideType?: 'grant' | 'revoke'
    reason?: string | null
    expiresAt?: string | null
  }>
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as SaveOverridesBody | null
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''

    if (!userId) {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 })
    }

    const overrides: PersistedUserViewOverrideInput[] =
      body?.overrides
        ?.filter(
          override =>
            typeof override.viewCode === 'string' &&
            override.viewCode.trim().length > 0 &&
            (override.overrideType === 'grant' || override.overrideType === 'revoke')
        )
        .map(override => ({
          viewCode: override.viewCode!.trim(),
          overrideType: override.overrideType as 'grant' | 'revoke',
          reason: typeof override.reason === 'string' && override.reason.trim().length > 0 ? override.reason.trim() : null,
          expiresAt: typeof override.expiresAt === 'string' && override.expiresAt.trim().length > 0 ? override.expiresAt.trim() : null
        })) ?? []

    const hasReasonlessOverride = overrides.some(override => !override.reason)

    if (overrides.length > 0 && hasReasonlessOverride) {
      return NextResponse.json({ error: 'Cada override debe incluir una razón breve.' }, { status: 400 })
    }

    const result = await saveUserViewOverrides({
      userId,
      overrides,
      actorUserId: tenant.userId
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ViewAccessStoreError && error.code === 'SCHEMA_NOT_READY') {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Unable to save user view overrides.', error)

    return NextResponse.json({ error: 'Unable to save user view overrides.' }, { status: 500 })
  }
}
