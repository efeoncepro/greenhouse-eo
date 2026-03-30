import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { ensureWebhookSchema, getRecentDeliveries, getDeliveryAttempts } from '@/lib/webhooks/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureWebhookSchema()

  const { searchParams } = new URL(request.url)
  const deliveryId = searchParams.get('delivery_id')
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '50')))

  if (deliveryId) {
    const attempts = await getDeliveryAttempts(deliveryId)

    return NextResponse.json({ deliveryId, attempts, total: attempts.length })
  }

  const items = await getRecentDeliveries(limit, 'dead_letter')

  return NextResponse.json({ items, total: items.length })
}
