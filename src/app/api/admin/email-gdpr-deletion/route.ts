import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json() as { recipientEmail?: unknown; reason?: unknown }
    const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim().toLowerCase() : null
    const reason = typeof body.reason === 'string' ? body.reason.trim() : null

    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required.' }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({ error: 'reason is required (GDPR deletion must be auditable).' }, { status: 400 })
    }

    // Anonymize delivery records for this recipient
    const deliveryRows = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(`
      WITH anonymized AS (
        UPDATE greenhouse_notifications.email_deliveries
        SET
          recipient_email  = '[gdpr-deleted]',
          recipient_name   = '[gdpr-deleted]',
          recipient_user_id = NULL,
          delivery_payload = '{"gdpr_deleted": true}'::jsonb,
          actor_email      = CASE WHEN actor_email = $1 THEN '[gdpr-deleted]' ELSE actor_email END,
          data_redacted_at = NOW(),
          updated_at       = NOW()
        WHERE recipient_email = $1
          AND data_redacted_at IS NULL
        RETURNING delivery_id
      )
      SELECT COUNT(*)::text AS count FROM anonymized
    `, [recipientEmail])

    const deliveriesAnonymized = Number(deliveryRows[0]?.count ?? 0)

    // Revoke all subscriptions
    const subRows = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(`
      WITH revoked AS (
        UPDATE greenhouse_notifications.email_subscriptions
        SET active = FALSE, updated_at = NOW()
        WHERE recipient_email = $1
          AND active = TRUE
        RETURNING subscription_id
      )
      SELECT COUNT(*)::text AS count FROM revoked
    `, [recipientEmail])

    const subscriptionsRevoked = Number(subRows[0]?.count ?? 0)

    // Publish audit event (no PII in payload)
    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.emailDelivery,
      aggregateId: `gdpr-deletion-${Date.now()}`,
      eventType: EVENT_TYPES.emailGdprDeletionCompleted,
      payload: {
        deliveriesAnonymized,
        subscriptionsRevoked,
        requestedBy: tenant.userId,
        reason,
        completedAt: new Date().toISOString()
      }
    })

    return NextResponse.json({
      ok: true,
      deliveriesAnonymized,
      subscriptionsRevoked
    })
  } catch (error) {
    console.error('[email-gdpr-deletion] Error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    )
  }
}
