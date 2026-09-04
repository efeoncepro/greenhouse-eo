/**
 * TOTP como segundo factor del emisor (TASK-1830 Slice 3).
 *
 * No es un método de login: es el step-up que exige `authorize` para consentir un scope de
 * ESCRITURA. En el lane ecosystem el actor es la máquina, así que este —junto con el `uv` del
 * passkey— es el único gate de toda la cadena que depende de QUIÉN es la persona.
 *
 * `otplib` v13 (ESM nativo, verificado importando el paquete real antes de fijarlo; su API v12 con
 * `authenticator` ya no existe). Parámetros del ADR: 6 dígitos, paso 30 s, ventana ±1 —
 * `epochTolerance: 30` es esa ventana expresada en segundos.
 *
 * Dos defensas que el parámetro "ventana ±1" abre y hay que cerrar a mano:
 *
 * 1. **Replay.** Un código vive 30 s y la ventana lo estira a 90 s. Sin recordar el último paso
 *    aceptado, quien lo intercepte lo reusa dentro de esa ventana. Por eso `last_used_step`.
 * 2. **Fuerza bruta.** Seis dígitos son un millón de combinaciones y la ventana acepta tres a la
 *    vez. El límite por sujeto es lo que lo vuelve inviable, no la longitud del código.
 *
 * Los códigos de respaldo nacen de 128 bits y se guardan con sha256, no con un KDF lento: el
 * problema que el KDF resuelve —secretos de baja entropía— no existe con esa entropía. Un código de
 * respaldo corto sí lo necesitaría; por eso son largos, y no al revés.
 */

import { randomBytes } from 'node:crypto'

import { NobleCryptoPlugin, ScureBase32Plugin, TOTP } from 'otplib'

import { sha256Hex } from '../oauth/primitives'
import type { AuthServerPersonAuthConfig } from './config'
import { enforceRateLimit, TOTP_VERIFY_SUBJECT_RULE } from './rate-limit'
import type { PersonAuthStorePort } from './store/port'
import { isTotpCipherUnavailableError, type TotpSecretCipherPort } from './totp-cipher'
import type { PersonAuthAmr } from './types'

/** Alfabeto Crockford-ish sin caracteres que se confundan al dictar por teléfono (0/O, 1/I/L). */
const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'
const BACKUP_CODE_LENGTH = 26
const BACKUP_CODE_COUNT = 10
const BACKUP_CODE_GROUP = 5

const TOTP_DIGITS = 6
const TOTP_PERIOD_SECONDS = 30
/** Ventana ±1 paso, expresada en segundos como la pide la API v13. */
const TOTP_EPOCH_TOLERANCE_SECONDS = TOTP_PERIOD_SECONDS

const buildTotp = () =>
  new TOTP({
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS
  })

export type TotpDeps = {
  store: PersonAuthStorePort
  config: AuthServerPersonAuthConfig
  cipher: TotpSecretCipherPort
  environmentId: string
  now: () => Date
}

/**
 * 26 caracteres de un alfabeto de 30 ≈ 127 bits. Se agrupa de a 5 sólo para poder leerlo en voz
 * alta; los guiones no cuentan y se quitan al normalizar.
 */
export const generateBackupCode = (): string => {
  const bytes = randomBytes(BACKUP_CODE_LENGTH)
  let code = ''

  for (let index = 0; index < BACKUP_CODE_LENGTH; index += 1) {
    code += BACKUP_CODE_ALPHABET[bytes[index] % BACKUP_CODE_ALPHABET.length]
  }

  return (code.match(new RegExp(`.{1,${BACKUP_CODE_GROUP}}`, 'g')) ?? [code]).join('-')
}

/** Quien lo teclea no debe pelear con guiones ni mayúsculas: se normaliza antes de hashear. */
export const normalizeBackupCode = (value: string): string => value.replace(/[\s-]/g, '').toUpperCase()

export const hashBackupCode = (value: string): string => sha256Hex(normalizeBackupCode(value))

export type StartTotpEnrollmentResult =
  | {
      status: 'ready'
      /** Secreto base32 para el QR. Se muestra UNA vez y no vuelve a salir del servidor. */
      secret: string
      otpauthUri: string
      /** Códigos en claro: sólo en esta respuesta; en la base viven hasheados. */
      backupCodes: string[]
    }
  | { status: 'already_active' }
  | { status: 'envelope_unavailable' }

/**
 * Enrolar deja el secreto en `pending`: mientras la persona no confirme un código, NO es un segundo
 * factor. Sin ese estado intermedio, alguien que abandona el diálogo del QR se queda con un TOTP
 * que cree tener y no puede usar — y peor, que el sistema cree que tiene.
 */
export const startTotpEnrollment = async (
  deps: TotpDeps,
  input: { subject: string }
): Promise<StartTotpEnrollmentResult> => {
  const existing = await deps.store.getTotpEnrollment({
    environmentId: deps.environmentId,
    subject: input.subject
  })

  if (existing?.status === 'active') return { status: 'already_active' }

  const totp = buildTotp()
  const secret = totp.generateSecret()
  const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode)
  const now = deps.now()

  let encrypted: Awaited<ReturnType<TotpSecretCipherPort['encrypt']>>

  try {
    encrypted = await deps.cipher.encrypt({
      plaintext: new TextEncoder().encode(secret),
      environmentId: deps.environmentId,
      subject: input.subject
    })
  } catch (error) {
    // Falla cerrado: sin cifrado no se guarda el secreto en claro «por esta vez».
    if (isTotpCipherUnavailableError(error)) return { status: 'envelope_unavailable' }

    throw error
  }

  await deps.store.upsertTotpEnrollment({
    environmentId: deps.environmentId,
    subject: input.subject,
    secretCiphertext: encrypted.ciphertext,
    kmsKeyName: encrypted.keyName,
    status: 'pending',
    lastUsedStep: null,
    createdAt: now,
    confirmedAt: null,
    lastVerifiedAt: null,
    revokedAt: null,
    revokeReason: null
  })

  await deps.store.replaceTotpBackupCodes({
    environmentId: deps.environmentId,
    subject: input.subject,
    codeHashes: backupCodes.map(hashBackupCode),
    createdAt: now
  })

  return {
    status: 'ready',
    secret,
    otpauthUri: buildOtpauthUri({ secret, label: input.subject, issuer: deps.config.passkeyRelyingPartyName }),
    backupCodes
  }
}

/** URI `otpauth://` estándar para el QR. El `label` es el sujeto opaco, nunca el correo. */
export const buildOtpauthUri = ({
  secret,
  label,
  issuer
}: {
  secret: string
  label: string
  issuer: string
}): string =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}` +
  `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`

export type VerifyTotpResult =
  | { status: 'verified'; amr: PersonAuthAmr[]; usedBackupCode: boolean }
  | { status: 'invalid' }
  | { status: 'replayed' }
  | { status: 'not_enrolled' }
  | { status: 'envelope_unavailable' }
  | { status: 'rate_limited'; retryAfterSeconds: number }

/**
 * Verifica un código TOTP o uno de respaldo. `confirmEnrollment` convierte el `pending` en `active`:
 * el mismo código que prueba que la persona copió el secreto es el que lo activa.
 */
export const verifyTotp = async (
  deps: TotpDeps,
  input: {
    subject: string
    code: string
    confirmEnrollment?: boolean
    ipHash: string | null
    userAgentHash: string | null
    correlationId: string | null
  }
): Promise<VerifyTotpResult> => {
  const now = deps.now()

  // Seis dígitos con ventana ±1 aceptan tres códigos a la vez: lo que hace inviable la fuerza bruta
  // es el límite por sujeto, no la longitud del código.
  const decision = await enforceRateLimit({
    store: deps.store,
    config: deps.config,
    rule: TOTP_VERIFY_SUBJECT_RULE,
    value: input.subject,
    now
  })

  const record = (outcome: 'success' | 'rejected' | 'rate_limited', reasonCode: string | null) =>
    deps.store.recordAttempt({
      method: 'totp',
      stage: 'verify',
      outcome,
      reasonCode,
      environmentId: deps.environmentId,
      subjectHash: sha256Hex(input.subject),
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
      correlationId: input.correlationId,
      details: {}
    })

  if (!decision.allowed) {
    await record('rate_limited', decision.reason)

    return { status: 'rate_limited', retryAfterSeconds: decision.retryAfterSeconds }
  }

  const enrollment = await deps.store.getTotpEnrollment({
    environmentId: deps.environmentId,
    subject: input.subject
  })

  if (!enrollment || enrollment.status === 'revoked') {
    await record('rejected', 'not_enrolled')

    return { status: 'not_enrolled' }
  }

  // Un código de respaldo se acepta sólo sobre un enrolamiento YA activo: si el `pending` pudiera
  // activarse con un código de respaldo, nadie habría probado nunca que copió el secreto.
  if (enrollment.status === 'active') {
    const consumed = await deps.store.consumeTotpBackupCode({
      environmentId: deps.environmentId,
      subject: input.subject,
      codeHash: hashBackupCode(input.code),
      now,
      consumedIpHash: input.ipHash
    })

    if (consumed) {
      await deps.store.markTotpVerified({
        environmentId: deps.environmentId,
        subject: input.subject,
        lastUsedStep: enrollment.lastUsedStep,
        lastVerifiedAt: now,
        confirm: false
      })
      await record('success', 'backup_code')

      return { status: 'verified', amr: ['totp'], usedBackupCode: true }
    }
  }

  let secret: string

  try {
    secret = new TextDecoder().decode(
      await deps.cipher.decrypt({
        ciphertext: enrollment.secretCiphertext,
        environmentId: deps.environmentId,
        subject: input.subject
      })
    )
  } catch (error) {
    if (isTotpCipherUnavailableError(error)) {
      await record('rejected', 'envelope_unavailable')

      // Degradación honesta: sin KMS no hay step-up, y por lo tanto no hay consentimiento de
      // escritura. Nunca «aceptar sin verificar».
      return { status: 'envelope_unavailable' }
    }

    throw error
  }

  // `epoch` va en SEGUNDOS y `epochTolerance` es opción de VERIFY, no del constructor: con el
  // valor en milisegundos la ventana cae en un futuro absurdo y nada verifica. Lo destapó el
  // typecheck sobre el constructor; el `/1000` no lo habría destapado nadie salvo un test con reloj.
  let verification: Awaited<ReturnType<TOTP['verify']>>

  try {
    verification = await buildTotp().verify(input.code.trim(), {
      secret,
      epoch: Math.floor(now.getTime() / 1000),
      epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS
    })
  } catch {
    // `otplib` LANZA con un token que no son 6 dígitos (`TokenLengthError`), y acá llega cualquier
    // cosa: un código de respaldo que no se consumió, un campo vacío, lo que teclee quien sea. Sin
    // este catch, un endpoint público de autenticación responde 500 en vez de rechazar.
    // Lo destaparon los tests de códigos de respaldo, no una revisión.
    await record('rejected', 'malformed_code')

    return { status: 'invalid' }
  }

  if (!verification.valid) {
    await record('rejected', 'invalid_code')

    return { status: 'invalid' }
  }

  const timeStep = verification.timeStep ?? Math.floor(now.getTime() / 1000 / TOTP_PERIOD_SECONDS)

  // Anti-replay: la ventana ±1 mantiene válido un código durante 90 s; sin esto, un código
  // interceptado sirve dos veces.
  if (enrollment.lastUsedStep !== null && timeStep <= enrollment.lastUsedStep) {
    await record('rejected', 'replayed')

    return { status: 'replayed' }
  }

  await deps.store.markTotpVerified({
    environmentId: deps.environmentId,
    subject: input.subject,
    lastUsedStep: timeStep,
    lastVerifiedAt: now,
    confirm: Boolean(input.confirmEnrollment) || enrollment.status === 'pending'
  })

  await record('success', null)

  return { status: 'verified', amr: ['totp'], usedBackupCode: false }
}
