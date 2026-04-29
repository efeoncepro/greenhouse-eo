/**
 * TASK-715 — Archive a reconciliation period as test residue.
 *
 * Surface: same `finance.reconciliation` view as the rest of the module.
 * Capability gating: requireFinanceTenantContext (write/match access).
 *
 * Request body:
 *   { reason: string  // >= 8 chars, audit-grade explanation }
 *
 * Outcomes:
 *   201 - { periodId, alreadyArchived: false }     archived now
 *   200 - { periodId, alreadyArchived: true }      no-op (was already archived)
 *   404 - period not found
 *   422 - reason too short OR period in status='closed'
 *   409 - period archived with a different kind (extension hook for future kinds)
 *
 * DELETE same path = unarchive (reactivate).
 */

import { NextResponse } from 'next/server'

import {
  archiveReconciliationPeriodAsTestInPostgres,
  unarchiveReconciliationPeriodInPostgres
} from '@/lib/finance/postgres-reconciliation'
import { can } from '@/lib/entitlements/runtime'
import { FinanceValidationError } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-722 — granular guard: archive es mutación operativa.
  if (!can(tenant, 'finance.reconciliation.match', 'update', 'space')) {
    return NextResponse.json({ error: 'No tienes permiso para archivar periodos.' }, { status: 403 })
  }

  try {
    const { id: periodId } = await params
    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' ? body.reason : ''
    const actorUserId = tenant.userId

    const result = await archiveReconciliationPeriodAsTestInPostgres({
      periodId,
      reason,
      actorUserId
    })

    return NextResponse.json(result, { status: result.alreadyArchived ? 200 : 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-722 — granular guard: unarchive también es mutación operativa.
  if (!can(tenant, 'finance.reconciliation.match', 'update', 'space')) {
    return NextResponse.json({ error: 'No tienes permiso para reactivar periodos.' }, { status: 403 })
  }

  try {
    const { id: periodId } = await params
    const actorUserId = tenant.userId

    const result = await unarchiveReconciliationPeriodInPostgres({
      periodId,
      actorUserId
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
