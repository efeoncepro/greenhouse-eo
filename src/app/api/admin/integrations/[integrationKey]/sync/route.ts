import { NextResponse } from 'next/server'

import { triggerSync } from '@/lib/integrations/sync-trigger'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ integrationKey: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { integrationKey } = await params

  const result = await triggerSync(integrationKey)

  return NextResponse.json(result, { status: result.triggered ? 200 : 422 })
}
