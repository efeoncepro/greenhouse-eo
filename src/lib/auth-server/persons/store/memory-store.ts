/**
 * Store en memoria del dominio de personas (TASK-1830).
 *
 * Existe para ejercitar el FLUJO COMPLETO contra el handler real en Vitest, sin PG. No sustituye al
 * smoke contra PostgreSQL: los mocks ejercitan el TS, nunca el SQL.
 */

import type {
  ClaimMagicLinkResult,
  MagicLinkRecord,
  PersonAuthAttemptEvent,
  PersonSessionRecord,
  PersonSessionWithLink,
  RateLimitDecision
} from '../types'
import { computeLockoutSeconds } from '../rate-limit'
import type { PersonAuthStorePort } from './port'

type LinkState = { linkId: string; subject: string; sourceSystem: string; active: boolean }

type BucketState = { windowStartedAt: Date; hitCount: number; lockoutCount: number; lockedUntil: Date | null }

export class InMemoryPersonAuthStore implements PersonAuthStorePort {
  readonly sessions = new Map<string, PersonSessionRecord>()
  readonly magicLinks = new Map<string, MagicLinkRecord>()
  readonly attempts: PersonAuthAttemptEvent[] = []
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

  async revokeSession({ sessionHash, now, reason }: { sessionHash: string; now: Date; reason: string }): Promise<number> {
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

  async recordAttempt(event: PersonAuthAttemptEvent): Promise<void> {
    this.attempts.push({ ...event })
  }
}
