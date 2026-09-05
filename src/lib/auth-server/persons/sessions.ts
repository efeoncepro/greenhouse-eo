/**
 * Sesión propia del emisor (TASK-1830).
 *
 * La cookie `__Host-efeonce_auth` lleva un id aleatorio; en PG sólo vive su `sha256`. La sesión NO
 * es autosuficiente: en CADA request se resuelve junto con su source link, y si el operador revocó
 * el acceso la sesión muere en ese mismo request (invariante del ADR, no un job de limpieza).
 *
 * `authLevel` es el único gate de toda la cadena que depende de QUIÉN es la persona — en el lane
 * ecosystem el actor es la máquina. Por eso `step_up` exige un factor fuerte REAL en `amr`
 * (`totp`, o `passkey` con user verification) y que sea RECIENTE; nunca lo declara el cliente.
 */

import { randomBytes } from 'node:crypto'

import { sha256Hex } from '../oauth/primitives'
import type { AuthenticatedSubject } from '../oauth/subject'
import type { AuthServerPersonAuthConfig } from './config'
import type { PersonAuthStorePort } from './store/port'
import type { PersonAuthAmr, PersonSessionRecord } from './types'

/** Factores que califican como segundo factor para consentir un scope de escritura. */
const STRONG_AMR: ReadonlySet<PersonAuthAmr> = new Set<PersonAuthAmr>(['totp', 'uv'])

export const SESSION_ID_BYTES = 32

export type CreatePersonSessionInput = {
  subject: string
  environmentId: string
  profileId: string
  linkId: string
  amr: readonly PersonAuthAmr[]
  authTime: Date
  /** `true` cuando el factor que abrió la sesión YA es un segundo factor verificado. */
  stepUp?: boolean
  ipHash: string | null
  userAgentHash: string | null
  correlationId: string | null
}

export type CreatePersonSessionResult = {
  /** Valor CRUDO de la cookie. Se devuelve una vez y jamás se persiste ni se loggea. */
  sessionId: string
  record: PersonSessionRecord
}

export const createPersonSession = async ({
  store,
  config,
  input,
  now
}: {
  store: Pick<PersonAuthStorePort, 'insertSession'>
  config: AuthServerPersonAuthConfig
  input: CreatePersonSessionInput
  now: Date
}): Promise<CreatePersonSessionResult> => {
  const sessionId = randomBytes(SESSION_ID_BYTES).toString('base64url')

  const record: PersonSessionRecord = {
    sessionHash: sha256Hex(sessionId),
    subject: input.subject,
    environmentId: input.environmentId,
    profileId: input.profileId,
    linkId: input.linkId,
    amr: Array.from(new Set(input.amr)),
    authTime: input.authTime,
    stepUpAt: input.stepUp ? input.authTime : null,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + config.sessionSlidingTtlSeconds * 1000),
    absoluteExpiresAt: new Date(now.getTime() + config.sessionAbsoluteTtlSeconds * 1000),
    revokedAt: null,
    revokeReason: null,
    ipHash: input.ipHash,
    userAgentHash: input.userAgentHash,
    correlationId: input.correlationId
  }

  await store.insertSession(record)

  return { sessionId, record }
}

export type PersonSessionResolution =
  | { status: 'active'; session: PersonSessionRecord; authLevel: AuthenticatedSubject['authLevel'] }
  | { status: 'absent' }
  | { status: 'not_found' }
  | { status: 'revoked' }
  | { status: 'expired' }
  /** El source link dejó de estar activo: acceso revocado por el operador. */
  | { status: 'link_revoked' }
  /** El link ya no describe a este sujeto/environment: la sesión no es de esa persona. */
  | { status: 'link_mismatch' }

/**
 * `step_up` = factor fuerte en `amr` **y** reciente. Las dos condiciones juntas: un TOTP de ayer no
 * autoriza mover dinero hoy, y una sesión nueva abierta por magic link nunca es un segundo factor.
 */
export const resolveAuthLevel = (
  session: PersonSessionRecord,
  config: AuthServerPersonAuthConfig,
  now: Date
): AuthenticatedSubject['authLevel'] => {
  const hasStrongFactor = session.amr.some(factor => STRONG_AMR.has(factor))

  if (!hasStrongFactor) return 'primary'

  const lastStrongAt = session.stepUpAt ?? session.authTime
  const ageSeconds = (now.getTime() - lastStrongAt.getTime()) / 1000

  return ageSeconds <= config.stepUpMaxAgeSeconds ? 'step_up' : 'primary'
}

/**
 * Resuelve la sesión de un id CRUDO. Cuando el link murió, revoca la sesión antes de responder: el
 * estado inválido no sobrevive al request que lo detectó.
 */
export const resolvePersonSession = async ({
  store,
  config,
  sessionId,
  expectedEnvironmentId,
  expectedSourceSystem,
  now
}: {
  store: PersonAuthStorePort
  config: AuthServerPersonAuthConfig
  sessionId: string | null
  expectedEnvironmentId: string
  expectedSourceSystem: string
  now: Date
}): Promise<PersonSessionResolution> => {
  if (!sessionId) return { status: 'absent' }

  const found = await store.getSessionWithLink(sha256Hex(sessionId))

  if (!found) return { status: 'not_found' }

  const { session, linkActive, linkSubject, linkSourceSystem } = found

  if (session.revokedAt) return { status: 'revoked' }

  if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
    await store.revokeSession({ sessionHash: session.sessionHash, now, reason: 'expired' })

    return { status: 'expired' }
  }

  if (!linkActive) {
    await store.revokeSession({ sessionHash: session.sessionHash, now, reason: 'source_link_revoked' })

    return { status: 'link_revoked' }
  }

  if (
    session.environmentId !== expectedEnvironmentId ||
    linkSubject !== session.subject ||
    linkSourceSystem !== expectedSourceSystem
  ) {
    await store.revokeSession({ sessionHash: session.sessionHash, now, reason: 'source_link_mismatch' })

    return { status: 'link_mismatch' }
  }

  // Ventana deslizante: sólo se renueva cerca del vencimiento, para no escribir en cada request.
  const remainingSeconds = (session.expiresAt.getTime() - now.getTime()) / 1000

  if (remainingSeconds < config.sessionSlidingTtlSeconds - config.sessionRenewThresholdSeconds) {
    const expiresAt = new Date(now.getTime() + config.sessionSlidingTtlSeconds * 1000)

    await store.touchSession({ sessionHash: session.sessionHash, lastSeenAt: now, expiresAt })
    session.expiresAt = expiresAt < session.absoluteExpiresAt ? expiresAt : session.absoluteExpiresAt
    session.lastSeenAt = now
  }

  return { status: 'active', session, authLevel: resolveAuthLevel(session, config, now) }
}

// ─── Cookie ───────────────────────────────────────────────────────────────────

/**
 * `__Host-` obliga a `Secure`, `Path=/` y a NO declarar `Domain`: el navegador rechaza la cookie si
 * falta cualquiera de las tres, así que el prefijo es una garantía del cliente, no una convención.
 * `SameSite=Lax` deja pasar el retorno por GET desde el correo y corta el POST cross-site.
 */
export const buildSessionCookie = (
  name: string,
  value: string,
  maxAgeSeconds: number
): string => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`

export const buildSessionClearCookie = (name: string): string =>
  `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

export const readCookie = (cookieHeader: string | null | undefined, name: string): string | null => {
  if (!cookieHeader) return null

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')

    if (separator === -1) continue
    if (part.slice(0, separator).trim() !== name) continue

    return part.slice(separator + 1).trim() || null
  }

  return null
}
