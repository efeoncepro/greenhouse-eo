import 'server-only'

import { createHash } from 'crypto'

import jwt from 'jsonwebtoken'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ────────────────────────────────────────────────────────────

type TokenType = 'reset' | 'invite' | 'verify'

interface TokenPayload {
  user_id?: string
  email: string
  client_id?: string
  type: TokenType
}

interface TokenRecord {
  token_id: string
  user_id: string | null
  email: string
  client_id: string | null
  token_type: TokenType
  token_hash: string
  expires_at: string
  used: boolean
  [key: string]: unknown
}

// ── Helpers ──────────────────────────────────────────────────────────

const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET

  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')

  return secret
}

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

// ── Public API ───────────────────────────────────────────────────────

/** Generate a signed JWT for transactional auth flows */
export function generateToken(payload: TokenPayload, expiresInHours: number): string {
  return jwt.sign(payload, getSecret(), { expiresIn: `${expiresInHours}h` })
}

/** Store the token hash in PostgreSQL */
export async function storeToken(token: string, payload: TokenPayload): Promise<void> {
  const decoded = jwt.decode(token) as { exp?: number } | null
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : new Date(Date.now() + 3600_000).toISOString()

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.auth_tokens (email, user_id, client_id, token_type, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [payload.email, payload.user_id || null, payload.client_id || null, payload.type, hashToken(token), expiresAt]
  )
}

/** Validate a JWT: verify signature, check DB record is unused and not expired */
export async function validateToken(token: string): Promise<TokenRecord | null> {
  try {
    jwt.verify(token, getSecret())
  } catch {
    return null
  }

  const rows = await runGreenhousePostgresQuery<TokenRecord>(
    `SELECT token_id, user_id, email, client_id, token_type, token_hash, expires_at, used
     FROM greenhouse_core.auth_tokens
     WHERE token_hash = $1 AND used = false AND expires_at > now()
     LIMIT 1`,
    [hashToken(token)]
  )

  return rows[0] ?? null
}

/** Mark a token as consumed */
export async function consumeToken(tokenHash: string): Promise<void> {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.auth_tokens SET used = true, used_at = now() WHERE token_hash = $1`,
    [tokenHash]
  )
}

/** Rate limit: count tokens created in the last hour for this email+type */
export async function checkRateLimit(email: string, type: string, maxPerHour: number): Promise<boolean> {
  const rows = await runGreenhousePostgresQuery<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM greenhouse_core.auth_tokens
     WHERE email = $1 AND token_type = $2 AND created_at > now() - interval '1 hour'`,
    [email, type]
  )

  return Number(rows[0]?.count || 0) < maxPerHour
}
