# TASK-480 — Pricing Engine Cost Resolver, Provenance & Confidence

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Completa: replay input persistido, bulk repricing activo y downstream alineado`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar el follow-on real del resolver de costo en `pricing-engine-v2`: persistir contexto suficiente para replay fiel, activar `POST /quotes/reprice-bulk`, fijar la taxonomía final de provenance/fallback y exponer esa metadata downstream sin recomputarla. Todo eso ya quedó aterrizado en `develop`.

## Closure Delta 2026-04-20

La task quedó cerrada con el aterrizaje de estos contratos:

- `services/commercial-cost-worker/server.ts` ya activa `POST /quotes/reprice-bulk` y delega la corrida a `src/lib/commercial-cost-worker/quote-reprice-bulk.ts`
- la migración `20260420131341856_task-480-quote-pricing-v2-replay-input.sql` agregó:
  - `greenhouse_commercial.quotations.pricing_context`
  - `greenhouse_commercial.quotation_line_items.pricing_input`
- `quotation-pricing-orchestrator.ts` soporta replay con `strictReplay`, reutiliza `pricing_input` persistido y falla de forma explícita con `UnsupportedQuotationReplayError` cuando una quote legacy no tiene contexto suficiente
- la taxonomía final ya distingue el fallback catalog-level de tools como `tool_catalog_fallback`
- `document-chain-reader.ts` y el canonical store ya exponen provenance persistida sin recomputar costo en runtime

## Why This Task Existed

El repo ya tenía el core del resolver en `pricing-engine-v2`, pero todavía faltaba cerrar el tramo operativo:

- batch repricing fuera del runtime interactivo
- replay determinístico de líneas `pricing-v2`
- semántica final de `costBasisKind`
- consumers downstream leyendo snapshot persistido en lugar de reconstruirlo

Ese gap ya no existe como trabajo pendiente.

## Goal

- habilitar repricing bulk batch sobre el runtime dedicado
- dejar persistido por línea el input mínimo que permita replay fiel de `pricing-v2`
- cerrar la semántica final de provenance/fallback/manual override
- endurecer los consumers downstream para que lean la metadata persistida sin recomputar

## Architecture Alignment

Documentos alineados en el cierre:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/tasks/complete/TASK-476-commercial-cost-basis-program.md`
- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`

Reglas que quedaron preservadas:

- la prioridad de resolución sigue siendo explícita y determinística
- el engine no recalcula FX ni costo factual inline; consume readers/shared stores
- override manual sigue existiendo como excepción gobernada
- repricing bulk y recomputes masivos viven en `commercial-cost-worker`

## Dependencies & Impact

### Depends on

- `services/commercial-cost-worker/server.ts`
- `src/lib/commercial-cost-worker/quote-reprice-bulk.ts`
- `src/lib/finance/pricing/pricing-engine-v2.ts`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/views/greenhouse/finance/workspace/quote-builder-pricing.ts`
- `src/lib/finance/quote-to-cash/document-chain-reader.ts`
- `src/lib/finance/quotation-canonical-store.ts`

### Blocks / Impacts

- `TASK-481`
- `TASK-466`

### Files owned

- `migrations/20260420131341856_task-480-quote-pricing-v2-replay-input.sql`
- `services/commercial-cost-worker/server.ts`
- `src/lib/commercial-cost-worker/quote-reprice-bulk.ts`
- `src/lib/finance/pricing/pricing-engine-v2.ts`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/views/greenhouse/finance/workspace/quote-builder-pricing.ts`
- `src/lib/finance/quote-to-cash/document-chain-reader.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/types/db.d.ts`

## Final Repo State

### Closed gaps

- `POST /quotes/reprice-bulk` dejó de responder `501`
- el schema ya persiste replay input suficiente para `pricing-v2`
- `costBasisKind` quedó alineado entre engine/orchestrator/consumers
- quotes sin replay input suficiente no se repricingean a ciegas; se reportan como `skipped`
- document chain y readers downstream exponen provenance persistida

### Constraints that remain by design

- quotes legacy sin `pricing_input` siguen fuera de replay automático y requieren resave/backfill explícito
- `docs/architecture/schema-snapshot-baseline.sql` sigue stale para esta zona; la referencia operativa real quedó en `migrations/` + `src/types/db.d.ts`

## Scope Delivered

### Slice 1 — Semantic cleanup del resolver

- se cerró la taxonomía final de `costBasisKind`
- se eliminó el drift de naming entre engine, orchestrator y consumers
- el fallback de tools quedó explícito como `tool_catalog_fallback`

### Slice 2 — Replay input persistence

- se persistió `pricing_context` a nivel quote
- se persistió `pricing_input` por línea para replay fiel
- se mantuvo compatibilidad con líneas legacy/manuales sin reprocesarlas a ciegas

### Slice 3 — Bulk repricing runtime

- `commercial-cost-worker` implementa `POST /quotes/reprice-bulk`
- la corrida registra runs/resultados en el patrón del worker
- las quotes legacy incompatibles quedan explícitamente `skipped`

### Slice 4 — Downstream adoption hardening

- canonical store y document chain leen metadata persistida
- la explainability histórica dejó de depender de recomputes oportunistas

## Out of Scope

- gobernanza UX de overrides en builder/detail (`TASK-481`)
- feedback loop quoted-vs-actual (`TASK-482`)
- surface client-facing de quote multi-moneda (`TASK-466`)

## Acceptance Criteria

- [x] `POST /quotes/reprice-bulk` deja de responder `501` y corre en `commercial-cost-worker`
- [x] `quotation_line_items` persiste replay input suficiente para que el worker pueda reconstruir líneas `pricing-v2` sin depender del builder interactivo
- [x] La taxonomía final de `costBasisKind` queda cerrada y documentada sin drift entre engine/orchestrator/consumers
- [x] Override manual sigue soportado, pero como caso explícito y explicable
- [x] Quotes sin replay input suficiente no se repricingean a ciegas: se reportan como `skipped` o equivalente
- [x] Document chain y consumers downstream leen o exponen la metadata persistida sin recalcular costo en runtime

## Verification

- `pnpm test -- src/lib/finance/pricing/__tests__/pricing-engine-v2.test.ts src/views/greenhouse/finance/workspace/__tests__/quote-builder-pricing.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm pg:connect:migrate`
- `pnpm build`

### Verification Run 2026-04-20

- Vitest ok: suite completa terminó verde (`1562 passed`, `2 skipped`)
- `pnpm exec tsc --noEmit` ok
- `pnpm lint` ok
- `pnpm pg:connect:migrate` ok y `src/types/db.d.ts` quedó regenerado con el DDL nuevo
- `pnpm build` ok; persisten warnings conocidos de `Dynamic server usage` en rutas que usan `headers`, no introducidos por esta task

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` quedó sincronizado con el cierre
- [x] `Handoff.md` quedó actualizado con el cierre documental
- [x] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-466`
- `TASK-481`
- `TASK-482`
