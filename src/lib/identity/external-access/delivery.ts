import { withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { appendAudit } from './authority-transactions'
import { INVITATION_SELECT, mapInvitationRow } from './store'
import type {
  ExternalAccessActor,
  ExternalIdentityEnvironment,
  ExternalInvitationDelivery,
  ExternalInvitationDeliveryStatus,
  ExternalMemberInvitation
} from './types'

/**
 * TASK-1837 — Entrega de la invitación externa por el sistema.
 *
 * Por qué vive acá y no en un consumer reactivo: el consumer sólo ve el payload del evento, y el
 * evento NO lleva el token porque el token no se persiste en claro en ninguna parte (sólo `sha256`).
 * Para que un consumer pudiera mandar el enlace habría que meter el secreto en el outbox —Postgres y
 * BigQuery— o guardarlo cifrado y recuperable, y eso destruye la propiedad que hace segura a la
 * invitación. El correo se envía en el MISMO acto que genera el token, después de que la transacción
 * confirma, con el secreto viviendo únicamente en memoria del proceso y en el cuerpo del mensaje.
 *
 * Por qué la URL sale del environment y no de una env var: `NEXT_PUBLIC_APP_URL` es el bug cross-env
 * de TASK-1012/ISSUE-084 (el enlace de staging apunta a producción). El origen del emisor ya es un
 * DATO del registry de TASK-1631 (`external_identity_environments.issuer_url`), hecho para absorber
 * la rotación de issuer. La landing del invitado es `GET /i/<token>` del auth-server
 * (`PERSON_AUTH_PATHS.invitationLanding`, TASK-1830).
 *
 * `@/lib/email/delivery` es `server-only`: se carga por import dinámico para que el bundle del
 * auth-server (que consume `acceptExternalInvitation` in-process) no lo evalúe nunca.
 */

/** Providers cuyo emisor expone la landing `/i/<token>`. Otro provider ⇒ `landing_unavailable`. */
const PROVIDERS_WITH_INVITATION_LANDING: ReadonlySet<string> = new Set(['efeonce_auth'])

export const INVITATION_LANDING_PATH = '/i/'

export const EXTERNAL_INVITATION_EMAIL_TYPE = 'external_access_invitation' as const
export const EXTERNAL_INVITATION_SOURCE_ENTITY = 'external_member_invitations' as const

export type InvitationAcceptanceUrlResolution =
  | { ok: true; url: string; origin: string }
  | { ok: false; errorCode: 'landing_unavailable' | 'issuer_invalid' }

/**
 * Deriva la URL de aceptación desde el ORIGEN CONFIGURADO del emisor del environment. Nunca desde
 * `NEXT_PUBLIC_APP_URL` ni desde ninguna env var (test de contrato en `delivery.test.ts`).
 */
export const resolveInvitationAcceptanceUrl = (
  environment: Pick<ExternalIdentityEnvironment, 'provider' | 'issuerUrl'>,
  token: string
): InvitationAcceptanceUrlResolution => {
  if (!PROVIDERS_WITH_INVITATION_LANDING.has(environment.provider)) {
    return { ok: false, errorCode: 'landing_unavailable' }
  }

  let origin: string

  try {
    const issuer = new URL(environment.issuerUrl)

    if (issuer.protocol !== 'https:') return { ok: false, errorCode: 'issuer_invalid' }
    origin = issuer.origin
  } catch {
    return { ok: false, errorCode: 'issuer_invalid' }
  }

  return { ok: true, origin, url: `${origin}${INVITATION_LANDING_PATH}${encodeURIComponent(token)}` }
}

/** `ana.perez@cliente.cl` → `a***@cliente.cl`. Para respuestas, logs y evidencia de señales. */
export const maskEmail = (email: string): string => {
  const at = email.indexOf('@')

  if (at <= 0) return '***'

  return `${email.charAt(0)}***${email.slice(at)}`
}

export const buildInvitationDelivery = (
  invitation: Pick<ExternalMemberInvitation, 'email' | 'deliveryStatus' | 'deliveryAttempts' | 'lastDeliveryErrorCode'>,
  mode: ExternalInvitationDelivery['mode']
): ExternalInvitationDelivery => ({
  mode,
  status: invitation.deliveryStatus,
  attempts: invitation.deliveryAttempts,
  recipientMasked: maskEmail(invitation.email),
  errorCode: invitation.lastDeliveryErrorCode
})

export type SendInvitationEmailInput = {
  invitation: ExternalMemberInvitation
  environment: ExternalIdentityEnvironment
  organizationName: string | null
  token: string
}

export type SendInvitationEmailResult = { status: 'sent'; deliveryId: string | null } | { status: 'failed'; errorCode: string }

/**
 * Puerto de envío. Inyectable para tests; el runtime usa `sendEmail` con postura `token_sensitive`
 * (el cuerpo con el enlace NO se persiste en `email_deliveries`).
 */
export type InvitationEmailSender = (input: SendInvitationEmailInput) => Promise<SendInvitationEmailResult>

export const sendInvitationEmailViaPlatform: InvitationEmailSender = async ({
  invitation,
  environment,
  organizationName,
  token
}) => {
  const resolved = resolveInvitationAcceptanceUrl(environment, token)

  if (!resolved.ok) return { status: 'failed', errorCode: resolved.errorCode }

  const expiresInHours = Math.max(
    1,
    Math.round((new Date(invitation.expiresAt).getTime() - Date.now()) / (60 * 60 * 1000))
  )

  try {
    const { sendEmail } = await import('@/lib/email/delivery')

    const delivery = await sendEmail({
      emailType: EXTERNAL_INVITATION_EMAIL_TYPE,
      domain: 'identity',
      recipients: [{ email: invitation.email }],
      context: {
        acceptanceUrl: resolved.url,
        issuerHost: new URL(resolved.origin).host,
        organizationName,
        expiresInHours,
        locale: 'es' as const
      },
      persistence: {
        mode: 'token_sensitive',
        safeContext: { locale: 'es', expiresAt: invitation.expiresAt }
      },
      sourceEntity: EXTERNAL_INVITATION_SOURCE_ENTITY,
      sourceEventId: invitation.invitationId
    })

    if (delivery.status === 'failed' || delivery.dispatchOutcome === 'failed') {
      return { status: 'failed', errorCode: 'provider_rejected' }
    }

    if (delivery.status === 'skipped' || delivery.status === 'rate_limited') {
      return { status: 'failed', errorCode: delivery.status }
    }

    return { status: 'sent', deliveryId: delivery.deliveryId ?? null }
  } catch {
    // El mensaje del proveedor nunca cruza: sólo el código. Observabilidad vía captureWithDomain del caller.
    return { status: 'failed', errorCode: 'send_exception' }
  }
}

export type RecordDeliveryOutcomeInput = {
  invitationId: string
  outcome: Exclude<ExternalInvitationDeliveryStatus, 'not_attempted'>
  errorCode?: string | null
  /** `true` cuando el acto fue un intento de envío (sent/failed); los webhooks (delivered/bounced) no cuentan intento. */
  countsAsAttempt: boolean
  actor: ExternalAccessActor
  metadata?: Record<string, unknown>
}

/**
 * Único writer de las columnas `delivery_*` (fuera del INSERT inicial): estado + audit + outbox en una
 * transacción. `failed`/`bounced` publican `identity.external_invitation.delivery_failed` — sin token,
 * sin email — para que el operador y las señales lo vean sin abrir la base.
 */
export const recordExternalInvitationDeliveryOutcome = async (
  input: RecordDeliveryOutcomeInput
): Promise<ExternalMemberInvitation | null> =>
  withTransaction(async client => {
    const { rows } = await client.query<Parameters<typeof mapInvitationRow>[0] & { environment_id: string; organization_id: string }>(
      `UPDATE greenhouse_core.external_member_invitations i
          SET delivery_status = $2,
              delivery_attempts = delivery_attempts + $3,
              last_delivery_at = CURRENT_TIMESTAMP,
              last_delivery_error_code = $4,
              updated_at = CURRENT_TIMESTAMP
         FROM greenhouse_core.external_organization_bindings b
        WHERE i.invitation_id = $1 AND b.binding_id = i.binding_id
        RETURNING ${INVITATION_SELECT
          .split(',')
          .map(column => `i.${column.trim()}`)
          .join(', ')}, b.environment_id, b.organization_id`,
      [input.invitationId, input.outcome, input.countsAsAttempt ? 1 : 0, input.errorCode ?? null]
    )

    const row = rows[0]

    if (!row) return null

    const invitation = mapInvitationRow(row)
    const negative = input.outcome === 'failed' || input.outcome === 'bounced'

    if (negative) {
      await appendAudit(client, {
        eventType: input.outcome === 'bounced' ? 'invitation_delivery_bounced' : 'invitation_delivery_failed',
        environmentId: row.environment_id,
        bindingId: invitation.bindingId,
        invitationId: invitation.invitationId,
        organizationId: row.organization_id,
        profileId: invitation.profileId,
        performedBy: input.actor.actorId,
        reason: input.errorCode ?? null,
        metadata: { attempts: invitation.deliveryAttempts, ...(input.metadata ?? {}) }
      })

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
          aggregateId: invitation.bindingId,
          eventType: EVENT_TYPES.externalInvitationDeliveryFailed,
          payload: {
            schemaVersion: 1,
            bindingId: invitation.bindingId,
            invitationId: invitation.invitationId,
            organizationId: row.organization_id,
            environmentId: row.environment_id,
            deliveryStatus: input.outcome,
            errorCode: input.errorCode ?? null,
            attempts: invitation.deliveryAttempts,
            changedByUserId: input.actor.actorId
          }
        },
        client
      )
    }

    return invitation
  })
