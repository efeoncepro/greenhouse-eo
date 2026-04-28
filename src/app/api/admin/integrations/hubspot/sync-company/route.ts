import { NextResponse } from 'next/server'

import { syncHubSpotCompanyById } from '@/lib/hubspot/sync-company-by-id'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const hubspotCompanyId = String(body?.hubspotCompanyId ?? '').trim()

    if (!hubspotCompanyId) {
      return NextResponse.json({ error: 'hubspotCompanyId is required' }, { status: 400 })
    }

    const promote = body?.promote !== false
    const result = await syncHubSpotCompanyById(hubspotCompanyId, { promote })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
