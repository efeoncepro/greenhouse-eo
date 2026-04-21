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

interface BulkRequestBody {
  entityType?: unknown
  entityIds?: unknown
  updates?: unknown
  notesAppend?: unknown
}

const MAX_BULK = 100

/**
 * POST /api/admin/pricing-catalog/bulk
 *
 * Generalized bulk update para el pricing catalog (TASK-471 Gap-4).
 * Reemplaza endpoints dedicados por entidad (/roles/bulk etc.) con un
 * endpoint unico que routea via `applyPricingCatalogEntityChanges` del
 * shared entity-writer.
 *
 * Body:
 *   - entityType: 'sellable_role' | 'tool_catalog' | 'overhead_addon' | 'service_catalog'
 *   - entityIds: string[] (1-100)
 *   - updates: Record<string, unknown> (filtrado por whitelist del entity_type)
 *   - notesAppend?: string (concat con separador ' | ')
 *
 * Emite 1 audit row por entity con action='bulk_edited' + change_summary rica.
 * Transaction atomica; fallos individuales se reportan en `errors[]` sin
 * abortar el batch completo.
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: BulkRequestBody = {}

  try {
    body = (await request.json()) as BulkRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const entityType = typeof body.entityType === 'string' ? body.entityType : null

  if (!entityType || !PRICING_CATALOG_ENTITY_WHITELIST[entityType]) {
    return NextResponse.json(
      {
        error: `entityType must be one of: ${Object.keys(PRICING_CATALOG_ENTITY_WHITELIST).join(', ')}`,
        code: 'entity_not_supported'
      },
      { status: 400 }
    )
  }

  const entityIds = Array.isArray(body.entityIds)
    ? body.entityIds.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : []

  if (entityIds.length === 0) {
    return NextResponse.json({ error: 'entityIds must be a non-empty array.' }, { status: 400 })
  }

  if (entityIds.length > MAX_BULK) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BULK} entities per bulk request.` },
      { status: 400 }
    )
  }

  const updatesRaw =
    body.updates && typeof body.updates === 'object' && !Array.isArray(body.updates)
      ? (body.updates as Record<string, unknown>)
      : {}
  const notesAppend = typeof body.notesAppend === 'string' ? body.notesAppend.trim() : ''

  if (Object.keys(updatesRaw).length === 0 && !notesAppend) {
    return NextResponse.json(
      { error: 'No fields to update; include updates or notesAppend.' },
      { status: 400 }
    )
  }

  const session = await getServerAuthSession()
  const actorName = session?.user?.name || session?.user?.email || tenant.userId || 'unknown'

  const applied: string[] = []
  const failed: Array<{ entityId: string; message: string; code: string }> = []

  try {
    await withTransaction(async (client: PoolClient) => {
      for (const entityId of entityIds) {
        try {
          const changeset: Record<string, unknown> = { ...updatesRaw }

          // notesAppend handled via raw SQL to preserve existing notes.
          if (notesAppend) {
            const whitelist = PRICING_CATALOG_ENTITY_WHITELIST[entityType]
            const notesRes = await client.query<{ notes: string | null }>(
              `SELECT notes FROM ${whitelist.schema}.${whitelist.table} WHERE ${whitelist.pk} = $1`,
              [entityId]
            )

            if (notesRes.rowCount === 0) {
              failed.push({ entityId, message: 'Entity not found.', code: 'entity_gone' })

              continue
            }

            const currentNotes = notesRes.rows[0]?.notes
            const newNotes = currentNotes ? `${currentNotes} | ${notesAppend}` : notesAppend

            changeset.notes = newNotes
          }

          const result = await applyPricingCatalogEntityChanges({
            client,
            entityType,
            entityId,
            changeset
          })

          // Read entity_sku for audit row.
          const whitelist = PRICING_CATALOG_ENTITY_WHITELIST[entityType]
          const skuField =
            entityType === 'sellable_role'
              ? 'role_sku'
              : entityType === 'tool_catalog'
                ? 'tool_sku'
                : entityType === 'overhead_addon'
                  ? 'addon_sku'
                  : 'service_sku'

          const skuRes = await client.query<Record<string, string | null>>(
            `SELECT ${skuField} AS sku FROM ${whitelist.schema}.${whitelist.table} WHERE ${whitelist.pk} = $1`,
            [entityId]
          )
          const entitySku = skuRes.rows[0]?.sku ?? null

          await client.query(
            `INSERT INTO greenhouse_commercial.pricing_catalog_audit_log (
               entity_type, entity_id, entity_sku, action,
               actor_user_id, actor_name, change_summary
             ) VALUES ($1, $2, $3, 'bulk_edited', $4, $5, $6::jsonb)`,
            [
              entityType,
              entityId,
              entitySku,
              tenant.userId,
              actorName,
              JSON.stringify({
                new_values: changeset,
                notes_append: notesAppend || null,
                fields_changed: result.updatedFields,
                bulk_size: entityIds.length
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

    return NextResponse.json({
      applied: applied.length,
      failed: failed.length,
      errors: failed
    })
  } catch (error) {
    console.error('[TASK-471] Failed to apply bulk update', error)

    return NextResponse.json(
      { error: 'Failed to apply bulk update.', applied: applied.length, failed: failed.length },
      { status: 500 }
    )
  }
}
