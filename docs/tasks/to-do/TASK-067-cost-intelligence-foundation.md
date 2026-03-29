# TASK-067 — Cost Intelligence Foundation

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseño` |
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
- Schema nuevo: `greenhouse_cost_intelligence` (config + estado)
- Serving views: extensión de `greenhouse_serving`
- Modelo de acceso PostgreSQL: `AGENTS.md` → perfiles runtime/migrator/admin

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

- Implementación de projections (TASK-067, TASK-068)
- APIs de lectura/mutations (TASK-069)
- UI (TASK-069)
- Consumer enrichment (TASK-070)

## Acceptance Criteria

- [ ] `pnpm setup:postgres:cost-intelligence` ejecuta sin error en Cloud SQL
- [ ] `pnpm pg:doctor --profile=runtime` confirma acceso a `greenhouse_cost_intelligence`
- [ ] Event catalog tiene 4 nuevos event types bajo prefix `accounting.*`
- [ ] Projection domain `cost_intelligence` registrado y visible en `/api/internal/projections`
- [ ] `/api/cron/outbox-react-cost-intelligence` responde 200 (sin projections registradas aún)
- [ ] `pnpm build` pasa
- [ ] `pnpm lint` pasa

## Verification

- `pnpm setup:postgres:cost-intelligence`
- `pnpm pg:doctor --profile=runtime`
- `pnpm pg:doctor --profile=migrator`
- `pnpm build`
- `pnpm lint`
- `curl /api/cron/outbox-react-cost-intelligence` (local)
