import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { DeliverabilityVerdict } from './provider'

/**
 * TASK-1254 — Store del cache de verificación de email (server-only).
 *
 * Clave = hash del email (NUNCA email crudo). TTL vía `expires_at`: un hit vigente evita
 * re-correr Tier 2 (provider pago) y re-facturar. Upsert idempotente `ON CONFLICT`.
 */

export interface EmailVerificationVerdict {
  domain: string | null
  isCorporate: boolean
  isDisposable: boolean
  isRoleBased: boolean
  isFreeProvider: boolean
  deliverable: DeliverabilityVerdict
  verifiedTier: 'tier1' | 'tier2'
  provider: string
}

type CacheRow = {
  domain: string | null
  is_corporate: boolean
  is_disposable: boolean
  is_role_based: boolean
  is_free_provider: boolean
  deliverable: string
  verified_tier: string
  provider: string
}

const toVerdict = (row: CacheRow): EmailVerificationVerdict => ({
  domain: row.domain,
  isCorporate: row.is_corporate,
  isDisposable: row.is_disposable,
  isRoleBased: row.is_role_based,
  isFreeProvider: row.is_free_provider,
  deliverable: row.deliverable as DeliverabilityVerdict,
  verifiedTier: row.verified_tier === 'tier2' ? 'tier2' : 'tier1',
  provider: row.provider,
})

/** Devuelve el veredicto cacheado VIGENTE (no expirado) para un hash, o `null` si miss. */
export const getCachedVerification = async (emailHash: string): Promise<EmailVerificationVerdict | null> => {
  const rows = await runGreenhousePostgresQuery<CacheRow>(
    `SELECT domain, is_corporate, is_disposable, is_role_based, is_free_provider,
            deliverable, verified_tier, provider
       FROM greenhouse_growth.email_verification_cache
      WHERE email_hash = $1 AND expires_at > NOW()
      LIMIT 1`,
    [emailHash],
  )

  return rows.length > 0 ? toVerdict(rows[0]) : null
}

/** Upsert idempotente del veredicto con TTL (segundos). Refresca el cache en cada verificación. */
export const upsertVerification = async (
  emailHash: string,
  verdict: EmailVerificationVerdict,
  ttlSeconds: number,
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_growth.email_verification_cache
       (email_hash, domain, is_corporate, is_disposable, is_role_based, is_free_provider,
        deliverable, verified_tier, provider, verified_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW() + ($10 || ' seconds')::interval)
     ON CONFLICT (email_hash) DO UPDATE SET
       domain = EXCLUDED.domain,
       is_corporate = EXCLUDED.is_corporate,
       is_disposable = EXCLUDED.is_disposable,
       is_role_based = EXCLUDED.is_role_based,
       is_free_provider = EXCLUDED.is_free_provider,
       deliverable = EXCLUDED.deliverable,
       verified_tier = EXCLUDED.verified_tier,
       provider = EXCLUDED.provider,
       verified_at = NOW(),
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()`,
    [
      emailHash,
      verdict.domain,
      verdict.isCorporate,
      verdict.isDisposable,
      verdict.isRoleBased,
      verdict.isFreeProvider,
      verdict.deliverable,
      verdict.verifiedTier,
      verdict.provider,
      String(ttlSeconds),
    ],
  )
}
