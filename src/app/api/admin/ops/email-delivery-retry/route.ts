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

  try {
    const result = await processFailedEmailDeliveries(25)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[email-delivery-retry] Error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    )
  }
}
