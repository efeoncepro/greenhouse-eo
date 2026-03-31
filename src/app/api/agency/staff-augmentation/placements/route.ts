import { NextResponse } from 'next/server'

import { createStaffAugPlacement, listStaffAugPlacements } from '@/lib/staff-augmentation/store'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') || '25') || 25))
  const search = searchParams.get('search') || undefined
  const status = searchParams.get('status') || undefined
  const businessUnit = searchParams.get('businessUnit') || undefined

  const result = await listStaffAugPlacements({ page, pageSize, search, status, businessUnit })

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const result = await createStaffAugPlacement(body, tenant.userId)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create placement.' },
      { status: 400 }
    )
  }
}
