# TASK-482 — Quoted vs Actual Margin Feedback Loop

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-452`, `TASK-480`
- Branch: `task/TASK-482-quoted-vs-actual-margin-feedback-loop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar el loop entre lo cotizado y lo ejecutado para que Greenhouse pueda comparar margen esperado versus margen real usando la capa `Commercial Cost Basis` y la foundation de atribución por servicio. Esta task no recalcula el quote builder; construye la lectura posterior que permite aprender y recalibrar supuestos.

## Why This Task Exists

Sin feedback loop, el programa cost basis mejora la cotización pero no aprende de la realidad. Greenhouse necesita saber cuánto margen esperaba al cotizar, cuánto costó realmente ejecutar y qué supuestos fallaron.

## Goal

- Comparar margen cotizado versus margen ejecutado.
- Reusar service attribution y financial consumers existentes.
- Dejar evidencia para recalibrar assumptions y blended costs.

## Architecture Alignment

Revisar y respetar:

- `docs/tasks/to-do/TASK-452-service-attribution-foundation.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md`

Reglas obligatorias:

- El feedback loop consume serving/attribution; no recalcula heurísticas opacas inline.
- La comparación debe mantener provenance suficiente para explicar el desvío.

## Dependencies & Impact

### Depends on

- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/commercial/contracts-store.ts`
- `src/lib/finance/quote-to-cash/document-chain-reader.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/finance/postgres-store-intelligence.ts`

### Blocks / Impacts

- recalibración futura del cost basis

### Files owned

- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/commercial/contracts-store.ts`
- `src/lib/finance/quote-to-cash/document-chain-reader.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/finance/postgres-store-intelligence.ts`

## Current Repo State

### Already exists

- quote and contract anchors
- document chain
- cost intelligence consumers
- service attribution foundation planificada

### Gap

- No existe una lectura explícita de margen cotizado vs real.
- Los supuestos del pricing lane no tienen feedback loop formal hacia su calibración.

## Scope

### Slice 1 — Comparison contract

- Definir qué campos comparan `quoted` vs `actual`.

### Slice 2 — Read model

- Construir el reader o snapshot que una quote/contract con ejecución atribuida.

### Slice 3 — Calibration signals

- Dejar outputs consumibles para recalibrar assumptions/modeling futuros.

## Out of Scope

- UI completa de analytics.
- Recalibración automática del catálogo.

## Acceptance Criteria

- [ ] Existe una lectura confiable de margen cotizado vs real.
- [ ] La comparación se apoya en `TASK-452` y no en heurísticas inline.
- [ ] El sistema puede explicar desvíos con suficiente provenance.
- [ ] Queda base para recalibrar assumptions comerciales posteriores.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
