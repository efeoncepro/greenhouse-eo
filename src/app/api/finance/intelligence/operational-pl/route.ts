import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { listOperationalPlSnapshots } from '@/lib/cost-intelligence/compute-operational-pl'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year')) || new Date().getFullYear()
  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1
  const scope = searchParams.get('scope') as 'client' | 'space' | 'organization' | undefined

  try {
    const snapshots = await listOperationalPlSnapshots({ year, month, scopeType: scope || undefined })

    return NextResponse.json({ snapshots, year, month })
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json({ snapshots: [], year, month })
    }

    throw error
  }
}
