import { NextResponse } from 'next/server'

import type { PoolClient } from 'pg'

import { getServerAuthSession } from '@/lib/auth'
import { withTransaction } from '@/lib/db'
import {
  canAdministerPricingCatalog,
  requireAdminTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface BulkRequestBody {
  roleIds?: unknown
  updates?: unknown
  notesAppend?: unknown
}

const MAX_BULK = 100

/**
 * POST /api/admin/pricing-catalog/roles/bulk
 *
 * TASK-471 slice 3 — Bulk update de sellable_roles.
 *
 * Body:
 *   - roleIds: string[]                (1-100 role ids)
 *   - updates: { active?: boolean; category?: string; tier?: string; tier_label?: string }
 *   - notesAppend?: string             (se concatena al notes existente con separador " | ")
 *
 * Flow: withTransaction aplica el UPDATE por cada roleId + emite 1 audit row
 * por role con action='bulk_edited'. Validation de shape server-side.
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

  const roleIds =
    Array.isArray(body.roleIds)
      ? body.roleIds.filter((v): v is string => typeof v === 'string' && v.length > 0)
      : []

  if (roleIds.length === 0) {
    return NextResponse.json({ error: 'roleIds must be a non-empty array.' }, { status: 400 })
  }

  if (roleIds.length > MAX_BULK) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BULK} roles per bulk request.` },
      { status: 400 }
    )
  }

  const updatesRaw = body.updates && typeof body.updates === 'object' ? body.updates : {}
  const updates: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(updatesRaw as Record<string, unknown>)) {
    if (key === 'active' && typeof value === 'boolean') updates.active = value
    if (key === 'category' && typeof value === 'string' && value) updates.category = value
    if (key === 'tier' && typeof value === 'string' && value) updates.tier = value
    if (key === 'tier_label' && typeof value === 'string') updates.tier_label = value
  }

  const notesAppend = typeof body.notesAppend === 'string' ? body.notesAppend.trim() : ''

  if (Object.keys(updates).length === 0 && !notesAppend) {
    return NextResponse.json(
      { error: 'No fields to update; include updates or notesAppend.' },
      { status: 400 }
    )
  }

  const session = await getServerAuthSession()
  const actorName = session?.user?.name || session?.user?.email || tenant.userId || 'unknown'

  const applied: string[] = []
  const failed: Array<{ roleId: string; message: string }> = []

  try {
    await withTransaction(async (client: PoolClient) => {
      for (const roleId of roleIds) {
        try {
          // Build UPDATE statement.
          const setClauses: string[] = []
          const values: unknown[] = []

          for (const [key, value] of Object.entries(updates)) {
            setClauses.push(`"${key}" = $${values.length + 1}`)
            values.push(value)
          }

          if (notesAppend) {
            setClauses.push(
              `notes = CASE WHEN notes IS NULL OR notes = '' THEN $${values.length + 1} ELSE notes || ' | ' || $${values.length + 1} END`
            )
            values.push(notesAppend)
          }

          values.push(roleId)

          const res = await client.query<{ role_id: string; role_sku: string }>(
            `UPDATE greenhouse_commercial.sellable_roles
                SET ${setClauses.join(', ')},
                    updated_at = NOW()
              WHERE role_id = $${values.length}
              RETURNING role_id, role_sku`,
            values
          )

          if (res.rowCount === 0) {
            failed.push({ roleId, message: 'Role not found.' })

            continue
          }

          const { role_sku: roleSku } = res.rows[0]

          await client.query(
            `INSERT INTO greenhouse_commercial.pricing_catalog_audit_log (
               entity_type, entity_id, entity_sku, action,
               actor_user_id, actor_name, change_summary
             ) VALUES ('sellable_role', $1, $2, 'bulk_edited', $3, $4, $5::jsonb)`,
            [
              roleId,
              roleSku,
              tenant.userId,
              actorName,
              JSON.stringify({
                new_values: updates,
                notes_append: notesAppend || null,
                fields_changed: [
                  ...Object.keys(updates),
                  ...(notesAppend ? ['notes'] : [])
                ],
                bulk_size: roleIds.length
              })
            ]
          )

          applied.push(roleId)
        } catch (err) {
          failed.push({
            roleId,
            message: err instanceof Error ? err.message : 'Unknown error.'
          })
        }
      }
    })

    return NextResponse.json({
      applied: applied.length,
      failed: failed.length,
      errors: failed
    })
  } catch (error) {
    console.error('[TASK-471] Failed to apply bulk role update', error)

    return NextResponse.json(
      { error: 'Failed to apply bulk update.', applied: applied.length, failed: failed.length },
      { status: 500 }
    )
  }
}
