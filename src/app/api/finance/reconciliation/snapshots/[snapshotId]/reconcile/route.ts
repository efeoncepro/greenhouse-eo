import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { reconcileSnapshot } from '@/lib/finance/reconciliation/snapshots'
import { FinanceValidationError, assertNonEmptyString } from '@/lib/finance/shared'
import { requireBankTreasuryTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  const { tenant, errorResponse } = await requireBankTreasuryTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-722 — granular guard: marcar snapshot como reconciled es match.
  if (!can(tenant, 'finance.reconciliation.match', 'update', 'space')) {
    return NextResponse.json({ error: 'No tienes permiso para marcar snapshots como conciliados.' }, { status: 403 })
  }

  try {
    const { snapshotId } = await params
    const body = await request.json()
    const reason = assertNonEmptyString(body.reason, 'reason')
    const result = await reconcileSnapshot(snapshotId, reason, tenant.userId || null)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    throw error
  }
}
