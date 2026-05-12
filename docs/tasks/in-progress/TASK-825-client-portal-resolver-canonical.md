# TASK-825 — Client Portal Resolver Canonical + Helpers + Cache

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Implementacion v1.1 directo en develop (sin branch separada por instruccion operativa 2026-05-12). Spec v1.1 con 5 correcciones verdict aplicadas pre-Slice-1.`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `none` (TASK-824 cerrada 2026-05-12; schema + seed listos)
- Branch: `develop` (direct work, no feature branch — user override)

## Delta 2026-05-12 (tercera revisión — arch-architect verdict v1.1 aplicado pre-Slice-1)

5 correcciones estructurales al spec V1.0 original verificadas contra realidad post-cierre de TASK-822/823/824:

1. **Issue 1 (bloqueante)** — SQL del Detailed Spec usaba `m.business_line` pero TASK-824 V1.4 renombró la columna a `m.applicability_scope`. Query habría fallado con `column m.business_line does not exist` al primer run. **Fix**: rename en SQL + DTO `ResolvedClientPortalModule.businessLine` → `applicabilityScope`. Spec arquitectónica V1.4 §5.1 documenta el rationale (no duplicar enum del 360 canónico).

2. **Issue 2 (bloqueante)** — Spec usaba `requireClientSession` (TASK-823 helper) pero TASK-823 V1.1 verdict explícitamente lo eliminó (Issue 3): "Helper `requireClientSession` pre-emptive eliminado V1.0; inline check estilo TASK-553". `grep "requireClientSession" src/` → vacío. Endpoint scaffold no compilaba. **Fix**: clone verbatim el pattern de `account-summary/route.ts` (TASK-823 shipped) — `getServerAuthSession()` directo + null check + inline `tenantType` check + `NextResponse.json({error:redactErrorForResponse(err)}, {status})` + `captureWithDomain('client_portal', ...)`. Promover a `requireSessionByTenantType` genérico solo cuando emerja 2do BFF.

3. **Issue 3 (bloqueante)** — Contradicción interna: Delta block decía resolver vive en `readers/native/`, Detailed Spec + Files owned decían `modules/resolver.ts`. Spec V1.1 §3.1 canónica dictamina **`readers/native/`** para readers BFF-owned. La carpeta `modules/` ni existe en el repo (Slice 1 TASK-822 explícitamente eliminó folders pre-emptive). **Fix**: archivo único `src/lib/client-portal/readers/native/module-resolver.ts` con resolver + cache + 3 helpers + meta. NO sub-folders (helpers son 3 funciones triviales; `commands/` no se toca).

4. **Issue 4 (bloqueante invariant)** — TASK-822 V1.1 §3.1 hard rule: TODO archivo bajo `readers/{curated,native}/` exporta un `*Meta: ClientPortalReaderMeta`. Este resolver es el **primer reader native del BFF** — el invariant nace con esta task. `assertReaderMeta()` enforce que `classification:'native'` requiere `ownerDomain: null`. **Fix**: exportar `moduleResolverMeta: ClientPortalReaderMeta` desde el archivo del resolver + crear `native-meta.test.ts` clonando el pattern de `curated-meta.test.ts` (TASK-822 Slice 4).

5. **Issue 5 (polish architectural)** — Spec original requería "emit reliability signal `assignment.orphan_module_key` y `pilot_expired_not_actioned` desde el resolver". Anti-pattern: resolver es read hot-path (page load cada cliente), emitir signals desde ahí causa side effects en read (rompe línea 65 "Pure read, NO side-effects"), signal duplicate, overhead I/O. Pattern canónico Greenhouse (TASK-742+TASK-722+TASK-829): reliability signals los compute un reader **dedicado** en `src/lib/reliability/queries/` cron-paced desde `/admin/operations`. **Fix**: resolver SOLO filtra (no emite). Reliability signals dedicados los implementa TASK-829. Adicional: "orphan module_key" es naming confuso — el FK `module_assignments.module_key REFERENCES modules.module_key` enforce imposibilidad de orphan; lo que se filtra es `m.effective_to IS NULL` (módulo deprecated post-assignment). Renombrar comentarios + tests.

Adicionalmente, opciones dead-coded del original eliminadas:

- `asOf?: Date` option declarada pero NO usada en el SQL (que hardcodea `now()`). YAGNI. Si emerge temporal query V1.1 ("qué veía este cliente al 2026-04-01"), agregar con SQL conditional.

Single-flight Promise dedup queda en Follow-ups V1.1 como decisión consciente (cardinality V1.0 baja ~200 orgs × ~10 reads/min steady ⇒ ~5-10 DB queries/min; cache hit rate >90% post-warm), no pendiente olvidado.

## Delta 2026-05-12 — TASK-824 cerrada, sustrato DB listo

TASK-824 cerró 2026-05-12 con schema `greenhouse_client_portal` (3 tablas + 10 seed modules + ALTER `engagement_commercial_terms.bundled_modules`). Cuando arranque esta task:

- Las 3 tablas existen y están listas para queries del resolver: `modules` (10 seed), `module_assignments` (vacía hasta TASK-826 + TASK-828), `module_assignment_events` (vacía).
- Tipos Kysely regenerados en `src/types/db.d.ts` cubren las 3 tablas + `engagement_commercial_terms.bundled_modules`.
- Spec V1.4 canoniza: `applicability_scope` (no business_line), `organization_id TEXT` (no UUID), FK a `client_users` (no `users`), sin `default_for_business_lines`, view_codes/capabilities forward-looking en seed.
- `data_sources[]` parity test live activo desde TASK-824 Slice 2; este resolver consume datos del catalog confiado de que data_sources son válidos.

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

Implementa `resolveClientPortalModulesForOrganization` como **única fuente de verdad** para qué módulos ve un cliente. **Primer reader native del BFF** (TASK-822 V1.1 §3.1 hard rule: declara `ClientPortalReaderMeta` con `classification:'native', ownerDomain:null`). Pure read, in-process cache TTL 60s, helpers derivados (`hasModuleAccess`, `hasViewCodeAccess`, `hasCapabilityViaModule`), endpoint `GET /api/client-portal/modules`. Tests cache hit/miss + invalidation + edge cases (deprecated module filter, expired pilot filter, empty case, error path).

## Why This Task Exists

Sin resolver canónico, cada surface (menú, page guard, API gate) implementaría su propia lógica de "qué ve el cliente" — receta para divergencia. El resolver es el punto de control único: cualquier cambio en cómo se computa visibilidad pasa por ahí. Es prerequisito para TASK-826 (admin endpoints), TASK-827 (UI), TASK-828 (cascade), TASK-829 (reliability signals que detectan drift contra el resolver).

## Goal

- `src/lib/client-portal/readers/native/module-resolver.ts` (archivo único; sin folder split) exporta:
  - `resolveClientPortalModulesForOrganization`
  - 3 helpers derivados: `hasModuleAccess`, `hasViewCodeAccess`, `hasCapabilityViaModule`
  - `__clearClientPortalResolverCache(orgId?)` invalidator
  - `moduleResolverMeta: ClientPortalReaderMeta` (TASK-822 §3.1 invariant)
- In-process cache TTL 60s con invalidation key `organizationId` (pattern TASK-780 home_rollout_flags mirror)
- `GET /api/client-portal/modules` endpoint que devuelve resolver para `session.user.organizationId` (clone TASK-823 `account-summary` pattern: `getServerAuthSession()` directo + inline tenant check)
- Tests (12+): cache hit/miss, cache invalidation, deprecated module filter, expired pilot filter, empty case, error path, `assertReaderMeta(moduleResolverMeta)` no lanza, los 3 helpers, endpoint 200/401/403

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` V1.4 §3.1 (Module classification — native), §6 (Resolver Canonical)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (signals dedicados los implementa TASK-829, NO este resolver)
- Patrones canonizados que se replican:
  - **TASK-780 home_rollout_flags** (`src/lib/home/rollout-flags.ts:83-93`) — Map cache + TTL + invalidator shape verbatim
  - **TASK-553 shortcuts resolver** (`src/lib/shortcuts/resolver.ts`) — sessionToSubject + filter chain pattern
  - **TASK-823 `account-summary` endpoint** (`src/app/api/client-portal/account-summary/route.ts`) — `getServerAuthSession()` directo + inline tenant check mirror verbatim
  - **TASK-822 Slice 4 `curated-meta.test.ts`** — meta validation test pattern clone para `native-meta.test.ts`

Reglas obligatorias:

- Resolver es **server-only** (`import 'server-only'` al inicio del archivo)
- Pure read, NO side-effects (**NO emite reliability signals desde el resolver**; TASK-829 los implementa con readers dedicados cron-paced)
- Cache in-process per `organizationId` con TTL 60s; invalidator exportado `__clearClientPortalResolverCache(orgId?)`
- Filtra `m.effective_to IS NULL` (módulo deprecated post-assignment — el FK enforce que orphan module_key es imposible a nivel DB)
- Filtra `a.effective_to IS NULL` (assignment activo)
- Filtra `status IN ('active','pilot')` por default; `includePending=true` opt-in para admin UI (TASK-826)
- Filtra pilot expirado (`status='pilot' AND expires_at < now()`) inline en SQL — NO emite signal desde acá
- JOIN con catálogo activo para hidratar `applicability_scope` (V1.4 rename, NO `business_line`), `view_codes`, `capabilities`, `data_sources`
- Errors via `captureWithDomain(err, 'client_portal', { tags: { source: 'module_resolver' }, extra: { organizationId } })`
- API endpoint clona TASK-823 pattern: `getServerAuthSession()` directo + null check (401) + inline `tenantType` check (403) — **NO usa** `requireClientSession` (helper eliminado en TASK-823 V1.1)
- Exporta `moduleResolverMeta: ClientPortalReaderMeta` con `classification:'native'`, `ownerDomain:null`, `clientFacing:true`, `routeGroup:'client'`

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

- `src/lib/client-portal/readers/native/module-resolver.ts` — archivo único con resolver + cache + 3 helpers + `moduleResolverMeta`
- `src/lib/client-portal/dto/module.ts` — interface `ResolvedClientPortalModule` + `AssignmentSource` type union (export desde `dto/index.ts`)
- `src/app/api/client-portal/modules/route.ts` — endpoint clone TASK-823 shape
- `src/lib/client-portal/readers/native/module-resolver.test.ts` — resolver + cache + helpers + filter tests
- `src/lib/client-portal/readers/native/native-meta.test.ts` — clone `curated-meta.test.ts` (TASK-822 Slice 4) para validar `moduleResolverMeta` con `assertReaderMeta`
- `src/app/api/client-portal/__tests__/modules.test.ts` — endpoint integration (401/403/200/empty/reader-throws)

NO se crean (eliminados por verdict v1.1):

- ~~`src/lib/client-portal/modules/`~~ — carpeta no existe; canonical es `readers/native/` per spec V1.1 §3.1
- ~~`modules/cache.ts`~~ y ~~`modules/helpers.ts`~~ — cache + helpers inline en el archivo único del resolver (3 funciones triviales, no merece folder split)

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

- `src/lib/client-portal/dto/module.ts` con `ResolvedClientPortalModule` (incluye `applicabilityScope: string` — NO `businessLine`)
- `AssignmentSource` type union (`'lifecycle_case_provision'|'commercial_terms_cascade'|'manual_admin'|'self_service_request'|'migration_backfill'|'default_business_line'`)
- Export desde `src/lib/client-portal/dto/index.ts` + barrel `src/lib/client-portal/index.ts`

### Slice 2 — Resolver core + cache + helpers + meta (archivo único)

Archivo único `src/lib/client-portal/readers/native/module-resolver.ts` con:

- `resolveClientPortalModulesForOrganization(orgId, options?)` — pure read, SQL JOIN canónico filtrado
- `getCachedResolver(orgId)` / `setCachedResolver(orgId, data)` — inline cache helpers (Map TTL 60s, pattern TASK-780 mirror)
- `__clearClientPortalResolverCache(orgId?)` — invalidator (clear scoped o full)
- `hasModuleAccess(orgId, moduleKey)` / `hasViewCodeAccess(orgId, viewCode)` / `hasCapabilityViaModule(orgId, capability)` — 3 helpers reusan el resolver
- `moduleResolverMeta: ClientPortalReaderMeta` — `classification:'native'`, `ownerDomain:null`, `dataSources:['identity.organizations']`, `clientFacing:true`, `routeGroup:'client'`

Query SQL canónica (V1.4 columns):

```sql
SELECT
  a.assignment_id, a.module_key, a.status, a.source, a.expires_at,
  m.display_label, m.display_label_client, m.applicability_scope, m.tier,
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

NO se crea folder `modules/` ni `commands/` (anti-pattern pre-emptive eliminado en TASK-822 verdict). NO se emiten reliability signals desde el resolver (TASK-829 los implementa con readers dedicados).

### Slice 3 — Endpoint `GET /api/client-portal/modules` (clone TASK-823)

- Pattern: clone verbatim el shape de `src/app/api/client-portal/account-summary/route.ts` (TASK-823 shipped)
- `export const dynamic = 'force-dynamic'`
- `getServerAuthSession()` directo (NO `requireServerSession()` que redirige)
- `if (!session?.user?.userId)` → `NextResponse.json({error:'Unauthorized'}, {status:401})`
- `if (session.user.tenantType !== 'client')` → `NextResponse.json({error:'Not a client session'}, {status:403})`
- `if (!session.user.organizationId)` → `captureWithDomain` + 500 'Session incomplete'
- `try { const modules = await resolveClientPortalModulesForOrganization(orgId); return NextResponse.json(modules) } catch (err) { captureWithDomain(err, 'client_portal', {tags: {source:'api_endpoint', endpoint:'modules'}, extra:{orgId}}); return NextResponse.json({error:'Unable to load modules', detail: redactErrorForResponse(err)}, {status:500}) }`

### Slice 4 — Tests (12+)

- **Resolver unit tests** (`module-resolver.test.ts`):
  - Cache hit/miss: dos calls consecutivas → segundo es cache hit (no re-query)
  - Cache TTL expiry: avanzar mock clock 61s → próximo call refresca
  - Cache invalidation: `__clearClientPortalResolverCache(orgId)` → próximo call refresca
  - Cache scope: invalidate orgA NO afecta orgB
  - Deprecated module filter: módulo con `effective_to NOT NULL` → omitido (NO orphan — el FK enforce)
  - Expired pilot filter: pilot con `expires_at < now()` → omitido
  - Empty case: org sin assignments → `[]` (no error)
  - Error path: DB throws → `captureWithDomain` invocado + re-throw
  - 3 helpers: `hasModuleAccess` / `hasViewCodeAccess` / `hasCapabilityViaModule` retornan boolean correcto (cache hit warm)
  - `includePending=true` opt-in incluye `status='pending'` en resultado
- **Native meta test** (`native-meta.test.ts`, clone TASK-822 Slice 4 `curated-meta.test.ts`):
  - `assertReaderMeta(moduleResolverMeta)` no lanza
  - `moduleResolverMeta.classification === 'native'`
  - `moduleResolverMeta.ownerDomain === null`
  - `moduleResolverMeta.dataSources.length > 0`
- **Endpoint integration tests** (`modules.test.ts`, mirror TASK-823 `account-summary.test.ts`):
  - 401 sin session
  - 403 con session efeonce_internal
  - 500 con session client sin organizationId + Sentry capture verified
  - 200 happy path con array
  - 500 cuando resolver throws + payload sanitizado

## Out of Scope

- Admin endpoints — TASK-826
- Composition layer UI — TASK-827
- Cascade del lifecycle — TASK-828
- Reliability signals dedicados (`assignment.deprecated_module_referenced`, `pilot_expired_not_actioned`, etc.) — TASK-829 los implementa con readers cron-paced en `src/lib/reliability/queries/`. **El resolver NO los emite** (Issue 5 verdict v1.1 — anti-pattern emit signals desde read hot-path)
- Single-flight con Promise dedupe — V1.1 si emerge contention real. Cardinality V1.0 estimada ~200 orgs × ~10 reads/min steady ⇒ ~5-10 DB queries/min con cache hit rate >90% post-warm. Acceptable.
- `asOf?: Date` temporal query option — V1.1 si emerge consumer concreto (NO pre-emptive abstraction)
- `requireSessionByTenantType(allowed: TenantType[])` helper genérico — emerge cuando exista 2do BFF (partner_portal, vendor_portal). V1.0 mantiene inline check estilo TASK-553/823.

## Detailed Spec

Pattern canónico V1.0 — primer reader **native** del BFF; archivo único con resolver + cache + 3 helpers + meta. Replica el shape de TASK-780 home_rollout_flags (cache) + TASK-553 shortcuts (filter pattern) + TASK-822 §3.1 (meta declaration).

```ts
// src/lib/client-portal/readers/native/module-resolver.ts
import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ClientPortalReaderMeta } from '../../dto/reader-meta'
import type { ResolvedClientPortalModule } from '../../dto/module'

/**
 * TASK-825 — Resolver canónico del Client Portal BFF.
 *
 * **Single source of truth** para qué módulos ve un cliente. Toda surface
 * client-facing (menú, page guards, API gates) consume este resolver — NUNCA
 * lee `tenant_capabilities`, `business_line`, `tenant_type` directo.
 *
 * Primer reader **native** del BFF (TASK-822 V1.1 §3.1):
 *   - `classification: 'native'` (NO existe owner producer-domain)
 *   - `ownerDomain: null` (BFF-owned)
 *
 * Pure read. Cache TTL 60s in-process per `organizationId` (pattern TASK-780
 * home_rollout_flags mirror). Invalidador exportado para uso desde commands
 * TASK-826 post mutation.
 *
 * **NO emite reliability signals desde este path** (Issue 5 verdict v1.1
 * anti-pattern: read hot-path + side effects). Los signals dedicados
 * (`assignment.deprecated_module_referenced`, `pilot_expired_not_actioned`,
 * etc.) los implementa TASK-829 con readers cron-paced en
 * `src/lib/reliability/queries/`.
 */

// ─────────────────────────────────────────────────────────────
// Meta declaration (TASK-822 §3.1 invariant)
// ─────────────────────────────────────────────────────────────

export const moduleResolverMeta: ClientPortalReaderMeta = {
  key: 'module-resolver',
  classification: 'native',
  ownerDomain: null,
  dataSources: ['identity.organizations'],
  clientFacing: true,
  routeGroup: 'client'
}

// ─────────────────────────────────────────────────────────────
// In-process cache (pattern TASK-780 home_rollout_flags mirror)
// ─────────────────────────────────────────────────────────────

interface CacheEntry {
  readonly data: readonly ResolvedClientPortalModule[]
  readonly expiresAt: number
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

const getCachedResolver = (orgId: string): readonly ResolvedClientPortalModule[] | null => {
  const entry = cache.get(orgId)

  if (!entry) return null

  if (entry.expiresAt < Date.now()) {
    cache.delete(orgId)

    return null
  }

  return entry.data
}

const setCachedResolver = (orgId: string, data: readonly ResolvedClientPortalModule[]): void => {
  cache.set(orgId, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

export const __clearClientPortalResolverCache = (orgId?: string): void => {
  if (orgId) cache.delete(orgId)
  else cache.clear()
}

// ─────────────────────────────────────────────────────────────
// Resolver core
// ─────────────────────────────────────────────────────────────

interface RawRow {
  assignment_id: string
  module_key: string
  status: string
  source: string
  expires_at: Date | null
  display_label: string
  display_label_client: string
  applicability_scope: string
  tier: string
  view_codes: string[]
  capabilities: string[]
  data_sources: string[]
}

const SQL_BASE = `
  SELECT
    a.assignment_id, a.module_key, a.status, a.source, a.expires_at,
    m.display_label, m.display_label_client, m.applicability_scope, m.tier,
    m.view_codes, m.capabilities, m.data_sources
  FROM greenhouse_client_portal.module_assignments a
  JOIN greenhouse_client_portal.modules m ON m.module_key = a.module_key
  WHERE a.organization_id = $1
    AND a.effective_to IS NULL
    AND m.effective_to IS NULL
    AND (a.expires_at IS NULL OR a.expires_at > now())
`

const SQL_ACTIVE_ONLY = `${SQL_BASE} AND a.status IN ('active','pilot') ORDER BY m.tier, m.display_label`
const SQL_INCLUDING_PENDING = `${SQL_BASE} AND a.status IN ('active','pilot','pending') ORDER BY m.tier, m.display_label`

const toResolvedModule = (row: RawRow): ResolvedClientPortalModule => ({
  assignmentId: row.assignment_id,
  moduleKey: row.module_key,
  status: row.status as ResolvedClientPortalModule['status'],
  source: row.source as ResolvedClientPortalModule['source'],
  expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
  displayLabel: row.display_label,
  displayLabelClient: row.display_label_client,
  applicabilityScope: row.applicability_scope,
  tier: row.tier,
  viewCodes: row.view_codes,
  capabilities: row.capabilities,
  dataSources: row.data_sources
})

export interface ResolveModulesOptions {
  readonly includePending?: boolean
  readonly bypassCache?: boolean
}

export const resolveClientPortalModulesForOrganization = async (
  organizationId: string,
  options: ResolveModulesOptions = {}
): Promise<readonly ResolvedClientPortalModule[]> => {
  // includePending bypassea el cache (admin UI vista distinta)
  if (!options.bypassCache && !options.includePending) {
    const cached = getCachedResolver(organizationId)

    if (cached) return cached
  }

  try {
    const sql = options.includePending ? SQL_INCLUDING_PENDING : SQL_ACTIVE_ONLY
    const rows = await query<RawRow>(sql, [organizationId])
    const result: readonly ResolvedClientPortalModule[] = rows.map(toResolvedModule)

    if (!options.includePending) {
      setCachedResolver(organizationId, result)
    }

    return result
  } catch (err) {
    captureWithDomain(err, 'client_portal', {
      tags: { source: 'module_resolver', endpoint: 'resolve' },
      extra: { organizationId }
    })

    throw err
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers derivados (3 funciones triviales — reusan el resolver)
// ─────────────────────────────────────────────────────────────

export const hasModuleAccess = async (orgId: string, moduleKey: string): Promise<boolean> => {
  const modules = await resolveClientPortalModulesForOrganization(orgId)

  return modules.some(m => m.moduleKey === moduleKey)
}

export const hasViewCodeAccess = async (orgId: string, viewCode: string): Promise<boolean> => {
  const modules = await resolveClientPortalModulesForOrganization(orgId)

  return modules.some(m => m.viewCodes.includes(viewCode))
}

export const hasCapabilityViaModule = async (orgId: string, capability: string): Promise<boolean> => {
  const modules = await resolveClientPortalModulesForOrganization(orgId)

  return modules.some(m => m.capabilities.includes(capability))
}
```

```ts
// src/app/api/client-portal/modules/route.ts (clone TASK-823 account-summary shape)
import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { resolveClientPortalModulesForOrganization } from '@/lib/client-portal/readers/native/module-resolver'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

export const dynamic = 'force-dynamic'

export const GET = async () => {
  const session = await getServerAuthSession()

  if (!session?.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.tenantType !== 'client') {
    return NextResponse.json({ error: 'Not a client session' }, { status: 403 })
  }

  const organizationId = session.user.organizationId

  if (!organizationId) {
    captureWithDomain(
      new Error('client session missing organizationId'),
      'client_portal',
      {
        tags: { source: 'api_endpoint', endpoint: 'modules', stage: 'session_validation' },
        extra: { userId: session.user.userId }
      }
    )

    return NextResponse.json({ error: 'Session incomplete' }, { status: 500 })
  }

  try {
    const modules = await resolveClientPortalModulesForOrganization(organizationId)

    return NextResponse.json(modules)
  } catch (err) {
    captureWithDomain(err, 'client_portal', {
      tags: { source: 'api_endpoint', endpoint: 'modules' },
      extra: { organizationId }
    })

    return NextResponse.json(
      { error: 'Unable to load client portal modules', detail: redactErrorForResponse(err) },
      { status: 500 }
    )
  }
}
```

Notas del pattern:

- **NO `requireClientSession`** — ese helper fue eliminado en TASK-823 V1.1 verdict (Issue 3); clone el pattern inline de `account-summary/route.ts`.
- **NO `Response.json`** — convention repo `NextResponse.json` consistente.
- **`includePending` bypassea el cache** — admin UI puede pedir vista con pending; el cache mantiene la versión "active+pilot" optimizada para hot path cliente.
- **Cache scoped por `organizationId`** — `__clearClientPortalResolverCache(orgId)` invalida solo ese; TASK-826 commands llaman post-mutation.
- **Defense in depth `organizationId` null** — defensive Sentry capture si session cliente carece de organizationId (drift NextAuth callback), no 200 con shape vacía silenciosa.

## Acceptance Criteria

- [ ] `resolveClientPortalModulesForOrganization` exported desde `src/lib/client-portal/index.ts` via `readers/native/module-resolver.ts`
- [ ] 3 helpers (`hasModuleAccess`, `hasViewCodeAccess`, `hasCapabilityViaModule`) funcionan + cache hit warm
- [ ] `moduleResolverMeta: ClientPortalReaderMeta` exportado con `classification:'native'`, `ownerDomain:null`
- [ ] `assertReaderMeta(moduleResolverMeta)` no lanza (test en `native-meta.test.ts`)
- [ ] Cache TTL 60s funciona (re-call dentro de TTL → no re-query DB)
- [ ] `__clearClientPortalResolverCache(orgId)` invalida correctamente; scope orgA NO afecta orgB
- [ ] **Deprecated module filter** (NO orphan — FK enforce): assignment cuyo módulo tiene `effective_to NOT NULL` → omitido por resolver
- [ ] Pilot expirado filtrado out (smoke: pilot con `expires_at < now()` → omitido)
- [ ] `includePending=true` opt-in incluye `status='pending'` + bypassea el cache
- [ ] `GET /api/client-portal/modules` 200 con array; 401 sin session; 403 con session efeonce_internal; 500 con session client sin organizationId + Sentry capture
- [ ] Resolver es server-only (`import 'server-only'` marker al inicio)
- [ ] Errors via `captureWithDomain(err, 'client_portal', {tags:{source:'module_resolver'}, extra:{organizationId}})`
- [ ] **NO emite reliability signals desde el resolver** (verdict Issue 5); grep `signals\|reliability` en el archivo del resolver → cero matches semánticos
- [ ] Endpoint usa `getServerAuthSession()` directo (NO `requireClientSession` — helper eliminado en TASK-823 V1.1)
- [ ] `NextResponse.json` consistente (NO `Response.json`)
- [ ] SQL usa `m.applicability_scope` (NO `m.business_line` — TASK-824 V1.4 rename)
- [ ] DTO `ResolvedClientPortalModule` expone `applicabilityScope: string` (NO `businessLine`)
- [ ] 12+ tests pasan: cache hit/miss + invalidation + scope, deprecated filter, expired pilot filter, empty case, error path, 3 helpers, `assertReaderMeta` no lanza, endpoint 401/403/500/200/500-reader-throws, includePending bypassea cache
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/lib/client-portal src/app/api/client-portal` verde

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/client-portal/readers/native src/app/api/client-portal/__tests__/modules.test.ts`
- Smoke staging: `pnpm staging:request /api/client-portal/modules` con session cliente test → 200 + array (vacío hasta que TASK-826 introduzca commands para crear assignments)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo cruzado: TASK-826, TASK-827, TASK-828 desbloqueadas
- [ ] EPIC-015 progress actualizado

## Follow-ups

- **V1.1 candidate** — single-flight Promise dedup pattern si emerge contention real. Cardinality V1.0 estimada ~200 orgs × ~10 reads/min ⇒ ~5-10 DB queries/min con cache hit rate >90% post-warm. Si métricas reales muestran thundering herd, agregar inFlight `Map<string, Promise>` ~15 líneas.
- **V1.2 candidate** — Redis cache si cardinalidad de orgs supera 1000 o si emerge necesidad de cross-instance invalidation (Vercel serverless multi-region).
- **V1.1 candidate** — `requireSessionByTenantType(allowed: TenantType[])` helper genérico cuando exista 2do BFF (partner_portal, vendor_portal). Extrae el inline check actual de TASK-823 + TASK-825 + futuros.
- **V1.1 candidate** — `asOf?: Date` temporal query option si emerge consumer concreto ("qué veía este cliente al 2026-04-01" para audit). SQL conditional simple; NO pre-emptive.

## Open Questions

- (Resuelta por verdict v1.1) **Cache invalidation desde commands**: invalidar explícito desde commands (TASK-826) — staleness max 60s + cache hit rate alto + invalidation atómica con la mutación. Pattern canonizado en spec V1.4 §6.
- (Resuelta por verdict v1.1) **`includePending` exposure**: NO por default; opt-in via `includePending=true` para admin UI (TASK-826). `includePending=true` bypassea el cache (admin no quiere stale data en superficies de gestión).
- (Heredada de TASK-822 OQ-2) **Primer reader native del BFF**: ESTA task lo entrega (`moduleResolverMeta`). El `readers/native/README.md` (TASK-822) y el spec V1.1 §3.1 documentan la convención; este resolver es la materialización.
- (Heredada de TASK-824 contract) **Parity test view_codes + capabilities**: NO se implementa acá. TASK-827 entrega parity `view_codes[]`, TASK-826 entrega parity `capabilities[]`. Este resolver consume confiado de que `data_sources[]` parity (TASK-824 Slice 2) está activo y los otros emergen downstream.
