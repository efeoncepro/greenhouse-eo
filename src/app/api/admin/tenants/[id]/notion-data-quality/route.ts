import { NextResponse } from 'next/server'

import { getTenantNotionDeliveryDataQuality } from '@/lib/integrations/notion-delivery-data-quality'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parsePositiveInteger = (value: string | null, fallback: number) => {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const { id: clientId } = await params
  const limit = parsePositiveInteger(searchParams.get('limit'), 10)

  const data = await getTenantNotionDeliveryDataQuality({
    clientId,
    limit
  })

  if (!data) {
    return NextResponse.json({ error: 'No active space found for this client' }, { status: 404 })
  }

  return NextResponse.json(data)
}
