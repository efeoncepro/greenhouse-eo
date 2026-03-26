import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { listClientEconomicsTrend } from '@/lib/finance/postgres-store-intelligence'
import { sanitizeSnapshotForPresentation } from '../route'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const months = Math.min(Math.max(Number(searchParams.get('months')) || 6, 1), 24)

  const snapshots = await listClientEconomicsTrend(clientId, months)
  const sanitized = snapshots.map(sanitizeSnapshotForPresentation)

  if (clientId) {
    return NextResponse.json({
      clientId,
      months,
      periods: sanitized
    })
  }

  // Group by client for portfolio view
  const byClient = new Map<string, { clientName: string; periods: typeof snapshots }>()

  for (const snap of sanitized) {
    const entry = byClient.get(snap.clientId) || { clientName: snap.clientName, periods: [] }

    entry.periods.push(snap)
    byClient.set(snap.clientId, entry)
  }

  const clients = Array.from(byClient.entries()).map(([id, data]) => ({
    clientId: id,
    clientName: data.clientName,
    periods: data.periods
  }))

  return NextResponse.json({ months, clients })
}
