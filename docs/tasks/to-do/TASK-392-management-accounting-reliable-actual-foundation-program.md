# TASK-392 — Management Accounting Reliable Actual Foundation Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseno estructural`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-392-management-accounting-reliable-actual-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Management Accounting no puede institucionalizarse encima de "actuals" incompletos o poco auditables. Esta task crea el programa base para consolidar el actual confiable de Greenhouse: reconciliacion Postgres-first, fully-loaded labor cost, integridad de datos, materializaciones reproducibles y cobertura de pruebas sobre el nucleo economico.

## Why This Task Exists

La arquitectura ya formaliza el modulo de Management Accounting, pero el programa sigue dependiendo de varios cimientos abiertos: costos laborales sin todas las provisiones, reconciliacion financiera todavia en hardening, quality gates incompletos y cobertura insuficiente sobre el calculo de P&L. Si este bloque no se cierra primero, cualquier budget, forecast o tablero ejecutivo quedara apoyado en numeros fragiles.

## Goal

- Consolidar una definicion operativa de "actual confiable" para Management Accounting
- Coordinar las tasks fundacionales ya existentes bajo una misma salida de programa
- Dejar criterios de readiness claros para habilitar planning, variance y control tower

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Ninguna capability de planning, variance o forecast puede declararse enterprise-ready mientras el actual no cumpla reconciliacion, trazabilidad y cobertura minima
- Los actuals canonicos deben salir de Postgres/serving canonico y no de agregaciones UI o calculos ad hoc en cliente
- Los cambios de este programa deben respetar el modelo de periodos y materializaciones existentes, sin introducir dobles fuentes de verdad

## Normative Docs

- `docs/tasks/to-do/TASK-174-finance-data-integrity-hardening.md`
- `docs/tasks/to-do/TASK-175-finance-core-test-coverage.md`
- `docs/tasks/to-do/TASK-176-labor-provisions-fully-loaded-cost.md`
- `docs/tasks/to-do/TASK-179-finance-reconciliation-cutover-hardening.md`
- `docs/tasks/to-do/TASK-167-operational-pl-organization-scope.md`

## Dependencies & Impact

### Depends on

- `TASK-174` — quality gates y controles de consistencia
- `TASK-175` — cobertura del nucleo finance / cost intelligence
- `TASK-176` — costo laboral fully-loaded con provisiones
- `TASK-179` — reconciliacion finance Postgres-first (prerequisito para actual limpio)
- `TASK-401` — continuous matching (sin conciliación diaria, el actual siempre tiene lag de un mes)
- `TASK-167` — scope organizacional del operational P&L

### Blocks / Impacts

- `TASK-393`
- `TASK-395`
- `TASK-396`
- `TASK-397`
- `TASK-398`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`

### Files owned

- `docs/tasks/to-do/TASK-174-finance-data-integrity-hardening.md`
- `docs/tasks/to-do/TASK-175-finance-core-test-coverage.md`
- `docs/tasks/to-do/TASK-176-labor-provisions-fully-loaded-cost.md`
- `docs/tasks/to-do/TASK-179-finance-reconciliation-cutover-hardening.md`
- `docs/tasks/to-do/TASK-392-management-accounting-reliable-actual-foundation-program.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/cost-intelligence/period-closure-store.ts`
- `src/lib/finance/periods.ts`
- `src/views/greenhouse/finance/FinanceIntelligenceView.tsx`
- `src/views/greenhouse/finance/ClientEconomicsView.tsx`

### Gap

- El actual todavia no tiene una definicion de salida unificada para Management Accounting
- Las tasks base viven separadas y sin criterio de cierre de programa
- No hay gate formal para decir "ya podemos planificar, comparar y forecast-ear"

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Inventario y readiness del actual canonico

- Consolidar el inventario de fuentes que alimentan `operational_pl_snapshots`, `client_economics` y vistas financieras relacionadas
- Definir criterios de salida para "actual confiable": reconciled, period-aware, traceable, tested, reproducible

### Slice 2 — Programa fundacional coordinado

- Reordenar y amarrar `TASK-174`, `TASK-175`, `TASK-176`, `TASK-179` y `TASK-167` como bloque obligatorio del programa
- Documentar secuencia recomendada, dependencias duras y evidencias minimas de cierre

### Slice 3 — Gate formal para habilitar Management Accounting enterprise

- Definir el checklist que desbloquea planning, variance, forecast y financial costs integration
- Formalizar el concepto de "actual baseline" en la arquitectura y backlog

## Out of Scope

- Implementar budget engine, forecast o control tower en esta task
- Abrir nuevos scopes analiticos por entidad legal o intercompany
- Integrar factoring, FX o treasury al P&L en este bloque

## Detailed Spec

Esta task funciona como programa paraguas. No implementa una sola pieza de codigo; ordena y endurece las bases operativas para que el modulo completo no quede montado sobre datos parcialmente confiables.

La salida esperada es una declaracion verificable de readiness:

1. `Actual source of truth` identificado por metrica y scope
2. `Cost model` fully-loaded listo para consumo
3. `Reconciliation posture` definida y auditada
4. `Quality gates` automatizados o explicitamente pendientes
5. `Test baseline` suficiente para tocar el nucleo sin regresiones silenciosas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una definicion documental unica de "actual confiable" para Management Accounting
- [ ] Las dependencias fundacionales del programa quedaron secuenciadas y justificadas
- [ ] El gate que desbloquea planning / variance / forecast esta explicito
- [ ] La arquitectura de Management Accounting refleja este bloque base

## Verification

- Revision manual del programa y consistencia con arquitectura
- `git diff --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se actualizo el estado de las tasks fundacionales coordinadas por este programa

## Follow-ups

- `TASK-393`
- `TASK-395`
- `TASK-396`
- `TASK-397`
- `TASK-398`
