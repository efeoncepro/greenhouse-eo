import { NextResponse } from 'next/server'

import { resumeIntegration } from '@/lib/integrations/registry'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ integrationKey: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { integrationKey } = await params

  const updated = await resumeIntegration(integrationKey)

  if (!updated) {
    return NextResponse.json({ error: 'Integration not found or already inactive' }, { status: 404 })
  }

  return NextResponse.json({ integrationKey, paused: false })
}
