/**
 * TASK-2053 — Rate limit por IP para lecturas públicas baratas del motor (p.ej. el conteo de reservas).
 *
 * Es la capa de DOMINIO, por instancia y en memoria: ventana fija por IP con tope de claves. La capa
 * global por IP es el WAF de Vercel sobre `/api/public/**` (TASK-1876,
 * `src/lib/security/public-burst-guard/firewall-rules.ts`), que corta antes de invocar la función.
 * Las dos se suman: el WAF frena ráfagas repartidas entre instancias; ésta frena a un cliente que
 * martilla una instancia tibia aunque el WAF esté en `observe`. Nunca guarda la IP en claro: la clave
 * es un hash truncado.
 */
import { createHash } from 'node:crypto'

export interface PublicReadRateLimitOptions {
  windowMs: number
  maxRequests: number
  /** Tope de IPs distintas recordadas; al llenarse se descarta la ventana más antigua. */
  maxKeys?: number
  now?: () => number
}

export interface PublicReadRateLimitDecision {
  allowed: boolean
  retryAfterSeconds: number
}

type Window = { startedAt: number; count: number }

export const createPublicReadRateLimiter = (options: PublicReadRateLimitOptions) => {
  const windows = new Map<string, Window>()
  const maxKeys = options.maxKeys ?? 5000
  const now = options.now ?? Date.now

  const keyFor = (ip: string | null): string =>
    createHash('sha256').update(ip ?? 'unknown').digest('hex').slice(0, 24)

  const check = (ip: string | null): PublicReadRateLimitDecision => {
    const key = keyFor(ip)
    const at = now()
    const current = windows.get(key)

    if (!current || at - current.startedAt >= options.windowMs) {
      windows.delete(key)

      if (windows.size >= maxKeys) {
        const oldest = windows.keys().next().value

        if (oldest !== undefined) windows.delete(oldest)
      }

      windows.set(key, { startedAt: at, count: 1 })

      return { allowed: true, retryAfterSeconds: 0 }
    }

    current.count += 1

    if (current.count > options.maxRequests) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.startedAt + options.windowMs - at) / 1000)) }
    }

    return { allowed: true, retryAfterSeconds: 0 }
  }

  return { check, reset: () => windows.clear() }
}

/** Límite del conteo público de reservas: 30 lecturas por minuto por IP (la respuesta se cachea 10 min). */
export const registrationsCountRateLimiter = createPublicReadRateLimiter({ windowMs: 60_000, maxRequests: 30 })
