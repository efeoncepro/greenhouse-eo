# TASK-274 — Account Complete 360: capa de serving federada por facetas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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

### Slice 1 — Types: definir AccountComplete360 con todas las facetas

Crear `src/types/account-complete-360.ts` con:

```typescript
type AccountComplete360 = {
  // Faceta core (siempre presente)
  identity: AccountIdentityFacet          // de organization_360

  // Facetas on-demand
  spaces?: AccountSpaceFacet[]            // spaces con client bridge
  team?: AccountTeamFacet                 // memberships + FTE + team members
  economics?: AccountEconomicsFacet       // P&L, revenue, margins, trend
  delivery?: AccountDeliveryFacet         // projects, sprints, ICO metrics
  finance?: AccountFinanceFacet           // client profiles, invoicing, DTE
  crm?: AccountCrmFacet                   // HubSpot company, deals, contacts
  services?: AccountServicesFacet         // active services, capabilities, BLs
  staffAug?: AccountStaffAugFacet         // placements, billing, contracts
}
```

### Slice 2 — Scope resolver: org → spaces → clients (centralizado)

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

### Slice 3 — Facet modules

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

### Slice 4 — Resolver: `getAccountComplete360()`

Crear `src/lib/account-360/account-complete-360.ts`:

```typescript
export async function getAccountComplete360(
  organizationId: string,
  facets: AccountFacetName[] = ['identity']
): Promise<AccountComplete360> {
  const identity = await fetchIdentityFacet(organizationId)
  const scope: AccountScope = {
    organizationId,
    spaceIds: identity.spaces.map(s => s.spaceId),
    clientIds: identity.spaces.map(s => s.clientId).filter(Boolean),
    hubspotCompanyId: identity.hubspotCompanyId
  }

  const [spaces, team, economics, delivery, finance, crm, services, staffAug] =
    await Promise.all([
      facets.includes('spaces') ? fetchSpacesFacet(scope) : undefined,
      facets.includes('team') ? fetchTeamFacet(scope) : undefined,
      facets.includes('economics') ? fetchEconomicsFacet(scope) : undefined,
      facets.includes('delivery') ? fetchDeliveryFacet(scope) : undefined,
      facets.includes('finance') ? fetchFinanceFacet(scope) : undefined,
      facets.includes('crm') ? fetchCrmFacet(scope) : undefined,
      facets.includes('services') ? fetchServicesFacet(scope) : undefined,
      facets.includes('staffAug') ? fetchStaffAugFacet(scope) : undefined,
    ])

  return { identity, spaces, team, economics, delivery, finance, crm, services, staffAug }
}
```

### Slice 5 — API endpoint: `GET /api/organization/[id]/360`

- Auth: `requireTenantContext` — admin o usuario de la organizacion
- Query param `facets` — comma-separated (default: `identity`)
- El `[id]` acepta `organization_id`, `public_id` (`EO-ORG...`), o `hubspot_company_id`
- Respuesta: `AccountComplete360` con solo las facetas solicitadas

### Slice 6 — Migrar Organization Detail al resolver

Reescribir las vistas de Organization Detail para consumir el endpoint 360 con las facetas necesarias en vez de 6 fetches separados.

### Slice 7 — Migrar Agency Spaces al resolver

Reescribir la vista de Agency Spaces para usar el resolver con `facets=identity,economics,delivery,team`.

## Out of Scope

- Crear tablas nuevas o materialized views
- Migrar BigQuery data a PostgreSQL
- Reescribir `organization_360` VIEW — se reutiliza como faceta identity
- Migrar TODAS las vistas de cuenta en un solo PR — incremental por slice
- Cache layer — optimizacion futura
- GraphQL — los facets son el building block para eso si se necesita despues

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

Cada faceta recibe `{ organizationId, spaceIds, clientIds, hubspotCompanyId }` y no necesita resolver la cadena.

### Datos de cada faceta

**identity**: organizationId, publicId, name, legalName, taxId, industry, country, type, status, hubspotCompanyId, spaceCount, membershipCount, uniquePersonCount

**spaces**: spaceId, publicId, spaceName, spaceType, clientId, clientName, status

**team**: totalMembers, totalFte, members[{profileId, name, avatarUrl, jobTitle, department, fteAllocation, membershipType}]

**economics**: currentPeriod{year, month, revenueCLP, laborCostCLP, directExpenseCLP, overheadCLP, totalCostCLP, grossMarginCLP, grossMarginPct, headcountFte, revenuePerFte}, trend[{year, month, revenueCLP, grossMarginPct}], byClient[{clientName, revenueCLP, costCLP, marginPct}]

**delivery**: icoMetrics{rpaAvg, otdPct, throughputCount, cycleTimeAvg, stuckAssetCount}, projectCount, activeProjectCount, sprintCount, taskCounts{total, completed, active, overdue}

**finance**: clientProfiles[{clientId, legalName, currency, paymentTerms}], revenueYTD, invoiceCount, outstandingAmount, dteCoverage{coveredPct, uncoveredCount}

**crm**: company{hubspotId, name, lifecycleStage, industry}, dealCount, dealsPipeline[{dealName, stage, amount, closeDate}], contactCount

**services**: activeServices[{serviceId, name, businessLine, modalidad, startDate, status}], byBusinessLine{globe, efeonce_digital, reach, wave, crm_solutions}, totalActiveCount

**staffAug**: placements[{placementId, memberName, status, billingRate, currency, contractStart, contractEnd}], activePlacementCount, totalBillingRate

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `getAccountComplete360(orgId, ['identity'])` retorna datos equivalentes a `organization_360` actual
- [ ] `getAccountComplete360(orgId, ['identity', 'economics'])` retorna P&L + margins + trend
- [ ] `getAccountComplete360(orgId, ['identity', 'team'])` retorna team con avatares y FTE
- [ ] `getAccountComplete360(orgId, ['identity', 'delivery'])` retorna ICO metrics + project/task counts
- [ ] `getAccountComplete360(orgId, ['identity', 'finance'])` retorna perfiles financieros + revenue YTD
- [ ] `getAccountComplete360(orgId, ['identity', 'crm'])` retorna company + deals + contacts
- [ ] `getAccountComplete360(orgId, ['identity', 'services'])` retorna servicios activos por BL
- [ ] `GET /api/organization/{orgId}/360?facets=identity,economics,team` retorna datos correctos
- [ ] Scope resolution `org → spaces → clients` ejecutada una sola vez (no por faceta)
- [ ] `pnpm build`, `pnpm lint` pasan sin errores

## Verification

- `pnpm build`
- `pnpm lint`
- `npx tsc --noEmit`
- Verificacion E2E: `pnpm staging:request /api/organization/{orgId}/360?facets=identity,economics,team,delivery`
- Verificacion: comparar output del resolver con output de `getOrganizationExecutiveSnapshot()` existente — deben coincidir
- Verificacion: agregar faceta nueva (mock) para confirmar extensibilidad

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` con la arquitectura del resolver
- [ ] Actualizar `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` con el endpoint 360
- [ ] Deprecar gradualmente las funciones individuales de `organization-*.ts` a favor de las facetas

## Follow-ups

- Cache layer: facetas de economics y delivery con TTL de 5 min
- Streaming: para dashboards que muestran KPIs progresivamente
- Person 360 + Account 360 cross-reference: persona → sus organizaciones → economics de cada una
- Client portal: el mismo resolver sirve el dashboard del cliente con facetas filtradas por permisos
- Space-level 360: si se necesita granularidad sub-org, crear `getSpaceComplete360()` con el mismo patron

## Open Questions

- El scope resolver usa `spaces.client_id` como bridge a datos legacy. Si un org tiene spaces sin client_id, esas facetas de finance/delivery quedaran vacias. Aceptable?
- CRM facet: usar `hubspot_company_id` como join key o resolver via `client_id`? Propuesta: ambos, COALESCE.
- Auth: un usuario de una organizacion puede ver economics de otra org? Propuesta: solo admin. Usuarios normales solo ven su propia org.
