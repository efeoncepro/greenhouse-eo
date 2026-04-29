# TASK-728 — Finance Movement Feed Decision Polish

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-728-finance-movement-feed-decision-polish`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Mejora la experiencia de `FinanceMovementFeed` en `/finance/reconciliation` para que la cola de movimientos sea una superficie operativa moderna: summary strip, subtotales por día, microinteracciones de fila y jerarquía visual que separa la cola de conciliación de la tabla de períodos.

## Why This Task Exists

TASK-726 creó la foundation reusable y los fixes posteriores corrigieron wrapping, semántica visual, logos de proveedores e instrumentos. La vista ya funciona, pero todavía se percibía como una tabla/lista plana y quedaba contaminada por la paginación de la tabla de períodos. Faltaba elevar el feed a una experiencia de decisión clara sin tocar saldos ni matching.

## Goal

- Hacer que la cola de movimientos sea la primera superficie operativa visible en conciliación.
- Agregar resumen y subtotales informativos sin modificar ni recalcular saldos contables.
- Mejorar hover, focus, affordance de detalle y estados para lectura frecuente.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

Reglas obligatorias:

- Cambio UI/read-only: no tocar queries financieras, saldos, materializaciones, matching ni writes.
- Reutilizar `FinanceMovementFeed`, `PaymentInstrumentChip`, MUI/Vuexy y catálogos existentes.
- No hardcodear bancos ni proveedores; la identidad visual sigue saliendo de catálogos canónicos.
- Mantener accesibilidad: foco visible, labels claros y texto para estados.

## Dependencies & Impact

### Depends on

- `TASK-726` — Finance Movement Feed Foundation.
- `TASK-727` no es dependencia; esta task se implementa en worktree aislado para no mezclar scopes.

### Blocks / Impacts

- Mejora `/finance/reconciliation`.
- Deja `FinanceMovementFeed` más reusable para Banco, cash position y futuros feeds financieros.

### Files owned

- `src/components/greenhouse/finance/FinanceMovementFeed.tsx`
- `src/components/greenhouse/finance/finance-movement-feed.types.ts`
- `src/components/greenhouse/finance/finance-movement-feed.utils.ts`
- `src/views/greenhouse/finance/ReconciliationView.tsx`
- `docs/tasks/complete/TASK-728-finance-movement-feed-decision-polish.md`

## Current Repo State

### Already exists

- `FinanceMovementFeed` con agrupación por fecha, wrapping seguro, virtualización y estados.
- Catálogo visual SaaS local para proveedores conocidos.
- `PaymentInstrumentChip` y catálogo canónico de instrumentos de pago.

### Gap

- Falta summary strip reusable.
- Falta subtotal por día dentro del feed.
- La cola de movimientos aparece después de la tabla de períodos y hereda ruido visual de paginación.
- La fila necesita affordance de detalle/foco más claro sin depender de hover-only.

## Scope

### Slice 1 — Task + reusable feed polish

- Crear task `TASK-728`.
- Agregar summary strip reusable al feed.
- Agregar subtotales por día.
- Mejorar microinteracciones de fila: hover/focus, chevron estable y labels accesibles.

### Slice 2 — Reconciliation integration

- Mover la cola de movimientos antes de la tabla de períodos.
- Agregar summary items de cola visible, pagos, cobros e instrumentos reconocidos.
- Mantener copy honesta: los totales son solo de la lista visible, no saldos contables.

### Slice 3 — Verification + visual QA

- Ejecutar tests/lint/build.
- Verificar visualmente con usuario agente dedicado.
- Capturar screenshot, analizar con skills UI/UX/microinteracción y ajustar antes de cerrar.

## Out of Scope

- Cambiar matching, saldos, account balances, materializaciones o APIs.
- Agregar nuevas librerías.
- Resolver TASK-727 o mezclar sus cambios.
- Crear logos o catálogos nuevos.

## Acceptance Criteria

- [x] El feed muestra un summary strip compacto y responsive.
- [x] Las fechas muestran conteo y subtotal del día.
- [x] La cola de movimientos se ve antes de la tabla de períodos en `/finance/reconciliation`.
- [x] Las filas mantienen foco visible, hover sutil y affordance de detalle.
- [x] El cambio no altera saldos, matching, queries ni materializaciones.
- [x] La task queda documentada y registrada.

## Verification

- `pnpm test src/components/greenhouse/finance`
- `pnpm exec eslint src/components/greenhouse/finance src/views/greenhouse/finance/ReconciliationView.tsx`
- `pnpm lint`
- `pnpm build`
- Visual QA con usuario agente dedicado en `/finance/reconciliation`

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con estado real.
- [x] El archivo vive en `docs/tasks/complete/`.
- [x] `docs/tasks/README.md` quedó sincronizado.
- [x] `docs/tasks/TASK_ID_REGISTRY.md` quedó sincronizado.
- [x] `Handoff.md` actualizado al cierre.
- [x] `changelog.md` actualizado al cierre.
- [x] Worktree temporal reconciliado y removido.

## Follow-ups

- Evaluar drawer de detalle de movimiento cuando haya contrato de candidatos/sugerencias listo para no duplicar UX con `ReconciliationDetailView`.
- Evaluar señales de riesgo basadas en reglas declarativas cuando exista source of truth para thresholds, no hardcodearlas en UI.
