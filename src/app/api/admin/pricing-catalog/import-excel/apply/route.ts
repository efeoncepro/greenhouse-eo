import { NextResponse } from 'next/server'

import type { PoolClient } from 'pg'

import { getServerAuthSession } from '@/lib/auth'
import { withTransaction } from '@/lib/db'
import {
  canAdministerPricingCatalog,
  requireAdminTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface ApplyDiffInput {
  entityType?: unknown
  entityId?: unknown
  action?: unknown
  newValues?: unknown
  fieldsChanged?: unknown
}

interface ApplyRequestBody {
  diffsToApply?: unknown
}

const ROLE_WHITELIST = [
  'role_label_es',
  'role_label_en',
  'category',
  'tier',
  'tier_label',
  'can_sell_as_staff',
  'can_sell_as_service_component',
  'active',
  'notes'
] as const

/**
 * POST /api/admin/pricing-catalog/import-excel/apply
 *
 * TASK-471 slice 6 — aplica selectivamente los diffs del preview. Cada
 * diff aplicado genera un audit row con action='bulk_imported'. V1 soporta
 * solo `action='update'` sobre `sellable_role` (no create/delete en
 * bulk hasta que tengamos workflow de approval).
 *
 * Body:
 *   { diffsToApply: Array<{ entityType, entityId, action, newValues, fieldsChanged }> }
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: ApplyRequestBody = {}

  try {
    body = (await request.json()) as ApplyRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!Array.isArray(body.diffsToApply)) {
    return NextResponse.json({ error: 'diffsToApply must be an array.' }, { status: 400 })
  }

  const session = await getServerAuthSession()
  const actorName = session?.user?.name || session?.user?.email || tenant.userId || 'unknown'

  const applied: string[] = []
  const failed: Array<{ entityId: string; message: string }> = []

  try {
    await withTransaction(async (client: PoolClient) => {
      for (const rawDiff of body.diffsToApply as ApplyDiffInput[]) {
        if (!rawDiff || typeof rawDiff !== 'object') continue

        const diff = rawDiff as ApplyDiffInput

        if (diff.entityType !== 'sellable_role') {
          failed.push({
            entityId: typeof diff.entityId === 'string' ? diff.entityId : 'unknown',
            message: 'Only sellable_role imports are supported in V1.'
          })

          continue
        }

        if (diff.action !== 'update') {
          failed.push({
            entityId: typeof diff.entityId === 'string' ? diff.entityId : 'unknown',
            message: `Action "${String(diff.action)}" not supported in V1 (only update).`
          })

          continue
        }

        const entityId = typeof diff.entityId === 'string' ? diff.entityId : null
        const newValues = diff.newValues && typeof diff.newValues === 'object'
          ? (diff.newValues as Record<string, unknown>)
          : null
        const fieldsChanged = Array.isArray(diff.fieldsChanged)
          ? diff.fieldsChanged.filter((f): f is string => typeof f === 'string')
          : []

        if (!entityId || !newValues) {
          failed.push({ entityId: entityId ?? 'unknown', message: 'Missing entityId or newValues.' })

          continue
        }

        // Whitelist fields to update.
        const setClauses: string[] = []
        const values: unknown[] = []

        for (const field of fieldsChanged) {
          if ((ROLE_WHITELIST as readonly string[]).includes(field)) {
            setClauses.push(`"${field}" = $${values.length + 1}`)
            values.push(newValues[field])
          }
        }

        if (setClauses.length === 0) {
          failed.push({ entityId, message: 'No whitelisted fields to update.' })

          continue
        }

        values.push(entityId)

        try {
          const res = await client.query(
            `UPDATE greenhouse_commercial.sellable_roles
                SET ${setClauses.join(', ')},
                    updated_at = NOW()
              WHERE role_id = $${values.length}
              RETURNING role_id, role_sku`,
            values
          )

          if (res.rowCount === 0) {
            failed.push({ entityId, message: 'Role not found.' })

            continue
          }

          const { role_sku: roleSku } = res.rows[0] as { role_sku: string }

          await client.query(
            `INSERT INTO greenhouse_commercial.pricing_catalog_audit_log (
               entity_type, entity_id, entity_sku, action,
               actor_user_id, actor_name, change_summary
             ) VALUES ($1, $2, $3, 'bulk_imported', $4, $5, $6::jsonb)`,
            [
              'sellable_role',
              entityId,
              roleSku,
              tenant.userId,
              actorName,
              JSON.stringify({
                new_values: newValues,
                fields_changed: fieldsChanged,
                source: 'excel_import'
              })
            ]
          )

          applied.push(entityId)
        } catch (err) {
          failed.push({
            entityId,
            message: err instanceof Error ? err.message : 'Unknown error.'
          })
        }
      }
    })

    return NextResponse.json({ applied: applied.length, failed: failed.length, errors: failed })
  } catch (error) {
    console.error('[TASK-471] Failed to apply Excel import diffs', error)

    return NextResponse.json(
      { error: 'Failed to apply import.', applied: applied.length, failed: failed.length, errors: failed },
      { status: 500 }
    )
  }
}
