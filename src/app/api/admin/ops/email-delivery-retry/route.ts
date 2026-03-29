import { NextResponse } from 'next/server'

import { processFailedEmailDeliveries } from '@/lib/email/delivery'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processFailedEmailDeliveries(25)

  return NextResponse.json(result)
}
