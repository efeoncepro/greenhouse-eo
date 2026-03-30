import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { ensureWebhookSchema, getRecentInboxEvents } from '@/lib/webhooks/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureWebhookSchema()

  const { searchParams } = new URL(request.url)
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '50')))
  const status = searchParams.get('status') || undefined

  const items = await getRecentInboxEvents(limit, status)

  return NextResponse.json({ items, total: items.length })
}
