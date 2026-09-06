import 'server-only'

/**
 * TASK-1837 — El rebote del correo de invitación externa vuelve observable.
 *
 * `email_delivery.bounced` (lo publica el webhook de Resend en `src/lib/email/resend-webhook.ts`)
 * lleva `deliveryId`; acá se re-lee `email_deliveries` por ID, y sólo si el tipo es
 * `external_access_invitation` se llama al writer canónico del dominio
 * (`recordExternalInvitationDeliveryOutcome`), que deja `delivery_status='bounced'`, audita y publica
 * `identity.external_invitation.delivery_failed`. Nunca se escribe `external_member_invitations`
 * desde acá: el módulo external-access es el único writer.
 *
 * Sin flag a propósito: el consumer sólo actúa sobre entregas que existen. Gatearlo en el ops-worker
 * habría creado el riesgo del ledger (flag ON en Vercel, drenaje muerto en el worker). Domain
 * `notifications` → lane `ops-reactive-notifications` (cada 2 min), sin tocar deploy.sh.
 */

import { query } from '@/lib/db'
import {
  EXTERNAL_INVITATION_EMAIL_TYPE,
  EXTERNAL_INVITATION_SOURCE_ENTITY,
  recordExternalInvitationDeliveryOutcome
} from '@/lib/identity/external-access'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

export const EXTERNAL_INVITATION_BOUNCE_ACTOR_ID = 'ops-worker:resend-webhook'

type DeliveryRow = { email_type: string; source_entity: string | null; source_event_id: string | null }

export const externalInvitationDeliveryBouncedProjection: ProjectionDefinition = {
  name: 'external_invitation_delivery_bounced',
  description:
    'TASK-1837 — email_delivery.bounced (tipo external_access_invitation) → delivery_status=bounced en la invitación + audit + identity.external_invitation.delivery_failed.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.emailDeliveryBounced],
  extractScope: payload => {
    const deliveryId = typeof payload.deliveryId === 'string' ? payload.deliveryId.trim() : ''

    if (!deliveryId) return null

    return { entityType: 'email_delivery', entityId: deliveryId }
  },
  refresh: async (scope, payload) => {
    const rows = await query<DeliveryRow>(
      `SELECT email_type, source_entity, source_event_id
         FROM greenhouse_notifications.email_deliveries
        WHERE delivery_id = $1::uuid`,
      [scope.entityId]
    )

    const row = rows[0]

    if (!row || row.email_type !== EXTERNAL_INVITATION_EMAIL_TYPE) return `skip: not an external invitation (${scope.entityId})`

    if (row.source_entity !== EXTERNAL_INVITATION_SOURCE_ENTITY || !row.source_event_id) {
      return `skip: invitation correlation missing (${scope.entityId})`
    }

    const bounceType = typeof payload.bounceType === 'string' && payload.bounceType ? payload.bounceType : 'bounced'

    const invitation = await recordExternalInvitationDeliveryOutcome({
      invitationId: row.source_event_id,
      outcome: 'bounced',
      errorCode: `bounce:${bounceType}`,
      countsAsAttempt: false,
      actor: { actorId: EXTERNAL_INVITATION_BOUNCE_ACTOR_ID },
      metadata: { deliveryId: scope.entityId }
    })

    return invitation ? `bounced: ${invitation.invitationId}` : `skip: invitation not found (${row.source_event_id})`
  },
  maxRetries: 3
}
