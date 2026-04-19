# TASK-481 — Quote Builder Suggested Cost UX & Override Governance

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-473`, `TASK-480`
- Branch: `task/TASK-481-quote-builder-suggested-cost-override-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Llevar el `Commercial Cost Basis` al quote builder full-page para que la UI deje de pedir montos manuales por defecto y muestre costo sugerido, fuente, confidence, vigencia y override governance. La task reutiliza el builder existente y se monta sobre `TASK-473`.

## Why This Task Exists

Aunque el engine resuelva costos bien, el usuario necesita una experiencia clara: ver costo sugerido, entender si viene de persona real, rol modelado o tool/provider, saber qué tan confiable es, y poder hacer override con justificación cuando haga falta.

## Goal

- Mostrar suggested cost y provenance en el builder.
- Hacer visible confidence/freshness.
- Gobernar overrides con motivo y blast radius claro.

## Architecture Alignment

Revisar y respetar:

- `docs/tasks/to-do/TASK-473-quote-builder-full-page-surface-migration.md`
- `docs/tasks/to-do/TASK-476-commercial-cost-basis-program.md`
- `docs/tasks/to-do/TASK-480-pricing-engine-cost-resolver-provenance-confidence.md`

Reglas obligatorias:

- La surface principal es full-page builder, no `QuoteCreateDrawer`.
- La UI no recalcula costo; consume la salida del engine/shared readers.
- Override requiere motivo y debe dejar trazabilidad.

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/finance/QuoteBuilderPageView.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx`
- `src/views/greenhouse/finance/workspace/QuoteTotalsFooter.tsx`
- `src/components/greenhouse/pricing/SellableItemPickerDrawer.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`

### Blocks / Impacts

- `TASK-466`

### Files owned

- `src/views/greenhouse/finance/QuoteBuilderPageView.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx`
- `src/views/greenhouse/finance/workspace/QuoteTotalsFooter.tsx`
- `src/components/greenhouse/pricing/SellableItemPickerDrawer.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`

## Current Repo State

### Already exists

- full-page builder surface
- builder actions
- totals footer
- item picker

### Gap

- La UI todavía piensa demasiado en input manual y no en suggested cost.
- No existe una UX consistente de provenance/confidence/override.

## Scope

### Slice 1 — Suggested cost presentation

- Mostrar costo sugerido por línea y resumen en builder/detail.

### Slice 2 — Provenance and confidence

- Hacer visibles fuente, vigencia y confidence.

### Slice 3 — Override governance

- Pedir motivo, mostrar delta vs sugerido y señalizar impacto.

## Out of Scope

- Engine internals.
- FX platform.

## Acceptance Criteria

- [ ] El builder muestra costo sugerido y su fuente.
- [ ] La UI hace visible confidence y vigencia del costo.
- [ ] Override manual requiere motivo y deja trazabilidad.
- [ ] La surface principal sigue siendo full-page builder.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual del builder full-page
