import { NextResponse } from 'next/server'

import { requireIntegrationRequest } from '@/lib/integrations/integration-auth'
import { listTenantsForIntegration, parseIntegrationLimit } from '@/lib/integrations/greenhouse-integration'

export const dynamic = 'force-dynamic'

const normalizeSelector = (searchParams: URLSearchParams) => ({
  clientId: searchParams.get('clientId'),
  publicId: searchParams.get('publicId'),
  sourceSystem: searchParams.get('sourceSystem'),
  sourceObjectType: searchParams.get('sourceObjectType'),
  sourceObjectId: searchParams.get('sourceObjectId')
})

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireIntegrationRequest(request)

  if (!authorized) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const selector = normalizeSelector(searchParams)
  const updatedSince = searchParams.get('updatedSince')
  const limit = parseIntegrationLimit(searchParams.get('limit'))

  const items = await listTenantsForIntegration({
    selector,
    updatedSince,
    limit
  })

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    count: items.length,
    items
  })
}
