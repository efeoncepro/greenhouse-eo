import { NextResponse } from 'next/server'

import type { PoolClient } from 'pg'

import { getServerAuthSession } from '@/lib/auth'
import { withTransaction } from '@/lib/db'
import {
  getPricingCatalogAuditEntry,
  isPricingCatalogAuditReverted
} from '@/lib/commercial/pricing-catalog-audit-store'
import {
  buildRevertPayload,
  PricingCatalogRevertNotSupportedError
} from '@/lib/commercial/pricing-catalog-revert'
import {
  applyPricingCatalogEntityChanges,
  EntityWriterError,
  PRICING_CATALOG_ENTITY_WHITELIST
} from '@/lib/commercial/pricing-catalog-entity-writer'
import {
  canRevertPricingCatalogChange,
  requireAdminTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RouteParams {
  auditId: string
}

interface RevertRequestBody {
  reason?: unknown
}

const REASON_MIN_LENGTH = 15
const REASON_MAX_LENGTH = 500

/**
 * POST /api/admin/pricing-catalog/audit-log/[auditId]/revert
 *
 * One-click revert of a pricing catalog audit entry (TASK-471 slice 2).
 *
 * Body:
 *   - reason: string (15-500 chars, required for audit trail)
 *
 * Flow:
 *   1. Auth: requireAdminTenantContext + canRevertPricingCatalogChange (efeonce_admin only).
 *   2. Load audit entry; 404 if missing.
 *   3. Guard: 409 if already reverted (has a reverted child via change_summary.reverts_audit_id).
 *   4. Build revert descriptor via `buildRevertPayload` (throws for unsupported cases).
 *   5. Whitelist-check each field in payload against entity_type's allowed columns.
 *   6. Transaction:
 *      a. UPDATE entity table with restored values.
 *      b. INSERT new audit row (action='reverted', change_summary wraps original audit id + restored fields + reason).
 *   7. Return { reverted: true, newAuditId, entityUpdated }.
 *
 * V1 scope: sellable_role, tool_catalog, overhead_addon. Other entity types (governance,
 * service_catalog, fte_hours_guide) return 400 with clear reason — operators can still
 * revert manually via PATCH endpoints with the previous_values from the diff viewer.
 */
export async function POST(request: Request, { params }: { params: Promise<RouteParams> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canRevertPricingCatalogChange(tenant)) {
    return NextResponse.json(
      { error: 'Permission denied: revert requires efeonce_admin role.', code: 'revert_forbidden' },
      { status: 403 }
    )
  }

  const { auditId } = await params

  let body: RevertRequestBody = {}

  try {
    body = (await request.json()) as RevertRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const reasonRaw = typeof body.reason === 'string' ? body.reason.trim() : ''

  if (reasonRaw.length < REASON_MIN_LENGTH) {
    return NextResponse.json(
      {
        error: `Reason must be at least ${REASON_MIN_LENGTH} characters.`,
        code: 'reason_too_short'
      },
      { status: 400 }
    )
  }

  if (reasonRaw.length > REASON_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Reason must be ${REASON_MAX_LENGTH} characters or fewer.`, code: 'reason_too_long' },
      { status: 400 }
    )
  }

  const entry = await getPricingCatalogAuditEntry(auditId)

  if (!entry) {
    return NextResponse.json({ error: 'Audit entry not found.', code: 'audit_not_found' }, { status: 404 })
  }

  const alreadyReverted = await isPricingCatalogAuditReverted(auditId)

  if (alreadyReverted) {
    return NextResponse.json(
      { error: 'This audit entry has already been reverted.', code: 'already_reverted' },
      { status: 409 }
    )
  }

  let descriptor

  try {
    descriptor = buildRevertPayload(entry)
  } catch (error) {
    if (error instanceof PricingCatalogRevertNotSupportedError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }

    throw error
  }

  if (!PRICING_CATALOG_ENTITY_WHITELIST[entry.entityType]) {
    return NextResponse.json(
      {
        error: `Revert not supported for entity_type "${entry.entityType}" in V1.`,
        code: 'revert_entity_not_supported'
      },
      { status: 400 }
    )
  }

  const session = await getServerAuthSession()

  const actorName =
    session?.user?.name || session?.user?.email || tenant.clientName || tenant.userId || 'unknown'

  try {
    const result = await withTransaction(async (client: PoolClient) => {
      const applyResult = await applyPricingCatalogEntityChanges({
        client,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changeset: descriptor.payload
      })

      const updates: Record<string, unknown> = {}

      for (const field of applyResult.updatedFields) {
        updates[field] = descriptor.payload[field] ?? descriptor.payload[field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())]
      }

      const auditInsert = await client.query<{ audit_id: string }>(
        `INSERT INTO greenhouse_commercial.pricing_catalog_audit_log (
           entity_type, entity_id, entity_sku, action,
           actor_user_id, actor_name, change_summary
         ) VALUES ($1, $2, $3, 'reverted', $4, $5, $6::jsonb)
         RETURNING audit_id`,
        [
          entry.entityType,
          entry.entityId,
          entry.entitySku,
          tenant.userId,
          actorName,
          JSON.stringify({
            reverts_audit_id: entry.auditId,
            reverts_original_action: entry.action,
            previous_values: entry.changeSummary.new_values ?? null, // what the entity looked like before revert
            new_values: updates, // what it looks like after revert
            fields_changed: Object.keys(updates),
            reason: reasonRaw
          })
        ]
      )

      return {
        newAuditId: auditInsert.rows[0]?.audit_id,
        entityId: entry.entityId,
        entityType: entry.entityType
      }
    })

    return NextResponse.json({ reverted: true, ...result }, { status: 200 })
  } catch (error) {
    if (error instanceof EntityWriterError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }

    if (error instanceof PricingCatalogRevertNotSupportedError) {
      const status = error.code === 'entity_gone' ? 409 : 400

      return NextResponse.json({ error: error.message, code: error.code }, { status })
    }

    console.error('[TASK-471] Failed to apply revert', error)

    return NextResponse.json(
      { error: 'Failed to revert audit entry.', code: 'revert_failed' },
      { status: 500 }
    )
  }
}

