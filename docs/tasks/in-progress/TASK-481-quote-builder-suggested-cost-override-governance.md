# TASK-481 — Quote Builder Suggested Cost UX & Override Governance

## Delta 2026-04-20 — Reanclaje contra codebase real

La revisión del repo confirma que esta task sigue vigente, pero más acotada:

- el builder ya persiste `resolvedCostBreakdown` y metadata `pricingV2CostBasis*`
- el cost stack ya existe y está gateado por permiso
- lo que falta es UX de provenance/confidence/freshness y gobernanza de override, no otro resolver backend

## Delta 2026-04-20 — Scope extension post-audit

La auditoria en Phase 1-2 revelo que la spec original asumia persistencia de override governance, pero en realidad NO existen columnas de audit en `quotation_line_items` (solo `manualUnitCost` como numero crudo dentro de JSONB). Para cumplir AC #3 "Override manual requiere motivo y deja trazabilidad" se agrega al scope:

- **Migration nueva**: columnas `cost_override_reason`, `cost_override_by_user_id`, `cost_override_at`, `cost_override_delta_pct`, `cost_override_suggested_unit_cost_usd`, `cost_override_suggested_breakdown JSONB`, `cost_override_category` con CHECK en enum.
- **Tabla append-only nueva**: `greenhouse_commercial.quotation_line_cost_override_history` para historial completo reutilizable por UI (últimos 5 en dialog) y audit dashboards futuros.
- **Evento canonico nuevo**: `commercial.quotation_line.cost_overridden`.
- **Capability nueva**: `canOverrideQuoteCost(tenant)` restrictiva a `efeonce_admin + finance_admin` (analyst lee, no muta).
- **Nomenclature extension**: secciones `GH_PRICING.costProvenance` y `GH_PRICING.costOverride`.
- **Primitives nuevos**: `CostSourceChip`, `CostConfidenceChip`, `CostFreshnessBadge`, `CostProvenancePopover`, `CostDeltaChip`, `CostOverrideDialog`.

Resolucion de open questions con criterio enterprise:

1. Override replace-completo (`pricingV2CostBasisKind='manual'`), snapshot de breakdown original en JSONB.
2. Capability restrictiva (admin + finance_admin only); threshold-based dual approval queda como follow-up V2.
3. minLength 30 chars (15 si category aporta contexto); category enum obligatorio.
4. History append-only + mostrar ultimos 5 en dialog.

TASK-480 confirmado NO bloqueante (core resolver + persistencia ya existen; sus gaps son downstream).

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-481-quote-builder-suggested-cost-override-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Llevar al builder y al detail la explainability que ya existe en el runtime de pricing: costo sugerido, provenance, confidence, freshness y override governance. La task reutiliza el builder actual; no reabre el trabajo del resolver ni rediseña la surface principal.

## Why This Task Exists

Aunque el engine ya resuelva y persista costos con metadata, el usuario todavía no ve eso bien en la UI. Hoy el builder muestra el cost stack, pero no explica claramente:

- de dónde salió el costo sugerido
- cuán confiable o fresco es
- cuándo una línea está en fallback o requiere atención
- cómo gobernar un override manual con motivo y trazabilidad

## Goal

- mostrar suggested cost y provenance de forma legible en builder/detail
- hacer visible confidence/freshness sin exponer metadata cruda
- gobernar overrides con motivo, delta e impacto visible

## Architecture Alignment

Revisar y respetar:

- `docs/tasks/complete/TASK-473-quote-builder-full-page-surface-migration.md`
- `docs/tasks/complete/TASK-476-commercial-cost-basis-program.md`
- `docs/tasks/to-do/TASK-480-pricing-engine-cost-resolver-provenance-confidence.md`
- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`

Reglas obligatorias:

- La surface principal es full-page builder, no `QuoteCreateDrawer`.
- La UI no recalcula costo; consume la salida del engine/shared readers.
- Override requiere motivo y debe dejar trazabilidad.
- Si la UI necesita refrescar snapshots pesados, debe disparar el lane asíncrono existente y reflejar estado; no bloquear el builder con recomputes inline.

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/finance/QuoteBuilderPageView.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx`
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx`
- `src/views/greenhouse/finance/workspace/QuoteLineCostStack.tsx`
- `src/views/greenhouse/finance/workspace/quote-builder-pricing.ts`
- `src/components/greenhouse/pricing/SellableItemPickerDrawer.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`

### Blocks / Impacts

- `TASK-466`

### Files owned

- `src/views/greenhouse/finance/QuoteBuilderPageView.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx`
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx`
- `src/views/greenhouse/finance/workspace/QuoteLineCostStack.tsx`
- `src/views/greenhouse/finance/workspace/quote-builder-pricing.ts`
- `src/components/greenhouse/pricing/SellableItemPickerDrawer.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`

## Current Repo State

### Already exists

- full-page builder surface
- builder actions
- cost stack por línea
- item picker
- metadata persistida de costo resuelto en el write path del builder
- `TASK-483` ya dejó el split `portal interactive lane + commercial-cost-worker`, así que esta task debe quedarse en UX/consumo y no reabrir topología

### Gap

- La UI todavía piensa demasiado en input manual y no en suggested cost explainable.
- No existe una UX consistente de provenance/confidence/freshness.
- No existe gobernanza explícita de override con motivo y blast radius visible.

## Scope

### Slice 1 — Suggested cost presentation

- Mostrar costo sugerido por línea y en detail con labels legibles (`member_actual`, `role_blended`, etc.) y disclaimers cuando el costo venga de fallback.

### Slice 2 — Provenance and confidence

- Hacer visibles fuente, vigencia, confidence y freshness sin obligar al usuario a leer JSON o metadata cruda.

### Slice 3 — Override governance

- Pedir motivo, mostrar delta vs sugerido y señalizar impacto antes de persistir un override manual permitido.

## Out of Scope

- Engine internals.
- FX platform.
- Reabrir el drawer legacy como surface principal.

## Acceptance Criteria

- [ ] El builder y/o detail muestran costo sugerido y su fuente de forma legible
- [ ] La UI hace visible confidence, vigencia y freshness del costo
- [ ] Override manual requiere motivo y deja trazabilidad
- [ ] La surface principal sigue siendo full-page builder

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual del builder full-page
