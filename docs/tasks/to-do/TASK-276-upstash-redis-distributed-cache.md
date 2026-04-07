# TASK-276 — Upstash Redis: cache distribuido para resolvers 360

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`, `data`, `ops`
- Blocked by: `TASK-273` (Person Complete 360 — provee la interfaz de cache a reemplazar)
- Branch: `task/TASK-276-upstash-redis-cache`
- Legacy ID: —
- GitHub Issue: —

## Summary

Los resolvers 360 (TASK-273 y TASK-274) usan in-memory cache por faceta. En Vercel serverless cada function invocation tiene su propia memoria — dos usuarios pidiendo la misma persona ejecutan queries duplicadas. Esta task reemplaza el storage backend de `facet-cache.ts` con **Upstash Redis** (serverless, pay-per-request) para que el cache sea compartido entre todas las invocaciones, eliminando queries redundantes y reduciendo latencia de P50 del resolver de ~200ms a <50ms para cache hits.

## Why This Task Exists

1. **Vercel serverless no comparte memoria** — cada cold start tiene cache vacío. Con N usuarios concurrentes, N queries idénticas al mismo person/account.
2. **Las facetas pesadas (economics, delivery) hacen 2-3 JOINs** — cachearlas distribuido ahorra el 80%+ de queries en uso normal.
3. **Bulk endpoints (TASK-273 Slice 10, TASK-274 Slice 10)** sin cache distribuido generan O(N*F) queries por request — con Redis generan O(misses*F).
4. **Upstash tiene integración nativa con Vercel** — auto-provisiona las env vars, serverless pricing, zero ops.

## Goal

- `facet-cache.ts` usa Upstash Redis como backend (no in-memory Map)
- Cache key: `{resolver}:{entityId}:{facetName}:{version}`
- TTL por faceta respetado (del facet registry)
- Stale-while-revalidate funciona con Redis TTL + soft expiry
- Cache invalidation via outbox events escribe `DEL` key en Redis
- Fallback graceful: si Redis no está disponible, el resolver ejecuta queries directas sin cache (no crashea)
- `_meta.cacheStatus` reporta `hit`/`miss`/`stale`/`bypass`/`error` por faceta

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — arquitectura general
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — estrategia de datos

Reglas obligatorias:

- Upstash REST SDK (`@upstash/redis`) — no usar `ioredis` ni TCP connections (incompatible con Vercel serverless)
- Variables de entorno auto-provisioned por Vercel Marketplace integration: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Cache es best-effort — si Redis falla, el resolver sigue funcionando con queries directas
- No almacenar datos sensibles sin encriptar — las facetas `payroll` y `costs` contienen salarios. Usar Redis con TLS (Upstash lo hace por defecto) y TTL corto

## Dependencies & Impact

### Depends on

- TASK-273 (Person Complete 360) — provee `facet-cache.ts` con interfaz in-memory a reemplazar
- Vercel Marketplace — integración Upstash Redis

### Blocks / Impacts

- TASK-274 (Account Complete 360) — heredará el cache distribuido automáticamente
- Todos los consumers de los resolvers 360 — mejora de performance transparente

### Files owned

- `src/lib/shared/facet-cache.ts` — rewrite de in-memory a Upstash (MODIFICAR)
- `src/lib/shared/redis-client.ts` — cliente Upstash singleton (NUEVO)

## Current Repo State

### Already exists (post TASK-273)

- `src/lib/shared/facet-cache.ts` con `Map<string, CacheEntry>` in-memory
- `_meta.cacheStatus` per faceta ya implementado
- Cache invalidation via outbox events ya implementado (con in-memory `delete`)

### Gap

- No existe cliente Redis
- No existe `@upstash/redis` en dependencies
- No existe integración Upstash en Vercel project

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Provisioning: Upstash Redis + Vercel integration

- Habilitar Upstash Redis desde Vercel Marketplace (project settings > Integrations)
- Esto auto-crea las env vars `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en todos los environments (production, preview, development)
- Verificar que las env vars están disponibles: `pnpm staging:request /api/health` (o similar)
- Seleccionar region: `us-east-1` (más cercana a `iad1` donde corren las functions)

### Slice 2 — Redis client: `redis-client.ts`

Crear `src/lib/shared/redis-client.ts`:

```typescript
import { Redis } from '@upstash/redis'

let redis: Redis | null = null

export function getRedisClient(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null  // graceful fallback — no Redis configured
  redis = new Redis({ url, token })
  return redis
}
```

Singleton pattern. Si no hay env vars (local dev sin Redis), retorna `null` y el cache cae a in-memory.

### Slice 3 — Rewrite `facet-cache.ts` con dual backend

```typescript
async function getCached<T>(key: string): Promise<{ data: T; status: 'hit' | 'stale' } | null> {
  const redis = getRedisClient()
  if (redis) {
    const entry = await redis.get<CacheEntry<T>>(key)
    if (entry) {
      const isStale = Date.now() > entry.softExpiresAt
      return { data: entry.data, status: isStale ? 'stale' : 'hit' }
    }
    return null
  }
  // Fallback: in-memory (for local dev)
  return getFromMemoryCache(key)
}

async function setCached<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    resolvedAt: Date.now(),
    softExpiresAt: Date.now() + ttlSeconds * 1000  // soft expiry for stale-while-revalidate
  }
  const redis = getRedisClient()
  if (redis) {
    await redis.set(key, entry, { ex: ttlSeconds * 2 })  // hard TTL = 2x soft for stale window
  }
  setInMemoryCache(key, entry)  // also keep in-memory for same-invocation dedup
}

async function invalidateCached(pattern: string): Promise<void> {
  const redis = getRedisClient()
  if (redis) {
    // Use SCAN + DEL for pattern-based invalidation
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
  }
  invalidateMemoryCache(pattern)
}
```

### Slice 4 — Stale-while-revalidate con background refresh

Cuando el cache retorna `stale`:

1. El resolver retorna los datos stale inmediatamente (UX rápida)
2. Dispara un background refresh via `waitUntil()` de Vercel (no bloquea el response)
3. El refresh actualiza Redis con datos frescos
4. El siguiente request obtiene `hit` con datos actualizados

```typescript
import { waitUntil } from '@vercel/functions'

if (cached?.status === 'stale') {
  waitUntil(refreshFacetInBackground(key, fetchFn, ttl))
  return { data: cached.data, cacheStatus: 'stale' }
}
```

### Slice 5 — Metrics y monitoring

- Registrar hit/miss ratio en `ResolverTrace` (ya existe)
- Agregar dashboard endpoint `GET /api/admin/ops/cache-health` que muestra:
  - Total keys en Redis (`DBSIZE`)
  - Memory usage (`INFO memory`)
  - Hit/miss ratio (computed from recent ResolverTrace logs)
- Alertar si hit ratio < 50% (indica TTLs demasiado cortos o invalidation demasiado agresiva)

## Out of Scope

- Redis Cluster / Redis Sentinel — Upstash maneja esto internamente
- Custom serialization — Upstash REST SDK maneja JSON automáticamente
- Cache warming (pre-populate) — no necesario, se llena orgánicamente
- Redis pub/sub para real-time invalidation — overkill, outbox events son suficientes

## Acceptance Criteria

- [ ] `@upstash/redis` instalado y env vars configuradas en production + staging
- [ ] Cache hit retorna datos en <10ms (vs ~200ms query directa)
- [ ] Faceta cacheada reporta `cacheStatus: 'hit'` en `_meta`
- [ ] Redis no disponible → resolver funciona normal con queries directas (no crashea)
- [ ] Cache invalidation via outbox event elimina key correcta de Redis
- [ ] Stale-while-revalidate retorna datos stale + refresca en background
- [ ] `pnpm build`, `pnpm lint` pasan sin errores
- [ ] Local dev sin Redis funciona con fallback in-memory

## Verification

- `pnpm build` + `pnpm lint`
- Staging: dos requests rapidos al mismo person 360 → segundo retorna `cacheStatus: 'hit'` + `X-Timing-Ms` < 50ms
- Staging: `cache=bypass` → `cacheStatus: 'bypass'` + timing normal (~200ms)
- Staging: crear leave request → siguiente request a faceta leave retorna `cacheStatus: 'miss'`
- Production: verificar `DBSIZE` crece con uso normal

## Follow-ups

- Redis pub/sub para invalidation en tiempo real (vs polling outbox)
- Cache analytics dashboard en Admin Center
- Per-user cache (no solo per-entity) para facetas con field redaction
- Edge caching con Vercel KV para datos publicos (identity facet)
