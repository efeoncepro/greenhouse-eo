import 'server-only'

/**
 * TASK-1254 — Rate-limit best-effort en memoria para el endpoint público `verify-email`.
 *
 * Ventana deslizante por IP (per-instancia, efímero en serverless). NO es la defensa de
 * costo dura: el control real de gasto es Tier1-first + cache TTL + (cuando haya provider
 * real) un cap diario en una capa compartida. Esto solo amortigua bursts de una misma
 * instancia. Un limiter cross-instance (PG/Redis) + cap diario son follow-up al enchufar
 * el provider pago. Sin IP (server-side desconocida) NO limita (deja pasar, el cache cubre).
 */

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 30

const hits = new Map<string, number[]>()

export const allowVerifyRequest = (ip: string | null, now: number = Date.now()): boolean => {
  if (!ip) return true

  const recent = (hits.get(ip) ?? []).filter(ts => now - ts < WINDOW_MS)

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent)

    return false
  }

  recent.push(now)
  hits.set(ip, recent)

  // Poda oportunista para que el Map no crezca sin techo en una instancia longeva.
  if (hits.size > 5_000) {
    for (const [key, stamps] of hits) {
      if (stamps.every(ts => now - ts >= WINDOW_MS)) hits.delete(key)
    }
  }

  return true
}
