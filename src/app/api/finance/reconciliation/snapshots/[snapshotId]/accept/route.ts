import { NextResponse } from 'next/server'

import { acceptDrift } from '@/lib/finance/reconciliation/snapshots'
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

  try {
    const { snapshotId } = await params
    const body = await request.json()
    const reason = assertNonEmptyString(body.reason, 'reason')
    const result = await acceptDrift(snapshotId, reason, tenant.userId || null)

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
