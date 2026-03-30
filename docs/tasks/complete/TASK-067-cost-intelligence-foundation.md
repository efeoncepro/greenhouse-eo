# TASK-067 — Cost Intelligence Foundation

## Delta 2026-03-30 — Cierre técnico + alineación con Finance canónico

- El remanente del smoke local ya quedó resuelto:
  - `src/lib/google-credentials.ts` ahora normaliza PEMs colapsados en `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - el path real `@google-cloud/cloud-sql-connector` ya no cae en `ERR_OSSL_UNSUPPORTED`
  - smoke autenticado local de `/api/cron/outbox-react-cost-intelligence` ya responde `200`
- Resultado operativo:
  - la foundation técnica de `TASK-067` ya quedó cerrada para su alcance
  - la cron dedicada puede seguir diferida en `vercel.json` hasta que `068/069` registren projections reales; ya no por un bloqueo técnico del runtime
- Alineación nueva obligatoria:
  - `TASK-068` y `TASK-069` deben colgarse también de `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `TASK-069` no debe redefinir un P&L paralelo; debe materializar y agregar la semántica financiera canónica ya definida por Finance
  - reglas que quedan amarradas desde ahora:
    - revenue neto vía `partnerShare`
    - payroll multi-moneda con FX canónico
    - anti-doble-conteo con `expenses.payroll_entry_id`
    - reutilización de bridges/helpers como `client_labor_cost_allocation`, `member_capacity_economics`, `resolveExchangeRateToClp()` y `total-company-cost.ts`

## Delta 2026-03-30 — Auditoría Finance + dependencias clarificadas

- Auditoría completa del módulo Finance confirmó que esta task es el **blocker #1** de todo el pipeline Cost Intelligence.
- Orden canónico de ejecución: **TASK-067 → (068 ∥ 069) → (070 ∥ 071)**
- TASK-068 y TASK-069 pueden ejecutarse en paralelo después de esta.
- TASK-138 (gaps de inteligencia) y TASK-139 (hardening) son independientes y pueden ejecutarse en paralelo.
- No existe `greenhouse_cost_intelligence` schema — esta task lo crea.
- No existen `accounting.*` event types — esta task los agrega.
- No existe `cost_intelligence` domain en projections — esta task lo registra.

## Delta 2026-03-30 — Bootstrap foundation aplicado

- Ya quedó aplicado el setup idempotente `pnpm setup:postgres:cost-intelligence` sobre Cloud SQL.
- Nuevo schema operativo:
  - `greenhouse_cost_intelligence`
- Nuevas tablas base:
  - `greenhouse_cost_intelligence.period_closure_config`
  - `greenhouse_cost_intelligence.period_closures`
  - `greenhouse_serving.period_closure_status`
  - `greenhouse_serving.operational_pl_snapshots`
- Nuevo script/wrapper:
  - `scripts/setup-postgres-cost-intelligence.sql`
  - `scripts/setup-postgres-cost-intelligence.ts`
- `scripts/pg-doctor.ts` ya reconoce `greenhouse_cost_intelligence`.
- `event-catalog.ts` ya soporta aggregate types y eventos `accounting.*`.
- `projection-registry.ts` ya reconoce `cost_intelligence` como domain soportado.
- Nueva route disponible:
  - `/api/cron/outbox-react-cost-intelligence`
- `GET /api/internal/projections` ya expone `supportedDomains`, incluyendo `cost_intelligence`.
- Smoke adicional ejecutado y ya resuelto:
  - dev server local con `CRON_SECRET` efímero
  - request autenticado a `/api/cron/outbox-react-cost-intelligence`
  - resultado final: `200`, sin projections registradas aún

Pendiente fuera del alcance de esta task:
- decidir cuándo conviene agendar cron dedicada en `vercel.json` vs seguir temporalmente con el catch-all `outbox-react`

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Cerrada` |
| Rank | — |
| Domain | Cost Intelligence |

## Summary

Bootstrap del schema `greenhouse_cost_intelligence`, extensión del event catalog con eventos `accounting.*`, registro del domain `cost_intelligence` en el projection registry, y setup SQL idempotente.

## Why This Task Exists

Cost Intelligence necesita infraestructura base antes de que las projections y APIs puedan implementarse. Sin schema, sin eventos registrados y sin domain en el registry, las TASK-067 a TASK-070 no pueden avanzar.

## Goal

Dejar la fundación técnica lista para que las projections `period_closure_status` y `operational_pl` puedan registrarse y ejecutarse.

## Architecture Alignment

- Fuente canónica: `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- Fuente complementaria obligatoria para continuidad del carril: `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- Schema nuevo: `greenhouse_cost_intelligence` (config + estado)
- Serving views: extensión de `greenhouse_serving`
- Modelo de acceso PostgreSQL: `AGENTS.md` → perfiles runtime/migrator/admin
- Regla explícita para follow-ons:
  - `TASK-068` y `TASK-069` consumen esta foundation, pero deben mantenerse consistentes con el motor financiero canónico ya definido en Finance

## Dependencies & Impact

- **Depende de:**
  - `greenhouse_serving` schema existente (grants ya configurados)
  - `src/lib/sync/event-catalog.ts` (catálogo de eventos)
  - `src/lib/sync/projections/index.ts` (projection registry)
  - `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` (modelo de acceso)
- **Impacta a:**
  - TASK-068 (period closure status) — necesita schema + domain
  - TASK-069 (operational P&L) — necesita schema + domain + eventos
  - TASK-070 (Finance UI) — necesita APIs base
  - TASK-071 (consumers) — necesita serving views
- **Archivos owned:**
  - `scripts/setup-postgres-cost-intelligence.sql`
  - `scripts/migrations/add-cost-intelligence-schema.sql`
  - Event catalog entries `accounting.*`
  - Projection domain registration `cost_intelligence`

## Current Repo State

- `greenhouse_serving` schema ya existe con grants para runtime y migrator
- Event catalog (`src/lib/sync/event-catalog.ts`) tiene 4 domains: `organization`, `people`, `finance`, `notifications`
- Projection registry (`src/lib/sync/projections/index.ts`) tiene 11 projections en 4 domains
- Cron routes por domain ya existen (`/api/cron/outbox-react-*`)
- No existe `greenhouse_cost_intelligence` schema

## Scope

### Slice 1 — Schema bootstrap
1. Crear `scripts/setup-postgres-cost-intelligence.sql` (idempotente):
   - `CREATE SCHEMA IF NOT EXISTS greenhouse_cost_intelligence`
   - `period_closure_config` table
   - `period_closures` table
   - Grants para runtime (SELECT, INSERT, UPDATE) y migrator (ALL)
2. Crear serving view stubs en `greenhouse_serving`:
   - `period_closure_status` table
   - `operational_pl_snapshots` table
3. Registrar script en `package.json` como `pnpm setup:postgres:cost-intelligence`

### Slice 2 — Event catalog extension
1. Agregar aggregate types en `src/lib/sync/event-catalog.ts`:
   - `period_closure`
   - `operational_pl`
   - `margin_alert`
2. Agregar event types:
   - `accounting.period_closed`
   - `accounting.period_reopened`
   - `accounting.pl_snapshot.materialized`
   - `accounting.margin_alert.triggered`

### Slice 3 — Projection domain registration
1. Agregar domain `cost_intelligence` al `ProjectionDomain` type
2. Crear cron route `/api/cron/outbox-react-cost-intelligence`
3. Registrar domain en el reactive consumer

## Out of Scope

- Implementación de projections (TASK-068, TASK-069)
- APIs de lectura/mutations (TASK-068, TASK-069)
- UI (TASK-070)
- Consumer enrichment (TASK-071)

## Acceptance Criteria

- [x] `pnpm setup:postgres:cost-intelligence` ejecuta sin error en Cloud SQL
- [x] `pnpm pg:doctor --profile=runtime` confirma acceso a `greenhouse_cost_intelligence`
- [x] Event catalog tiene 4 nuevos event types bajo prefix `accounting.*`
- [x] Projection domain `cost_intelligence` registrado y visible en `/api/internal/projections`
- [x] `/api/cron/outbox-react-cost-intelligence` responde 200 (sin projections registradas aún)
- [x] `pnpm build` pasa
- [x] `pnpm lint` pasa

## Verification

- `pnpm setup:postgres:cost-intelligence`
- `pnpm pg:doctor --profile=runtime`
- `pnpm pg:doctor --profile=migrator`
- `pnpm exec vitest run src/lib/google-credentials.test.ts`
- `pnpm build`
- `pnpm lint`
- `curl /api/cron/outbox-react-cost-intelligence` (local)
