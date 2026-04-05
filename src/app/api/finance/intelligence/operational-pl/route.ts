import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { listOperationalPlSnapshots } from '@/lib/cost-intelligence/compute-operational-pl'
import {
  financeSchemaDriftResponse,
  isFinanceSchemaDriftError,
  logFinanceSchemaDrift
} from '@/lib/finance/schema-drift'
import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const currentPeriod = getFinanceCurrentPeriod()
  const year = Number(searchParams.get('year')) || currentPeriod.year
  const month = Number(searchParams.get('month')) || currentPeriod.month
  const scope = searchParams.get('scope') as 'client' | 'space' | 'organization' | undefined

  try {
    const snapshots = await listOperationalPlSnapshots({ year, month, scopeType: scope || undefined })

    return NextResponse.json({ snapshots, year, month })
  } catch (error) {
    if (isFinanceSchemaDriftError(error)) {
      logFinanceSchemaDrift('operational pl', error)

      return financeSchemaDriftResponse('operational pl', { snapshots: [], year, month })
    }

    throw error
  }
}
