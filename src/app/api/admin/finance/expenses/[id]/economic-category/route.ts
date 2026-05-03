import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { query, withTransaction } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import {
  EXPENSE_ECONOMIC_CATEGORIES,
  isExpenseEconomicCategory
} from '@/lib/finance/economic-category'
import { captureWithDomain } from '@/lib/observability/capture'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-768 Slice 6 — Endpoint admin para reclasificar economic_category de
 * un expense. Capability granular: finance.expenses.reclassify_economic_category
 * (FINANCE_ADMIN + EFEONCE_ADMIN, least-privilege).
 *
 * Audit:
 *   - Inserta fila en economic_category_resolution_log (append-only,
 *     trigger anti-update/delete) con matched_rule='manual_reclassify' +
 *     evidence_json incluyendo previous_category, reason, actor.
 *   - UPDATE expenses.economic_category (trigger BEFORE INSERT no aplica
 *     porque es UPDATE; CHECK constraint `canonical_values` valida el valor).
 *   - Marca manual_queue como resolved si la fila estaba pending.
 *   - Publica outbox event finance.expense.economic_category_changed v1.
 *
 * Idempotente: re-llamar con misma categoria no falla; solo agrega audit row
 * adicional con la nota.
 */

interface ReclassifyBody {
  economicCategory?: unknown
  reason?: unknown
  bulkContext?: unknown
}

interface ExpenseRow {
  expense_id: string
  economic_category: string | null
  [key: string]: unknown
}

const validateCategory = (value: unknown): string => {
  if (typeof value !== 'string' || !isExpenseEconomicCategory(value)) {
    throw new Error(
      `economicCategory invalido. Valores canonicos: ${EXPENSE_ECONOMIC_CATEGORIES.join(', ')}`
    )
  }

  return value
}

const validateReason = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length < 10) {
    throw new Error('reason requerido (minimo 10 caracteres) para audit trail')
  }

  return value.trim()
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.expenses.reclassify_economic_category', 'update', 'tenant')) {
    return NextResponse.json(
      {
        error: 'No tienes permiso para reclasificar la categoria economica de expenses.',
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

  let body: ReclassifyBody = {}

  try {
    body = (await request.json().catch(() => ({}))) as ReclassifyBody

    const newCategory = validateCategory(body.economicCategory)
    const reason = validateReason(body.reason)

    const bulkContext =
      typeof body.bulkContext === 'string' && body.bulkContext.trim().length > 0
        ? body.bulkContext.trim()
        : null

    // Lookup current row.
    const rows = await query<ExpenseRow>(
      `SELECT expense_id, economic_category
         FROM greenhouse_finance.expenses
        WHERE expense_id = $1
        LIMIT 1`,
      [expenseId]
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `Expense ${expenseId} no encontrado.`, code: 'not_found' },
        { status: 404 }
      )
    }

    const previousCategory = rows[0].economic_category

    if (previousCategory === newCategory) {
      return NextResponse.json({
        ok: true,
        result: { changed: false, expenseId, category: newCategory },
        eventId: null
      })
    }

    // Atomic: UPDATE + audit log + mark queue resolved (if pending).
    await withTransaction(async client => {
      await client.query(
        `UPDATE greenhouse_finance.expenses
            SET economic_category = $1
          WHERE expense_id = $2`,
        [newCategory, expenseId]
      )

      await client.query(
        `INSERT INTO greenhouse_finance.economic_category_resolution_log
           (log_id, target_kind, target_id, resolved_category, matched_rule,
            confidence, evidence_json, resolved_by, batch_id)
         VALUES ($1, 'expense', $2, $3, 'manual_reclassify', 'manual_required', $4, $5, $6)`,
        [
          `ecr-${randomUUID()}`,
          expenseId,
          newCategory,
          JSON.stringify({
            previous_category: previousCategory,
            reason,
            bulk_context: bulkContext,
            actor_user_id: tenant.userId
          }),
          tenant.userId,
          bulkContext
        ]
      )

      await client.query(
        `UPDATE greenhouse_finance.economic_category_manual_queue
            SET status = 'resolved',
                resolved_by = $1,
                resolved_at = NOW(),
                resolution_note = $2
          WHERE target_kind = 'expense'
            AND target_id = $3
            AND status = 'pending'`,
        [tenant.userId, reason, expenseId]
      )
    })

    // Audit outbox event (fire-and-forget).
    let eventId: string | null = null

    try {
      eventId = await publishOutboxEvent({
        aggregateType: 'finance_expense',
        aggregateId: expenseId,
        eventType: 'finance.expense.economic_category_changed',
        payload: {
          eventVersion: 'v1',
          expenseId,
          previousCategory,
          newCategory,
          reason,
          bulkContext,
          confidence: 'manual',
          matchedRule: 'manual_reclassify',
          actorUserId: tenant.userId,
          changedAt: new Date().toISOString()
        }
      })
    } catch (auditErr) {
      captureWithDomain(auditErr, 'finance', {
        tags: { source: 'expense_economic_category_audit_publish' }
      })
    }

    return NextResponse.json({
      ok: true,
      result: {
        changed: true,
        expenseId,
        previousCategory,
        category: newCategory
      },
      eventId
    })
  } catch (error) {
    if (error instanceof Error && /requerido|invalido|minimo/i.test(error.message)) {
      return NextResponse.json(
        { error: error.message, code: 'validation_error' },
        { status: 400 }
      )
    }

    captureWithDomain(error, 'finance', {
      tags: { source: 'expense_economic_category_reclassify_endpoint' },
      extra: { expenseId, body }
    })

    return NextResponse.json(
      {
        error: 'No fue posible reclasificar el expense. Revisa los logs.',
        code: 'reclassify_failed'
      },
      { status: 500 }
    )
  }
}
