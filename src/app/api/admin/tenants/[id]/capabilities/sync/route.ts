import { NextResponse } from 'next/server'

import {
  deriveHubSpotCapabilitiesForTenant,
  syncTenantCapabilitiesFromSource
} from '@/lib/admin/tenant-capabilities'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const normalizeCodeList = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const sourceSystem = typeof body.sourceSystem === 'string' ? body.sourceSystem.trim() : 'hubspot_crm'
  const sourceObjectType = typeof body.sourceObjectType === 'string' ? body.sourceObjectType.trim() : null
  const sourceObjectId = typeof body.sourceObjectId === 'string' ? body.sourceObjectId.trim() : null

  const sourceClosedwonDealId =
    typeof body.sourceClosedwonDealId === 'string' ? body.sourceClosedwonDealId.trim() : null

  const confidence = typeof body.confidence === 'string' ? body.confidence.trim() : 'high'

  let businessLines = normalizeCodeList(body.businessLines)
  let serviceModules = normalizeCodeList(body.serviceModules)
  let syncSourceObjectType = sourceObjectType
  let syncSourceObjectId = sourceObjectId
  let syncClosedwonDealId = sourceClosedwonDealId
  let derivedFromLatestClosedwon = false

  if (businessLines.length === 0 && serviceModules.length === 0 && sourceSystem === 'hubspot_crm') {
    const derived = await deriveHubSpotCapabilitiesForTenant(id)

    if (!derived) {
      return NextResponse.json(
        { error: 'The tenant does not have a HubSpot company mapping to derive capabilities from.' },
        { status: 400 }
      )
    }

    businessLines = derived.businessLines
    serviceModules = derived.serviceModules
    syncSourceObjectType = 'company'
    syncSourceObjectId = derived.hubspotCompanyId
    syncClosedwonDealId = derived.latestDealId
    derivedFromLatestClosedwon = true
  }

  const state = await syncTenantCapabilitiesFromSource({
    clientId: id,
    sourceSystem,
    sourceObjectType: syncSourceObjectType,
    sourceObjectId: syncSourceObjectId,
    sourceClosedwonDealId: syncClosedwonDealId,
    confidence,
    businessLines,
    serviceModules,
    derivedFromLatestClosedwon
  })

  return NextResponse.json(state)
}
