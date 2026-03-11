import { NextResponse } from 'next/server'

import { syncTenantCapabilitiesFromSource } from '@/lib/admin/tenant-capabilities'
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
  const confidence = typeof body.confidence === 'string' ? body.confidence.trim() : 'high'

  const businessLines = normalizeCodeList(body.businessLines)
  const serviceModules = normalizeCodeList(body.serviceModules)

  if (businessLines.length === 0 && serviceModules.length === 0) {
    return NextResponse.json(
      {
        error:
          'External sync requires an explicit businessLines or serviceModules payload. Greenhouse does not derive capabilities from deals.'
      },
      { status: 400 }
    )
  }

  const state = await syncTenantCapabilitiesFromSource({
    clientId: id,
    sourceSystem,
    sourceObjectType,
    sourceObjectId,
    sourceClosedwonDealId: null,
    confidence,
    businessLines,
    serviceModules,
    derivedFromLatestClosedwon: false
  })

  return NextResponse.json(state)
}
