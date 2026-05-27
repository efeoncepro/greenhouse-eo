import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { acknowledgeUnanchoredExpense } from '@/lib/finance/ledger-drift/acknowledge-unanchored'
import { FinanceValidationError } from '@/lib/finance/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-934 — Endpoint admin para aceptar un gasto pagado sin FK-anchor como
 * deuda conocida (clasificado por economic_category, sin supplier apropiado).
 * Capability granular finance.expenses.acknowledge_unanchored (FINANCE_ADMIN +
 * EFEONCE_ADMIN). NO es write-off (el gasto se queda en P&L).
 *
 * Para ANCLAR un vendor (no aceptar) se usa el flujo canónico existente:
 * PUT /api/finance/expenses/[id] con supplierId.
 *
 * Delega en el helper canónico (tx atómica + idempotencia + guards + outbox).
 */

interface AcknowledgeBody {
  reason?: unknown
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.expenses.acknowledge_unanchored', 'update', 'tenant')) {
    return NextResponse.json(
      {
        error: 'No tienes permiso para aceptar gastos sin anchor como deuda conocida.',
        code: 'forbidden'
      },
      { status: 403 }
    )
  }

  const { id: expenseId } = await params

  if (!expenseId) {
    return NextResponse.json(
      { error: 'expense_id requerido en path', code: 'validation_error' },
      { status: 400 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as AcknowledgeBody
  const reason = typeof body.reason === 'string' ? body.reason : ''

  try {
    const result = await acknowledgeUnanchoredExpense({
      expenseId,
      reason,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json(
        { error: error.message, code: 'validation_error' },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'finance', {
      tags: { source: 'expense_acknowledge_unanchored_endpoint' },
      extra: { expenseId }
    })

    return NextResponse.json(
      {
        error: 'No fue posible aceptar el gasto como deuda conocida. Revisa los logs.',
        code: 'acknowledge_failed'
      },
      { status: 500 }
    )
  }
}
