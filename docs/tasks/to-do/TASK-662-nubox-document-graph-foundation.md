# TASK-662 — Nubox Document Graph Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`, `data`
- Blocked by: `TASK-212 coordination`
- Branch: `task/TASK-662-nubox-document-graph-foundation`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear el grafo documental Nubox first-class: detalles, referencias, lineage y
relaciones entre cotizaciones, facturas, notas y artifacts. Este task no duplica
`TASK-212`; lo usa como owner de line items y agrega referencias/lineage.

## Why This Task Exists

Nubox hoy proyecta headers a Finance. Los links `details_url` y
`references_url` se preservan como metadata, pero no existe un grafo durable que
explique `cotizacion -> factura`, `factura -> nota`, documento -> líneas,
referencias y artifacts.

## Goal

- Diseñar y migrar tablas de grafo documental Nubox.
- Extender raw/conformed para details/references sin saltarse evidencia.
- Proyectar relaciones documentales a PostgreSQL con idempotencia.
- Coordinar line items con `TASK-212`.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- Nada escribe directo a Finance sin evidencia raw/conformed previa.
- `TASK-212` conserva ownership de line items y emisión multi-línea.
- Las relaciones documentales deben preservar IDs Nubox y source run.

## Normative Docs

- `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md`
- `docs/tasks/to-do/TASK-212-nubox-line-items-sync-multiline-emission.md`
- `docs/tasks/plans/TASK-640-plan.md`

## Dependencies & Impact

### Depends on

- `src/lib/nubox/client.ts`
- `src/lib/nubox/sync-nubox-raw.ts`
- `src/lib/nubox/sync-nubox-conformed.ts`
- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `greenhouse_finance.income`
- `greenhouse_finance.expenses`
- `greenhouse_finance.quotes`
- `greenhouse_finance.income_line_items`
- `greenhouse_finance.quote_line_items`

### Blocks / Impacts

- Nubox artifacts
- payment reconciliation explainability
- VAT evidence quality
- Finance document detail surfaces

### Files owned

- `src/lib/nubox/**`
- `scripts/setup-bigquery-nubox-*.sql`
- `migrations/**`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `getNuboxSaleDetails()`
- header projections for sales/purchases/quotes
- line item tables
- document-chain reader for quote-to-cash context

### Gap

- no purchase details helper
- no references helpers
- no raw/conformed tables for details/references
- no Postgres document graph / lineage table

## Scope

### Slice 1 — API capability confirmation

- Confirmar endpoints Nubox disponibles for details/references.
- Documentar rate limits and payload shape.

### Slice 2 — DDL

- Crear DDL raw/conformed/Postgres para details, references and lineage.
- Include source run IDs and idempotency keys.

### Slice 3 — Projection

- Extend Nubox sync to populate document graph.
- Reuse `TASK-212` line item output where possible.

## Out of Scope

- Durable PDF/XML storage.
- Payment graph reconciliation.
- UI redesign.

## Acceptance Criteria

- [ ] Details/references have raw/conformed evidence.
- [ ] PostgreSQL graph links documents and references idempotently.
- [ ] `TASK-212` scope is not duplicated.
- [ ] Finance docs updated with document graph contract.

## Verification

- `pnpm migrate:create <name>`
- `pnpm migrate:up`
- `pnpm lint`
- `pnpm test --run src/lib/nubox`
- replay manual by period.

## Closing Protocol

- [ ] Lifecycle/folder/index synced.
- [ ] `src/types/db.d.ts` committed if migrations run.
- [ ] Architecture and handoff updated.

## Follow-ups

- TASK-663 durable artifacts.
