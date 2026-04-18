import { NextResponse } from 'next/server'

import { getAgencyEconomics } from '@/lib/agency/agency-economics'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const toOptionalInteger = (value: string | null) => {
  if (!value) return undefined

  const parsed = Number(value)

  return Number.isInteger(parsed) ? parsed : undefined
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  const payload = await getAgencyEconomics({
    year: toOptionalInteger(searchParams.get('year')),
    month: toOptionalInteger(searchParams.get('month')),
    trendMonths: toOptionalInteger(searchParams.get('trendMonths'))
  })

  return NextResponse.json(payload)
}
