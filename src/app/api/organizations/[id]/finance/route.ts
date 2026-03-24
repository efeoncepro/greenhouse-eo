import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { getOrganizationFinanceSummary } from '@/lib/account-360/organization-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)

  const now = new Date()
  const year = Number(searchParams.get('year')) || now.getFullYear()
  const month = Number(searchParams.get('month')) || now.getMonth() + 1

  const summary = await getOrganizationFinanceSummary(id, year, month)

  return NextResponse.json(summary)
}
