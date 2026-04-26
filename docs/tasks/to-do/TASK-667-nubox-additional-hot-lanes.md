# TASK-667 — Nubox Additional Hot Lanes

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`, `ops`, `data`
- Blocked by: `TASK-399 recommended`
- Branch: `task/TASK-667-nubox-additional-hot-lanes`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Agregar hot lanes livianas para facturas, compras, saldos y movimientos Nubox
sin reemplazar el full ETL diario. Cada lane debe conservar raw/conformed/PG,
locks, ventanas configurables y observabilidad por etapa.

## Why This Task Exists

Solo cotizaciones tienen frescura incremental. Finanzas todavía depende del ETL
diario para facturas, compras, saldos y movimientos, lo que limita operación
near-real-time.

## Goal

- Diseñar lanes incrementales por objeto.
- Mantener full ETL como safety net.
- Reutilizar advisory locks/source_sync tracking.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/tasks/to-do/TASK-399-native-integrations-runtime-hardening-source-adapters-control-plane-replay.md`

## Normative Docs

- `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md`
- `docs/tasks/plans/TASK-640-plan.md`

## Dependencies & Impact

### Depends on

- `src/lib/nubox/sync-nubox-quotes-hot.ts`
- `src/lib/nubox/sync-plan.ts`
- `src/app/api/cron/nubox-*`
- `greenhouse_sync.source_sync_runs`

### Blocks / Impacts

- Finance freshness.
- Ops Health / reliability signals.
- Nubox enterprise promotion.

### Files owned

- `src/lib/nubox/**`
- `src/app/api/cron/nubox-*`
- `scripts/run-nubox-*.ts`
- `vercel.json`
- `services/ops-worker/**` if moved off Vercel.

## Current Repo State

### Already exists

- `quotes_hot_sync` with advisory lock and manual script.
- full ETL daily.
- balance sync route.

### Gap

- no hot lanes for invoices, purchases, balances or bank movements.
- no shared hot-lane framework beyond quotes.

## Scope

### Slice 1 — Lane design

- Define object windows, locks and source object types.

### Slice 2 — Implementation

- Implement one lane at a time, starting with highest freshness impact.

### Slice 3 — Scheduling/ops

- Add cron/manual scripts and status surfaces.

## Out of Scope

- Removing full ETL.
- Heavy backfills in Vercel functions.

## Acceptance Criteria

- [ ] Each hot lane writes raw/conformed before PG.
- [ ] Each lane has advisory lock and source_sync tracking.
- [ ] Full ETL remains safety net.

## Verification

- `pnpm lint`
- `pnpm test --run src/lib/nubox`
- manual hot sync by period/window.

## Closing Protocol

- [ ] Lifecycle/folder/index synced.
- [ ] Handoff documents scheduler/runtime changes.
