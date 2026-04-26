# TASK-676 — Mercado Publico Purchase Order Reconciliation Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-674`
- Branch: `task/TASK-676-mercado-publico-oc-reconciliation`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crea el carril de ordenes de compra Mercado Publico para reconciliar oportunidades publicas con adjudicaciones/post-award, especialmente Compra Agil donde la OC puede ser la evidencia mas confiable del cierre. Complementa la ingesta de licitaciones y permite medir outcomes sin mezclarlo con scoring.

## Why This Task Exists

El endpoint de OC es una fuente distinta a licitaciones y contiene senales post-award que no deben perderse. Compra Agil puede aparecer como `Tipo=AG` y vincularse a cotizaciones COT por `CodigoOC`, por lo que necesitamos un modelo durable de reconciliacion.

## Goal

- Ingerir OC Mercado Publico con keys externas y buyer/supplier snapshots.
- Reconciliar OC con oportunidades por codigo licitacion, codigo cotizacion y heuristicas controladas.
- Registrar adjudicacion/outcome como child object, no mutacion opaca del agregado.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/schema-snapshot-baseline.sql`

Reglas obligatorias:

- Toda query filtra por `space_id`.
- No usar la OC como sustituto de oportunidad si existe source primaria; modelarla como post-award evidence.
- Usar `greenhouse-agent` antes de escribir backend/DB.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`

## Dependencies & Impact

### Depends on

- `TASK-674`
- Endpoint oficial `ordenesdecompra.json` documentado en research.

### Blocks / Impacts

- `TASK-677`
- `TASK-682`
- `TASK-686`
- Reporting futuro de win/loss y post-award.

### Files owned

- `migrations/`
- `src/lib/integrations/mercado-publico/`
- `src/lib/commercial/public-procurement/`
- `src/app/api/cron/`

## Current Repo State

### Already exists

- Research documenta el endpoint OC y la relacion con Compra Agil.

### Gap

- No existe ingestion ni tabla target de purchase orders publicas.
- No hay reconciliacion entre COT/licitation/opportunity y OC.

## Scope

### Slice 1 — Purchase Order Model

- Crear tabla child `public_procurement_purchase_orders` o nombre canonico definido por `TASK-674`.
- Persistir codigo OC, codigo licitacion/cotizacion cuando exista, buyer, supplier, montos, fechas y raw payload.

### Slice 2 — Sync And Reconciliation

- Implementar sync incremental/replay de OC.
- Implementar reconciliador deterministico con confidence y explanation.
- Emitir eventos de `awarded`, `purchase_order_linked` o equivalente definido por arquitectura.

### Slice 3 — Tests And Docs

- Cubrir normalizacion y matching de OC.
- Documentar limites de la reconciliacion.

## Out of Scope

- Facturacion, cobro o accounting.
- Scoring pre-bid.
- UI.

## Acceptance Criteria

- [ ] Las OC quedan persistidas con `space_id` y unique external key.
- [ ] El reconciliador explica match directo vs heuristico.
- [ ] Los outcomes no sobreescriben datos fuente de licitacion/Compra Agil.
- [ ] Runs/watermarks registran estado y conteos.

## Verification

- `pnpm migrate:up`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- Tests focalizados del reconciliador y normalizador.

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] schema snapshot/db types actualizados si aplica.

## Follow-ups

- `TASK-677`
- `TASK-686`
