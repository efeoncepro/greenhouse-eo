## Delta 2026-04-13 (cierre del programa)

El programa umbrella se cierra como entrega documental con **5 de 6 foundation deps cerradas**. La definicion operativa de "actual confiable", el gate de readiness y la secuencia recomendada quedaron formalizadas en `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md` bajo la nueva seccion `Reliable Actual Foundation`.

### Snapshot del gate al cierre

| Dep | Estado | Nota |
|---|---|---|
| `TASK-174` — Finance data integrity hardening | ✅ complete | bulk atomicity, idempotency_keys migrada, FOR UPDATE NOWAIT, payment ledger transactional |
| `TASK-175` — Finance core test coverage | ✅ complete | 64 tests nuevos sobre `postgres-store-slice2`, `postgres-reconciliation`, `payment-ledger`, P&L E2E |
| `TASK-179` — Finance reconciliation Postgres-only cutover | ✅ complete | zero dual-write BQ en reconciliation paths; HubSpot schema validation con outbox drift events |
| `TASK-401` — Bank reconciliation continuous matching | ✅ complete | motor standalone `auto-match.ts` + cron diario 07:45 UTC + endpoint manual |
| `TASK-167` — Operational P&L organization scope | 🟡 superseded | cerrado en runtime via TASK-192 (org scope materializer), pendiente reclasificacion administrativa |
| `TASK-176` — Labor provisions fully-loaded cost | 🔴 **OPEN** | unico blocker real del gate; gap material ~12.5% en labor cost hasta que cierre |

### Que se entrega con el cierre de este umbrella

1. Seccion `## Reliable Actual Foundation` en `GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md` — definicion de 5 criterios (reconciled, fully-loaded, period-aware, traceable, tested & transactional) + tabla de fundaciones requeridas + gate de readiness + secuencia recomendada.
2. Este snapshot del estado del programa como fuente de verdad para los tasks downstream (`TASK-393`, `TASK-395`, `TASK-396`, `TASK-397`, `TASK-398`).
3. Criterio explicito: las capabilities downstream NO pueden declararse enterprise-ready hasta que `TASK-176` tambien cierre.

### Que NO se entrega (y por que)

- `TASK-176` (labor provisions) sigue abierta. El umbrella cierra porque su deliverable es la **definicion del gate**, no el estado final de cada checkbox. El proximo agente que intente declarar `planning` / `variance` ready debera verificar que el gate este al 100%.
- `TASK-167` queda marcada como superseded sin ser movida administrativamente — es un cleanup menor independiente.

---

## Delta 2026-04-13 (historico — TASK-174)

- TASK-174 cerrada. El bloque de integridad transaccional de Finance ya está implementado: bulk atomicity, idempotency keys (tabla PG migrada), SELECT FOR UPDATE NOWAIT en reconciliación y payment ledger con FOR UPDATE atómico. El gap de "reconciliación financiera todavía en hardening" de este programa se reduce — solo resta el cutover Postgres-only de TASK-179 para que actuals sean 100% confiables sin riesgo de doble escritura.

# TASK-392 — Management Accounting Reliable Actual Foundation Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Cerrado como programa documental 2026-04-13 — 5/6 foundation deps cerradas, TASK-176 queda como unico blocker del gate`
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
