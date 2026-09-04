/**
 * Port de persistencia de la autenticación de personas (TASK-1830).
 *
 * Mismo contrato que el store OAuth de `TASK-1829`: operaciones ATÓMICAS por diseño, no CRUD
 * genérico. `claimMagicLink` y `hitRateLimitBucket` encapsulan la escritura que decide una carrera;
 * la implementación en memoria sirve a los tests del flujo completo contra el handler real.
 */

import type {
  ClaimMagicLinkResult,
  ClaimPasskeyChallengeResult,
  MagicLinkRecord,
  PersonAuthAttemptEvent,
  PersonSessionRecord,
  PersonSessionWithLink,
  PasskeyChallengeRecord,
  PasskeyCredentialRecord,
  RateLimitDecision,
  TotpEnrollmentRecord
} from '../types'

export interface PersonAuthStorePort {
  // ─── Sesiones ─────────────────────────────────────────────────────────────
  insertSession(record: PersonSessionRecord): Promise<void>
  /**
   * Sesión + estado del source link en UNA consulta: la validez de la sesión depende del link y
   * resolverlos por separado abre una ventana donde la sesión sobrevive a la revocación.
   */
  getSessionWithLink(sessionHash: string): Promise<PersonSessionWithLink | null>
  /** Renovación de la ventana deslizante; el caller decide cuándo, para no escribir en cada request. */
  touchSession(input: { sessionHash: string; lastSeenAt: Date; expiresAt: Date }): Promise<void>
  /** Marca un step-up verificado y fusiona el `amr` del factor usado. */
  recordSessionStepUp(input: { sessionHash: string; stepUpAt: Date; amr: readonly string[] }): Promise<void>
  revokeSession(input: { sessionHash: string; now: Date; reason: string }): Promise<number>
  revokeSessionsForSubject(input: {
    environmentId: string
    subject: string
    now: Date
    reason: string
  }): Promise<number>

  // ─── Magic link ───────────────────────────────────────────────────────────
  insertMagicLink(record: MagicLinkRecord): Promise<void>
  /**
   * Atómico: un magic link se consume exactamente una vez. El verificador NO se compara acá — el
   * caller lo hace en tiempo constante sobre el registro devuelto. Un verificador equivocado sobre
   * un `tokenId` válido deja el enlace igualmente consumido: es la respuesta segura a un sondeo.
   */
  claimMagicLink(input: { tokenId: string; now: Date; consumedIpHash: string | null }): Promise<ClaimMagicLinkResult>

  // ─── Anti-abuso ───────────────────────────────────────────────────────────
  /**
   * Upsert atómico de una fila por llave: cuenta dentro de la ventana y aplica bloqueo progresivo.
   * El bloqueo NO se puede derivar contando el ledger — tiene que sobrevivir aunque los intentos
   * paren, y eso es estado.
   */
  hitRateLimitBucket(input: {
    bucketKey: string
    now: Date
    windowSeconds: number
    limit: number
    lockoutBaseSeconds: number
    lockoutMaxSeconds: number
  }): Promise<RateLimitDecision>

  // ─── Passkeys ─────────────────────────────────────────────────────────────
  insertPasskeyChallenge(record: PasskeyChallengeRecord): Promise<void>
  /** Atómico: un reto WebAuthn sirve para UNA ceremonia. El replay no llega al verificador. */
  claimPasskeyChallenge(input: { challengeHash: string; now: Date }): Promise<ClaimPasskeyChallengeResult>
  insertPasskeyCredential(record: PasskeyCredentialRecord): Promise<void>
  getPasskeyCredential(credentialId: string): Promise<PasskeyCredentialRecord | null>
  listPasskeyCredentials(input: { environmentId: string; subject: string }): Promise<PasskeyCredentialRecord[]>
  updatePasskeyCounter(input: { credentialId: string; counter: number; lastUsedAt: Date }): Promise<void>
  revokePasskeyCredential(input: { credentialId: string; now: Date; reason: string }): Promise<number>

  // ─── TOTP ─────────────────────────────────────────────────────────────────
  getTotpEnrollment(input: { environmentId: string; subject: string }): Promise<TotpEnrollmentRecord | null>
  upsertTotpEnrollment(record: TotpEnrollmentRecord): Promise<void>
  /** `confirm` pasa `pending` → `active`: el código que prueba la copia del secreto lo activa. */
  markTotpVerified(input: {
    environmentId: string
    subject: string
    lastUsedStep: number | null
    lastVerifiedAt: Date
    confirm: boolean
  }): Promise<void>
  revokeTotpEnrollment(input: {
    environmentId: string
    subject: string
    now: Date
    reason: string
  }): Promise<number>
  /** Reemplaza el set completo: regenerar códigos invalida los anteriores, no los acumula. */
  replaceTotpBackupCodes(input: {
    environmentId: string
    subject: string
    codeHashes: readonly string[]
    createdAt: Date
  }): Promise<void>
  /** Atómico: un código de respaldo sirve UNA vez. `false` = no existía o ya se usó. */
  consumeTotpBackupCode(input: {
    environmentId: string
    subject: string
    codeHash: string
    now: Date
    consumedIpHash: string | null
  }): Promise<boolean>
  countOpenTotpBackupCodes(input: { environmentId: string; subject: string }): Promise<number>

  // ─── Ledger ───────────────────────────────────────────────────────────────
  recordAttempt(event: PersonAuthAttemptEvent): Promise<void>
}
