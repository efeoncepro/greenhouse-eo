# TASK-273 — Person Complete 360: capa de serving federada por facetas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete` (closed 2026-05-05 — Phases A-F shipped, GREENHOUSE_PERSON_COMPLETE_360_V1.md spec publicado, 3 legacy resolvers @deprecated, TASK-011 subsumida. Cleanup residual opcional: 2 API routes /api/my/{assignments,payroll} siguen consumiendo resolvers @deprecated — no bloquea cierre)
- Priority: `P1`
- Impact: `Critico`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementación — Phases A–E complete, Phase F (consumer migration) pending`
- Rank: `TBD`
- Domain: `data`, `platform`, `identity`
- Blocked by: `none`
- Branch: `task/TASK-273-person-complete-360`
- Legacy ID: —
- GitHub Issue: —

## Summary

`person_360` solo resuelve identidad (nombre, email, avatar, job title). Todos los demas datos de una persona — asignaciones, nomina, leave, delivery, costos, organizacion — viven en tablas separadas sin federacion. Cada API hace sus propios JOINs, duplicando logica y resolviendo `profile_id → member_id` de forma ad-hoc. Esta task crea una **capa de serving federada** que consolida todo bajo un solo resolver con facetas on-demand, eliminando las queries dispersas y habilitando un `GET /api/person/{id}/360?facets=...` enterprise.

## Why This Task Exists

Hoy para armar una vista completa de una persona se necesitan 4-6 queries a tablas distintas, cada una con su propia resolucion de identity → member, su propio mapeo de avatares, y su propio fallback. Esto genera:

1. **Duplicacion de logica** — `resolveAvatarUrl()` copiada en 3 archivos, `COALESCE(p360.resolved_display_name, ...)` repetido en 5+ queries
2. **Performance** — `/my/profile` hace 4 fetches paralelos porque no existe un solo endpoint que consolide
3. **Inconsistencia** — un endpoint resuelve el nombre de una forma, otro de otra
4. **Fragilidad** — cada nueva vista que necesite datos de persona recrea la misma cadena de JOINs
5. **Gap funcional** — Mi Perfil no puede mostrar proyectos, ICO, ni nomina porque no existe un serving layer que los unifique

El resultado esperado es que cualquier consumidor (My Profile, Admin User Detail, People Detail, Agency Team) pida una persona y reciba exactamente las facetas que necesita, sin queries ad-hoc.

## Goal

- Un solo `getPersonComplete360(profileId, facets[])` server-side que retorna el objeto completo o parcial
- Un endpoint `GET /api/person/{id}/360?facets=identity,assignments,leave,payroll,delivery,costs,organization` que cualquier vista puede consumir
- Todas las vistas existentes que consultan datos de persona migran al resolver (My Profile, Admin User Detail, People Detail)
- El resolver resuelve `profile_id → member_id` una sola vez y lo pasa a cada faceta
- Cada faceta es un modulo independiente que se puede agregar sin modificar el resolver core

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — arquitectura general
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canonico 360
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person-org
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — backbone 360 en Cloud SQL
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — estrategia PG + BQ

Reglas obligatorias:

- `identity_profiles.profile_id` es el anchor canonico — todo se une ahi
- `members.member_id` es el FK para datos HR/payroll/delivery — el resolver lo resuelve una vez
- Datos de persona se leen de PostgreSQL first, BigQuery fallback
- No crear tablas nuevas — esto es un serving layer sobre datos existentes
- Las vistas serving existentes (`person_360`, `person_hr_360`, `person_operational_360`) se reutilizan, no se duplican

## Normative Docs

- `migrations/20260405180048252_canonical-source-system-function-person360.sql` — definicion actual de `person_360`
- `src/lib/person-360/` — funciones existentes de persona
- `src/lib/people/get-person-detail.ts` — ejemplo de query multi-join actual
- `src/lib/person-360/get-person-finance.ts` — ejemplo de finance overview actual

## Dependencies & Impact

### Depends on

- `greenhouse_serving.person_360` — vista base de identidad (ya existe)
- `greenhouse_serving.person_operational_360` — metricas ICO por persona (ya existe)
- `greenhouse_serving.commercial_cost_attribution` — costos por persona (ya existe)
- `greenhouse_core.client_team_assignments` — asignaciones (ya existe)
- `greenhouse_hr.leave_balances` + `leave_requests` — HR leave (ya existe)
- `greenhouse_payroll.payroll_entries` + `compensation_versions` — nomina (ya existe)
- `greenhouse_delivery.projects` + `tasks` — delivery (ya existe)
- `greenhouse_core.person_memberships` — memberships organizacionales (ya existe)

### Blocks / Impacts

- TASK-011 (ICO Person 360 Integration) — esta task la subsume
- TASK-272 (My Profile) — consumidor principal, simplifica sus 4 fetches a 1
- Todas las vistas de persona (People Detail, Admin User Detail, Agency Team)
- Futuras vistas de persona (evaluaciones, career path, org chart)

### Files owned

- `src/lib/person-360/person-complete-360.ts` — resolver principal (NUEVO)
- `src/lib/person-360/facets/` — modulos por faceta (NUEVO)
- `src/app/api/person/[id]/360/route.ts` — endpoint API (NUEVO)
- `src/types/person-complete-360.ts` — tipos del objeto completo (NUEVO)

## Current Repo State

### Already exists

- `person_360` VIEW con ~50 columnas de identidad (4 facetas: identity, member, user, CRM)
- `person_hr_360` VIEW con datos HR + leave + compensation
- `person_operational_360` materialized table con ICO + capacity + costs por mes
- `person_finance_360` VIEW con payroll + expenses
- `getPersonFinanceOverviewFromPostgres()` en `src/lib/person-360/get-person-finance.ts`
- `getPersonRuntimeProfile()` en `src/lib/person-360/get-person-runtime.ts`
- `getPersonDetailFromPostgres()` en `src/lib/people/get-person-detail.ts`
- `toPersonProfileSummary()` en `src/lib/person-360/get-person-profile.ts`
- `resolveAvatarUrl()` duplicada en 3 archivos

### Gap

- No existe resolver federado — cada consumidor hace sus propios JOINs
- `person_360` solo cubre identidad (15 de 40+ columnas de `members`)
- `person_memberships` estaba en v1 de person_360, se quito en v2 — hay que reintroducirlo
- No existe endpoint unificado `/api/person/{id}/360`
- `resolveAvatarUrl` copiada en `get-person-profile.ts`, `my/organization/members/route.ts`, `my/assignments/route.ts`
- El salto `profile_id → member_id` se resuelve ad-hoc en cada query

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Phase A — Core Resolver

#### Slice 1 — Types: definir PersonComplete360 con todas las facetas

Crear `src/types/person-complete-360.ts` con:

```typescript
type PersonComplete360 = {
  _meta: ResolverMeta                     // timing, cache status, version
  identity: PersonIdentityFacet           // de person_360
  assignments?: PersonAssignmentFacet[]
  organization?: PersonOrganizationFacet
  leave?: PersonLeaveFacet
  payroll?: PersonPayrollFacet
  delivery?: PersonDeliveryFacet
  costs?: PersonCostFacet
  staffAug?: PersonStaffAugFacet
}

type ResolverMeta = {
  resolvedAt: string                      // ISO timestamp
  resolverVersion: string                 // semver, para backward compat
  facetsRequested: PersonFacetName[]
  facetsResolved: PersonFacetName[]
  timing: Record<PersonFacetName, number> // ms por faceta
  cacheStatus: Record<PersonFacetName, 'hit' | 'miss' | 'stale' | 'bypass'>
}
```

Cada faceta es una interface tipada. No exponer raw rows — transformar a la forma que la UI consume.

#### Slice 2 — Facet modules: un archivo por faceta

Crear `src/lib/person-360/facets/`:

- `identity.ts` — lee de `person_360` view, resuelve avatar URL. Es la base.
- `assignments.ts` — lee `client_team_assignments` + team members de `person_360` por space. Incluye `resolveAvatarUrl` centralizado.
- `organization.ts` — lee `person_memberships` + `organizations` + `spaces`
- `leave.ts` — lee `leave_balances` (saldos actuales) + `leave_requests` (resumen: pending, approved, last 5)
- `payroll.ts` — lee `compensation_versions` (current) + ultimo `payroll_entry`
- `delivery.ts` — lee `person_operational_360` para ICO metrics + counts de projects/tasks
- `costs.ts` — lee `commercial_cost_attribution` + `member_capacity_economics` periodo actual

Cada modulo exporta una funcion `fetchXxxFacet(memberId: string): Promise<XxxFacet>`.

#### Slice 3 — Resolver: `getPersonComplete360()`

Crear `src/lib/person-360/person-complete-360.ts` con facet registry pattern:

```typescript
const FACET_REGISTRY: Record<PersonFacetName, FacetDefinition> = {
  identity:     { fetch: fetchIdentityFacet,     requiresMemberId: false, cacheTTL: 300,  sensitivityLevel: 'public'      },
  assignments:  { fetch: fetchAssignmentsFacet,  requiresMemberId: true,  cacheTTL: 300,  sensitivityLevel: 'internal'    },
  organization: { fetch: fetchOrganizationFacet, requiresMemberId: false, cacheTTL: 600,  sensitivityLevel: 'public'      },
  leave:        { fetch: fetchLeaveFacet,        requiresMemberId: true,  cacheTTL: 120,  sensitivityLevel: 'personal'    },
  payroll:      { fetch: fetchPayrollFacet,      requiresMemberId: true,  cacheTTL: 3600, sensitivityLevel: 'confidential'},
  delivery:     { fetch: fetchDeliveryFacet,     requiresMemberId: true,  cacheTTL: 300,  sensitivityLevel: 'internal'    },
  costs:        { fetch: fetchCostsFacet,        requiresMemberId: true,  cacheTTL: 600,  sensitivityLevel: 'confidential'},
  staffAug:     { fetch: fetchStaffAugFacet,     requiresMemberId: true,  cacheTTL: 600,  sensitivityLevel: 'confidential'},
}
```

El resolver resuelve `profile_id → member_id` **una sola vez**, ejecuta facetas en paralelo, recolecta timing, y retorna `_meta`.

#### Slice 4 — API endpoint: `GET /api/person/[id]/360`

- Auth: `requireTenantContext`
- Query params: `facets` (comma-separated), `asOf` (ISO date, point-in-time), `limit` (per-collection cap)
- El `[id]` acepta `profile_id`, `member_id`, `user_id`, `eo_id`, o `me`
- Response headers: `X-Resolver-Version`, `X-Cache-Status`, `X-Timing-Ms`
- Error per-facet: si una faceta falla, las demas siguen — el error se reporta en `_meta`

#### Slice 5 — Centralizar `resolveAvatarUrl`

Mover a `src/lib/person-360/resolve-avatar.ts` y eliminar las 3 copias. Todos los facets importan de ahi.

### Phase B — Enterprise Authorization

#### Slice 6 — Facet Authorization Engine

Crear `src/lib/person-360/facet-authorization.ts`:

```typescript
type FacetAuthorizationContext = {
  requesterProfileId: string
  requesterRoleCodes: string[]
  requesterTenantType: string
  targetProfileId: string
  targetOrganizationId: string | null
  requestedFacets: PersonFacetName[]
}

type FacetAuthorizationResult = {
  allowedFacets: PersonFacetName[]
  deniedFacets: { facet: PersonFacetName; reason: string }[]
  fieldRedactions: Record<PersonFacetName, string[]>  // campos a omitir dentro de una faceta permitida
}
```

Reglas de autorizacion:

| Relacion | Facetas permitidas | Campos redactados |
|----------|-------------------|-------------------|
| `self` (me) | TODAS | ninguno |
| `same_org` + `collaborator` | identity, assignments, organization, delivery | payroll.baseSalary, costs.* |
| `same_org` + `hr_manager` | TODAS excepto costs | payroll completo |
| `same_org` + `efeonce_admin` | TODAS | ninguno |
| `different_org` + `efeonce_admin` | TODAS | ninguno |
| `different_org` + cualquier otro | identity solamente | phone, email parcial |
| `client` tenant | identity, assignments, delivery | todo lo demas denegado |

Field-level redaction: el resolver recibe el `FacetAuthorizationResult` y aplica redacciones antes de retornar. Los campos redactados se reemplazan con `null` y se listan en `_meta.redactedFields`.

#### Slice 7 — Integration en el resolver

El resolver llama a `authorizeFacets()` ANTES de ejecutar las facetas. Solo ejecuta las permitidas. Los campos redactados se aplican DESPUES de ejecutar la faceta (post-processing).

```typescript
const authResult = await authorizeFacets({ requester, target, requestedFacets })
// Solo ejecutar facetas permitidas
const resolvedFacets = authResult.allowedFacets
// Post-process: redactar campos
applyFieldRedactions(result, authResult.fieldRedactions)
// Agregar denied info a _meta
result._meta.deniedFacets = authResult.deniedFacets
```

### Phase C — Caching Layer

#### Slice 8 — In-memory facet cache con TTL

Crear `src/lib/person-360/facet-cache.ts`:

- Cache key: `person360:{profileId}:{facetName}:{version}`
- TTL por faceta (definido en registry): identity 5min, payroll 1h, delivery 5min, leave 2min
- Storage: `Map<string, { data, expiresAt, resolvedAt }>` in-process (sin Redis — escalable a Redis despues)
- Stale-while-revalidate: si el cache esta stale (<2x TTL), retorna stale + dispara revalidation en background
- Cache bypass: query param `cache=bypass` para forzar fresh data
- Cache status reportado en `_meta.cacheStatus` por faceta

#### Slice 9 — Cache invalidation via outbox events

Crear `src/lib/person-360/facet-cache-invalidation.ts`:

Escuchar eventos del outbox para invalidar facetas especificas:

| Evento | Faceta invalidada |
|--------|-------------------|
| `assignment.created/updated/deactivated` | `assignments` |
| `leave.request.created/approved/rejected` | `leave` |
| `payroll.entry.created/closed` | `payroll` |
| `compensation.version.created` | `payroll`, `costs` |
| `membership.created/deactivated` | `organization` |
| `delivery.task.synced` | `delivery` |
| `identity.profile.updated` | `identity` |

Integracion con el reactive worker existente: registrar un handler en el outbox consumer que llama a `invalidateFacetCache(profileId, facetName)`.

### Phase D — Bulk & Pagination

#### Slice 10 — Bulk resolver: `getPersonsComplete360()`

Crear `src/lib/person-360/person-complete-360-bulk.ts`:

```typescript
export async function getPersonsComplete360(
  profileIds: string[],
  facets: PersonFacetName[] = ['identity'],
  options?: { limit?: number; offset?: number }
): Promise<PersonComplete360[]>
```

- Batch identity resolution: un solo query `WHERE profile_id IN (...)` en vez de N queries
- Batch facet fetching: cada faceta recibe `memberId[]` y retorna `Map<memberId, FacetData>`
- Limit: max 100 personas por request
- Authorization: `authorizeFacets()` ejecutado una vez con el requester, aplicado a todos los targets (mismas reglas para todos en el batch)

Endpoint: `POST /api/persons/360` con body `{ profileIds: string[], facets: string[] }`

#### Slice 11 — Sub-collection pagination

Cada faceta con colecciones anidadas soporta paginacion:

```typescript
type PersonLeaveFacet = {
  balances: LeaveBalance[]                            // siempre completo (max ~10 tipos)
  recentRequests: LeaveRequestSummary[]               // paginado
  recentRequestsPagination: { total: number; limit: number; offset: number; hasMore: boolean }
  summary: LeavesSummary
}
```

Query params en el endpoint: `leave.requests.limit=5&leave.requests.offset=0`

Default limits por sub-coleccion:

| Coleccion | Default | Max |
|-----------|---------|-----|
| `assignments[].teamMembers` | 10 | 50 |
| `leave.recentRequests` | 5 | 50 |
| `delivery.ownedProjects` | 10 | 50 |
| `costs.allocationsBySpace` | 20 | 100 |

### Phase E — Observability & Temporal

#### Slice 12 — Observability: tracing por faceta

Cada invocacion del resolver registra:

```typescript
type ResolverTrace = {
  traceId: string
  profileId: string
  requestedFacets: string[]
  resolvedFacets: string[]
  deniedFacets: string[]
  timingMs: Record<string, number>
  totalMs: number
  cacheHits: number
  cacheMisses: number
  errors: { facet: string; error: string }[]
  requesterUserId: string
  timestamp: string
}
```

- Logging: `console.info('[person-360-resolver]', JSON.stringify(trace))` — capturado por Vercel runtime logs
- Metricas: si una faceta excede su p95 (ej: payroll > 200ms), se registra como warning
- Dashboard: `/admin/ops/360-health` muestra p50/p95/p99 de cada faceta (futuro, via Vercel log drain)

#### Slice 13 — Point-in-time queries (temporal)

Facetas que soportan consulta historica reciben `asOf?: string` (ISO date):

| Faceta | Point-in-time soportado | Mecanismo |
|--------|------------------------|-----------|
| `payroll` | Si | `WHERE period_year = EXTRACT(YEAR FROM $asOf) AND period_month = EXTRACT(MONTH FROM $asOf)` |
| `costs` | Si | `WHERE period_year/period_month` del `asOf` |
| `delivery` | Si | `WHERE period_year/period_month` del `asOf` via `person_operational_360` |
| `leave` | Parcial | `WHERE year = EXTRACT(YEAR FROM $asOf)` para balances |
| `assignments` | Parcial | `WHERE start_date <= $asOf AND (end_date IS NULL OR end_date >= $asOf)` |
| `identity` | No | siempre estado actual (snapshot historico requiere audit_events, futuro) |

Query param: `GET /api/person/{id}/360?facets=payroll,costs&asOf=2026-03-15`

### Phase F — Consumer Migration

#### Slice 14 — Migrar MyProfileView al resolver

Reescribir `MyProfileView` para usar un solo fetch:

```
GET /api/person/me/360?facets=identity,assignments,leave,organization
```

Elimina los 4 fetches paralelos actuales.

#### Slice 15 — Migrar Admin User Detail al resolver

Reescribir `getPersonDetailFromPostgres()` y relacionadas para usar:

```
GET /api/person/{profileId}/360?facets=identity,assignments,leave,payroll,delivery,costs,organization
```

#### Slice 16 — Migrar People Detail al resolver

Reescribir la vista de People Detail para consumir el endpoint 360.

## Out of Scope

- Redis / external cache — in-memory es suficiente para la escala actual, preparado para Redis si se necesita
- GraphQL — los facets son el building block; GraphQL es una capa futura sobre el mismo resolver
- Reescribir `person_360` VIEW — se reutiliza tal cual como faceta identity
- API publica/externa — solo consumo interno del portal
- Migrar TODAS las vistas en un solo PR — incremental por phase/slice
- Real-time subscriptions (WebSocket) — futuro sobre cache invalidation

## Detailed Spec

### Resolution de identidad flexible

| Input | Resolucion |
|-------|-----------|
| `profile_id` (`identity-...`) | directo |
| `member_id` (`julio-reyes`) | `members.identity_profile_id` |
| `user_id` (`user-efeonce-...`) | `client_users.identity_profile_id` |
| `eo_id` (`EO-ID0001`) | `identity_profiles.public_id` |
| `me` | `tenant.identityProfileId` del session |

### Sensitivity Levels

| Level | Significado | Quien puede ver |
|-------|------------|-----------------|
| `public` | Nombre, cargo, departamento, avatar | cualquier usuario autenticado |
| `internal` | Asignaciones, delivery metrics | misma organizacion |
| `personal` | Leave requests, balances | self + HR + admin |
| `confidential` | Salario, costos, compensation | self + admin + finance |

### Datos de cada faceta

**identity**: resolvedDisplayName, resolvedEmail, resolvedPhone, resolvedAvatarUrl, resolvedJobTitle, departmentName, jobLevel, employmentType, hireDate, contractType, payRegime, locationCity, locationCountry, timezone, hasMemberFacet, hasUserFacet, hasCrmFacet, linkedSystems[], activeRoleCodes[], eoId, biography, seniorityLevel

**assignments**: assignmentId, clientId, clientName, fteAllocation, hoursPerMonth, contractedHoursMonth, roleTitle, assignmentType, startDate, endDate, active, teamMembers[{name, avatarUrl}]

**organization**: memberships[{membershipId, organizationId, organizationName, spaceName, spaceType, membershipType, roleLabel, department, isPrimary, startDate}], primaryOrganization{id, publicId, name, legalName, industry, country}

**leave**: balances[{leaveTypeCode, leaveTypeName, year, allowance, progressiveExtra, carriedOver, adjustments, used, reserved, available}], recentRequests[{requestId, leaveTypeName, startDate, endDate, requestedDays, status, startPeriod, endPeriod, reason, createdAt}], recentRequestsPagination{total, limit, offset, hasMore}, summary{totalPending, totalApproved, totalUsedThisYear, totalAvailableVacation}

**payroll**: currentCompensation{currency, baseSalary, remoteAllowance, colacion, movilizacion, fixedBonus, totalComp, payRegime, contractType, afpName, healthSystem, effectiveFrom}, lastEntry{periodYear, periodMonth, grossTotal, netTotal, status, workingDays, daysPresent, daysAbsent, daysOnLeave}, compensationHistory[{version, effectiveFrom, baseSalary, currency, changeReason}]

**delivery**: icoMetrics{rpaAvg, rpaMedian, otdPct, ftrPct, throughputCount, cycleTimeAvg, pipelineVelocity, stuckAssetCount}, projectCount, activeTaskCount, completedTaskCount, overdueTaskCount, ownedProjects[{name, status, clientName, onTimePct, avgRpa}]

**costs**: currentPeriod{year, month, loadedCostTarget, laborCostTarget, directOverhead, sharedOverhead, costPerHour, utilizationPct, capacityHealth, contractedHours, assignedHours, usedHours}, allocationsBySpace[{clientName, fteContribution, commercialLoadedCost, allocationRatio}]

**staffAug**: placements[{placementId, clientName, organizationName, status, lifecycleStage, billingRate, billingCurrency, contractStart, contractEnd, requiredSkills, matchedSkills}], activePlacementCount

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### Phase A — Core Resolver
- [ ] `getPersonComplete360('identity-xxx', ['identity'])` retorna datos equivalentes a `person_360` actual
- [ ] Todas las 8 facetas retornan datos correctos cuando se solicitan
- [ ] `_meta` incluye timing por faceta, facetsRequested, facetsResolved, resolverVersion
- [ ] Si una faceta falla, las demas siguen — el error se reporta en `_meta.errors[]`
- [ ] `GET /api/person/{id}/360` acepta profile_id, member_id, user_id, eo_id, y `me`
- [ ] Response headers incluyen `X-Resolver-Version`, `X-Cache-Status`, `X-Timing-Ms`
- [ ] `resolveAvatarUrl` centralizada en un solo archivo, sin copias

### Phase B — Enterprise Authorization
- [ ] Collaborator de misma org NO puede ver facetas `payroll` ni `costs` de otro colega
- [ ] HR manager de misma org SI puede ver faceta `payroll` (sin `costs`)
- [ ] Admin puede ver TODAS las facetas de cualquier persona
- [ ] Self (`me`) puede ver TODAS sus propias facetas
- [ ] Cliente solo puede ver `identity` + `assignments` + `delivery` de miembros asignados
- [ ] Campos redactados se reemplazan con `null` y se listan en `_meta.redactedFields`
- [ ] Facetas denegadas se listan en `_meta.deniedFacets` con reason

### Phase C — Caching
- [ ] Facetas con TTL activo retornan `cacheStatus: 'hit'` en `_meta`
- [ ] Cache invalidation funciona: al crear leave request, faceta `leave` se invalida
- [ ] `cache=bypass` query param fuerza fresh data
- [ ] Stale-while-revalidate: retorna stale + dispara revalidation en background

### Phase D — Bulk & Pagination
- [ ] `POST /api/persons/360` con 30 profileIds retorna datos correctos en batch
- [ ] Sub-colecciones respetan `limit` y `offset` parameters
- [ ] `recentRequestsPagination.hasMore` reporta correctamente si hay mas items

### Phase E — Observability & Temporal
- [ ] Cada request logea `ResolverTrace` en Vercel runtime logs
- [ ] `asOf` parameter retorna datos del periodo solicitado (payroll, costs, delivery)
- [ ] Faceta con p95 > threshold se registra como warning

### Phase F — Consumer Migration
- [ ] MyProfileView usa un solo fetch al endpoint 360
- [ ] Admin User Detail usa el endpoint 360
- [ ] People Detail usa el endpoint 360
- [ ] `pnpm build`, `pnpm lint` pasan sin errores

## Verification

- `pnpm build` + `pnpm lint` + `npx tsc --noEmit`
- Verificacion E2E per phase:
  - Phase A: `pnpm staging:request /api/person/me/360?facets=identity,assignments,leave,organization` — datos correctos
  - Phase B: request como collaborator pidiendo `payroll` → denied en `_meta`; request como admin → allowed
  - Phase C: request 2 veces rapido → segundo retorna `cacheStatus: 'hit'`; crear leave request → tercer request retorna `cacheStatus: 'miss'`
  - Phase D: `POST /api/persons/360` con 10 ids → 10 resultados; `leave.requests.limit=2` → max 2 requests
  - Phase E: verificar logs en Vercel contienen `ResolverTrace`; `?asOf=2026-03-01&facets=payroll` → datos de marzo
  - Phase F: navegar a `/my/profile` — Network tab muestra 1 request al endpoint 360 (no 4)

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` con la arquitectura completa del resolver federado
- [ ] Crear `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md` — spec dedicada del serving layer
- [ ] Actualizar `docs/documentation/plataforma/mi-perfil.md` con el nuevo data source
- [ ] Marcar TASK-011 (ICO Person 360 Integration) como subsumida
- [ ] Deprecar `getPersonFinanceOverviewFromPostgres()`, `getPersonDetailFromPostgres()`, `getPersonRuntimeProfile()` con JSDoc `@deprecated`

## Follow-ups

- Redis cache: cuando la escala requiera cache distribuido, migrar `facet-cache.ts` de in-memory a Redis
- GraphQL: los facets son el building block para un resolver GraphQL sobre las mismas facetas
- Person 360 VIEW v3: extender la VIEW con los ~25 campos de `members` que faltan
- Real-time subscriptions: WebSocket push cuando una faceta cambia
- Audit trail: registrar en `audit_events` quien consulto que facetas de quien
- Cross-object: persona → sus organizaciones → economics de cada una (requiere TASK-274)

## Open Questions

- Performance: con todas las facetas, son ~8 queries paralelas. PG pool default es 20 connections. Con 10 usuarios concurrentes son 80 queries simultaneas — verificar pool sizing.
- Cache TTL tuning: los defaults propuestos (identity 5min, payroll 1h) son estimaciones. Ajustar basado en metricas reales post-deploy.
- Field redaction granularity: redactar `baseSalary` pero mostrar `totalComp` range? O todo-o-nada per faceta? Propuesta: per-field, no per-faceta.
