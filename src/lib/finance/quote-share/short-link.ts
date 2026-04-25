import 'server-only'

import { randomBytes } from 'node:crypto'

import { query, withTransaction } from '@/lib/db'

/**
 * TASK-631 — URL shortener for shareable web quote links.
 *
 * Maps a 7-char base62 code → canonical /public/quote/[id]/[v]/[token].
 * Persistent table mapping (greenhouse_commercial.quote_short_links).
 * Soft revoke + access tracking + explicit expiration.
 */

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

const DEFAULT_SHORT_CODE_LENGTH = 7
const MAX_GENERATION_ATTEMPTS = 5

export interface QuoteShortLink {
  shortCode: string
  quotationId: string
  versionNumber: number
  fullToken: string
  createdAt: string
  createdBy: string | null
  expiresAt: string | null
  lastAccessedAt: string | null
  accessCount: number
  revokedAt: string | null
  revokedBy: string | null
  revocationReason: string | null
}

interface QuoteShortLinkRow extends Record<string, unknown> {
  short_code: string
  quotation_id: string
  version_number: number
  full_token: string
  created_at: string | Date
  created_by: string | null
  expires_at: string | Date | null
  last_accessed_at: string | Date | null
  access_count: number
  revoked_at: string | Date | null
  revoked_by: string | null
  revocation_reason: string | null
}

const toIso = (value: string | Date | null): string | null => {
  if (!value) return null

  return value instanceof Date ? value.toISOString() : value
}

const normalize = (row: QuoteShortLinkRow): QuoteShortLink => ({
  shortCode: row.short_code,
  quotationId: row.quotation_id,
  versionNumber: Number(row.version_number),
  fullToken: row.full_token,
  createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  createdBy: row.created_by,
  expiresAt: toIso(row.expires_at),
  lastAccessedAt: toIso(row.last_accessed_at),
  accessCount: Number(row.access_count),
  revokedAt: toIso(row.revoked_at),
  revokedBy: row.revoked_by,
  revocationReason: row.revocation_reason
})

/**
 * Generates a cryptographically random base62 short code.
 *
 * 7 chars × 62 alphabet = ~3.5T combinations. Collision probability with
 * <1M existing links is ~3 × 10^-7 per generation — effectively impossible.
 * The retry loop in `createQuoteShortLink` handles the theoretical case.
 */
export const generateShortCode = (length: number = DEFAULT_SHORT_CODE_LENGTH): string => {
  if (length < 7 || length > 12) {
    throw new Error(`short_code length must be in [7, 12], got ${length}`)
  }

  const bytes = randomBytes(length)
  let code = ''

  for (let i = 0; i < length; i++) {
    code += BASE62[bytes[i] % 62]
  }

  return code
}

interface CreateShortLinkInput {
  quotationId: string
  versionNumber: number
  fullToken: string
  createdBy?: string | null
  expiresAt?: Date | string | null
}

const isPrimaryKeyConflict = (error: unknown): boolean => {
  const code = (error as { code?: string } | null)?.code

  return code === '23505'
}

/**
 * Creates a new short link for a quote. Idempotency note: this NEVER reuses
 * an existing short code — calling twice with the same input produces two
 * different shorts. Use `getActiveShortLinksForQuote` first if you want to
 * dedupe.
 *
 * Retries up to 5 times on PK collision (extremely unlikely in practice).
 */
export const createQuoteShortLink = async (
  input: CreateShortLinkInput
): Promise<QuoteShortLink> => {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const shortCode = generateShortCode()

    try {
      const rows = await query<QuoteShortLinkRow>(
        `INSERT INTO greenhouse_commercial.quote_short_links
         (short_code, quotation_id, version_number, full_token, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          shortCode,
          input.quotationId,
          input.versionNumber,
          input.fullToken,
          input.createdBy ?? null,
          input.expiresAt ?? null
        ]
      )

      return normalize(rows[0])
    } catch (error) {
      if (isPrimaryKeyConflict(error) && attempt < MAX_GENERATION_ATTEMPTS - 1) {
        continue
      }

      throw error
    }
  }

  throw new Error(
    `Failed to generate unique short_code after ${MAX_GENERATION_ATTEMPTS} attempts`
  )
}

/**
 * Resolves a short code to its target quote, OR null if it doesn't exist /
 * was revoked / has expired. Caller is responsible for tracking access via
 * `trackShortLinkAccess` after a successful resolution.
 */
export const resolveQuoteShortLink = async (
  shortCode: string
): Promise<{
  link: QuoteShortLink
  status: 'active' | 'revoked' | 'expired'
} | null> => {
  if (!shortCode || !/^[a-zA-Z0-9]{7,12}$/.test(shortCode)) return null

  const rows = await query<QuoteShortLinkRow>(
    `SELECT *
     FROM greenhouse_commercial.quote_short_links
     WHERE short_code = $1`,
    [shortCode]
  )

  const row = rows[0]

  if (!row) return null

  const link = normalize(row)

  if (link.revokedAt) {
    return { link, status: 'revoked' }
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { link, status: 'expired' }
  }

  return { link, status: 'active' }
}

/**
 * Best-effort access tracker. Increments the access counter and updates
 * last_accessed_at without blocking the caller. Failures are swallowed.
 */
export const trackShortLinkAccess = async (shortCode: string): Promise<void> => {
  try {
    await query(
      `UPDATE greenhouse_commercial.quote_short_links
       SET access_count = access_count + 1,
           last_accessed_at = now()
       WHERE short_code = $1
         AND revoked_at IS NULL`,
      [shortCode]
    )
  } catch (error) {
    console.warn(
      '[quote-share] Failed to track short link access:',
      error instanceof Error ? error.message : error
    )
  }
}

/**
 * Lists active (not revoked, not expired) short links for a quote.
 */
export const getActiveShortLinksForQuote = async (
  quotationId: string,
  versionNumber: number
): Promise<QuoteShortLink[]> => {
  const rows = await query<QuoteShortLinkRow>(
    `SELECT *
     FROM greenhouse_commercial.quote_short_links
     WHERE quotation_id = $1
       AND version_number = $2
       AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY created_at DESC`,
    [quotationId, versionNumber]
  )

  return rows.map(normalize)
}

interface RevokeInput {
  shortCode: string
  revokedBy?: string | null
  reason?: string | null
}

/**
 * Soft-revokes a short link. The row is preserved for audit trail; future
 * resolutions return status='revoked'. Idempotent — calling twice on the
 * same code is a no-op (revoked_at is preserved).
 */
export const revokeQuoteShortLink = async (
  input: RevokeInput
): Promise<QuoteShortLink | null> => {
  const rows = await query<QuoteShortLinkRow>(
    `UPDATE greenhouse_commercial.quote_short_links
     SET revoked_at = COALESCE(revoked_at, now()),
         revoked_by = COALESCE(revoked_by, $2),
         revocation_reason = COALESCE(revocation_reason, $3)
     WHERE short_code = $1
     RETURNING *`,
    [input.shortCode, input.revokedBy ?? null, input.reason ?? null]
  )

  return rows[0] ? normalize(rows[0]) : null
}

interface CreateOrReuseShortLinkInput extends CreateShortLinkInput {

  /**
   * If true and an active short link already exists for the same quote
   * + version, return the existing one instead of creating a new one.
   */
  reuseIfActive?: boolean
}

/**
 * Convenience helper: returns an active short link if `reuseIfActive=true`
 * and one exists, otherwise creates a new one. Wraps in a transaction to
 * avoid races on concurrent calls.
 */
export const createOrReuseQuoteShortLink = async (
  input: CreateOrReuseShortLinkInput
): Promise<QuoteShortLink> => {
  if (!input.reuseIfActive) {
    return createQuoteShortLink(input)
  }

  return withTransaction(async () => {
    const existing = await getActiveShortLinksForQuote(input.quotationId, input.versionNumber)

    if (existing.length > 0) {
      return existing[0]
    }

    return createQuoteShortLink(input)
  })
}
