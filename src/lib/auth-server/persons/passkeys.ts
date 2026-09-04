/**
 * Passkeys (WebAuthn) del emisor — método primario de autenticación (TASK-1830 Slice 2).
 *
 * Se usa `@simplewebauthn/server` y no una implementación propia por una razón concreta: verificar
 * una aserción exige parsear CBOR, decodificar claves COSE y validar firmas sobre datos que llegan
 * del navegador. Ahí escribir código propio es la opción exótica y peligrosa; la librería mantenida
 * es la aburrida.
 *
 * Dos decisiones que sostienen invariantes del ADR:
 *
 * 1. **Autenticación con credenciales descubribles, sin `allowCredentials`.** Pedir la lista de
 *    credenciales de un correo antes de autenticar convertiría el endpoint en un oráculo de
 *    existencia — justo lo que la anti-enumeración del magic link evita. El sujeto lo trae la
 *    aserción firmada, no el cliente.
 * 2. **`amr` sale de los flags REALES de la aserción.** `uv` sólo se escribe cuando el autenticador
 *    verificó a la persona de verdad. Es lo que decide el step-up de los scopes de escritura, y en
 *    el lane ecosystem el actor es la máquina: este es el único gate que depende de QUIÉN es.
 */

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse
} from '@simplewebauthn/server'

import { sha256Hex } from '../oauth/primitives'
import type { AuthServerPersonAuthConfig } from './config'
import type { PersonDirectoryPort } from './magic-link'
import { createPersonSession, type CreatePersonSessionResult } from './sessions'
import type { PersonAuthStorePort } from './store/port'
import type { PasskeyAmrFactors, PasskeyChallengeRecord, PersonAuthAmr } from './types'

export type PasskeyDeps = {
  store: PersonAuthStorePort
  config: AuthServerPersonAuthConfig
  directory: PersonDirectoryPort
  environmentId: string
  /** Origen exacto esperado en la ceremonia (`https://auth.efeonce.org`). */
  origin: string
  /** `rpId`: el HOST del emisor, sin esquema ni puerto. */
  rpId: string
  now: () => Date
}

/** `rpId` es el host desnudo; un `rpId` con esquema hace que el navegador rechace la ceremonia. */
export const deriveRpId = (issuer: string): string => new URL(issuer).hostname

export type StartPasskeyRegistrationInput = {
  subject: string
  displayName: string | null
  ipHash: string | null
  correlationId: string | null
}

export type StartPasskeyRegistrationResult =
  | { status: 'ready'; options: Awaited<ReturnType<typeof generateRegistrationOptions>> }
  | { status: 'limit_reached'; max: number }

export const startPasskeyRegistration = async (
  deps: PasskeyDeps,
  input: StartPasskeyRegistrationInput
): Promise<StartPasskeyRegistrationResult> => {
  const now = deps.now()

  const existing = await deps.store.listPasskeyCredentials({
    environmentId: deps.environmentId,
    subject: input.subject
  })

  if (existing.length >= deps.config.maxPasskeysPerPerson) {
    return { status: 'limit_reached', max: deps.config.maxPasskeysPerPerson }
  }

  const options = await generateRegistrationOptions({
    rpName: deps.config.passkeyRelyingPartyName,
    rpID: deps.rpId,
    // El `userID` es el sujeto opaco del emisor: nunca el correo ni el `profile_id`.
    userID: new TextEncoder().encode(input.subject),
    userName: input.displayName ?? input.subject,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    supportedAlgorithmIDs: [-7, -257],
    // Impide registrar dos veces el mismo autenticador para la misma persona.
    excludeCredentials: existing.map(credential => ({
      id: credential.credentialId,
      transports: credential.transports as never
    }))
  })

  await deps.store.insertPasskeyChallenge({
    challengeHash: sha256Hex(options.challenge),
    purpose: 'registration',
    environmentId: deps.environmentId,
    subject: input.subject,
    createdAt: now,
    expiresAt: new Date(now.getTime() + deps.config.passkeyChallengeTtlSeconds * 1000),
    consumedAt: null,
    ipHash: input.ipHash,
    correlationId: input.correlationId
  })

  return { status: 'ready', options }
}

/** Reto reclamado y coherente con la ceremonia que se está cerrando. */
const claimChallenge = async (
  deps: PasskeyDeps,
  input: { challenge: string; purpose: PasskeyChallengeRecord['purpose'] }
): Promise<PasskeyChallengeRecord | null> => {
  const claimed = await deps.store.claimPasskeyChallenge({
    challengeHash: sha256Hex(input.challenge),
    now: deps.now()
  })

  if (claimed.status !== 'claimed') return null
  if (claimed.record.purpose !== input.purpose) return null
  if (claimed.record.environmentId !== deps.environmentId) return null

  return claimed.record
}

export type FinishPasskeyRegistrationResult =
  | { status: 'registered'; credentialId: string }
  | { status: 'rejected'; reason: string }

export const finishPasskeyRegistration = async (
  deps: PasskeyDeps,
  input: {
    subject: string
    /** Reto que el cliente devuelve; se compara contra el reclamado, nunca se confía. */
    challenge: string
    response: Parameters<typeof verifyRegistrationResponse>[0]['response']
    deviceName: string | null
  }
): Promise<FinishPasskeyRegistrationResult> => {
  const challenge = await claimChallenge(deps, { challenge: input.challenge, purpose: 'registration' })

  if (!challenge) return { status: 'rejected', reason: 'challenge_invalid' }

  // El reto de registro pertenece a UNA persona: usarlo para otra es un intento de injerto.
  if (challenge.subject !== input.subject) return { status: 'rejected', reason: 'challenge_subject_mismatch' }

  let verification: VerifiedRegistrationResponse

  try {
    verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: input.challenge,
      expectedOrigin: deps.origin,
      expectedRPID: deps.rpId,
      requireUserVerification: false
    })
  } catch {
    return { status: 'rejected', reason: 'verification_failed' }
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { status: 'rejected', reason: 'not_verified' }
  }

  const info = verification.registrationInfo
  const now = deps.now()

  try {
    await deps.store.insertPasskeyCredential({
      credentialId: info.credential.id,
      environmentId: deps.environmentId,
      subject: input.subject,
      publicKey: info.credential.publicKey,
      counter: info.credential.counter,
      transports: [...(info.credential.transports ?? [])],
      deviceName: input.deviceName,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      aaguid: info.aaguid ?? null,
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
      revokeReason: null
    })
  } catch {
    // El trigger de PG rechaza pasar el tope aunque el chequeo de arriba se hubiera saltado.
    return { status: 'rejected', reason: 'limit_reached' }
  }

  return { status: 'registered', credentialId: info.credential.id }
}

export type StartPasskeyAuthenticationResult = {
  options: Awaited<ReturnType<typeof generateAuthenticationOptions>>
}

/**
 * Sin `allowCredentials` a propósito: pedirle al servidor la lista de credenciales de un correo
 * antes de autenticar sería un oráculo de existencia. La credencial la elige el autenticador.
 */
export const startPasskeyAuthentication = async (
  deps: PasskeyDeps,
  input: { ipHash: string | null; correlationId: string | null }
): Promise<StartPasskeyAuthenticationResult> => {
  const now = deps.now()

  const options = await generateAuthenticationOptions({
    rpID: deps.rpId,
    userVerification: 'preferred'
  })

  await deps.store.insertPasskeyChallenge({
    challengeHash: sha256Hex(options.challenge),
    purpose: 'authentication',
    environmentId: deps.environmentId,
    subject: null,
    createdAt: now,
    expiresAt: new Date(now.getTime() + deps.config.passkeyChallengeTtlSeconds * 1000),
    consumedAt: null,
    ipHash: input.ipHash,
    correlationId: input.correlationId
  })

  return { options }
}

export type FinishPasskeyAuthenticationResult =
  | { status: 'authenticated'; session: CreatePersonSessionResult; subject: string; amr: PersonAuthAmr[] }
  | { status: 'rejected'; reason: string }
  /** Contador que retrocede: la credencial queda invalidada y alguien tiene que mirar. */
  | { status: 'counter_regression'; credentialId: string; subject: string }
  | { status: 'access_revoked' }

/**
 * Un contador que retrocede significa que existen DOS autenticadores con la misma clave: uno clonado.
 * Un contador que se queda en 0 no significa nada — los passkeys sincronizados no lo incrementan. Por
 * eso la regla mira el par (almacenado, nuevo) y no sólo el nuevo.
 */
export const isCounterRegression = (storedCounter: number, newCounter: number): boolean =>
  storedCounter > 0 && newCounter <= storedCounter

export const finishPasskeyAuthentication = async (
  deps: PasskeyDeps,
  input: {
    challenge: string
    response: Parameters<typeof verifyAuthenticationResponse>[0]['response']
    ipHash: string | null
    userAgentHash: string | null
    correlationId: string | null
  }
): Promise<FinishPasskeyAuthenticationResult> => {
  const challenge = await claimChallenge(deps, { challenge: input.challenge, purpose: 'authentication' })

  if (!challenge) return { status: 'rejected', reason: 'challenge_invalid' }

  const credential = await deps.store.getPasskeyCredential(input.response.id)

  if (!credential || credential.revokedAt) return { status: 'rejected', reason: 'unknown_credential' }
  if (credential.environmentId !== deps.environmentId) return { status: 'rejected', reason: 'environment_mismatch' }

  let verification: VerifiedAuthenticationResponse

  try {
    verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: input.challenge,
      expectedOrigin: deps.origin,
      expectedRPID: deps.rpId,
      credential: {
        id: credential.credentialId,
        publicKey: credential.publicKey,
        // `counter: 0` A PROPÓSITO. Con el contador real, la librería LANZA cuando retrocede, y
        // entonces la regresión llega acá como un "no verificó" cualquiera: la credencial clonada
        // se quedaría VIVA y la señal nunca se dispararía. Detectado por el test del clon, que
        // exigía `counter_regression` y recibía `rejected`.
        //
        // Con 0 la librería omite SÓLO el chequeo del contador —la firma, el origen, el rpId y el
        // reto se verifican igual— y la política del contador la aplica el emisor abajo, sobre
        // datos YA verificados. Ese orden importa: revocar antes de verificar la firma convertiría
        // el endpoint en un botón de denegación de servicio para cualquiera que conozca un
        // `credential_id`.
        counter: 0,
        transports: credential.transports as never
      },
      requireUserVerification: false
    })
  } catch {
    return { status: 'rejected', reason: 'verification_failed' }
  }

  if (!verification.verified) return { status: 'rejected', reason: 'not_verified' }

  const now = deps.now()
  const { newCounter, userVerified } = verification.authenticationInfo

  if (isCounterRegression(credential.counter, newCounter)) {
    await deps.store.revokePasskeyCredential({
      credentialId: credential.credentialId,
      now,
      reason: 'counter_regression'
    })

    return { status: 'counter_regression', credentialId: credential.credentialId, subject: credential.subject }
  }

  // El acceso pudo revocarse desde el último uso: la sesión sólo nace sobre un link vivo.
  const person = await deps.directory.findBySubject({
    environmentId: deps.environmentId,
    subject: credential.subject
  })

  if (!person) return { status: 'access_revoked' }

  await deps.store.updatePasskeyCounter({
    credentialId: credential.credentialId,
    counter: newCounter,
    lastUsedAt: now
  })

  const amr = buildPasskeyAmr({ userVerified })

  const session = await createPersonSession({
    store: deps.store,
    config: deps.config,
    now,
    input: {
      subject: person.subject,
      environmentId: deps.environmentId,
      profileId: person.profileId,
      linkId: person.linkId,
      amr,
      authTime: now,
      // Un passkey con user verification real YA es segundo factor: abre la sesión en `step_up`.
      stepUp: userVerified,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
      correlationId: input.correlationId
    }
  })

  return { status: 'authenticated', session, subject: person.subject, amr }
}

/** `uv` SÓLO cuando la aserción lo trae. Nunca porque el cliente lo declare en el cuerpo. */
export const buildPasskeyAmr = ({ userVerified }: PasskeyAmrFactors): PersonAuthAmr[] =>
  userVerified ? ['passkey', 'uv'] : ['passkey']
