import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await runGreenhousePostgresQuery<{
      source_system: string
      status: string
      count: string
    }>(
      `SELECT source_system, status, COUNT(*)::TEXT AS count
       FROM greenhouse_sync.identity_reconciliation_proposals
       GROUP BY source_system, status
       ORDER BY source_system, status`
    )

    const summary: Record<string, Record<string, number>> = {}

    for (const row of rows) {
      if (!summary[row.source_system]) summary[row.source_system] = {}

      summary[row.source_system][row.status] = Number(row.count)
    }

    return NextResponse.json({ summary })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
