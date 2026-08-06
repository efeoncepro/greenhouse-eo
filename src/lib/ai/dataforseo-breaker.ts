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
  /**
   * `true` mientras una sonda de half-open está en vuelo.
   *
   * Sin esto, `canAttempt` sería una función pura del reloj y **todas** las llamadas
   * concurrentes pasarían en el instante en que se cumple el cooldown — justo la estampida
   * que el breaker existe para evitar. Con un consumer secuencial no se nota; con los crons
   * SEO por organización, sí.
   */
  probeInFlight: boolean
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

    const created: FamilyBreakerEntry = { consecutiveFailures: 0, openedAt: null, probeInFlight: false }

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

    // `half-open` deja pasar UNA sola sonda, y la marca en vuelo: si funciona,
    // `recordSuccess` cierra el breaker; si falla, `recordFailure` reinicia el cooldown.
    // Las demás llamadas concurrentes siguen viendo el breaker cerrado al paso.
    canAttempt: family => {
      const current = state(family)

      if (current === 'closed') return true
      if (current === 'open') return false

      const entry = entryFor(family)

      if (entry.probeInFlight) return false

      entry.probeInFlight = true

      return true
    },

    recordSuccess: family => {
      const entry = entryFor(family)

      entry.consecutiveFailures = 0
      entry.openedAt = null
      entry.probeInFlight = false
    },

    recordFailure: family => {
      const entry = entryFor(family)

      entry.consecutiveFailures += 1
      entry.probeInFlight = false

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

/**
 * ¿Este HTTP status indica que el PROVEEDOR está en problemas?
 *
 * El breaker sólo debe contar señales de salud del proveedor. Un `400` por payload mal
 * formado es un bug del caller: es determinista, se repite en cada llamada de esa corrida y
 * abriría el breaker castigando a callers que sí funcionan — incluido el AEO, que comparte
 * la familia `serp`. Lo mismo un `404` de endpoint equivocado.
 *
 * Sí cuentan: `429` (rate limit), `5xx` (el proveedor falla), y `402/403` porque indican
 * saldo agotado o credencial revocada — condiciones que no se arreglan reintentando y donde
 * frenar es exactamente lo correcto.
 */
export const isProviderHealthFailure = (httpStatus: number): boolean =>
  httpStatus === 429 || httpStatus === 402 || httpStatus === 403 || httpStatus >= 500
