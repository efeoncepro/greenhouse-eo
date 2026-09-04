/**
 * Implementación en memoria del `OAuthStorePort` (TASK-1829).
 *
 * Sólo para tests y smoke local: reproduce la semántica atómica del store PostgreSQL (un code se
 * consume una vez; un refresh rotado/revocado reporta `reused`). No es un runtime.
 */

import { generateOpaqueId } from '../primitives'
import type {
  AccessTokenRecord,
  AuthorizationCodeRecord,
  CimdCacheRecord,
  ClientConsentRecord,
  ConsumeAuthorizationCodeResult,
  CountAuditEventsInput,
  OAuthAuditEvent,
  OAuthAuditEventRecord,
  OAuthClientRecord,
  OAuthStorePort,
  RefreshTokenRecord,
  RevokeGrantResult,
  RotateRefreshTokenResult
} from './port'

const clone = <T>(value: T): T => structuredClone(value)

export class InMemoryOAuthStore implements OAuthStorePort {
  readonly clients = new Map<string, OAuthClientRecord>()
  readonly cimd = new Map<string, CimdCacheRecord>()
  readonly codes = new Map<string, AuthorizationCodeRecord>()
  readonly refreshTokens = new Map<string, RefreshTokenRecord>()
  readonly accessTokens = new Map<string, AccessTokenRecord>()
  readonly consents: ClientConsentRecord[] = []
  readonly audit: OAuthAuditEventRecord[] = []

  async getClient(clientId: string) {
    const row = this.clients.get(clientId)

    return row ? clone(row) : null
  }

  async upsertClient(record: OAuthClientRecord) {
    this.clients.set(record.clientId, clone(record))
  }

  async getCimdCache(clientIdUrl: string) {
    const row = this.cimd.get(clientIdUrl)

    return row ? clone(row) : null
  }

  async putCimdCache(record: CimdCacheRecord) {
    this.cimd.set(record.clientIdUrl, clone(record))
  }

  async insertAuthorizationCode(record: AuthorizationCodeRecord) {
    if (this.codes.has(record.codeHash)) throw new Error('duplicate authorization code hash')
    this.codes.set(record.codeHash, clone(record))
  }

  async consumeAuthorizationCode({ codeHash, now }: { codeHash: string; now: Date }): Promise<ConsumeAuthorizationCodeResult> {
    const row = this.codes.get(codeHash)

    if (!row) return { status: 'not_found' }
    if (row.consumedAt) return { status: 'already_consumed', code: clone(row) }
    if (row.expiresAt.getTime() <= now.getTime()) return { status: 'expired', code: clone(row) }

    row.consumedAt = now

    return { status: 'consumed', code: clone(row) }
  }

  async insertRefreshToken(record: RefreshTokenRecord) {
    if (this.refreshTokens.has(record.tokenHash)) throw new Error('duplicate refresh token hash')
    this.refreshTokens.set(record.tokenHash, clone(record))
  }

  async getRefreshToken(tokenHash: string) {
    const row = this.refreshTokens.get(tokenHash)

    return row ? clone(row) : null
  }

  async rotateRefreshToken({
    tokenHash,
    now,
    next,
    accessToken
  }: {
    tokenHash: string
    now: Date
    next: RefreshTokenRecord
    accessToken: AccessTokenRecord
  }): Promise<RotateRefreshTokenResult> {
    const row = this.refreshTokens.get(tokenHash)

    if (!row) return { status: 'not_found' }
    if (row.status === 'rotated') return { status: 'reused', previous: clone(row) }
    if (row.status === 'revoked') return { status: 'revoked', previous: clone(row) }

    if (row.expiresAt.getTime() <= now.getTime() || row.absoluteExpiresAt.getTime() <= now.getTime()) {
      return { status: 'expired', previous: clone(row) }
    }

    row.status = 'rotated'
    row.rotatedToHash = next.tokenHash
    row.usedAt = now
    this.refreshTokens.set(next.tokenHash, clone(next))
    this.accessTokens.set(accessToken.jti, clone(accessToken))

    return { status: 'rotated', previous: clone(row) }
  }

  async insertAccessToken(record: AccessTokenRecord) {
    if (this.accessTokens.has(record.jti)) throw new Error('duplicate jti')
    this.accessTokens.set(record.jti, clone(record))
  }

  async getAccessToken(jti: string) {
    const row = this.accessTokens.get(jti)

    return row ? clone(row) : null
  }

  private revokeWhere(
    predicateRefresh: (row: RefreshTokenRecord) => boolean,
    predicateAccess: (row: AccessTokenRecord) => boolean,
    now: Date,
    reason: string
  ): RevokeGrantResult {
    let refreshRevoked = 0
    let accessRevoked = 0

    for (const row of this.refreshTokens.values()) {
      if (row.status !== 'revoked' && predicateRefresh(row)) {
        row.status = 'revoked'
        row.revokedAt = now
        row.revokeReason = reason
        refreshRevoked += 1
      }
    }

    for (const row of this.accessTokens.values()) {
      if (!row.revokedAt && row.expiresAt.getTime() > now.getTime() && predicateAccess(row)) {
        row.revokedAt = now
        row.revokeReason = reason
        accessRevoked += 1
      }
    }

    return { refreshRevoked, accessRevoked }
  }

  async revokeGrant({ grantId, now, reason }: { grantId: string; now: Date; reason: string }) {
    return this.revokeWhere(row => row.grantId === grantId, row => row.grantId === grantId, now, reason)
  }

  async revokeGrantsForSubjectClient({
    subject,
    environmentId,
    clientId,
    now,
    reason
  }: {
    subject: string
    environmentId: string
    clientId: string
    now: Date
    reason: string
  }) {
    const match = (row: { subject: string; environmentId: string; clientId: string }) =>
      row.subject === subject && row.environmentId === environmentId && row.clientId === clientId

    return this.revokeWhere(match, match, now, reason)
  }

  async listActiveConsents({ subject, environmentId, clientId }: { subject: string; environmentId: string; clientId: string }) {
    return this.consents
      .filter(
        row =>
          row.status === 'active' &&
          row.subject === subject &&
          row.environmentId === environmentId &&
          row.clientId === clientId
      )
      .map(clone)
  }

  async grantConsents({
    subject,
    environmentId,
    clientId,
    scopes,
    grantedVia,
    grantedBy,
    now
  }: {
    subject: string
    environmentId: string
    clientId: string
    scopes: readonly string[]
    grantedVia: string
    grantedBy: string
    now: Date
  }) {
    const active = await this.listActiveConsents({ subject, environmentId, clientId })
    const existing = new Set(active.map(row => row.scope))

    for (const scope of new Set(scopes)) {
      if (existing.has(scope)) continue

      this.consents.push({
        consentId: `cst-${generateOpaqueId()}`,
        subject,
        environmentId,
        clientId,
        scope,
        status: 'active',
        grantedVia,
        grantedBy,
        grantedAt: now,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null
      })
    }

    return this.listActiveConsents({ subject, environmentId, clientId })
  }

  async revokeConsents({
    subject,
    environmentId,
    clientId,
    scopes,
    revokedBy,
    reason,
    now
  }: {
    subject: string
    environmentId: string
    clientId: string
    scopes: readonly string[] | null
    revokedBy: string
    reason: string
    now: Date
  }) {
    const target = scopes ? new Set(scopes) : null
    let count = 0

    for (const row of this.consents) {
      if (
        row.status === 'active' &&
        row.subject === subject &&
        row.environmentId === environmentId &&
        row.clientId === clientId &&
        (!target || target.has(row.scope))
      ) {
        row.status = 'revoked'
        row.revokedAt = now
        row.revokedBy = revokedBy
        row.revokeReason = reason
        count += 1
      }
    }

    return count
  }

  async recordAuditEvent(event: OAuthAuditEvent) {
    this.audit.push({ ...clone(event), eventId: `oae-${generateOpaqueId()}`, occurredAt: new Date() })
  }

  async countAuditEvents({ eventTypes, since, ipHash, clientId, outcome }: CountAuditEventsInput) {
    const types = new Set(eventTypes)

    return this.audit.filter(
      row =>
        types.has(row.eventType) &&
        row.occurredAt.getTime() >= since.getTime() &&
        (ipHash === undefined || row.ipHash === ipHash) &&
        (clientId === undefined || row.clientId === clientId) &&
        (outcome === undefined || row.outcome === outcome)
    ).length
  }
}
