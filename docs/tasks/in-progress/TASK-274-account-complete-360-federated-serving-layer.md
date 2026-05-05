# TASK-274 — Account Complete 360: capa de serving federada por facetas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress` (drift fix 2026-05-05 — folder + Lifecycle alineados; Phase F en curso con commits 5c3d0d11 + 6308564c)
- Priority: `P1`
- Impact: `Critico`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`, `platform`, `agency`, `finance`
- Blocked by: `none`
- Branch: `task/TASK-274-account-complete-360`
- Legacy ID: —
- GitHub Issue: —

## Summary

`organization_360` solo resuelve identidad de la cuenta (nombre, legal name, tax ID, spaces, memberships). Todos los datos operativos — P&L, revenue, costos, delivery, ICO, CRM, services, staff aug — se consultan via 8+ funciones separadas en `src/lib/account-360/`, cada una con sus propios JOINs y cadenas de resolucion `organization_id → space_id → client_id`. Esta task crea un **resolver federado por facetas** analogo a TASK-273 (Person Complete 360) que consolida todo bajo `getAccountComplete360(organizationId, facets[])` y un endpoint `GET /api/organization/{id}/360?facets=...`.

## Why This Task Exists

Para armar la vista completa de una cuenta/organizacion hoy se necesitan 6-8 queries separadas:

1. **Identidad** — `organization_360` view
2. **Economics** — `getOrganizationEconomics()` → `operational_pl_snapshots` + `client_economics` + `commercial_cost_attribution`
3. **Delivery/ICO** — `getOrganizationIcoSummary()` → ICO engine (BQ) + `ico_organization_metrics` (PG cache)
4. **Projects** — `getOrganizationProjects()` → `spaces` → BQ delivery projects
5. **Team** — `getOrganizationMemberships()` → `person_memberships` + `client_team_assignments` + `identity_profiles`
6. **Finance** — `getOrganizationFinanceSummary()` → `client_economics` + `client_profiles`
7. **Executive** — `getOrganizationExecutiveSnapshot()` → composite de economics + projects + operations + DTE
8. **CRM** — JOINs manuales via `hubspot_company_id`

Esto genera:

- **Duplicacion** — la cadena `org → spaces → client_ids` se resuelve en cada funcion
- **Performance** — el endpoint `/organizations/[id]/executive` hace ~5 queries secuenciales
- **Inconsistencia** — economics se calcula de una forma en el executive, de otra en finance
- **Fragilidad** — cada nueva vista de cuenta (Agency Spaces, Organization Detail, Client Economics) recrea JOINs
- **No composable** — no se pueden pedir "solo finance + ICO" sin cargar todo el executive snapshot

## Goal

- Un solo `getAccountComplete360(organizationId, facets[])` server-side que retorna el objeto completo o parcial
- Un endpoint `GET /api/organization/{id}/360?facets=identity,economics,delivery,team,finance,crm,services` que cualquier vista puede consumir
- El resolver resuelve `organization_id → space_ids[] → client_ids[]` **una sola vez** y lo pasa a cada faceta
- Cada faceta es un modulo independiente que se puede agregar sin modificar el resolver core
- Las funciones existentes en `src/lib/account-360/` se refactorizan como facetas del resolver

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — arquitectura general
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canonico 360
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person-org, grafos operativo vs estructural
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md` — business lines canonicas
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — modulo Finance: P&L engine, dual-store

Reglas obligatorias:

- `organization_id` es el anchor canonico para cuentas
- `space_id` → `client_id` es el bridge hacia datos legacy (assignments, finance, delivery)
- Datos de cuenta se leen de PostgreSQL first, BigQuery fallback
- No crear tablas nuevas — esto es un serving layer sobre datos existentes
- Las vistas serving existentes (`organization_360`, `client_360`, `operational_pl_snapshots`) se reutilizan
- Patron analogo a TASK-273 (Person Complete 360) — misma arquitectura de facetas

## Normative Docs

- `scripts/setup-postgres-organization-360.sql` — definicion actual de `organization_360`
- `scripts/setup-postgres-canonical-360.sql` — definicion de `client_360`, `client_capability_360`
- `src/lib/account-360/` — 8 archivos con funciones existentes de cuenta
- `src/lib/account-360/organization-economics.ts` — ejemplo de multi-query actual

## Dependencies & Impact

### Depends on

- `greenhouse_serving.organization_360` — vista base con spaces + people JSON (ya existe)
- `greenhouse_serving.operational_pl_snapshots` — P&L por scope (ya existe)
- `greenhouse_serving.commercial_cost_attribution` — costos por miembro/space (ya existe)
- `greenhouse_serving.ico_organization_metrics` — ICO metricas por org (ya existe)
- `greenhouse_finance.client_economics` — economics por client/period (ya existe)
- `greenhouse_finance.client_profiles` — perfiles financieros (ya existe)
- `greenhouse_delivery.projects` + `tasks` + `sprints` — delivery (ya existe)
- `greenhouse_crm.companies` + `deals` + `contacts` — CRM (ya existe)
- `greenhouse_core.services` + `client_service_modules` — servicios (ya existe)
- `greenhouse_delivery.staff_aug_placements` — staff aug (ya existe)
- TASK-273 (Person Complete 360) — patron analogo, puede compartir utilities

### Blocks / Impacts

- TASK-010 (Organization Economics Dashboard) — esta task la subsume parcialmente
- Agency Spaces view — consumidor principal
- Organization Detail view — consumidor principal
- Client Economics view — migra al resolver
- Finance Clients list — migra al resolver
- Futuras vistas de cuenta (client portal dashboard, org scorecard)

### Files owned

- `src/lib/account-360/account-complete-360.ts` — resolver principal (NUEVO)
- `src/lib/account-360/facets/` — modulos por faceta (NUEVO)
- `src/app/api/organization/[id]/360/route.ts` — endpoint API (NUEVO)
- `src/types/account-complete-360.ts` — tipos del objeto completo (NUEVO)

## Current Repo State

### Already exists

- `organization_360` VIEW con identity + spaces JSON + people JSON + counts
- `client_360` VIEW con client attributes + user count + module count
- `client_capability_360` VIEW con service modules por client
- `operational_pl_snapshots` tabla con P&L por scope (client/space/org) por periodo
- `client_economics` tabla con economics por client por periodo
- `ico_organization_metrics` tabla con ICO metricas por org por periodo
- `getOrganizationEconomics()` — economics completos con trend
- `getOrganizationExecutiveSnapshot()` — composite de todo
- `getOrganizationMemberships()` — team con FTE
- `getOrganizationProjects()` — projects por space
- `getOrganizationIcoSummary()` — ICO
- `getOrganizationFinanceSummary()` — finance summary
- `getOrganizationOperationalServing()` — ops metrics

### Gap

- No existe resolver federado — cada funcion hace sus propios JOINs y resolucion de org → spaces → clients
- No existe endpoint unificado `/api/organization/{id}/360`
- `org → space_ids → client_ids` se resuelve 4+ veces en distintas funciones
- CRM data no tiene serving view por org — se hace JOIN manual via `hubspot_company_id`
- Services por org no tienen serving view — solo `client_capability_360` a nivel client
- Staff aug placements por org no tienen faceta
- El executive snapshot es monolitico — no se pueden pedir facetas individuales

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Phase A — Core Resolver

#### Slice 1 — Types: definir AccountComplete360 con todas las facetas

Crear `src/types/account-complete-360.ts` con:

```typescript
type AccountComplete360 = {
  _meta: ResolverMeta                       // timing, cache status, version (shared type with TASK-273)
  identity: AccountIdentityFacet
  spaces?: AccountSpaceFacet[]
  team?: AccountTeamFacet
  economics?: AccountEconomicsFacet
  delivery?: AccountDeliveryFacet
  finance?: AccountFinanceFacet
  crm?: AccountCrmFacet
  services?: AccountServicesFacet
  staffAug?: AccountStaffAugFacet
}
```

`ResolverMeta` is the same shared type from TASK-273 — `{ resolvedAt, resolverVersion, facetsRequested, facetsResolved, timing, cacheStatus }`.

#### Slice 2 — Scope resolver: org → spaces → clients (centralizado)

Crear un utility que se ejecuta una sola vez al inicio del resolver:

```typescript
type AccountScope = {
  organizationId: string
  spaceIds: string[]
  clientIds: string[]
  hubspotCompanyId: string | null
}
```

Todas las facetas reciben `AccountScope` en vez de resolver las cadenas por su cuenta.

#### Slice 3 — Facet modules

Crear `src/lib/account-360/facets/`:

- `identity.ts` — lee de `organization_360` view
- `spaces.ts` — detalle de cada space (tipo, client bridge, status)
- `team.ts` — `person_memberships` + `client_team_assignments` + `person_360` (avatar, job title)
- `economics.ts` — `operational_pl_snapshots` + `client_economics` + margin calculation (refactor de `organization-economics.ts`)
- `delivery.ts` — projects/sprints counts + `ico_organization_metrics` + health scoring
- `finance.ts` — `client_profiles` + revenue summary + DTE coverage
- `crm.ts` — `crm.companies` + `deals` (pipeline, amounts) + `contacts` count
- `services.ts` — `services` + `client_service_modules` agrupados por business line
- `staffAug.ts` — `staff_aug_placements` por org, con status y billing

Cada modulo refactoriza la logica existente de `src/lib/account-360/organization-*.ts` en una funcion que recibe `AccountScope`.

#### Slice 4 — Resolver: `getAccountComplete360()`

Crear `src/lib/account-360/account-complete-360.ts` con facet registry:

```typescript
const FACET_REGISTRY: Record<AccountFacetName, FacetDefinition> = {
  identity:  { fetch: fetchIdentityFacet,  cacheTTL: 600,  sensitivityLevel: 'public'      },
  spaces:    { fetch: fetchSpacesFacet,    cacheTTL: 600,  sensitivityLevel: 'internal'    },
  team:      { fetch: fetchTeamFacet,      cacheTTL: 300,  sensitivityLevel: 'internal'    },
  economics: { fetch: fetchEconomicsFacet, cacheTTL: 300,  sensitivityLevel: 'confidential'},
  delivery:  { fetch: fetchDeliveryFacet,  cacheTTL: 300,  sensitivityLevel: 'internal'    },
  finance:   { fetch: fetchFinanceFacet,   cacheTTL: 600,  sensitivityLevel: 'confidential'},
  crm:       { fetch: fetchCrmFacet,       cacheTTL: 600,  sensitivityLevel: 'internal'    },
  services:  { fetch: fetchServicesFacet,  cacheTTL: 600,  sensitivityLevel: 'internal'    },
  staffAug:  { fetch: fetchStaffAugFacet,  cacheTTL: 600,  sensitivityLevel: 'confidential'},
}
```

The resolver resolves scope once, authorizes facets, executes in parallel, collects timing, and returns `_meta`.

#### Slice 5 — API endpoint: `GET /api/organization/[id]/360`

- Auth: `requireTenantContext`
- Query params: `facets` (comma-separated), `asOf` (ISO date), `limit` (per-collection cap), `cache` (`bypass` to force fresh)
- El `[id]` acepta `organization_id`, `public_id` (`EO-ORG...`), o `hubspot_company_id`
- Response headers: `X-Resolver-Version`, `X-Cache-Status`, `X-Timing-Ms`
- Error per-facet: si una faceta falla, las demas siguen

### Phase B — Enterprise Authorization

#### Slice 6 — Facet Authorization Engine

Crear `src/lib/account-360/facet-authorization.ts`:

```typescript
type AccountFacetAuthContext = {
  requesterRoleCodes: string[]
  requesterTenantType: string
  requesterOrganizationId: string | null
  targetOrganizationId: string
  requestedFacets: AccountFacetName[]
}
```

Reglas de autorizacion:

| Relacion | Facetas permitidas | Campos redactados |
|----------|-------------------|-------------------|
| `efeonce_admin` | TODAS | ninguno |
| `efeonce_operations` | TODAS excepto finance | economics.revenuePerFte |
| `same_org` + `client_executive` | identity, spaces, team, delivery, services | economics denegado, finance denegado |
| `same_org` + `finance_admin` | identity, spaces, team, economics, finance | staffAug denegado |
| `different_org` + no-admin | identity solamente | |

#### Slice 7 — Integration en el resolver

Misma mecanica que TASK-273: `authorizeFacets()` ANTES de ejecutar, field redaction DESPUES. `_meta.deniedFacets` y `_meta.redactedFields` reportados.

### Phase C — Caching Layer

#### Slice 8 — In-memory facet cache con TTL

Reutiliza la misma infraestructura de cache de TASK-273 (`src/lib/shared/facet-cache.ts` — shared module):

- Cache key: `account360:{organizationId}:{facetName}:{version}`
- TTL por faceta (del registry)
- Stale-while-revalidate
- `cache=bypass` param

#### Slice 9 — Cache invalidation via outbox events

| Evento | Faceta invalidada |
|--------|-------------------|
| `space.created/updated/deactivated` | `spaces`, `identity` |
| `assignment.created/updated` | `team` |
| `membership.created/deactivated` | `team` |
| `pl.snapshot.materialized` | `economics` |
| `income.created/updated` | `finance` |
| `delivery.project.synced` | `delivery` |
| `ico.metrics.materialized` | `delivery` |
| `crm.company.synced` | `crm` |
| `service.created/updated` | `services` |
| `placement.created/updated` | `staffAug` |

### Phase D — Bulk & Pagination

#### Slice 10 — Bulk resolver: `getAccountsComplete360()`

```typescript
export async function getAccountsComplete360(
  organizationIds: string[],
  facets: AccountFacetName[] = ['identity'],
  options?: { limit?: number }
): Promise<AccountComplete360[]>
```

- Batch scope resolution: un solo query para todos los org → spaces → clients
- Max 50 organizations por request
- Endpoint: `POST /api/organizations/360` con body `{ organizationIds, facets }`

#### Slice 11 — Sub-collection pagination

Default limits:

| Coleccion | Default | Max |
|-----------|---------|-----|
| `team.members` | 20 | 100 |
| `economics.trend` | 12 (meses) | 36 |
| `economics.byClient` | 20 | 100 |
| `delivery.taskCounts` | sin paginacion (aggregated) | — |
| `crm.dealsPipeline` | 10 | 50 |
| `services.activeServices` | 20 | 50 |
| `staffAug.placements` | 20 | 50 |

### Phase E — Observability & Temporal

#### Slice 12 — Observability: tracing por faceta

Mismo `ResolverTrace` type que TASK-273, logueado en Vercel runtime logs.

#### Slice 13 — Point-in-time queries

| Faceta | Point-in-time | Mecanismo |
|--------|--------------|-----------|
| `economics` | Si | `WHERE period_year/month` del `asOf` en `operational_pl_snapshots` |
| `delivery` | Si | `WHERE period_year/month` del `asOf` en `ico_organization_metrics` |
| `finance` | Parcial | revenue YTD calculado hasta `asOf` |
| `team` | Parcial | assignments con `WHERE start_date <= $asOf AND (end_date IS NULL OR end_date >= $asOf)` |
| `identity`, `spaces`, `crm`, `services` | No | siempre estado actual |

### Phase F — Consumer Migration

#### Slice 14 — Migrar Organization Detail al resolver

Reescribir las vistas de Organization Detail para consumir `GET /api/organization/{id}/360?facets=...` en vez de 6 fetches separados.

#### Slice 15 — Migrar Agency Spaces al resolver

Reescribir la vista de Agency Spaces para usar `POST /api/organizations/360` bulk con `facets=identity,economics,delivery,team`.

#### Slice 16 — Migrar Client Economics al resolver

Reescribir la vista de Client Economics para consumir la faceta `economics` del resolver.

## Out of Scope

- Redis / external cache — in-memory preparado para Redis si se necesita
- GraphQL — los facets son el building block para eso
- Reescribir `organization_360` VIEW — se reutiliza como faceta identity
- API publica/externa — solo consumo interno del portal
- Migrar TODAS las vistas en un solo PR — incremental por phase
- Real-time subscriptions (WebSocket) — futuro sobre cache invalidation

## Detailed Spec

### Account Scope Resolution (Slice 2)

El scope se resuelve **una sola vez** al inicio:

```sql
SELECT
  o.organization_id,
  o.hubspot_company_id,
  array_agg(DISTINCT s.space_id) AS space_ids,
  array_agg(DISTINCT s.client_id) FILTER (WHERE s.client_id IS NOT NULL) AS client_ids
FROM greenhouse_core.organizations o
LEFT JOIN greenhouse_core.spaces s ON s.organization_id = o.organization_id AND s.active = TRUE
WHERE o.organization_id = $1
GROUP BY o.organization_id, o.hubspot_company_id
```

### Sensitivity Levels

| Level | Significado | Quien puede ver |
|-------|------------|-----------------|
| `public` | Nombre, tipo, country | cualquier usuario autenticado |
| `internal` | Spaces, team, delivery, CRM, services | internal users (efeonce) |
| `confidential` | Economics, finance, costs, staff aug billing | admin + finance roles |

### Datos de cada faceta

**identity**: organizationId, publicId, name, legalName, taxId, taxIdType, industry, country, type, status, hubspotCompanyId, isOperatingEntity, legalAddress, spaceCount, membershipCount, uniquePersonCount, createdAt

**spaces**: spaceId, publicId, spaceName, spaceType, clientId, clientName, status, activeModuleCodes[], activeModuleCount

**team**: totalMembers, totalFte, members[{profileId, eoId, name, avatarUrl, jobTitle, department, fteAllocation, membershipType, isPrimary}], teamPagination{total, limit, offset, hasMore}

**economics**: currentPeriod{year, month, revenueCLP, laborCostCLP, directExpenseCLP, overheadCLP, totalCostCLP, grossMarginCLP, grossMarginPct, netMarginCLP, netMarginPct, headcountFte, revenuePerFte, costPerFte}, trend[{year, month, revenueCLP, grossMarginPct, headcountFte}], trendPagination{total, limit, offset}, byClient[{clientName, revenueCLP, costCLP, marginPct, fte}]

**delivery**: icoMetrics{rpaAvg, rpaMedian, otdPct, ftrPct, throughputCount, cycleTimeAvg, pipelineVelocity, stuckAssetCount, stuckAssetPct}, projectCount, activeProjectCount, sprintCount, taskCounts{total, completed, active, overdue, carryOver}

**finance**: clientProfiles[{clientId, legalName, currency, paymentTerms, requiresPo, requiresHes}], revenueYTD, invoiceCount, outstandingAmount, dteCoverage{coveredPct, uncoveredCount}, accountsReceivable{current, overdue30, overdue60, overdue90}

**crm**: company{hubspotId, name, lifecycleStage, industry, website, ownerName}, dealCount, openDealAmount, closedWonYTD, dealsPipeline[{dealName, stage, amount, currency, closeDate, ownerName}], contactCount

**services**: activeServices[{serviceId, publicId, name, businessLine, servicoEspecifico, modalidad, startDate, targetEndDate, status, billingFrequency, totalCost, currency}], byBusinessLine{globe, efeonce_digital, reach, wave, crm_solutions}, totalActiveCount, totalRevenue

**staffAug**: placements[{placementId, memberName, memberAvatarUrl, organizationName, status, lifecycleStage, billingRate, billingCurrency, contractStart, contractEnd, providerType, requiredSkills}], activePlacementCount, totalBillingRate, byCurrency[{currency, totalRate, count}]

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### Phase A — Core Resolver
- [ ] `getAccountComplete360(orgId, ['identity'])` retorna datos equivalentes a `organization_360` actual
- [ ] Todas las 9 facetas retornan datos correctos cuando se solicitan
- [ ] `_meta` incluye timing por faceta, resolverVersion, cacheStatus
- [ ] Si una faceta falla, las demas siguen — error reportado en `_meta.errors[]`
- [ ] Scope resolution `org → spaces → clients` ejecutada una sola vez (no por faceta)
- [ ] `GET /api/organization/{id}/360` acepta organization_id, public_id, y hubspot_company_id
- [ ] Response headers incluyen `X-Resolver-Version`, `X-Cache-Status`, `X-Timing-Ms`

### Phase B — Enterprise Authorization
- [ ] `efeonce_operations` NO puede ver faceta `finance` de una org
- [ ] `client_executive` de la misma org puede ver identity + spaces + team + delivery + services (no economics ni finance)
- [ ] `efeonce_admin` puede ver TODAS las facetas
- [ ] `finance_admin` puede ver economics + finance pero no staffAug
- [ ] Facetas denegadas se listan en `_meta.deniedFacets` con reason

### Phase C — Caching
- [ ] Second request retorna `cacheStatus: 'hit'` para facetas dentro de TTL
- [ ] Outbox event `pl.snapshot.materialized` invalida cache de economics
- [ ] `cache=bypass` fuerza fresh data

### Phase D — Bulk & Pagination
- [ ] `POST /api/organizations/360` con 20 orgIds retorna datos correctos en batch
- [ ] `team.members` respeta `limit` y `offset`
- [ ] `economics.trend` respeta `limit` (default 12 meses)

### Phase E — Observability & Temporal
- [ ] Cada request logea `ResolverTrace` en Vercel runtime logs
- [ ] `asOf=2026-03-01&facets=economics` retorna datos de marzo
- [ ] Faceta lenta se registra como warning

### Phase F — Consumer Migration
- [ ] Organization Detail usa el endpoint 360
- [ ] Agency Spaces usa bulk endpoint 360
- [ ] Client Economics usa la faceta economics del resolver
- [ ] `pnpm build`, `pnpm lint` pasan sin errores

## Verification

- `pnpm build` + `pnpm lint` + `npx tsc --noEmit`
- Verificacion E2E per phase:
  - Phase A: `pnpm staging:request /api/organization/{orgId}/360?facets=identity,economics,team,delivery` — datos correctos; comparar con `getOrganizationExecutiveSnapshot()` existente
  - Phase B: request como `efeonce_operations` pidiendo `finance` → denied; request como `efeonce_admin` → allowed
  - Phase C: 2 requests rapidos → segundo hit; create income → tercero miss para `finance`
  - Phase D: `POST /api/organizations/360` con 10 ids → 10 resultados
  - Phase E: verificar logs contienen `ResolverTrace`; `?asOf=2026-03-01&facets=economics` → datos de marzo
  - Phase F: navegar a Organization Detail — Network tab muestra 1 request al endpoint 360

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` con la arquitectura completa
- [ ] Crear `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md` — spec dedicada
- [ ] Deprecar `getOrganizationEconomics()`, `getOrganizationExecutiveSnapshot()`, etc. con JSDoc `@deprecated`
- [ ] Actualizar `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` con el endpoint 360

## Follow-ups

- Redis cache: migrar de in-memory a Redis cuando la escala lo requiera
- GraphQL: los facets son el building block
- Space-level 360: `getSpaceComplete360()` con el mismo patron para granularidad sub-org
- Client portal dashboard: el resolver sirve el dashboard del cliente con facetas filtradas
- Cross-object queries: persona → sus orgs → economics (requiere TASK-273 + TASK-274 coordinados)
- Real-time subscriptions: WebSocket push cuando una faceta cambia
- Audit trail: registrar en `audit_events` quien consulto que facetas de que organizacion

## Open Questions

- Scope resolver: si un org tiene spaces sin client_id, facetas finance/delivery quedan vacias. Aceptable? Propuesta: si — documentar en `_meta.warnings`.
- CRM join: `hubspot_company_id` vs `client_id`? Propuesta: COALESCE ambos.
- PG pool sizing: con bulk requests de 50 orgs x 9 facetas x 2 queries/faceta = ~900 queries. Pool default es 20. Verificar connection pooling de Cloud SQL Connector.
- Cache TTL tuning: los defaults son estimaciones. Ajustar post-deploy con metricas reales de `ResolverTrace`.
