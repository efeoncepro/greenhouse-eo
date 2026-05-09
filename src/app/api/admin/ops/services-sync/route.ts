import { NextResponse } from 'next/server'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { syncAllOrganizationServices } from '@/lib/services/service-sync'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasEntitlement(buildTenantEntitlementSubject(tenant), 'commercial.service_engagement.sync', 'sync')) {
    return NextResponse.json(
      { error: 'Missing capability commercial.service_engagement.sync.' },
      { status: 403 }
    )
  }

  try {
    const { organizations, results } = await syncAllOrganizationServices({
      createMissingSpace: true,
      createdBySource: 'admin:services-sync'
    })

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
    captureWithDomain(error, 'integrations.hubspot', {
      tags: { source: 'admin_services_sync' }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
