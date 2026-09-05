/** TASK-1836 — persistence adapters. Runtime uses canonical DB and envelope crypto ports. */
import { query } from '@/lib/db'

import type { InternalAuthorizationContext, InternalContextStorePort } from './context'
import type { InternalLoginTransaction, InternalLoginTransactionPort } from './oidc'

export type LoginEnvelopePort = {
  encrypt(plaintext: string, transactionId: string): Promise<string>
  decrypt(ciphertext: string, transactionId: string): Promise<string>
}

export class PostgresInternalLoginTransactions implements InternalLoginTransactionPort {
  constructor(private readonly envelope: LoginEnvelopePort) {}

  async insert(transaction: InternalLoginTransaction): Promise<void> {
    const encrypted = await this.envelope.encrypt(JSON.stringify(transaction), transaction.id)

    await query(
      `INSERT INTO greenhouse_auth.internal_login_transactions
         (transaction_id, browser_binding_hash, encrypted_payload, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [transaction.id, transaction.browserBindingHash, encrypted, transaction.createdAt, transaction.expiresAt]
    )
  }

  async consume(input: {
    id: string
    browserBindingHash: string
    now: Date
  }): Promise<InternalLoginTransaction | null> {
    const rows = await query<{ encrypted_payload: string }>(
      `UPDATE greenhouse_auth.internal_login_transactions SET consumed_at = $3
        WHERE transaction_id = $1 AND browser_binding_hash = $2
          AND consumed_at IS NULL AND expires_at > $3 AND created_at <= $3
       RETURNING encrypted_payload`,
      [input.id, input.browserBindingHash, input.now]
    )

    if (!rows[0]) return null

    const parsed = JSON.parse(
      await this.envelope.decrypt(rows[0].encrypted_payload, input.id)
    ) as InternalLoginTransaction

    if (
      parsed.id !== input.id ||
      parsed.browserBindingHash !== input.browserBindingHash ||
      typeof parsed.nonce !== 'string' ||
      typeof parsed.codeVerifier !== 'string' ||
      typeof parsed.returnTo !== 'string'
    )
      return null

    return { ...parsed, createdAt: new Date(parsed.createdAt), expiresAt: new Date(parsed.expiresAt) }
  }
}

type ContextRow = {
  context_id: string
  context_version: 1
  issuer: string
  environment_id: string
  subject: string
  profile_id: string
  client_id: string
  audience: string
  organization_id: string
  binding_id: string
  session_hash: string
  upstream_link_id: string
  auth_time: Date
  created_at: Date
  expires_at: Date
  revoked_at: Date | null
}

export class PostgresInternalContextStore implements InternalContextStorePort {
  async insert(c: InternalAuthorizationContext): Promise<InternalAuthorizationContext> {
    const rows = await query<{ context_id: string }>(
      `INSERT INTO greenhouse_auth.authorization_contexts
        (context_id, context_version, issuer, environment_id, subject, profile_id, client_id, audience,
         organization_id, binding_id, session_hash, upstream_link_id, auth_time, created_at, expires_at, revoked_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (session_hash, client_id, binding_id, issuer, audience) WHERE revoked_at IS NULL
       DO UPDATE SET context_id = greenhouse_auth.authorization_contexts.context_id
       RETURNING context_id`,
      [
        c.id,
        c.version,
        c.issuer,
        c.environmentId,
        c.subject,
        c.profileId,
        c.clientId,
        c.audience,
        c.organizationId,
        c.bindingId,
        c.sessionHash,
        c.upstreamLinkId,
        c.authTime,
        c.createdAt,
        c.expiresAt,
        c.revokedAt
      ]
    )

    const persisted = rows[0] ? await this.get(rows[0].context_id) : null

    if (!persisted) throw new Error('context_persistence_unavailable')

    return persisted
  }

  async get(id: string): Promise<InternalAuthorizationContext | null> {
    const rows = await query<ContextRow>(
      `SELECT context_id, context_version, issuer, environment_id, subject, profile_id, client_id, audience,
              organization_id, binding_id, session_hash, upstream_link_id, auth_time, created_at, expires_at, revoked_at
         FROM greenhouse_auth.authorization_contexts WHERE context_id = $1`,
      [id]
    )

    const r = rows[0]

    return r
      ? {
          id: r.context_id,
          version: r.context_version,
          issuer: r.issuer,
          environmentId: r.environment_id,
          subject: r.subject,
          profileId: r.profile_id,
          clientId: r.client_id,
          audience: r.audience,
          organizationId: r.organization_id,
          bindingId: r.binding_id,
          sessionHash: r.session_hash,
          upstreamLinkId: r.upstream_link_id,
          authTime: new Date(r.auth_time),
          createdAt: new Date(r.created_at),
          expiresAt: new Date(r.expires_at),
          revokedAt: r.revoked_at ? new Date(r.revoked_at) : null
        }
      : null
  }

  async revoke(input: { id: string; now: Date; reason: string }): Promise<boolean> {
    if (!input.reason.trim()) throw new Error('revocation_reason_required')

    const rows = await query<{ context_id: string }>(
      `UPDATE greenhouse_auth.authorization_contexts SET revoked_at = $2, revoke_reason = $3
        WHERE context_id = $1 AND revoked_at IS NULL RETURNING context_id`,
      [input.id, input.now, input.reason]
    )

    return rows.length === 1
  }
}
