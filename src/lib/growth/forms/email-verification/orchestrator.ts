import 'server-only'

import { hashIdentifier } from '@/lib/growth/public-submission/abuse-guard'
import { captureWithDomain } from '@/lib/observability/capture'

import { getCachedVerification, upsertVerification, type EmailVerificationVerdict } from './cache-store'
import { classifyEmailTier1 } from './tier1'
import { resolveVerificationProvider, type DeliverabilityVerdict, type EmailVerificationProvider } from './provider'

/**
 * TASK-1254 — Orquestador canónico de verificación de email (server-only, autoridad).
 *
 * Económico por construcción: Tier 1 (local, gratis) resuelve corporativo/desechable para
 * la mayoría; Tier 2 (provider pago) SOLO corre si Tier 1 pasa (dominio corporativo) y el
 * provider está listo, y siempre pasando por cache (hash + TTL) para no re-facturar.
 * Circuit breaker: si el provider falla/timeout, degrada a Tier 1 con `deliverable:'unknown'`
 * — NUNCA rompe el form. Un primitive; lo consumen el endpoint público, `submitForm`
 * (gate de política) y el dispatcher async.
 */

const EMAIL_VERIFY_SALT = 'gh-email-verify-v1'
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 días
const PROVIDER_TIMEOUT_MS = 4000
const BREAKER_FAILURE_THRESHOLD = 3
const BREAKER_COOLDOWN_MS = 60_000

export type EmailVerificationReasonCode = 'email_format' | 'email_not_corporate' | 'email_disposable' | null
export type EmailQuality = 'verified' | 'suspect' | 'unknown'

export interface EmailVerificationResult {
  syntaxValid: boolean
  isCorporate: boolean
  isDisposable: boolean
  isRoleBased: boolean
  isFreeProvider: boolean
  deliverable: DeliverabilityVerdict
  suggestion: string | null
  /** Veredicto resumido para el downstream (HubSpot handoff, scoring, columnas de lead). */
  quality: EmailQuality
  /** Espeja los reasonCodes del validador `corporate_email` para que el cliente mapee copy. */
  reasonCode: EmailVerificationReasonCode
  /** Hasta qué tier se resolvió este veredicto. */
  verifiedTier: 'tier1' | 'tier2'
  /** `true` si el provider Tier 2 fue saltado o degradado (circuit breaker / no listo). */
  degraded: boolean
}

/**
 * Circuit breaker en memoria (best-effort, por-instancia). En Vercel serverless el estado
 * es efímero/per-instance; un breaker cross-instance (PG/Redis) es follow-up. Suficiente
 * para que un provider caído no machaque cada request de una misma instancia.
 */
const breaker = { consecutiveFailures: 0, openUntil: 0 }

const breakerOpen = (now: number): boolean => now < breaker.openUntil

const recordBreakerFailure = (now: number): void => {
  breaker.consecutiveFailures += 1

  if (breaker.consecutiveFailures >= BREAKER_FAILURE_THRESHOLD) {
    breaker.openUntil = now + BREAKER_COOLDOWN_MS
    breaker.consecutiveFailures = 0
  }
}

const recordBreakerSuccess = (): void => {
  breaker.consecutiveFailures = 0
  breaker.openUntil = 0
}

const reasonFor = (isDisposable: boolean, isCorporate: boolean): EmailVerificationReasonCode => {
  if (isDisposable) return 'email_disposable'
  if (!isCorporate) return 'email_not_corporate'

  return null
}

const qualityFor = (isCorporate: boolean, isDisposable: boolean, deliverable: DeliverabilityVerdict): EmailQuality => {
  if (isDisposable || !isCorporate || deliverable === 'undeliverable') return 'suspect'
  if (isCorporate && deliverable === 'deliverable') return 'verified'

  return 'unknown'
}

const withTimeout = async (promise: Promise<DeliverabilityVerdict>, ms: number): Promise<DeliverabilityVerdict> => {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<DeliverabilityVerdict>(resolve => {
    timer = setTimeout(() => resolve('unknown'), ms)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Corre Tier 2 (provider) con timeout + circuit breaker. NUNCA throw: ante fallo/timeout
 * devuelve `'unknown'` y abre el breaker. El provider mismo promete no-throw, pero
 * guardamos igual (defensa en profundidad).
 */
const runTier2 = async (provider: EmailVerificationProvider, email: string, now: number): Promise<DeliverabilityVerdict> => {
  if (breakerOpen(now)) return 'unknown'

  try {
    const result = await withTimeout(provider.verify(email).then(r => r.deliverable), PROVIDER_TIMEOUT_MS)

    if (result === 'unknown') recordBreakerFailure(now)
    else recordBreakerSuccess()

    return result
  } catch (error) {
    recordBreakerFailure(now)
    captureWithDomain(error, 'growth', { extra: { stage: 'email_verification_tier2', provider: provider.name } })

    return 'unknown'
  }
}

interface VerifyOptions {
  /** Inyectable para tests; default = `resolveVerificationProvider()`. */
  provider?: EmailVerificationProvider
  /** Para tests deterministas del TTL/breaker. */
  now?: number
}

/**
 * Verifica un email: Tier 1 siempre; Tier 2 solo si Tier 1 pasa (corporativo) + provider
 * listo, vía cache. Cachea el veredicto (Tier 1 o Tier 2) con TTL. No-throwing.
 */
export const verifyEmail = async (rawEmail: unknown, options: VerifyOptions = {}): Promise<EmailVerificationResult> => {
  const provider = options.provider ?? resolveVerificationProvider()
  const now = options.now ?? Date.now()
  const t1 = classifyEmailTier1(rawEmail)

  if (!t1.syntaxValid) {
    return {
      syntaxValid: false,
      isCorporate: false,
      isDisposable: false,
      isRoleBased: false,
      isFreeProvider: false,
      deliverable: 'unknown',
      suggestion: null,
      quality: 'unknown',
      reasonCode: 'email_format',
      verifiedTier: 'tier1',
      degraded: false,
    }
  }

  const base = {
    syntaxValid: true,
    isCorporate: t1.isCorporate,
    isDisposable: t1.isDisposable,
    isRoleBased: t1.isRoleBased,
    isFreeProvider: t1.isFreeProvider,
    suggestion: t1.suggestion,
    reasonCode: reasonFor(t1.isDisposable, t1.isCorporate),
  }

  const emailHash = hashIdentifier(t1.dedupeKey, EMAIL_VERIFY_SALT)

  // Cache hit (vigente) → no re-corre Tier 2 ni re-factura.
  if (emailHash) {
    const cached = await getCachedVerification(emailHash).catch(error => {
      captureWithDomain(error, 'growth', { extra: { stage: 'email_verification_cache_read' } })

      return null
    })

    if (cached) {
      return {
        ...base,
        deliverable: cached.deliverable,
        quality: qualityFor(cached.isCorporate, cached.isDisposable, cached.deliverable),
        verifiedTier: cached.verifiedTier,
        degraded: cached.verifiedTier === 'tier1' && cached.isCorporate,
      }
    }
  }

  // Tier 2 SOLO si Tier 1 pasa (corporativo, no desechable) y el provider está listo.
  const wantsTier2 = t1.isCorporate && !t1.isDisposable && provider.isReady()
  const deliverable = wantsTier2 ? await runTier2(provider, t1.normalizedEmail, now) : 'unknown'
  const verifiedTier: 'tier1' | 'tier2' = wantsTier2 && deliverable !== 'unknown' ? 'tier2' : 'tier1'
  const degraded = wantsTier2 && deliverable === 'unknown'

  const verdict: EmailVerificationVerdict = {
    domain: t1.domain,
    isCorporate: t1.isCorporate,
    isDisposable: t1.isDisposable,
    isRoleBased: t1.isRoleBased,
    isFreeProvider: t1.isFreeProvider,
    deliverable,
    verifiedTier,
    provider: verifiedTier === 'tier2' ? provider.name : 'tier1_only',
  }

  if (emailHash) {
    await upsertVerification(emailHash, verdict, CACHE_TTL_SECONDS).catch(error => {
      captureWithDomain(error, 'growth', { extra: { stage: 'email_verification_cache_write' } })
    })
  }

  return {
    ...base,
    deliverable,
    quality: qualityFor(t1.isCorporate, t1.isDisposable, deliverable),
    verifiedTier,
    degraded,
  }
}
