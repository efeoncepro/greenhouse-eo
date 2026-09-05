/**
 * Store en memoria del dominio de personas (TASK-1830).
 *
 * Existe para ejercitar el FLUJO COMPLETO contra el handler real en Vitest, sin PG. No sustituye al
 * smoke contra PostgreSQL: los mocks ejercitan el TS, nunca el SQL.
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
import { computeLockoutSeconds } from '../rate-limit'
import type { PersonAuthStorePort } from './port'

type LinkState = { linkId: string; subject: string; sourceSystem: string; active: boolean }

type BucketState = { windowStartedAt: Date; hitCount: number; lockoutCount: number; lockedUntil: Date | null }

export class InMemoryPersonAuthStore implements PersonAuthStorePort {
  readonly sessions = new Map<string, PersonSessionRecord>()
  readonly magicLinks = new Map<string, MagicLinkRecord>()
  readonly attempts: PersonAuthAttemptEvent[] = []
  readonly passkeys = new Map<string, PasskeyCredentialRecord>()
  readonly challenges = new Map<string, PasskeyChallengeRecord>()
  readonly totpEnrollments = new Map<string, TotpEnrollmentRecord>()
  readonly totpBackupCodes = new Map<string, { environmentId: string; subject: string; consumedAt: Date | null }>()
  private readonly buckets = new Map<string, BucketState>()
  /** Espejo del estado de `identity_profile_source_links` que la implementación PG resuelve por JOIN. */
  readonly links = new Map<string, LinkState>()

  registerLink(link: LinkState): void {
    this.links.set(link.linkId, link)
  }

  async insertSession(record: PersonSessionRecord): Promise<void> {
    this.sessions.set(record.sessionHash, { ...record, amr: [...record.amr] })
  }

  async getSessionWithLink(sessionHash: string): Promise<PersonSessionWithLink | null> {
    const session = this.sessions.get(sessionHash)

    if (!session) return null

    const link = this.links.get(session.linkId)

    // La implementación PG hace INNER JOIN contra una FK: sin link no hay fila.
    if (!link) return null

    return {
      session: { ...session, amr: [...session.amr] },
      linkActive: link.active,
      linkSubject: link.subject,
      linkSourceSystem: link.sourceSystem
    }
  }

  async touchSession({
    sessionHash,
    lastSeenAt,
    expiresAt
  }: {
    sessionHash: string
    lastSeenAt: Date
    expiresAt: Date
  }): Promise<void> {
    const session = this.sessions.get(sessionHash)

    if (!session || session.revokedAt) return

    session.lastSeenAt = lastSeenAt
    session.expiresAt = expiresAt < session.absoluteExpiresAt ? expiresAt : session.absoluteExpiresAt
  }

  async recordBoundSessionStepUp(input: {
    sessionHash: string
    subject: string
    environmentId: string
    profileId: string
    linkId: string
    stepUpAt: Date
    amr: readonly string[]
  }): Promise<boolean> {
    const session = this.sessions.get(input.sessionHash)
    const link = session ? this.links.get(session.linkId) : null

    if (
      !session ||
      session.revokedAt ||
      session.subject !== input.subject ||
      session.environmentId !== input.environmentId ||
      session.profileId !== input.profileId ||
      session.linkId !== input.linkId ||
      session.expiresAt <= input.stepUpAt ||
      session.absoluteExpiresAt <= input.stepUpAt ||
      !link?.active ||
      link.subject !== session.subject ||
      link.sourceSystem !== `external_idp:${session.environmentId}`
    )
      return false
    session.stepUpAt = input.stepUpAt
    session.amr = Array.from(new Set([...session.amr, ...input.amr])) as PersonSessionRecord['amr']

    return true
  }

  async recordSessionStepUp({
    sessionHash,
    stepUpAt,
    amr
  }: {
    sessionHash: string
    stepUpAt: Date
    amr: readonly string[]
  }): Promise<void> {
    const session = this.sessions.get(sessionHash)

    if (!session || session.revokedAt) return

    session.stepUpAt = stepUpAt
    session.amr = Array.from(new Set([...session.amr, ...amr])) as PersonSessionRecord['amr']
  }

  async revokeSession({
    sessionHash,
    now,
    reason
  }: {
    sessionHash: string
    now: Date
    reason: string
  }): Promise<number> {
    const session = this.sessions.get(sessionHash)

    if (!session || session.revokedAt) return 0

    session.revokedAt = now
    session.revokeReason = reason

    return 1
  }

  async revokeSessionsForSubject({
    environmentId,
    subject,
    now,
    reason
  }: {
    environmentId: string
    subject: string
    now: Date
    reason: string
  }): Promise<number> {
    let revoked = 0

    for (const session of this.sessions.values()) {
      if (session.environmentId !== environmentId || session.subject !== subject || session.revokedAt) continue

      session.revokedAt = now
      session.revokeReason = reason
      revoked += 1
    }

    return revoked
  }

  async insertMagicLink(record: MagicLinkRecord): Promise<void> {
    this.magicLinks.set(record.tokenId, { ...record })
  }

  async claimMagicLink({
    tokenId,
    now,
    consumedIpHash
  }: {
    tokenId: string
    now: Date
    consumedIpHash: string | null
  }): Promise<ClaimMagicLinkResult> {
    const record = this.magicLinks.get(tokenId)

    if (!record) return { status: 'not_found' }
    if (record.consumedAt) return { status: 'already_consumed' }
    if (record.expiresAt <= now) return { status: 'expired' }

    record.consumedAt = now
    record.consumedIpHash = consumedIpHash

    return { status: 'claimed', record: { ...record } }
  }

  async hitRateLimitBucket({
    bucketKey,
    now,
    windowSeconds,
    limit,
    lockoutBaseSeconds,
    lockoutMaxSeconds
  }: {
    bucketKey: string
    now: Date
    windowSeconds: number
    limit: number
    lockoutBaseSeconds: number
    lockoutMaxSeconds: number
  }): Promise<RateLimitDecision> {
    const bucket = this.buckets.get(bucketKey) ?? {
      windowStartedAt: now,
      hitCount: 0,
      lockoutCount: 0,
      lockedUntil: null
    }

    const windowExpired = bucket.windowStartedAt.getTime() <= now.getTime() - windowSeconds * 1000

    if (windowExpired) {
      bucket.windowStartedAt = now
      bucket.hitCount = 1
    } else {
      bucket.hitCount += 1
    }

    if (bucket.lockedUntil && bucket.lockedUntil <= now) bucket.lockedUntil = null

    this.buckets.set(bucketKey, bucket)

    if (bucket.lockedUntil && bucket.lockedUntil > now) {
      return {
        allowed: false,
        reason: 'locked_out',
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.lockedUntil.getTime() - now.getTime()) / 1000))
      }
    }

    if (bucket.hitCount <= limit) return { allowed: true, hits: bucket.hitCount }

    bucket.lockoutCount += 1

    const lockoutSeconds = computeLockoutSeconds(bucket.lockoutCount, lockoutBaseSeconds, lockoutMaxSeconds)

    bucket.lockedUntil = new Date(now.getTime() + lockoutSeconds * 1000)

    return { allowed: false, reason: 'window_exceeded', retryAfterSeconds: lockoutSeconds }
  }

  // ─── Passkeys ─────────────────────────────────────────────────────────────

  async insertPasskeyChallenge(record: PasskeyChallengeRecord): Promise<void> {
    this.challenges.set(record.challengeHash, { ...record })
  }

  async claimPasskeyChallenge({
    challengeHash,
    now
  }: {
    challengeHash: string
    now: Date
  }): Promise<ClaimPasskeyChallengeResult> {
    const record = this.challenges.get(challengeHash)

    if (!record) return { status: 'not_found' }
    if (record.consumedAt) return { status: 'already_consumed' }
    if (record.expiresAt <= now) return { status: 'expired' }

    record.consumedAt = now

    return { status: 'claimed', record: { ...record } }
  }

  async insertPasskeyCredential(record: PasskeyCredentialRecord): Promise<void> {
    const active = [...this.passkeys.values()].filter(
      credential =>
        credential.environmentId === record.environmentId &&
        credential.subject === record.subject &&
        !credential.revokedAt &&
        credential.credentialId !== record.credentialId
    )

    // Espejo del trigger de PG: el tope vive en la base, y acá para que el flujo lo ejercite igual.
    if (active.length >= 5) throw new Error('passkey credential limit reached for this subject (max 5, TASK-1830)')

    this.passkeys.set(record.credentialId, { ...record })
  }

  async getPasskeyCredential(credentialId: string): Promise<PasskeyCredentialRecord | null> {
    const record = this.passkeys.get(credentialId)

    return record ? { ...record } : null
  }

  async listPasskeyCredentials({
    environmentId,
    subject
  }: {
    environmentId: string
    subject: string
  }): Promise<PasskeyCredentialRecord[]> {
    return [...this.passkeys.values()]
      .filter(
        credential =>
          credential.environmentId === environmentId && credential.subject === subject && !credential.revokedAt
      )
      .map(credential => ({ ...credential }))
  }

  async updatePasskeyCounter({
    credentialId,
    counter,
    lastUsedAt
  }: {
    credentialId: string
    counter: number
    lastUsedAt: Date
  }): Promise<void> {
    const record = this.passkeys.get(credentialId)

    if (!record || record.revokedAt) return

    record.counter = counter
    record.lastUsedAt = lastUsedAt
  }

  async revokePasskeyCredential({
    credentialId,
    now,
    reason
  }: {
    credentialId: string
    now: Date
    reason: string
  }): Promise<number> {
    const record = this.passkeys.get(credentialId)

    if (!record || record.revokedAt) return 0

    record.revokedAt = now
    record.revokeReason = reason

    return 1
  }

  // ─── TOTP ─────────────────────────────────────────────────────────────────

  private totpKey(environmentId: string, subject: string): string {
    return `${environmentId}|${subject}`
  }

  async getTotpEnrollment({
    environmentId,
    subject
  }: {
    environmentId: string
    subject: string
  }): Promise<TotpEnrollmentRecord | null> {
    const record = this.totpEnrollments.get(this.totpKey(environmentId, subject))

    return record ? { ...record } : null
  }

  async upsertTotpEnrollment(record: TotpEnrollmentRecord): Promise<void> {
    this.totpEnrollments.set(this.totpKey(record.environmentId, record.subject), { ...record })
  }

  async markTotpVerified({
    environmentId,
    subject,
    lastUsedStep,
    lastVerifiedAt,
    confirm
  }: {
    environmentId: string
    subject: string
    lastUsedStep: number | null
    lastVerifiedAt: Date
    confirm: boolean
  }): Promise<void> {
    const record = this.totpEnrollments.get(this.totpKey(environmentId, subject))

    if (!record || record.status === 'revoked') return

    record.lastUsedStep = lastUsedStep
    record.lastVerifiedAt = lastVerifiedAt

    if (confirm) {
      record.status = 'active'
      record.confirmedAt = record.confirmedAt ?? lastVerifiedAt
    }
  }

  async revokeTotpEnrollment({
    environmentId,
    subject,
    now,
    reason
  }: {
    environmentId: string
    subject: string
    now: Date
    reason: string
  }): Promise<number> {
    const record = this.totpEnrollments.get(this.totpKey(environmentId, subject))

    if (!record || record.status === 'revoked') return 0

    record.status = 'revoked'
    record.revokedAt = now
    record.revokeReason = reason

    return 1
  }

  async replaceTotpBackupCodes({
    environmentId,
    subject,
    codeHashes
  }: {
    environmentId: string
    subject: string
    codeHashes: readonly string[]
    createdAt: Date
  }): Promise<void> {
    for (const [hash, record] of this.totpBackupCodes) {
      if (record.environmentId === environmentId && record.subject === subject) this.totpBackupCodes.delete(hash)
    }

    for (const hash of codeHashes) {
      this.totpBackupCodes.set(hash, { environmentId, subject, consumedAt: null })
    }
  }

  async consumeTotpBackupCode({
    environmentId,
    subject,
    codeHash,
    now
  }: {
    environmentId: string
    subject: string
    codeHash: string
    now: Date
    consumedIpHash: string | null
  }): Promise<boolean> {
    const record = this.totpBackupCodes.get(codeHash)

    if (!record || record.environmentId !== environmentId || record.subject !== subject || record.consumedAt) {
      return false
    }

    record.consumedAt = now

    return true
  }

  async countOpenTotpBackupCodes({
    environmentId,
    subject
  }: {
    environmentId: string
    subject: string
  }): Promise<number> {
    return [...this.totpBackupCodes.values()].filter(
      record => record.environmentId === environmentId && record.subject === subject && !record.consumedAt
    ).length
  }

  async recordAttempt(event: PersonAuthAttemptEvent): Promise<void> {
    this.attempts.push({ ...event })
  }
}
