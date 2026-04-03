import { NextResponse } from 'next/server'

import { getNotionDeliveryDataQualityOverview } from '@/lib/integrations/notion-delivery-data-quality'
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
  { params }: { params: Promise<{ integrationKey: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { integrationKey } = await params

  if (integrationKey !== 'notion') {
    return NextResponse.json(
      { error: 'Data quality monitor not configured for this integration' },
      { status: 404 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit = parsePositiveInteger(searchParams.get('limit'), 20)
  const overview = await getNotionDeliveryDataQualityOverview({ limit })

  return NextResponse.json({
    integrationKey,
    overview
  })
}
