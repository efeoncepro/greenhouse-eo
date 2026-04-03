import { NextResponse } from 'next/server'

import { getSpaceNotionGovernanceByClientId } from '@/lib/space-notion/notion-governance'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: clientId } = await params
  const governance = await getSpaceNotionGovernanceByClientId(clientId)

  return NextResponse.json({
    governance
  })
}
