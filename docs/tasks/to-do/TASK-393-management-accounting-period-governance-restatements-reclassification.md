# TASK-393 — Management Accounting Period Governance, Restatements & Reclassification

## Delta 2026-04-28 — Subordinada al programa Member Loaded Cost Model

Esta task implementa **§5 Snapshots Inmutables + §6 Period Closing Workflow** del spec canónico `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`. La función `closeAccountingPeriod()` y el modelo de restatement aquí descritos son la mecánica concreta para producir y reabrir los snapshots `member_loaded_cost_per_period_snapshot` y `client_full_cost_per_period_snapshot` (Fact 3/4 del modelo dimensional). Scope técnico no cambia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno estructural`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (TASK-392 completada — desbloqueada 2026-05-05)
- Branch: `task/TASK-393-management-accounting-period-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Greenhouse ya puede cerrar y reabrir periodos operativos, pero Management Accounting enterprise necesita una gobernanza mas rica: cierre, reopen controlado, restatement versionado, reclassifications trazables y mutabilidad parcial por tipo de dato. Esta task endurece el contrato del periodo para que el modulo soporte auditoria, explicabilidad y correcciones formales sin destruir historia.

## Why This Task Exists

El estado actual resuelve un "open vs closed" operativo. Eso es insuficiente para un modulo de contabilidad de costos enterprise. Cuando aparezcan ajustes tardios, reclasificaciones, provisiones corregidas o costos financieros reexpresados, el sistema necesitara distinguir entre reabrir sin control y emitir una nueva version del periodo con evidencia y motivo. Si eso no se diseña ahora, el historico se volvera ambiguo.

## Goal

- Ampliar el lifecycle del periodo mas alla de open/closed
- Formalizar restatements y reclassifications auditables
- Exponer un contrato de mutabilidad y versionado consistente para los consumers

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Cerrar un periodo no puede significar "datos inmoviles para siempre"; el sistema debe diferenciar close operativo, reopen y restatement formal
- Toda reclassificacion o restatement debe dejar evidencia: quien, cuando, por que, desde que version y contra que impacto
- Los consumers deben poder distinguir numero actual, numero previo y delta por restatement sin recalcular historia a ciegas

## Normative Docs

- `src/lib/cost-intelligence/check-period-readiness.ts`
- `src/lib/cost-intelligence/close-period.ts`
- `src/lib/cost-intelligence/reopen-period.ts`
- `src/lib/cost-intelligence/period-closure-store.ts`
- `docs/tasks/to-do/TASK-190-cost-intelligence-period-closure.md`

## Dependencies & Impact

### Depends on

- `TASK-392`
- `TASK-190`
- `src/lib/cost-intelligence/check-period-readiness.ts`
- `src/lib/cost-intelligence/close-period.ts`
- `src/lib/cost-intelligence/reopen-period.ts`
- `src/lib/cost-intelligence/period-closure-store.ts`

### Blocks / Impacts

- `TASK-396`
- `TASK-397`
- `TASK-398`
- API y UI de periodos en finance / cost intelligence

### Files owned

- `src/lib/cost-intelligence/check-period-readiness.ts`
- `src/lib/cost-intelligence/close-period.ts`
- `src/lib/cost-intelligence/reopen-period.ts`
- `src/lib/cost-intelligence/period-closure-store.ts`
- `src/app/api/cost-intelligence/periods/route.ts`
- `src/app/api/cost-intelligence/periods/[year]/[month]/route.ts`
- `docs/tasks/to-do/TASK-393-management-accounting-period-governance-restatements-reclassification.md`

## Current Repo State

### Already exists

- Store y acciones de cierre/reapertura de periodos
- Checks de readiness operativa
- Consumers que ya se apoyan en snapshots mensuales

### Gap

- No existe versionado formal del periodo
- No hay restatement model ni politica de reclassifications
- La mutabilidad por familia de dato no esta declarada ni expuesta

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Lifecycle enterprise del periodo

- Definir estados: `open`, `soft_closed`, `closed`, `restated`, `superseded`
- Modelar transiciones permitidas, permisos y evidencia minima por transicion

### Slice 2 — Restatement & reclassification contract

- Diseñar store, schema y API para emitir un restatement versionado de un periodo
- Formalizar reclassifications con payload trazable y motivo obligatorio

### Slice 3 — Consumers y explainability

- Exponer en APIs la version vigente, versiones previas y deltas relevantes
- Ajustar vistas/consumers para que comuniquen si un numero pertenece a una version restated

## Out of Scope

- Forecasting, budget o control tower
- Nuevas dimensiones analiticas por BU o entidad legal
- Costos financieros detallados de factoring / FX / treasury

## Detailed Spec

El contrato minimo esperado incluye:

- `period_version`
- `restatement_reason`
- `restated_by`
- `restated_at`
- `supersedes_period_version`
- bitacora de reclassifications asociadas

La tarea debe decidir si el modelo vive en tablas nuevas, ampliacion del store actual o ambos, pero la salida obligatoria es la misma: historia versionada, mutabilidad gobernada y consumers conscientes del cambio.

## Acceptance Criteria

- [ ] Existe un lifecycle enterprise de periodo documentado e implementable
- [ ] Hay modelo de restatement con versionado y evidencia
- [ ] Las reclassifications quedan trazables y no se mezclan con mutaciones silenciosas
- [ ] Las APIs exponen suficiente contexto para explicar la version del dato
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

- `pnpm build`
- `pnpm test`
- Validacion manual de contratos de periodo y ejemplos de restatement

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedo explicita la politica de reopen vs restatement

## Follow-ups

- `TASK-396`
- `TASK-398`
