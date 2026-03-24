import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { syncServicesForCompany } from '@/lib/services/service-sync'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const hubspotCompanyId = body.hubspotCompanyId

    if (!hubspotCompanyId || typeof hubspotCompanyId !== 'string') {
      return NextResponse.json({ error: 'hubspotCompanyId is required' }, { status: 400 })
    }

    const result = await syncServicesForCompany(hubspotCompanyId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/integrations/hubspot/services/sync failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
