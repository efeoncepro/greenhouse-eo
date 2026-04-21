import { NextResponse } from 'next/server'

import type { PoolClient } from 'pg'

import { getServerAuthSession } from '@/lib/auth'
import { withTransaction } from '@/lib/db'
import {
  applyPricingCatalogEntityChanges,
  EntityWriterError,
  PRICING_CATALOG_ENTITY_WHITELIST
} from '@/lib/commercial/pricing-catalog-entity-writer'
import {
  canAdministerPricingCatalog,
  requireAdminTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface ApplyDiffInput {
  entityType?: unknown
  entityId?: unknown
  entitySku?: unknown
  action?: unknown
  newValues?: unknown
  fieldsChanged?: unknown
}

interface ApplyRequestBody {
  diffsToApply?: unknown
}

/**
 * POST /api/admin/pricing-catalog/import-excel/apply
 *
 * TASK-471 slice 6 + Gap-5 — aplica selectivamente los diffs del preview.
 * V1 scope: solo action='update' sobre las entidades del shared writer
 * whitelist (sellable_role, tool_catalog, overhead_addon, service_catalog).
 * Create/delete se diferen a follow-up porque requieren workflow de approval.
 *
 * Body: { diffsToApply: Array<{ entityType, entityId, entitySku?, action,
 *         newValues, fieldsChanged }> }
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
  const failed: Array<{ entityId: string; message: string; code: string }> = []

  try {
    await withTransaction(async (client: PoolClient) => {
      for (const rawDiff of body.diffsToApply as ApplyDiffInput[]) {
        if (!rawDiff || typeof rawDiff !== 'object') continue

        const diff = rawDiff as ApplyDiffInput
        const entityType = typeof diff.entityType === 'string' ? diff.entityType : null
        const entityId = typeof diff.entityId === 'string' ? diff.entityId : null
        const entitySku = typeof diff.entitySku === 'string' ? diff.entitySku : null

        if (!entityType || !PRICING_CATALOG_ENTITY_WHITELIST[entityType]) {
          failed.push({
            entityId: entityId ?? 'unknown',
            message: `Entity type "${String(entityType)}" not supported.`,
            code: 'entity_not_supported'
          })

          continue
        }

        if (diff.action !== 'update') {
          failed.push({
            entityId: entityId ?? 'unknown',
            message: `Action "${String(diff.action)}" not supported in V1 (only update).`,
            code: 'action_not_supported'
          })

          continue
        }

        const newValues =
          diff.newValues && typeof diff.newValues === 'object' && !Array.isArray(diff.newValues)
            ? (diff.newValues as Record<string, unknown>)
            : null
        const fieldsChanged = Array.isArray(diff.fieldsChanged)
          ? diff.fieldsChanged.filter((f): f is string => typeof f === 'string')
          : []

        if (!entityId || !newValues) {
          failed.push({
            entityId: entityId ?? 'unknown',
            message: 'Missing entityId or newValues.',
            code: 'missing_fields'
          })

          continue
        }

        // Only apply the fields explicitly flagged as changed (avoid resetting
        // unchanged fields to their old value — which the diff might include).
        const changeset: Record<string, unknown> = {}

        for (const field of fieldsChanged) {
          if (field in newValues) changeset[field] = newValues[field]
        }

        try {
          const result = await applyPricingCatalogEntityChanges({
            client,
            entityType,
            entityId,
            changeset
          })

          await client.query(
            `INSERT INTO greenhouse_commercial.pricing_catalog_audit_log (
               entity_type, entity_id, entity_sku, action,
               actor_user_id, actor_name, change_summary
             ) VALUES ($1, $2, $3, 'bulk_imported', $4, $5, $6::jsonb)`,
            [
              entityType,
              entityId,
              entitySku,
              tenant.userId,
              actorName,
              JSON.stringify({
                new_values: changeset,
                fields_changed: result.updatedFields,
                source: 'excel_import'
              })
            ]
          )

          applied.push(entityId)
        } catch (err) {
          if (err instanceof EntityWriterError) {
            failed.push({ entityId, message: err.message, code: err.code })
          } else {
            failed.push({
              entityId,
              message: err instanceof Error ? err.message : 'Unknown error.',
              code: 'unknown_error'
            })
          }
        }
      }
    })

    return NextResponse.json({ applied: applied.length, failed: failed.length, errors: failed })
  } catch (error) {
    console.error('[TASK-471] Failed to apply Excel import diffs', error)

    return NextResponse.json(
      {
        error: 'Failed to apply import.',
        applied: applied.length,
        failed: failed.length,
        errors: failed
      },
      { status: 500 }
    )
  }
}
