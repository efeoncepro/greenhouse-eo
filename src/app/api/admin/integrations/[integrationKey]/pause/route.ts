import { NextResponse } from 'next/server'

import { pauseIntegration } from '@/lib/integrations/registry'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ integrationKey: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { integrationKey } = await params

  const body = await request.json().catch(() => ({})) as { reason?: string }

  const reason = body.reason || 'Paused by admin'

  const updated = await pauseIntegration(integrationKey, reason)

  if (!updated) {
    return NextResponse.json({ error: 'Integration not found or already inactive' }, { status: 404 })
  }

  return NextResponse.json({ integrationKey, paused: true, reason })
}
