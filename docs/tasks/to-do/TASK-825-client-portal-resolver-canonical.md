# TASK-825 — Client Portal Resolver Canonical + Helpers + Cache

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseno (TASK-822 cerrada 2026-05-12; queda bloqueada por TASK-824 schema)`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `TASK-824`
- Branch: `task/TASK-825-client-portal-resolver`

## Delta 2026-05-12 — TASK-822 cerrada; este resolver es el primer reader NATIVO del BFF

TASK-822 dejó el BFF preparado para hospedar readers nativos. Por convención
canonizada en spec V1.1 §3.1:

- El resolver `resolveClientPortalModulesForOrganization` vive en `src/lib/client-portal/readers/native/` (primer archivo bajo esa carpeta — el README de `native/` documenta la convención).
- Su metadata declara `classification: 'native'` con `ownerDomain: null` (es BFF-owned, no producer-domain-owned). El runtime invariant `assertReaderMeta()` lo enforce; el test pattern de TASK-822 Slice 4 (`curated-meta.test.ts`) puede clonarse para validar el shape native.
- Importa libremente de producer domains (account-360, agency, ico-engine, etc.) — la ESLint rule canónica permite la dirección BFF → producer.
- Si emerge la tentación de "compartir" lógica del resolver con producer domains: NO. Producer domains no pueden importar `@/lib/client-portal/*` (lint rule bloquea). Si necesitan algo equivalente, extender API del producer domain en su propio lugar.
- Errores del path: usar `captureWithDomain(err, 'client_portal', { extra: { organizationId } })` — el domain ya está whitelisted (TASK-822 Slice 2).

Spec actualizada V1.1 §3.1 + §3.2.

## Summary

Implementa `resolveClientPortalModulesForOrganization` como **única fuente de verdad** para qué módulos ve un cliente. Pure read, in-process cache TTL 60s, helpers derivados (`hasModuleAccess`, `hasViewCodeAccess`, `hasCapabilityViaModule`), endpoint `GET /api/client-portal/modules`. Tests concurrencia + cache invalidation + edge cases (orphan module_key, drift legacy).

## Why This Task Exists

Sin resolver canónico, cada surface (menú, page guard, API gate) implementaría su propia lógica de "qué ve el cliente" — receta para divergencia. El resolver es el punto de control único: cualquier cambio en cómo se computa visibilidad pasa por ahí. Es prerequisito para TASK-826 (admin endpoints), TASK-827 (UI), TASK-828 (cascade), TASK-829 (reliability signals que detectan drift contra el resolver).

## Goal

- `src/lib/client-portal/modules/resolver.ts` exporta `resolveClientPortalModulesForOrganization`
- 3 helpers derivados: `hasModuleAccess`, `hasViewCodeAccess`, `hasCapabilityViaModule`
- In-process cache TTL 60s con invalidation key `organizationId`
- `__clearClientPortalResolverCache()` invalidator exportado para uso en commands
- `GET /api/client-portal/modules` endpoint que devuelve resolver para session.user.organizationId
- Tests: idempotency, concurrency, cache hit/miss, orphan filter, expired pilot filter

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §6 (Resolver Canonical)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- Patrones: TASK-553 shortcuts resolver, TASK-780 home_rollout_flags resolver

Reglas obligatorias:

- Resolver es **server-only** (`import 'server-only'`)
- Pure read, NO side-effects
- Cache in-process per organizationId con TTL 60s; invalidator exportado
- Filtra `effective_to IS NULL OR effective_to > asOf`
- Filtra status `IN ('active','pilot')` por default
- Filtra orphan `module_key` (assignments cuyo module no existe en catálogo activo) → emit reliability signal `assignment.orphan_module_key`
- Filtra pilot expirado (`status='pilot' AND expires_at < now()`) → emit signal `pilot_expired_not_actioned`
- JOIN con catálogo activo para hidratar view_codes, capabilities, data_sources
- Errors via `captureWithDomain(err, 'client_portal', { tags: { source: 'resolver' } })`
- API endpoint usa `requireClientSession` (TASK-823 helper)

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §6, §13

## Dependencies & Impact

### Depends on

- TASK-822 (`src/lib/client-portal/` existe)
- TASK-824 (tablas + seed)
- `src/lib/db.ts` query helper ✅
- `requireClientSession` (TASK-823)

### Blocks / Impacts

- TASK-826 (admin endpoints leen resolver para mostrar assignments)
- TASK-827 (UI compose menu desde resolver)
- TASK-828 (cascade invalida cache via __clearClientPortalResolverCache)
- TASK-829 (reliability signals detectan drift filtrado por resolver)

### Files owned

- `src/lib/client-portal/modules/resolver.ts`
- `src/lib/client-portal/modules/cache.ts`
- `src/lib/client-portal/modules/helpers.ts` (hasModuleAccess, etc.)
- `src/lib/client-portal/dto/module.ts` (interface ResolvedClientPortalModule)
- `src/app/api/client-portal/modules/route.ts`
- `src/lib/client-portal/__tests__/resolver.test.ts`
- `src/lib/client-portal/__tests__/cache.test.ts`

## Current Repo State

### Already exists

- TASK-824 produce tablas + seed
- TASK-822 produce `src/lib/client-portal/` carpeta + Sentry domain
- Patrón resolver con cache: TASK-553 shortcuts (`src/lib/shortcuts/resolver.ts`), TASK-780 home_rollout_flags

### Gap

- No existe resolver para client portal modules
- No existe endpoint `GET /api/client-portal/modules`

## Scope

### Slice 1 — DTO + interfaces

- `src/lib/client-portal/dto/module.ts` con `ResolvedClientPortalModule`
- `AssignmentSource` type union
- Export desde `src/lib/client-portal/index.ts`

### Slice 2 — Resolver core + cache

- Query SQL canónica:
  ```sql
  SELECT
    a.assignment_id, a.module_key, a.status, a.source, a.expires_at,
    m.display_label, m.display_label_client, m.business_line, m.tier,
    m.view_codes, m.capabilities, m.data_sources
  FROM greenhouse_client_portal.module_assignments a
  JOIN greenhouse_client_portal.modules m ON m.module_key = a.module_key
  WHERE a.organization_id = $1
    AND a.effective_to IS NULL
    AND m.effective_to IS NULL
    AND a.status IN ('active','pilot')
    AND (a.expires_at IS NULL OR a.expires_at > now())
  ORDER BY m.tier, m.display_label;
  ```
- Cache TTL 60s in-process Map<orgId, {data, expiresAt}>
- `__clearClientPortalResolverCache(orgId?)` invalidator (clear todo si orgId omitido)

### Slice 3 — Helpers derivados

- `hasModuleAccess(orgId, moduleKey)`: boolean
- `hasViewCodeAccess(orgId, viewCode)`: boolean
- `hasCapabilityViaModule(orgId, capability)`: boolean
- Cada uno reusa el resolver (cache hit warm)

### Slice 4 — Endpoint `GET /api/client-portal/modules`

- Auth: `requireClientSession`
- Body: `{}` (organizationId from session)
- Response: `ResolvedClientPortalModule[]`
- Errors: redacted + captureWithDomain

### Slice 5 — Tests

- Idempotency: dos calls consecutivas → mismo resultado (cache)
- Cache invalidation: `__clearClientPortalResolverCache(orgId)` → próximo call refresca
- Concurrency: 100 calls paralelos → query DB se ejecuta una sola vez (single-flight)
- Orphan filter: assignment con module_key no presente en catálogo → filtrado out
- Expired pilot filter: pilot con expires_at en el pasado → filtrado out
- Empty case: org sin assignments → `[]` (no error)
- Error path: DB down → captureWithDomain emit + throw

## Out of Scope

- Admin endpoints — TASK-826
- Composition layer UI — TASK-827
- Cascade del lifecycle — TASK-828
- Reliability signals — TASK-829 (este slice solo emite; signals se registran allá)
- Single-flight con Promise dedupe (consider para V1.1 si performance lo requiere)

## Detailed Spec

```ts
// src/lib/client-portal/modules/resolver.ts
import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { getCachedResolver, setCachedResolver } from './cache'
import type { ResolvedClientPortalModule } from '../dto/module'

const SQL = `
  SELECT
    a.assignment_id, a.module_key, a.status, a.source, a.expires_at,
    m.display_label, m.display_label_client, m.business_line, m.tier,
    m.view_codes, m.capabilities, m.data_sources
  FROM greenhouse_client_portal.module_assignments a
  JOIN greenhouse_client_portal.modules m ON m.module_key = a.module_key
  WHERE a.organization_id = $1
    AND a.effective_to IS NULL
    AND m.effective_to IS NULL
    AND a.status IN ('active','pilot')
    AND (a.expires_at IS NULL OR a.expires_at > now())
  ORDER BY m.tier, m.display_label
`

export async function resolveClientPortalModulesForOrganization(
  organizationId: string,
  options: { includePending?: boolean; asOf?: Date; bypassCache?: boolean } = {}
): Promise<ResolvedClientPortalModule[]> {
  if (!options.bypassCache) {
    const cached = getCachedResolver(organizationId)
    if (cached) return cached
  }

  try {
    const rows = await query<RawRow>(SQL, [organizationId])
    const result: ResolvedClientPortalModule[] = rows.map(toResolvedModule)
    setCachedResolver(organizationId, result)
    return result
  } catch (err) {
    captureWithDomain(err, 'client_portal', {
      tags: { source: 'resolver', organizationId }
    })
    throw err
  }
}

// Helpers
export async function hasModuleAccess(orgId: string, moduleKey: string) {
  const modules = await resolveClientPortalModulesForOrganization(orgId)
  return modules.some(m => m.moduleKey === moduleKey)
}

export async function hasViewCodeAccess(orgId: string, viewCode: string) {
  const modules = await resolveClientPortalModulesForOrganization(orgId)
  return modules.some(m => m.viewCodes.includes(viewCode))
}

export async function hasCapabilityViaModule(orgId: string, capability: string) {
  const modules = await resolveClientPortalModulesForOrganization(orgId)
  return modules.some(m => m.capabilities.includes(capability))
}
```

```ts
// src/lib/client-portal/modules/cache.ts
const cache = new Map<string, { data: ResolvedClientPortalModule[]; expiresAt: number }>()
const TTL_MS = 60_000

export function getCachedResolver(orgId: string) {
  const entry = cache.get(orgId)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(orgId)
    return null
  }
  return entry.data
}

export function setCachedResolver(orgId: string, data: ResolvedClientPortalModule[]) {
  cache.set(orgId, { data, expiresAt: Date.now() + TTL_MS })
}

export function __clearClientPortalResolverCache(orgId?: string) {
  if (orgId) cache.delete(orgId)
  else cache.clear()
}
```

## Acceptance Criteria

- [ ] `resolveClientPortalModulesForOrganization` exported desde `src/lib/client-portal/index.ts`
- [ ] 3 helpers (`hasModuleAccess`, `hasViewCodeAccess`, `hasCapabilityViaModule`) funcionan
- [ ] Cache TTL 60s funciona (re-call dentro de TTL → no re-query)
- [ ] `__clearClientPortalResolverCache(orgId)` invalida correctamente
- [ ] Orphan module_key filtrado out (smoke: insertar assignment con module no en catálogo → resolver lo omite)
- [ ] Pilot expirado filtrado out (smoke: pilot con expires_at en pasado → omitido)
- [ ] `GET /api/client-portal/modules` 200 con array; 401 sin session; 403 con session no-cliente
- [ ] Resolver es server-only (import 'server-only' marker)
- [ ] Errors via `captureWithDomain('client_portal', ...)`
- [ ] 12+ tests pasan (idempotency, cache, concurrency, orphan, expired, empty, error path, helpers)
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/lib/client-portal` verde

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/client-portal/modules src/app/api/client-portal/modules`
- Smoke staging: `pnpm staging:request /api/client-portal/modules` con session cliente test → 200 + array

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo cruzado: TASK-826, TASK-827, TASK-828 desbloqueadas
- [ ] EPIC-015 progress actualizado

## Follow-ups

- Considerar single-flight pattern (Promise dedup) en V1.1 si emerge contention
- Considerar Redis cache en V1.2 si cardinalidad de orgs supera 1000

## Open Questions

- ¿Cache invalida desde `pause/resume/expire/churn` commands explícitamente o el TTL 60s es suficiente? Recomendación: invalidar explícito desde commands (TASK-826) — staleness max 60s + cache hit rate alto.
- ¿Resolver expone `pending` assignments? Recomendación: NO por default; opt-in via `includePending=true` para admin UI (TASK-826).
