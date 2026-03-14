import { NextResponse } from 'next/server'

import { getAgencySpacesHealth } from '@/lib/agency/agency-queries'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const spaces = await getAgencySpacesHealth()

  return NextResponse.json({ spaces })
}
