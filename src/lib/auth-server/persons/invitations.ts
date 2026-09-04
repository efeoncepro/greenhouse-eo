/**
 * Aceptación de invitación externa desde el emisor (TASK-1830 sobre el command de TASK-1631).
 *
 * Rompe el huevo-y-gallina de la identidad externa: el source link necesita un `subject` y el
 * `subject` no existe antes de que alguien lo acuñe. La invitación es lo que autoriza acuñarlo.
 *
 * **La aceptación NO abre sesión.** El token de invitación lo entrega el operador por el canal que
 * quiera (Teams, teléfono, correo), así que tenerlo NO prueba control del buzón. Aceptar liga el
 * sujeto al `identity_profile`; para entrar hace falta además consumir un magic link enviado al
 * correo que declaró el operador en la invitación — nunca a uno que mande el usuario.
 *
 * Quien robe una invitación sólo logra quemarla: el `subject` lo acuña el servidor, y toda sesión
 * posterior sigue exigiendo el buzón. La reparación es una re-invitación auditada (`reissue`).
 */

import { sha256Hex } from '../oauth/primitives'
import { enforceRateLimit, INVITATION_ACCEPT_IP_RULE } from './rate-limit'
import type { MagicLinkDeps } from './magic-link'
import { issueMagicLinkForPerson, sanitizeReturnTo } from './magic-link'

/**
 * Resultado normalizado del command `acceptExternalInvitation`. El motivo del rechazo NUNCA llega al
 * cliente: distingue "invitación inexistente" de "invitación vencida" y eso es un oráculo.
 */
export type InvitationAcceptancePort = {
  accept(input: { token: string; environmentId: string; subject: string }): Promise<
    | { status: 'linked'; profileId: string; linkId: string; email: string }
    | { status: 'rejected'; reason: string }
  >
}

export type AcceptInvitationDeps = MagicLinkDeps & {
  invitations: InvitationAcceptancePort
  /** Acuñador del sujeto opaco. Inyectable para tests; en runtime son bytes aleatorios. */
  mintSubject: () => string
}

export type AcceptInvitationResult =
  | { status: 'accepted' }
  | { status: 'invalid' }
  | { status: 'rate_limited'; retryAfterSeconds: number }

export const acceptInvitationAndSendMagicLink = async (
  deps: AcceptInvitationDeps,
  input: {
    token: string
    returnTo: string | null
    ipHash: string | null
    ipValue: string | null
    userAgentHash: string | null
    correlationId: string | null
  }
): Promise<AcceptInvitationResult> => {
  const now = deps.now()

  const ipDecision = await enforceRateLimit({
    store: deps.store,
    config: deps.config,
    rule: INVITATION_ACCEPT_IP_RULE,
    value: input.ipValue,
    now
  })

  if (!ipDecision.allowed) {
    await deps.store.recordAttempt({
      method: 'invitation',
      stage: 'consume',
      outcome: 'rate_limited',
      reasonCode: ipDecision.reason,
      environmentId: deps.environmentId,
      subjectHash: null,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
      correlationId: input.correlationId,
      details: { dimension: 'ip' }
    })

    return { status: 'rate_limited', retryAfterSeconds: ipDecision.retryAfterSeconds }
  }

  if (!input.token || input.token.length < 16 || input.token.length > 256) {
    await deps.store.recordAttempt({
      method: 'invitation',
      stage: 'consume',
      outcome: 'rejected',
      reasonCode: 'malformed_token',
      environmentId: deps.environmentId,
      subjectHash: null,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
      correlationId: input.correlationId,
      details: {}
    })

    return { status: 'invalid' }
  }

  const subject = deps.mintSubject()

  const accepted = await deps.invitations.accept({
    token: input.token,
    environmentId: deps.environmentId,
    subject
  })

  if (accepted.status === 'rejected') {
    await deps.store.recordAttempt({
      method: 'invitation',
      stage: 'consume',
      outcome: 'rejected',
      reasonCode: accepted.reason,
      environmentId: deps.environmentId,
      subjectHash: null,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
      correlationId: input.correlationId,
      details: {}
    })

    return { status: 'invalid' }
  }

  await deps.store.recordAttempt({
    method: 'invitation',
    stage: 'consume',
    outcome: 'success',
    reasonCode: null,
    environmentId: deps.environmentId,
    subjectHash: sha256Hex(subject),
    ipHash: input.ipHash,
    userAgentHash: input.userAgentHash,
    correlationId: input.correlationId,
    details: { profileId: accepted.profileId }
  })

  // El correo sale a la dirección que el OPERADOR declaró en la invitación (`source_email`), nunca a
  // una que venga en la request: ahí está la prueba de control del buzón.
  await issueMagicLinkForPerson(deps, {
    subject,
    email: accepted.email,
    returnTo: sanitizeReturnTo(input.returnTo),
    ipHash: input.ipHash,
    userAgentHash: input.userAgentHash,
    correlationId: input.correlationId,
    now
  })

  return { status: 'accepted' }
}
