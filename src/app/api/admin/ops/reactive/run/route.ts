import { NextResponse } from 'next/server'

import { ensureReactiveSchema, processReactiveEvents } from '@/lib/sync/reactive-consumer'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureReactiveSchema()
  const result = await processReactiveEvents()

  return NextResponse.json(result)
}
