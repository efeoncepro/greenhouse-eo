import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { runPeriodAutoMatch } from '@/lib/finance/reconciliation/auto-match-period'
import { FinanceValidationError } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * Period-scoped auto-match (existing monthly close flow).
 * Cliente del command canónico `runPeriodAutoMatch` (Full API Parity: la CLI
 * `finance:import-statement --auto-match` corre exactamente el mismo pipeline).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-722 — granular guard.
  if (!can(tenant, 'finance.reconciliation.match', 'create', 'space')) {
    return NextResponse.json({ error: 'No tienes permiso para ejecutar auto-match.' }, { status: 403 })
  }

  try {
    const { id: periodId } = await params
    const result = await runPeriodAutoMatch({ periodId, actorUserId: tenant.userId || null })

    if (result.total === 0) {
      return NextResponse.json({ matched: 0, suggested: 0, message: 'No unmatched rows to process.' })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
