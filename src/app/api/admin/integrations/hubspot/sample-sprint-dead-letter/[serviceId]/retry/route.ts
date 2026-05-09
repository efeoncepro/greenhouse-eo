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
 * TASK-837 Slice 5 — Retry outbound projection from dead-letter.
 *
 * POST /api/admin/integrations/hubspot/sample-sprint-dead-letter/[serviceId]/retry
 *
 * Capability: commercial.engagement.recover_outbound (FINANCE_ADMIN + EFEONCE_ADMIN).
 * Atomic tx: UPDATE service status='outbound_pending' (only if currently
 * dead_letter) + audit + re-emit outbox event 'service.engagement.outbound_requested'.
 */

interface ServiceRow extends Record<string, unknown> {
  service_id: string
  hubspot_deal_id: string | null
  idempotency_key: string | null
  engagement_kind: string
}

export async function POST(
  _request: Request,
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

  try {
    const result = await withTransaction(async client => {
      const updateResult = await client.query<ServiceRow>(
        `UPDATE greenhouse_core.services
            SET hubspot_sync_status = 'outbound_pending',
                updated_at = CURRENT_TIMESTAMP
          WHERE service_id = $1
            AND engagement_kind != 'regular'
            AND hubspot_sync_status = 'outbound_dead_letter'
          RETURNING service_id, hubspot_deal_id, idempotency_key, engagement_kind`,
        [serviceId]
      )

      const updatedRow = updateResult.rows[0]

      if (!updatedRow) {
        return { ok: false, reason: 'not_in_dead_letter' as const }
      }

      await recordEngagementAuditEvent(
        {
          serviceId,
          eventKind: 'outbound_retry_attempted',
          actorUserId: tenant.userId,
          payload: {
            triggeredFrom: 'dead_letter_ux',
            previousStatus: 'outbound_dead_letter',
            nextStatus: 'outbound_pending'
          }
        },
        client
      )

      await publishEngagementEvent(
        {
          serviceId,
          eventType: EVENT_TYPES.serviceEngagementOutboundRequested,
          actorUserId: tenant.userId,
          payload: {
            hubspotDealId: updatedRow.hubspot_deal_id,
            idempotencyKey: updatedRow.idempotency_key,
            engagementKind: updatedRow.engagement_kind,
            requestedAt: new Date().toISOString(),
            triggeredFrom: 'dead_letter_retry'
          }
        },
        client
      )

      return { ok: true as const }
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Service is not in outbound_dead_letter — nothing to retry.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ ok: true, serviceId, status: 'outbound_pending' })
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'sample_sprint_dead_letter_retry' },
      extra: { serviceId }
    })
    
return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 502 })
  }
}
