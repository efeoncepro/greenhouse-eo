import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { runIdentityReconciliation } from '@/lib/identity/reconciliation/reconciliation-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// GET — list proposals (with optional filters)
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const status = url.searchParams.get('status') || 'pending'
  const sourceSystem = url.searchParams.get('source_system')
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200)

  try {
    const conditions = ['status = $1']
    const params: unknown[] = [status]
    let paramIdx = 2

    if (sourceSystem) {
      conditions.push(`source_system = $${paramIdx}`)
      params.push(sourceSystem)
      paramIdx++
    }

    params.push(limit)

    const rows = await runGreenhousePostgresQuery(
      `SELECT * FROM greenhouse_sync.identity_reconciliation_proposals
       WHERE ${conditions.join(' AND ')}
       ORDER BY occurrence_count DESC, created_at DESC
       LIMIT $${paramIdx}`,
      params
    )

    return NextResponse.json({ proposals: rows, count: rows.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — trigger reconciliation run manually
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const dryRun = body.dryRun === true
    const result = await runIdentityReconciliation({ dryRun })

    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'

    console.error('[identity-reconciliation] Manual run failed:', error)

    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
