import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { query, withTransaction } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import {
  INCOME_ECONOMIC_CATEGORIES,
  isIncomeEconomicCategory
} from '@/lib/finance/economic-category'
import { captureWithDomain } from '@/lib/observability/capture'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-768 Slice 6 — mirror del endpoint expenses para income. Ver
 * src/app/api/admin/finance/expenses/[id]/economic-category/route.ts para
 * documentacion del audit trail + outbox event pattern. Capability granular:
 * finance.income.reclassify_economic_category.
 */

interface ReclassifyBody {
  economicCategory?: unknown
  reason?: unknown
  bulkContext?: unknown
}

interface IncomeRow {
  income_id: string
  economic_category: string | null
  [key: string]: unknown
}

const validateCategory = (value: unknown): string => {
  if (typeof value !== 'string' || !isIncomeEconomicCategory(value)) {
    throw new Error(
      `economicCategory invalido. Valores canonicos: ${INCOME_ECONOMIC_CATEGORIES.join(', ')}`
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

  if (!can(tenant, 'finance.income.reclassify_economic_category', 'update', 'tenant')) {
    return NextResponse.json(
      {
        error: 'No tienes permiso para reclasificar la categoria economica de income.',
        code: 'forbidden'
      },
      { status: 403 }
    )
  }

  const { id: incomeId } = await params

  if (!incomeId) {
    return NextResponse.json(
      { error: 'income_id requerido en path', code: 'validation_error' },
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

    const rows = await query<IncomeRow>(
      `SELECT income_id, economic_category
         FROM greenhouse_finance.income
        WHERE income_id = $1
        LIMIT 1`,
      [incomeId]
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `Income ${incomeId} no encontrado.`, code: 'not_found' },
        { status: 404 }
      )
    }

    const previousCategory = rows[0].economic_category

    if (previousCategory === newCategory) {
      return NextResponse.json({
        ok: true,
        result: { changed: false, incomeId, category: newCategory },
        eventId: null
      })
    }

    await withTransaction(async client => {
      await client.query(
        `UPDATE greenhouse_finance.income
            SET economic_category = $1
          WHERE income_id = $2`,
        [newCategory, incomeId]
      )

      await client.query(
        `INSERT INTO greenhouse_finance.economic_category_resolution_log
           (log_id, target_kind, target_id, resolved_category, matched_rule,
            confidence, evidence_json, resolved_by, batch_id)
         VALUES ($1, 'income', $2, $3, 'manual_reclassify', 'manual_required', $4, $5, $6)`,
        [
          `ecr-${randomUUID()}`,
          incomeId,
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
          WHERE target_kind = 'income'
            AND target_id = $3
            AND status = 'pending'`,
        [tenant.userId, reason, incomeId]
      )
    })

    let eventId: string | null = null

    try {
      eventId = await publishOutboxEvent({
        aggregateType: 'finance_income',
        aggregateId: incomeId,
        eventType: 'finance.income.economic_category_changed',
        payload: {
          eventVersion: 'v1',
          incomeId,
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
        tags: { source: 'income_economic_category_audit_publish' }
      })
    }

    return NextResponse.json({
      ok: true,
      result: {
        changed: true,
        incomeId,
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
      tags: { source: 'income_economic_category_reclassify_endpoint' },
      extra: { incomeId, body }
    })

    return NextResponse.json(
      {
        error: 'No fue posible reclasificar el income. Revisa los logs.',
        code: 'reclassify_failed'
      },
      { status: 500 }
    )
  }
}
