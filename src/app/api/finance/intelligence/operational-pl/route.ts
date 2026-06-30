import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { can } from '@/lib/entitlements/runtime'
import { listOperationalPlSnapshots } from '@/lib/cost-intelligence/compute-operational-pl'
import { resolveLaborAllocationReadiness } from '@/lib/commercial-cost-attribution/labor-allocation-readiness'
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

  // TASK-1200 — el readiness de cobertura laboral está detrás de la capability
  // gobernada `finance.operational_pl.read_readiness` (Full API parity: un primitive
  // canónico, autorización fina reutilizable por UI/Nexa/API).
  const canReadReadiness = can(tenant, 'finance.operational_pl.read_readiness', 'read', 'tenant')

  try {
    // El margen es canónico SOLO si `readiness.status === 'canonical'`. Los consumers
    // degradan honestamente (no tratan revenue/costo 0 como margen real) según este
    // readiness.
    const [snapshots, readiness] = await Promise.all([
      listOperationalPlSnapshots({ year, month, scopeType: scope || undefined }),
      canReadReadiness ? resolveLaborAllocationReadiness(year, month) : Promise.resolve(null)
    ])

    return NextResponse.json({ snapshots, year, month, readiness })
  } catch (error) {
    if (isFinanceSchemaDriftError(error)) {
      logFinanceSchemaDrift('operational pl', error)

      return financeSchemaDriftResponse('operational pl', { snapshots: [], year, month })
    }

    throw error
  }
}
