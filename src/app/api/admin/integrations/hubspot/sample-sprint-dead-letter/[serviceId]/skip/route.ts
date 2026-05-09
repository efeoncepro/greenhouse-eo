import { NextResponse } from 'next/server'

import { recordEngagementAuditEvent } from '@/lib/commercial/sample-sprints/audit-log'
import { publishEngagementEvent } from '@/lib/commercial/sample-sprints/engagement-events'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { withTransaction } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-837 Slice 5 — Mark Sample Sprint outbound as skip permanently.
 *
 * POST /api/admin/integrations/hubspot/sample-sprint-dead-letter/[serviceId]/skip
 *
 * Body: { reason: string ≥ 5 chars }
 *
 * Capability: commercial.engagement.recover_outbound (FINANCE_ADMIN + EFEONCE_ADMIN).
 * Atomic tx: UPDATE service hubspot_sync_status='unmapped' (legacy semantic
 * for "not projecting to HubSpot") + audit + emit
 * 'service.engagement.outbound_skipped' v1 (audit-only).
 */

interface SkipBody {
  reason?: unknown
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'commercial.engagement.recover_outbound', 'approve', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { serviceId } = await params

  if (!serviceId?.trim()) {
    return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
  }

  let body: SkipBody | null = null

  try {
    body = (await request.json()) as SkipBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  if (reason.length < 5) {
    return NextResponse.json(
      { error: 'reason debe tener al menos 5 caracteres' },
      { status: 400 }
    )
  }

  try {
    const result = await withTransaction(async client => {
      const updateResult = await client.query<{ service_id: string }>(
        `UPDATE greenhouse_core.services
            SET hubspot_sync_status = 'unmapped',
                updated_at = CURRENT_TIMESTAMP
          WHERE service_id = $1
            AND engagement_kind != 'regular'
            AND hubspot_sync_status = 'outbound_dead_letter'
          RETURNING service_id`,
        [serviceId]
      )

      if (updateResult.rows.length === 0) {
        return { ok: false as const }
      }

      await recordEngagementAuditEvent(
        {
          serviceId,
          eventKind: 'outbound_skipped',
          actorUserId: tenant.userId,
          reason,
          payload: {
            triggeredFrom: 'dead_letter_ux',
            previousStatus: 'outbound_dead_letter',
            nextStatus: 'unmapped'
          }
        },
        client
      )

      await publishEngagementEvent(
        {
          serviceId,
          eventType: EVENT_TYPES.serviceEngagementOutboundSkipped,
          actorUserId: tenant.userId,
          payload: {
            reason,
            skippedAt: new Date().toISOString()
          }
        },
        client
      )

      return { ok: true as const }
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Service is not in outbound_dead_letter — nothing to skip.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ ok: true, serviceId, status: 'unmapped' })
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'sample_sprint_dead_letter_skip' },
      extra: { serviceId }
    })
    
return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 502 })
  }
}
