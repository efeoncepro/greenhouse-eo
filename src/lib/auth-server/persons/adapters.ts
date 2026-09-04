/**
 * Adaptadores del dominio de personas hacia las primitives reales (TASK-1830).
 *
 * El dominio (`magic-link.ts`, `invitations.ts`, `sessions.ts`) sólo conoce ports: así se prueba el
 * flujo completo sin PG, sin Resend y sin el command de invitaciones. Acá viven los cables.
 *
 * Frontera de escritura: el emisor NUNCA escribe fuera de `greenhouse_auth`. Lo que este archivo
 * hace contra `greenhouse_core` es (a) LEER el source link canónico y (b) delegar la única escritura
 * legítima —ligar la persona— al command de `TASK-1631`, que la ejecuta con su propia transacción,
 * su audit y su outbox. Nunca un `INSERT` propio sobre esas tablas.
 */

import { randomBytes } from 'node:crypto'

import { captureWithDomain } from '@/lib/observability/capture'
import {
  acceptExternalInvitation,
  findActiveExternalIdpLinkByEmail,
  getActiveExternalIdpLinkBySubject,
  isExternalAccessError
} from '@/lib/identity/external-access'

import type { InvitationAcceptancePort } from './invitations'
import type { MagicLinkMailerPort, PersonDirectoryPort } from './magic-link'

/** Identificador del runtime como actor en el audit de `TASK-1631`. */
export const AUTH_SERVER_ACTOR_ID = 'auth-server'

/** 24 bytes ≈ 192 bits: opaco, estable y sin estructura que revele nada de la persona. */
export const mintOpaqueSubject = (): string => randomBytes(24).toString('base64url')

export const createSourceLinkDirectoryPort = (): PersonDirectoryPort => ({
  findBySubject: async ({ environmentId, subject }) => {
    const link = await getActiveExternalIdpLinkBySubject({ environmentId, subject })

    if (!link) return null

    return { linkId: link.linkId, profileId: link.profileId, subject: link.subject, email: link.email }
  },
  findByEmail: async ({ environmentId, email }) => {
    const link = await findActiveExternalIdpLinkByEmail({ environmentId, email })

    if (!link) return null

    return { linkId: link.linkId, profileId: link.profileId, subject: link.subject, email: link.email }
  }
})

export const createExternalInvitationAcceptancePort = (): InvitationAcceptancePort => ({
  accept: async ({ token, environmentId, subject }) => {
    try {
      const result = await acceptExternalInvitation(
        { token, environmentId, subject },
        { actorId: AUTH_SERVER_ACTOR_ID }
      )

      return {
        status: 'linked',
        profileId: result.profileId,
        linkId: result.linkId,
        email: result.invitation.email
      }
    } catch (error) {
      // El código viaja al ledger, jamás al cliente: distinguir "no existe" de "vencida" es un oráculo.
      if (isExternalAccessError(error)) return { status: 'rejected', reason: error.code }

      captureWithDomain(error, 'identity', {
        tags: { component: 'auth-server', stage: 'invitation_accept' }
      })

      return { status: 'rejected', reason: 'internal_error' }
    }
  }
})

/**
 * Correo del magic link por el pipeline gobernado (`sendEmail`), nunca Resend directo: el wrapper
 * aplica kill-switch por tipo, prioridad, `from`/`reply-to` resueltos en plataforma, persistencia
 * sanitizada de tipos token-sensitive y la fila de `email_deliveries`.
 */
export const createGovernedMagicLinkMailer = (): MagicLinkMailerPort => ({
  send: async ({ email, url, expiresInMinutes, correlationId }) => {
    const { sendEmail } = await import('@/lib/email/delivery')

    await sendEmail({
      emailType: 'auth_server_magic_link',
      domain: 'identity',
      recipients: [{ email }],
      context: { magicLinkUrl: url, expiresInMinutes, locale: 'es' as const },
      // El bearer se renderiza en memoria y NUNCA se persiste: sólo el contexto seguro.
      persistence: {
        mode: 'token_sensitive',
        safeContext: { locale: 'es', timeLimitMinutes: expiresInMinutes }
      },
      sourceEntity: 'auth_server_person',
      sourceEventId: correlationId ?? undefined
    })
  }
})
