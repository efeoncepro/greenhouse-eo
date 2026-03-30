# TASK-050 - Finance Client Canonical Runtime Cutover

## Delta 2026-03-30

- El write path de `Finance Clients` ya no queda completamente anclado a BigQuery:
  - `POST /api/finance/clients`
  - `PUT /api/finance/clients/[id]`
  - `POST /api/finance/clients/sync`
  ahora corren Postgres-first sobre `greenhouse_finance.client_profiles`.
- Baseline runtime nuevo:
  - `getFinanceClientProfileFromPostgres()`
  - `upsertFinanceClientProfileInPostgres()`
  - `syncFinanceClientProfilesFromPostgres()`
- El remanente real de esta lane ya no es write-path sino read-path:
  - list/detail y enrichment de `Finance Clients` siguen usando lecturas BigQuery-first e híbridas
  - el resolver `resolveFinanceClientContext()` conserva fallback BigQuery explícito por compatibilidad
- Este delta fue absorbido por el trabajo de `TASK-166`; no reabre la task, pero sí cambia el estado real del gap.

## Delta 2026-03-30 — cierre real del read path

- `GET /api/finance/clients` y `GET /api/finance/clients/[id]` ya intentan resolver la surface completa desde PostgreSQL primero:
  - `greenhouse_core.clients`
  - `greenhouse_finance.client_profiles`
  - `greenhouse_crm.companies`
  - `greenhouse_crm.deals`
  - `greenhouse_core.v_client_active_modules`
  - `greenhouse_finance.income`
- BigQuery queda solo como fallback explícito cuando el carril Postgres no está disponible o no está listo.
- El request path principal de `Finance Clients` ya no nace desde `greenhouse.clients`, `greenhouse.fin_client_profiles` ni `greenhouse_conformed.crm_*`.
- Con esto, el drift histórico de esta task queda resuelto: el runtime principal sí quedó cortado al grafo canónico actual.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Cerrada`
- Rank: `38`
- Domain: `finance`
- GitHub Project: `Greenhouse Delivery`

## Summary

Cortar las superficies de `Finance Clients` al grafo canónico actual del portal para que la identidad de cliente, el billing profile y el bridge hacia organización dejen de depender primariamente del runtime legacy en BigQuery.

La meta no es borrar BigQuery de un día para otro, sino mover el request path principal a `greenhouse_core`, `greenhouse_finance` y `greenhouse_crm`, dejando fallback explícito solo donde todavía sea necesario.

## Why This Task Exists

Las rutas de `Finance Clients` y el resolver canónico de Finance siguen leyendo tablas legacy de BigQuery:

- `projectId.greenhouse.clients`
- `projectId.greenhouse.fin_client_profiles`
- `projectId.greenhouse_conformed.crm_companies`
- `projectId.greenhouse.client_service_modules`

Eso contradice el placement del modelo actual, donde el runtime canónico ya vive en PostgreSQL y el bridge de organización/cliente se resuelve sobre `greenhouse_core`.

Mientras este cutover no ocurra:

- Finance sostiene su propia visión del cliente
- `organization_id` se deriva tarde y por compatibilidad
- las superficies ejecutivas de org y finance no comparten una ancla suficientemente homogénea

## Goal

- Hacer `Finance Clients` Postgres-first sobre el grafo canónico actual
- Unificar la resolución `clientId -> clientProfile -> organizationId` con `greenhouse_core` y `greenhouse_finance`
- Mantener CRM y service-module enrichment sin volver a convertirlos en identidad primaria
- Dejar fallback legado explícito y observable, no silencioso

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md`

Reglas obligatorias:

- `client_id` debe seguir siendo la ancla canónica de cliente
- `client_profile` sigue siendo extensión Finance, no identidad paralela del tenant
- `hubspot_company_id` y enrichments CRM siguen siendo referencias de apoyo, no source of truth del request path
- el bridge hacia `organization_id` debe converger con `Account 360`, no recomputarse por caminos divergentes

## Dependencies & Impact

### Depends on

- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/clients/sync/route.ts`
- `src/lib/finance/canonical.ts`
- `src/lib/account-360/organization-identity.ts`
- `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md`

### Impacts to

- `TASK-015 - Financial Intelligence Layer`
- `TASK-044 - Organization Executive Snapshot`
- consumers que dependan de client profile, receivables o contextos financieros por organización

### Files owned

- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/clients/sync/route.ts`
- `src/lib/finance/canonical.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/lib/account-360/organization-identity.ts`
- `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md`

## Current Repo State

### Ya existe

- Finance ya tiene runtime PostgreSQL para buena parte de sus writes y snapshots
- existe resolución de `organizationId` desde Finance client context
- `Organization Economics` y `Person Finance` ya consumen tablas canónicas en PostgreSQL

### Gap actual

- `Finance Clients` sigue BigQuery-first en el request path principal
- el resolver canónico de cliente todavía consulta tablas legacy de BigQuery
- el bridge Finance -> Organization no es todavía la misma costura que usa el resto del portal

## Scope

### Slice 1 - Resolver canónico y stores

- mover `resolveFinanceClientContext()` a un path Postgres-first
- alinear la resolución de `clientId`, `clientProfileId`, `hubspotCompanyId` y `organizationId`
- dejar compatibilidad explícita para referencias legacy e historical rows

### Slice 2 - Client list y detail

- refactorizar `GET /api/finance/clients` y `GET /api/finance/clients/[id]` para que arranquen desde tablas canónicas de PostgreSQL
- mantener enrichment CRM y service-modules como complemento
- validar que clients activos sigan apareciendo aunque no tengan finance profile manual completo

### Slice 3 - Observabilidad y compatibilidad

- exponer claramente cuándo una lectura cayó a fallback legado
- cubrir conflictos de referencias antiguas con errores coherentes, no silent merges
- dejar playbook de migración para consumers pendientes

## Out of Scope

- rediseñar la UI de Finance Clients
- migrar toda la analítica financiera a PostgreSQL
- reemplazar HubSpot como fuente CRM
- rehacer el modelo de service modules

## Acceptance Criteria

- [x] `Finance Clients` y `Finance Client Detail` operan Postgres-first sobre el grafo canónico actual
- [x] `resolveFinanceClientContext()` deja de depender primariamente de BigQuery legacy
- [x] `organizationId` se resuelve de forma coherente con `Account 360`
- [x] fallback legacy queda explícito y observable cuando siga siendo necesario
- [x] `pnpm lint` pasa sin nuevos errores
- [x] `pnpm test` cubre conflictos de identidad y resolución canónica
- [x] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual sobre `/api/finance/clients` y `/api/finance/clients/[id]` verificando consistencia entre client profile, org y receivables
- `pnpm exec eslint src/app/api/finance/clients/route.ts 'src/app/api/finance/clients/[id]/route.ts' src/app/api/finance/clients/sync/route.ts src/lib/finance/postgres-store-slice2.ts src/app/api/finance/bigquery-write-cutover.test.ts`
- `pnpm exec vitest run src/app/api/finance/bigquery-write-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
