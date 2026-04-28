import { NextResponse } from 'next/server'

import {
  getReconciliationPeriodContextFromPostgres,
  getReconciliationPeriodDetailFromPostgres,
  updateReconciliationPeriodInPostgres,
  validateReconciledTransitionFromPostgres
} from '@/lib/finance/postgres-reconciliation'
import { FinanceValidationError, normalizeString, toNumber } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: periodId } = await params
  const detail = await getReconciliationPeriodDetailFromPostgres(periodId)

  if (!detail) {
    return NextResponse.json({ error: 'Reconciliation period not found' }, { status: 404 })
  }

  return NextResponse.json(detail)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: periodId } = await params
    const body = await request.json()

    const touchingFinancialFields = (
      body.closingBalanceBank !== undefined
      || body.closingBalanceSystem !== undefined
      || body.difference !== undefined
    )

    const updates: Record<string, unknown> = {}

    if (body.closingBalanceBank !== undefined) updates.closingBalanceBank = toNumber(body.closingBalanceBank)
    if (body.closingBalanceSystem !== undefined) updates.closingBalanceSystem = toNumber(body.closingBalanceSystem)
    if (body.difference !== undefined) updates.difference = toNumber(body.difference)
    if (body.notes !== undefined) updates.notes = body.notes ? normalizeString(body.notes) : null

    if (body.status !== undefined) {
      const validStatuses = ['open', 'in_progress', 'reconciled', 'closed']
      const nextStatus = normalizeString(body.status)

      if (!validStatuses.includes(nextStatus)) {
        throw new FinanceValidationError(`Invalid reconciliation status: ${nextStatus || '(empty)'}.`)
      }

      updates.status = nextStatus
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const existing = await getReconciliationPeriodContextFromPostgres(periodId)
    const previousStatus = existing.status

    if (previousStatus === 'closed') {
      throw new FinanceValidationError('Cannot update a closed reconciliation period.', 409)
    }

    if (previousStatus === 'reconciled') {
      const onlyClosingTransition = (
        updates.status === 'closed'
        && !touchingFinancialFields
        && body.notes === undefined
      )

      if (!onlyClosingTransition) {
        throw new FinanceValidationError('Cannot modify a reconciled period. Only a status change to "closed" is allowed.', 409)
      }
    }

    if (updates.status === 'closed' && previousStatus !== 'reconciled') {
      throw new FinanceValidationError('A reconciliation period can only be closed after it is reconciled.', 409)
    }

    if (updates.status === 'reconciled') {
      const { totalRows, remainingRows, statementImported } =
        await validateReconciledTransitionFromPostgres(periodId)

      const nextDifference = updates.difference !== undefined ? toNumber(updates.difference) : 0

      if (!statementImported || totalRows <= 0) {
        throw new FinanceValidationError('Cannot reconcile a period without an imported statement.', 409)
      }

      if (remainingRows > 0) {
        throw new FinanceValidationError('Cannot reconcile a period with unmatched or suggested statement rows.', 409)
      }

      if (Math.abs(nextDifference) > 0.01) {
        throw new FinanceValidationError('Cannot reconcile a period while difference is not zero.', 409)
      }
    }

    const result = await updateReconciliationPeriodInPostgres(periodId, updates, {
      reconciledByUserId: tenant.userId || null
    })

    if (!result) {
      return NextResponse.json({ error: 'Reconciliation period not found' }, { status: 404 })
    }

    if (updates.status === 'reconciled') {
      await publishOutboxEvent({
        aggregateType: 'finance_reconciliation_period',
        aggregateId: periodId,
        eventType: 'finance.reconciliation_period.reconciled',
        payload: {
          periodId,
          accountId: existing.accountId,
          year: existing.year,
          month: existing.month,
          previousStatus,
          nextStatus: 'reconciled',
          difference: updates.difference ?? 0,
          actorUserId: tenant.userId || null
        }
      })
    }

    if (updates.status === 'closed') {
      await publishOutboxEvent({
        aggregateType: 'finance_reconciliation_period',
        aggregateId: periodId,
        eventType: 'finance.reconciliation_period.closed',
        payload: {
          periodId,
          accountId: existing.accountId,
          year: existing.year,
          month: existing.month,
          previousStatus,
          nextStatus: 'closed',
          actorUserId: tenant.userId || null
        }
      })
    }

    return NextResponse.json({ periodId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
