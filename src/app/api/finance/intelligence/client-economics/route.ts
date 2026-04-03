import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveFinanceDownstreamScope } from '@/lib/finance/canonical'
import { sanitizeSnapshotForPresentation } from '@/lib/finance/client-economics-presentation'
import { FinanceValidationError, toNumber } from '@/lib/finance/shared'
import {
  assertFinanceSlice2PostgresReady,
  isFinanceSlice2PostgresEnabled
} from '@/lib/finance/postgres-store-slice2'
import {
  computeClientEconomicsSnapshots,
  getClientEconomics,
  listClientEconomicsByOrganization,
  listClientEconomicsByPeriod
} from '@/lib/finance/postgres-store-intelligence'
import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const organizationId = searchParams.get('organizationId')
  const clientProfileId = searchParams.get('clientProfileId')
  const hubspotCompanyId = searchParams.get('hubspotCompanyId')
  const spaceId = searchParams.get('spaceId')
  const currentPeriod = getFinanceCurrentPeriod()
  const year = Number(searchParams.get('year')) || currentPeriod.year
  const month = Number(searchParams.get('month')) || currentPeriod.month

  try {
    if (clientId || organizationId || clientProfileId || hubspotCompanyId || spaceId) {
      const resolvedScope = await resolveFinanceDownstreamScope({
        clientId,
        organizationId,
        clientProfileId,
        hubspotCompanyId,
        requestedSpaceId: spaceId,
        requireLegacyClientBridge: false
      })

      const snapshot = resolvedScope.clientId
        ? await getClientEconomics(resolvedScope.clientId, year, month)
        : null

      const snapshots = !snapshot && resolvedScope.organizationId
        ? await listClientEconomicsByOrganization(resolvedScope.organizationId, year, month)
        : []

      return NextResponse.json({
        snapshot: snapshot ? sanitizeSnapshotForPresentation(snapshot) : null,
        snapshots: snapshots.map(sanitizeSnapshotForPresentation)
      })
    }

    const snapshots = await listClientEconomicsByPeriod(year, month)

    return NextResponse.json({ snapshots: snapshots.map(sanitizeSnapshotForPresentation), year, month })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

// POST /api/finance/intelligence/client-economics?action=compute
// Computes and upserts client economics for a given period from income + cost allocations
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isFinanceSlice2PostgresEnabled()) {
    return NextResponse.json({ error: 'Finance Postgres not configured' }, { status: 503 })
  }

  await assertFinanceSlice2PostgresReady()

  try {
    const body = await request.json()
    const postPeriod = getFinanceCurrentPeriod()
    const year = toNumber(body.year) || postPeriod.year
    const month = toNumber(body.month) || postPeriod.month

    if (month < 1 || month > 12) {
      throw new FinanceValidationError('month must be between 1 and 12')
    }

    const results = await computeClientEconomicsSnapshots(year, month)

    return NextResponse.json({
      computed: true,
      year,
      month,
      clientCount: results.length,
      snapshots: results
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
