import { NextResponse } from 'next/server'

import { retryFailedDelivery } from '@/lib/email/delivery'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ deliveryId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { deliveryId } = await params

  if (!deliveryId) {
    return NextResponse.json({ error: 'deliveryId is required.' }, { status: 400 })
  }

  const result = await retryFailedDelivery(deliveryId)

  if (result.status === 'skipped') {
    return NextResponse.json({ error: result.error ?? 'Not eligible for retry.' }, { status: 409 })
  }

  return NextResponse.json({
    deliveryId,
    status: result.status,
    resendId: result.resendId,
    ...(result.error ? { error: result.error } : {})
  })
}
