import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { createOrLinkPeriodFromSnapshot } from '@/lib/finance/reconciliation/period-from-snapshot'
import { FinanceValidationError, assertNonEmptyString } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * POST /api/finance/reconciliation/from-snapshot
 *
 * TASK-722 — Crea o linkea un periodo de conciliación a partir de un snapshot
 * declarado en /finance/bank. Idempotente: re-llamar con el mismo snapshotId
 * devuelve el mismo periodId con `alreadyLinked=true`.
 *
 * Body:
 *   { snapshotId: string, openingBalance?: number, notes?: string }
 *
 * Response 201:
 *   { periodId, accountId, year, month, created, alreadyLinked, snapshotUpdated, periodUrl }
 *
 * Auth: requireFinanceTenantContext + can('finance.reconciliation.declare_snapshot', 'create', 'space')
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.reconciliation.declare_snapshot', 'create', 'space')) {
    return NextResponse.json(
      { error: 'No tienes permiso para crear periodos desde snapshot.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const snapshotId = assertNonEmptyString(body.snapshotId, 'snapshotId')

    const openingBalance = typeof body.openingBalance === 'number' && Number.isFinite(body.openingBalance)
      ? body.openingBalance
      : null

    const notes = typeof body.notes === 'string' ? body.notes : null

    const result = await createOrLinkPeriodFromSnapshot({
      snapshotId,
      actorUserId: tenant.userId || null,
      openingBalance,
      notes
    })

    return NextResponse.json(result, { status: 201 })
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
