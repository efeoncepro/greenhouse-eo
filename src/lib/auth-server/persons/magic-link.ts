/**
 * Magic link del emisor (TASK-1830).
 *
 * Patrón selector/verificador: el `tokenId` (UUID) viaja en la URL y sirve para buscar por PK; el
 * verificador son 32 bytes aleatorios de los que sólo se guarda `sha256`. Ese split es lo que evita
 * recorrer la tabla comparando hashes — el precedente del portal (`src/lib/auth/magic-link.ts`) lo
 * hace igual y de ahí se hereda.
 *
 * Se hereda la FORMA, no las afirmaciones: el docblock del portal declara un límite por IP que su
 * código no implementa, y su migración promete un índice único de single-use que no existe. Acá el
 * límite por IP es real (`auth_rate_limits`) y el consumo único lo garantiza un UPDATE condicional
 * dentro de una transacción, verificando que afectó exactamente una fila.
 *
 * Hashing: `sha256` + comparación en tiempo constante, igual que los demás bearers del emisor
 * (codes, refresh, access). NO bcrypt: sobre 256 bits de entropía un KDF lento no agrega resistencia
 * y sí agrega 300-800 ms de CPU de un solo hilo en un endpoint NO autenticado — un amplificador de
 * DoS en la puerta de entrada. El KDF lento existe para secretos de BAJA entropía.
 */

import { randomBytes, randomUUID } from 'node:crypto'

import { safeEquals, sha256Hex } from '../oauth/primitives'
import type { AuthServerPersonAuthConfig } from './config'
import { enforceRateLimit, MAGIC_LINK_CONSUME_IP_RULE, MAGIC_LINK_EMAIL_RULE, MAGIC_LINK_IP_RULE } from './rate-limit'
import type { PersonAuthStorePort } from './store/port'
import type { MagicLinkRecord, PersonAuthAmr } from './types'
import { createPersonSession, type CreatePersonSessionResult } from './sessions'

const VERIFIER_BYTES = 32
const MAX_RETURN_TO_LENGTH = 512

/** Validación deliberadamente laxa: sólo descarta lo que no puede ser un correo. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/

export const isPlausibleEmail = (value: string): boolean =>
  value.length <= 254 && EMAIL_PATTERN.test(value)

export const normalizeEmail = (value: string): string => value.trim().toLowerCase()

/**
 * `return_to` sólo puede ser un path del propio emisor. Un `//host` es protocolo-relativo y el
 * navegador lo trata como absoluto: sin este filtro, el magic link es un open redirect.
 */
export const sanitizeReturnTo = (value: string | null | undefined): string | null => {
  if (!value) return null

  const trimmed = value.trim()

  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.length > MAX_RETURN_TO_LENGTH) return null
  if (trimmed.includes('\\') || trimmed.includes('\n') || trimmed.includes('\r')) return null

  return trimmed
}

export type MagicLinkMailerPort = {
  /**
   * Despacha el correo. El caller NO espera esta promesa (el tiempo del envío es justamente lo que
   * delataría si el correo existe); los errores se observan por dominio.
   */
  send(input: { email: string; url: string; expiresInMinutes: number; correlationId: string | null }): Promise<void>
}

/** Resolución correo → persona. La implementación real lee el source link canónico de TASK-1631. */
export type PersonDirectoryPort = {
  findBySubject(input: {
    environmentId: string
    subject: string
  }): Promise<{ linkId: string; profileId: string; subject: string; email: string | null } | null>
  findByEmail(input: {
    environmentId: string
    email: string
  }): Promise<{ linkId: string; profileId: string; subject: string; email: string | null } | null>
}

export type RequestMagicLinkInput = {
  email: string
  returnTo: string | null
  ipHash: string | null
  ipValue: string | null
  userAgentHash: string | null
  correlationId: string | null
}

export type RequestMagicLinkResult =
  | { status: 'accepted' }
  | { status: 'invalid_email' }
  | { status: 'rate_limited'; retryAfterSeconds: number }

export type MagicLinkDeps = {
  store: PersonAuthStorePort
  config: AuthServerPersonAuthConfig
  directory: PersonDirectoryPort
  mailer: MagicLinkMailerPort
  environmentId: string
  issuer: string
  now: () => Date
  /** Inyectable para que los tests no esperen el piso anti-enumeración real. */
  sleep?: (ms: number) => Promise<void>
  onError?: (error: unknown, context: Record<string, unknown>) => void
}

const defaultSleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export const buildMagicLinkUrl = (issuer: string, tokenId: string, verifier: string): string =>
  `${issuer}/m/${tokenId}.${verifier}`

/**
 * Responde SIEMPRE lo mismo exista o no el correo, y tarda lo mismo: el cuerpo idéntico no basta si
 * el camino "existe" hace INSERT y despacha correo mientras el otro no hace nada.
 */
export const requestMagicLink = async (
  deps: MagicLinkDeps,
  input: RequestMagicLinkInput
): Promise<RequestMagicLinkResult> => {
  const now = deps.now()
  const startedAt = now.getTime()
  const sleep = deps.sleep ?? defaultSleep
  const email = normalizeEmail(input.email)

  const settle = async (result: RequestMagicLinkResult): Promise<RequestMagicLinkResult> => {
    const elapsed = deps.now().getTime() - startedAt

    if (elapsed < deps.config.antiEnumerationFloorMs) {
      await sleep(deps.config.antiEnumerationFloorMs - elapsed)
    }

    return result
  }

  // El límite por IP se evalúa PRIMERO y no depende del correo: no es un oráculo.
  const ipDecision = await enforceRateLimit({
    store: deps.store,
    config: deps.config,
    rule: MAGIC_LINK_IP_RULE,
    value: input.ipValue,
    now
  })

  if (!ipDecision.allowed) {
    await deps.store.recordAttempt({
      method: 'magic_link',
      stage: 'request',
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

  if (!isPlausibleEmail(email)) return settle({ status: 'invalid_email' })

  // Cooldown por correo: el bucket existe para CUALQUIER correo, registrado o no, así que tampoco
  // distingue. Por eso su rechazo devuelve el mismo 202 que el camino feliz.
  const emailDecision = await enforceRateLimit({
    store: deps.store,
    config: deps.config,
    rule: MAGIC_LINK_EMAIL_RULE,
    value: email,
    now
  })

  if (!emailDecision.allowed) {
    await deps.store.recordAttempt({
      method: 'magic_link',
      stage: 'request',
      outcome: 'rate_limited',
      reasonCode: emailDecision.reason,
      environmentId: deps.environmentId,
      subjectHash: null,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
      correlationId: input.correlationId,
      details: { dimension: 'email' }
    })

    return settle({ status: 'accepted' })
  }

  const person = await deps.directory.findByEmail({ environmentId: deps.environmentId, email })

  if (!person) {
    await deps.store.recordAttempt({
      method: 'magic_link',
      stage: 'request',
      outcome: 'rejected',
      reasonCode: 'unknown_email',
      environmentId: deps.environmentId,
      subjectHash: null,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
      correlationId: input.correlationId,
      details: {}
    })

    return settle({ status: 'accepted' })
  }

  await issueMagicLinkForPerson(deps, {
    subject: person.subject,
    email: person.email ?? email,
    returnTo: input.returnTo,
    ipHash: input.ipHash,
    userAgentHash: input.userAgentHash,
    correlationId: input.correlationId,
    now
  })

  return settle({ status: 'accepted' })
}

/**
 * Emite y despacha un magic link para una persona YA resuelta. Lo comparten el login por correo y la
 * aceptación de invitación (`TASK-1631`), que después de ligar al sujeto exige la misma prueba de
 * control del buzón antes de abrir sesión.
 */
export const issueMagicLinkForPerson = async (
  deps: MagicLinkDeps,
  input: {
    subject: string
    email: string
    returnTo: string | null
    ipHash: string | null
    userAgentHash: string | null
    correlationId: string | null
    now: Date
  }
): Promise<{ tokenId: string }> => {
  const tokenId = randomUUID()
  const verifier = randomBytes(VERIFIER_BYTES).toString('base64url')

  const record: MagicLinkRecord = {
    tokenId,
    tokenHash: sha256Hex(verifier),
    environmentId: deps.environmentId,
    subject: input.subject,
    emailHash: sha256Hex(normalizeEmail(input.email)),
    returnTo: sanitizeReturnTo(input.returnTo),
    requestedAt: input.now,
    expiresAt: new Date(input.now.getTime() + deps.config.magicLinkTtlSeconds * 1000),
    consumedAt: null,
    requestedIpHash: input.ipHash,
    consumedIpHash: null,
    userAgentHash: input.userAgentHash,
    correlationId: input.correlationId
  }

  await deps.store.insertMagicLink(record)

  await deps.store.recordAttempt({
    method: 'magic_link',
    stage: 'request',
    outcome: 'success',
    reasonCode: null,
    environmentId: deps.environmentId,
    subjectHash: sha256Hex(input.subject),
    ipHash: input.ipHash,
    userAgentHash: input.userAgentHash,
    correlationId: input.correlationId,
    details: { tokenId }
  })

  // Sin `await`: el tiempo del proveedor de correo es la mitad de la señal de enumeración.
  void deps.mailer
    .send({
      email: input.email,
      url: buildMagicLinkUrl(deps.issuer, tokenId, verifier),
      expiresInMinutes: Math.round(deps.config.magicLinkTtlSeconds / 60),
      correlationId: input.correlationId
    })
    .catch(error => deps.onError?.(error, { stage: 'magic_link_dispatch', tokenId }))

  return { tokenId }
}

export type ConsumeMagicLinkResult =
  | { status: 'authenticated'; session: CreatePersonSessionResult; returnTo: string | null }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'already_used' }
  | { status: 'access_revoked' }
  | { status: 'rate_limited'; retryAfterSeconds: number }

/** `<tokenId>.<verificador>`; cualquier otra forma es inválida sin tocar la base. */
export const parseMagicLinkToken = (raw: string): { tokenId: string; verifier: string } | null => {
  const separator = raw.indexOf('.')

  if (separator <= 0) return null

  const tokenId = raw.slice(0, separator)
  const verifier = raw.slice(separator + 1)

  if (!/^[0-9a-f-]{36}$/i.test(tokenId) || !/^[A-Za-z0-9_-]{16,128}$/.test(verifier)) return null

  return { tokenId, verifier }
}

export const consumeMagicLink = async (
  deps: MagicLinkDeps,
  input: {
    token: string
    ipHash: string | null
    ipValue: string | null
    userAgentHash: string | null
    correlationId: string | null
  }
): Promise<ConsumeMagicLinkResult> => {
  const now = deps.now()

  const ipDecision = await enforceRateLimit({
    store: deps.store,
    config: deps.config,
    rule: MAGIC_LINK_CONSUME_IP_RULE,
    value: input.ipValue,
    now
  })

  if (!ipDecision.allowed) {
    return { status: 'rate_limited', retryAfterSeconds: ipDecision.retryAfterSeconds }
  }

  const recordAttempt = (outcome: 'success' | 'rejected', reasonCode: string | null, subject: string | null) =>
    deps.store.recordAttempt({
      method: 'magic_link',
      stage: 'consume',
      outcome,
      reasonCode,
      environmentId: deps.environmentId,
      subjectHash: subject ? sha256Hex(subject) : null,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
      correlationId: input.correlationId,
      details: {}
    })

  const parsed = parseMagicLinkToken(input.token)

  if (!parsed) {
    await recordAttempt('rejected', 'malformed_token', null)

    return { status: 'invalid' }
  }

  const claimed = await deps.store.claimMagicLink({
    tokenId: parsed.tokenId,
    now,
    consumedIpHash: input.ipHash
  })

  if (claimed.status === 'not_found') {
    await recordAttempt('rejected', 'unknown_token', null)

    return { status: 'invalid' }
  }

  if (claimed.status === 'already_consumed') {
    await recordAttempt('rejected', 'already_used', null)

    return { status: 'already_used' }
  }

  if (claimed.status === 'expired') {
    await recordAttempt('rejected', 'expired', null)

    return { status: 'expired' }
  }

  const record = claimed.record

  // El enlace YA quedó consumido: un verificador equivocado sobre un `tokenId` válido lo quema. Es la
  // respuesta segura a un sondeo, y no hay oráculo de adivinanza que aprovechar.
  if (!safeEquals(sha256Hex(parsed.verifier), record.tokenHash)) {
    await recordAttempt('rejected', 'verifier_mismatch', record.subject)

    return { status: 'invalid' }
  }

  const person = await deps.directory.findBySubject({
    environmentId: deps.environmentId,
    subject: record.subject
  })

  // El acceso pudo revocarse entre la emisión y el consumo: la sesión sólo nace sobre un link vivo.
  if (!person) {
    await recordAttempt('rejected', 'source_link_inactive', record.subject)

    return { status: 'access_revoked' }
  }

  const session = await createPersonSession({
    store: deps.store,
    config: deps.config,
    now,
    input: {
      subject: person.subject,
      environmentId: deps.environmentId,
      profileId: person.profileId,
      linkId: person.linkId,
      amr: ['magic_link'] satisfies PersonAuthAmr[],
      authTime: now,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
      correlationId: input.correlationId
    }
  })

  await recordAttempt('success', null, person.subject)

  return { status: 'authenticated', session, returnTo: record.returnTo }
}
