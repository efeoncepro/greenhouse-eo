/**
 * Tipos del dominio de autenticación de personas del emisor (TASK-1830).
 *
 * Sin `server-only` y sin DB: se bundlean en `services/auth-server` y se prueban en Vitest sin mocks.
 */

/** Métodos de autenticación reconocidos por el ledger y por `amr`. */
export type PersonAuthMethod = 'magic_link' | 'passkey' | 'totp' | 'invitation' | 'session' | 'recovery'

export type PersonAuthStage = 'request' | 'consume' | 'register' | 'authenticate' | 'verify' | 'resolve' | 'revoke'

export type PersonAuthOutcome = 'success' | 'rejected' | 'failure' | 'rate_limited'

/**
 * Valores de `amr` (RFC 8176 en espíritu). `uv` sólo se escribe cuando la aserción WebAuthn trae el
 * flag de user verification REAL; jamás porque el cliente lo declare.
 */
export type PersonAuthAmr = 'magic_link' | 'passkey' | 'uv' | 'totp' | 'invitation'

export type PersonSessionRecord = {
  /** sha256 hex del id de sesión. El id crudo sólo vive en la cookie del navegador. */
  sessionHash: string
  subject: string
  environmentId: string
  profileId: string
  /** Source link `external_idp:<environment>` que sostiene esta sesión. */
  linkId: string
  amr: PersonAuthAmr[]
  authTime: Date
  stepUpAt: Date | null
  createdAt: Date
  lastSeenAt: Date
  expiresAt: Date
  absoluteExpiresAt: Date
  revokedAt: Date | null
  revokeReason: string | null
  ipHash: string | null
  userAgentHash: string | null
  correlationId: string | null
}

/** Sesión + estado VIVO del source link, resuelto en la misma consulta. */
export type PersonSessionWithLink = {
  session: PersonSessionRecord
  /** `false` cuando el operador revocó el acceso: la sesión muere en este request. */
  linkActive: boolean
  /** Sujeto que el link declara hoy; distinto del de la sesión ⇒ la sesión no es de esa persona. */
  linkSubject: string
  linkSourceSystem: string
}

export type MagicLinkRecord = {
  tokenId: string
  /** sha256 hex del verificador. El verificador crudo sólo viaja en el correo. */
  tokenHash: string
  environmentId: string
  subject: string
  /** sha256 hex del correo en minúsculas. El correo NUNCA se persiste en claro acá. */
  emailHash: string
  returnTo: string | null
  requestedAt: Date
  expiresAt: Date
  consumedAt: Date | null
  requestedIpHash: string | null
  consumedIpHash: string | null
  userAgentHash: string | null
  correlationId: string | null
}

export type ClaimMagicLinkResult =
  | { status: 'claimed'; record: MagicLinkRecord }
  | { status: 'already_consumed' }
  | { status: 'expired' }
  | { status: 'not_found' }

export type PersonAuthAttemptEvent = {
  method: PersonAuthMethod
  stage: PersonAuthStage
  outcome: PersonAuthOutcome
  reasonCode: string | null
  environmentId: string | null
  /** sha256 truncado del sujeto; el `sub` crudo NUNCA entra al ledger. */
  subjectHash: string | null
  ipHash: string | null
  userAgentHash: string | null
  correlationId: string | null
  details: Record<string, unknown>
}

/** Dimensión sobre la que se cuenta un límite. La llave siempre lleva el valor hasheado. */
export type RateLimitDimension = 'ip' | 'subject' | 'email'

export type RateLimitRule = {
  /** Prefijo de la acción, en `snake_case` (parte del CHECK de `bucket_key`). */
  action: string
  dimension: RateLimitDimension
  windowSeconds: number
  /** Intentos permitidos dentro de la ventana antes de bloquear. */
  limit: number
}

export type RateLimitDecision =
  | { allowed: true; hits: number }
  | { allowed: false; retryAfterSeconds: number; reason: 'window_exceeded' | 'locked_out' }

// ─── Passkeys (WebAuthn) ──────────────────────────────────────────────────────

export type PasskeyCredentialRecord = {
  /** `credential_id` en base64url tal como lo devuelve el navegador. */
  credentialId: string
  environmentId: string
  subject: string
  /**
   * Clave PÚBLICA en formato COSE. La privada nunca sale del autenticador.
   * `Uint8Array<ArrayBuffer>` explícito: `@simplewebauthn/server` no acepta el `ArrayBufferLike`
   * genérico, y dejarlo implícito rompe el typecheck recién en el callsite.
   */
  publicKey: Uint8Array<ArrayBuffer>
  /** Contador anti-clonación. Muchos passkeys modernos reportan siempre 0: eso NO es regresión. */
  counter: number
  transports: string[]
  deviceName: string | null
  deviceType: 'singleDevice' | 'multiDevice' | null
  backedUp: boolean
  aaguid: string | null
  createdAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
  revokeReason: string | null
}

export type PasskeyChallengePurpose = 'registration' | 'authentication'

export type PasskeyChallengeRecord = {
  /** sha256 hex del reto; el valor crudo vive en el navegador durante la ceremonia. */
  challengeHash: string
  purpose: PasskeyChallengePurpose
  environmentId: string
  /** `null` sólo en autenticación con credenciales descubribles. */
  subject: string | null
  createdAt: Date
  expiresAt: Date
  consumedAt: Date | null
  ipHash: string | null
  correlationId: string | null
}

export type ClaimPasskeyChallengeResult =
  | { status: 'claimed'; record: PasskeyChallengeRecord }
  | { status: 'already_consumed' }
  | { status: 'expired' }
  | { status: 'not_found' }

/** Lo que la ASERCIÓN dice del factor. `userVerified` viene de los flags firmados, no del cliente. */
export type PasskeyAmrFactors = {
  userVerified: boolean
}

// ─── TOTP ─────────────────────────────────────────────────────────────────────

export type TotpEnrollmentStatus = 'pending' | 'active' | 'revoked'

export type TotpEnrollmentRecord = {
  environmentId: string
  subject: string
  /** Ciphertext de KMS. El secreto en claro NUNCA se persiste, ni transitoriamente. */
  secretCiphertext: Uint8Array<ArrayBuffer>
  kmsKeyName: string
  status: TotpEnrollmentStatus
  /** Último paso de tiempo aceptado: un código no se acepta dos veces (anti-replay). */
  lastUsedStep: number | null
  createdAt: Date
  confirmedAt: Date | null
  lastVerifiedAt: Date | null
  revokedAt: Date | null
  revokeReason: string | null
}
