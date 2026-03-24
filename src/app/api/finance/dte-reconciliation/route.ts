import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  listDteProposals,
  runDteReconciliation,
  type DteProposalStatus
} from '@/lib/nubox/reconciliation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/finance/dte-reconciliation
 * List DTE reconciliation proposals with optional filters.
 *
 * Query params:
 *   - status: pending | auto_matched | approved | rejected | orphan
 *   - organizationId: filter by organization
 *   - page: page number (default 1)
 *   - pageSize: items per page (default 50)
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as DteProposalStatus | null
  const organizationId = searchParams.get('organizationId')
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Math.min(Number(searchParams.get('pageSize')) || 50, 200)

  try {
    const result = await listDteProposals({ status, organizationId, page, pageSize })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/finance/dte-reconciliation
 * Trigger a DTE reconciliation run.
 *
 * Body (optional):
 *   - dryRun: boolean (default false)
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let dryRun = false

  try {
    const body = await request.json().catch(() => ({}))

    dryRun = Boolean(body?.dryRun)
  } catch {
    // Use defaults
  }

  try {
    const result = await runDteReconciliation({ dryRun })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
