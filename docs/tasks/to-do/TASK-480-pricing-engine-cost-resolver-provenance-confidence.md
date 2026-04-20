# TASK-480 — Pricing Engine Cost Resolver, Provenance & Confidence

## Delta 2026-04-20 — Reanclaje contra codebase real

La auditoría del repo mostró que el núcleo de esta task ya aterrizó:

- `pricing-engine-v2` ya resuelve `member_actual`, `role_blended`, `role_modeled` y `tool_snapshot`
- el contrato `PricingCostStackV2` ya expone `costBasisKind`, `sourceRef`, `snapshotDate` y `confidence`
- `quote-builder-pricing.ts` y `quotation-pricing-orchestrator.ts` ya persisten `resolvedCostBreakdown` y metadata asociada

Por lo tanto, `TASK-480` deja de ser "introducir el resolver" y pasa a ser el follow-on que cierra los gaps restantes:

1. habilitar `POST /quotes/reprice-bulk` en `commercial-cost-worker`
2. persistir replay input suficiente para que el bulk repricing pueda reconstruir líneas `pricing-v2` con fidelidad
3. normalizar semántica final de source kinds/fallbacks/manual override
4. endurecer consumers downstream que hoy no exponen la metadata persistida o recalculan de más

Hallazgos que corrigen supuestos previos:

- `docs/architecture/schema-snapshot-baseline.sql` no refleja todavía el DDL real de esta zona; la referencia operativa para `TASK-480` es `migrations/` + `src/types/db.d.ts`
- `quotation_line_items` persiste `cost_breakdown`, pero no persiste todavía un payload suficiente para rehidratar todos los casos `pricing-v2` en replay batch
- varios consumers downstream siguen sin exponer provenance/confidence aunque la metadata ya se guarda

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-480-pricing-engine-cost-resolver-provenance-confidence`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar los gaps que quedaron después del landing del resolver de costo en el engine v2: bulk repricing, semántica final de provenance/fallback y adopción downstream consistente. Esta task ya no crea el resolver desde cero; lo consolida para replay, reprice y explainability estable.

## Why This Task Exists

Las foundations `TASK-477`, `TASK-478`, `TASK-479` y el pricing engine ya convergieron el core del cost resolver. El gap real que queda es operativo y semántico:

- el worker todavía responde `501` en `POST /quotes/reprice-bulk`
- persisten pequeñas asimetrías entre `tool_snapshot`, `manual`, fallback de catálogo y cómo las nombran/consumen los downstreams
- algunos readers/UI pueden seguir asumiendo que la metadata de costo se recompone en runtime

## Goal

- habilitar repricing bulk batch sobre el runtime dedicado
- dejar persistido por línea el input mínimo que permita replay fiel de `pricing-v2`
- dejar una semántica final y explícita de provenance/fallback/manual override
- endurecer los consumers downstream para que lean la metadata persistida sin recomputar ni depender de drift de naming

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-476-commercial-cost-basis-program.md`
- `docs/tasks/complete/TASK-475-greenhouse-fx-currency-platform-foundation.md`
- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`

Reglas obligatorias:

- La prioridad de resolución debe seguir siendo explícita y determinística.
- El engine no debe recalcular lógica de FX ni de costo factual inline; consume readers shared.
- Override manual sigue existiendo, pero como excepción gobernada, no como camino default.
- Repricing bulk o recomputes masivos salen del runtime interactivo y se delegan a `commercial-cost-worker`.

## Dependencies & Impact

### Depends on

- `services/commercial-cost-worker/server.ts`
- `src/lib/finance/pricing/pricing-engine-v2.ts`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/views/greenhouse/finance/workspace/quote-builder-pricing.ts`
- `src/lib/finance/quote-to-cash/document-chain-reader.ts`

### Blocks / Impacts

- `TASK-481`
- `TASK-466`

### Files owned

- `services/commercial-cost-worker/server.ts`
- `src/lib/finance/pricing/pricing-engine-v2.ts`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/views/greenhouse/finance/workspace/quote-builder-pricing.ts`
- `src/lib/finance/quote-to-cash/document-chain-reader.ts`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- pricing engine v2
- snapshot persistence desde el quote builder
- contratos de provenance/confidence en `PricingCostStackV2`
- `TASK-483` ya dejó `commercial-cost-worker` como compute lane canónico y reservó `POST /quotes/reprice-bulk` para el follow-on batch de esta task

### Gap

- `POST /quotes/reprice-bulk` sigue reservado
- el schema persistido no guarda todavía un replay input suficiente para reconstruir todos los line types `pricing-v2` fuera del builder interactivo
- no toda la semántica de fallback/sourceKind está cerrada y documentada de forma final
- algunos consumers downstream todavía no exponen ni leen de forma consistente la metadata ya persistida

## Scope

### Slice 1 — Semantic cleanup del resolver

- Cerrar la taxonomía final de `costBasisKind` y de los casos fallback/manual.
- Evitar drift entre lo que emite `pricing-engine-v2`, lo que persiste `quotation-pricing-orchestrator` y lo que lee UI/document chain.
- Documentar explícitamente qué casos siguen siendo `manual`.
- Hacer explícito el caso fallback de catálogo cuando no exista `tool_snapshot`.

### Slice 2 — Replay input persistence

- Persistir por línea el input mínimo que permita rehidratar `pricing-v2` en recálculos y replay batch.
- Reusar el contrato ya armado por el builder antes de degradarlo al schema canónico.
- Mantener compatibilidad con líneas legacy o manuales que no tengan replay input disponible.

### Slice 3 — Bulk repricing runtime

- Implementar `POST /quotes/reprice-bulk` en `commercial-cost-worker`.
- Aceptar scope acotado por quote set / periodo / criterio de replay.
- Registrar runs y resultados en el patrón del worker dedicado.
- Saltar y reportar de forma explícita quotes legacy que todavía no tengan replay input suficiente.

### Slice 4 — Downstream adoption hardening

- Endurecer readers/consumers para que lean y expongan la metadata persistida sin recomputar.
- Alinear document chain, quote detail/read models y otras lecturas históricas al contrato final del resolver.

## Out of Scope

- Rediseñar el builder.
- Cambiar la topología del worker.
- Volver a abrir la foundation `member_actual / role_blended / role_modeled / tool snapshot`.

## Acceptance Criteria

- [ ] `POST /quotes/reprice-bulk` deja de responder `501` y corre en `commercial-cost-worker`
- [ ] `quotation_line_items` persiste replay input suficiente para que el worker pueda reconstruir líneas `pricing-v2` sin depender del builder interactivo
- [ ] La taxonomía final de `costBasisKind` queda cerrada y documentada sin drift entre engine/orchestrator/consumers
- [ ] Override manual sigue soportado, pero como caso explícito y explicable
- [ ] Quotes sin replay input suficiente no se repricingean a ciegas: se reportan como `skipped` o equivalente
- [ ] Document chain y consumers downstream leen o exponen la metadata persistida sin recalcular costo en runtime

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
