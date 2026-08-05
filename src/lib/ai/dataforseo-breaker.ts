/**
 * TASK-1300 — Circuit breaker POR FAMILIA para el cliente DataForSEO.
 *
 * Existe por una razón concreta: el AEO (familia `serp`) y el módulo SEO (`labs`, `onpage`,
 * `backlinks`, `domain`) comparten credenciales y transporte. Sin aislamiento, una familia
 * caída —o un endpoint mal formado que devuelve 4xx en loop— consumiría reintentos y latencia
 * de todas, y un provider roto del SEO podría hundir al grader que ya está en producción
 * (riesgo §13.4 de la arquitectura del módulo).
 *
 * Es best-effort e in-memory POR PROCESO: no pretende ser un rate limiter distribuido. La
 * defensa dura del gasto es el presupuesto persistido (`seo_provider_spend_daily` +
 * `enforceSeoRunEntitlement`); esto sólo evita martillar a un proveedor que ya está fallando.
 */

import { type DataForSeoFamily } from './dataforseo-families'

export type BreakerState = 'closed' | 'open' | 'half-open'

/** Fallos consecutivos antes de abrir. */
const DEFAULT_FAILURE_THRESHOLD = 5

/** Cuánto espera un breaker abierto antes de dejar pasar una sonda. */
const DEFAULT_COOLDOWN_MS = 60_000

interface FamilyBreakerEntry {
  consecutiveFailures: number
  openedAt: number | null
}

export interface DataForSeoBreakerOptions {
  failureThreshold?: number
  cooldownMs?: number
  /** Inyectable para test; en producción es `Date.now`. */
  now?: () => number
}

export interface DataForSeoBreaker {
  /** `true` si la familia puede intentar la llamada ahora. */
  canAttempt(family: DataForSeoFamily): boolean
  state(family: DataForSeoFamily): BreakerState
  recordSuccess(family: DataForSeoFamily): void
  recordFailure(family: DataForSeoFamily): void
  reset(family?: DataForSeoFamily): void
}

export const createDataForSeoBreaker = (options: DataForSeoBreakerOptions = {}): DataForSeoBreaker => {
  const failureThreshold = Math.max(1, options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD)
  const cooldownMs = Math.max(0, options.cooldownMs ?? DEFAULT_COOLDOWN_MS)
  const now = options.now ?? (() => Date.now())

  // Un registro POR FAMILIA: es lo que hace que el aislamiento sea real y no una promesa.
  const entries = new Map<DataForSeoFamily, FamilyBreakerEntry>()

  const entryFor = (family: DataForSeoFamily): FamilyBreakerEntry => {
    const existing = entries.get(family)

    if (existing) return existing

    const created: FamilyBreakerEntry = { consecutiveFailures: 0, openedAt: null }

    entries.set(family, created)

    return created
  }

  const state = (family: DataForSeoFamily): BreakerState => {
    const entry = entryFor(family)

    if (entry.openedAt === null) return 'closed'

    return now() - entry.openedAt >= cooldownMs ? 'half-open' : 'open'
  }

  return {
    state,

    // `half-open` deja pasar la sonda: si funciona, `recordSuccess` cierra el breaker; si
    // falla, `recordFailure` reinicia el cooldown desde ahora.
    canAttempt: family => state(family) !== 'open',

    recordSuccess: family => {
      const entry = entryFor(family)

      entry.consecutiveFailures = 0
      entry.openedAt = null
    },

    recordFailure: family => {
      const entry = entryFor(family)

      entry.consecutiveFailures += 1

      if (entry.consecutiveFailures >= failureThreshold) {
        entry.openedAt = now()
      }
    },

    reset: family => {
      if (family) entries.delete(family)
      else entries.clear()
    }
  }
}

/** Breaker compartido del proceso. Los tests crean el suyo con `createDataForSeoBreaker`. */
export const dataForSeoBreaker = createDataForSeoBreaker()
