import { NextResponse } from 'next/server'

import { syncAllOrganizationServices } from '@/lib/services/service-sync'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { organizations, results } = await syncAllOrganizationServices()
    const totalCreated = results.reduce((sum, item) => sum + item.created, 0)
    const totalUpdated = results.reduce((sum, item) => sum + item.updated, 0)
    const totalErrors = results.reduce((sum, item) => sum + item.errors.length, 0)

    return NextResponse.json({
      organizations,
      totalCreated,
      totalUpdated,
      totalErrors
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
