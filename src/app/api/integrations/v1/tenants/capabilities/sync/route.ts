import { NextResponse } from 'next/server'

import { requireIntegrationRequest } from '@/lib/integrations/integration-auth'
import { syncTenantCapabilitiesFromIntegration } from '@/lib/integrations/greenhouse-integration'

export const dynamic = 'force-dynamic'

const normalizeCodeList = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const normalizeNullableString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

export async function POST(request: Request) {
  const { authorized, errorResponse } = requireIntegrationRequest(request)

  if (!authorized) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        target?: Record<string, unknown>
        sync?: Record<string, unknown>
      }
    | null

  if (!body?.target || !body.sync) {
    return NextResponse.json({ error: 'Invalid integration payload.' }, { status: 400 })
  }

  const businessLines = normalizeCodeList(body.sync.businessLines)
  const serviceModules = normalizeCodeList(body.sync.serviceModules)

  if (businessLines.length === 0 && serviceModules.length === 0) {
    return NextResponse.json(
      { error: 'Integration sync requires businessLines or serviceModules.' },
      { status: 400 }
    )
  }

  const state = await syncTenantCapabilitiesFromIntegration({
    selector: {
      clientId: normalizeNullableString(body.target.clientId),
      publicId: normalizeNullableString(body.target.publicId),
      sourceSystem: normalizeNullableString(body.target.sourceSystem),
      sourceObjectType: normalizeNullableString(body.target.sourceObjectType),
      sourceObjectId: normalizeNullableString(body.target.sourceObjectId)
    },
    sourceSystem: normalizeNullableString(body.sync.sourceSystem) || 'external_system',
    sourceObjectType: normalizeNullableString(body.sync.sourceObjectType),
    sourceObjectId: normalizeNullableString(body.sync.sourceObjectId),
    confidence: normalizeNullableString(body.sync.confidence) || 'high',
    businessLines,
    serviceModules
  })

  if (!state) {
    return NextResponse.json({ error: 'Tenant not found for the provided integration selector.' }, { status: 404 })
  }

  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    state
  })
}
