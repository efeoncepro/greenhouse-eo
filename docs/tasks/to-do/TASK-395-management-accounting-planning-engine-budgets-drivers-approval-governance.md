# TASK-395 — Management Accounting Planning Engine: Budgets, Drivers & Approval Governance

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
- Blocked by: `TASK-392`
- Branch: `task/TASK-395-management-accounting-planning-engine`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Esta task transforma el budget engine aislado en un verdadero planning engine enterprise: presupuesto versionado, drivers operativos, escenarios, workflow de aprobacion, locks y trazabilidad. Absorbe y expande `TASK-178` para que Management Accounting tenga un plano formal de Plan vs Actual.

## Why This Task Exists

`TASK-178` define el primer budget engine, pero el modulo necesita una capa mas robusta: no solo line items mensuales, sino drivers, escenarios, ownership, ciclos de aprobacion y gobierno de cambios. Sin esto, el presupuesto se vuelve una tabla mas y no el sistema de planning que el modulo requiere.

## Goal

- Reencuadrar `TASK-178` como bloque fundacional de un planning engine enterprise
- Definir presupuesto, forecast input y driver model bajo un solo contrato
- Formalizar aprobaciones, locks y versionado de plan

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`

Reglas obligatorias:

- El plan no puede modelarse como una sola tabla sin gobierno; debe soportar versiones, escenarios y aprobacion explicita
- Los drivers deben ser trazables y distinguibles de overrides manuales
- Planning debe nacer sobre actual confiable y respetar period governance

## Normative Docs

- `docs/tasks/to-do/TASK-178-finance-budget-engine.md`
- `docs/tasks/to-do/TASK-176-labor-provisions-fully-loaded-cost.md`
- `docs/tasks/to-do/TASK-177-operational-pl-business-unit-scope.md`
- `docs/tasks/to-do/TASK-167-operational-pl-organization-scope.md`

## Dependencies & Impact

### Depends on

- `TASK-392`
- `TASK-178`
- `TASK-176`
- `TASK-177`
- `TASK-167`

### Blocks / Impacts

- `TASK-396`
- management reviews y control tower ejecutivo
- futura planeacion rolling forecast

### Files owned

- `docs/tasks/to-do/TASK-178-finance-budget-engine.md`
- `docs/tasks/to-do/TASK-395-management-accounting-planning-engine-budgets-drivers-approval-governance.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- Diseño inicial de budget engine en `TASK-178`
- Finance Intelligence y Client Economics listos para consumir comparativos
- Scope organization / BU ya previsto en backlog

### Gap

- No existe driver model ni scenario planning
- No hay workflow de aprobacion ni ownership por budget
- El budget actual no esta planteado como motor de planning integral

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Modelo de planning

- Definir entidades canonicas: plan version, scenario, driver, override, approval state
- Aterrizar como `TASK-178` evoluciona a pieza del planning engine

### Slice 2 — Governance y workflow

- Diseñar roles de preparacion, revision, aprobacion y lock
- Definir ciclo anual, rolling forecast y cambios mid-year

### Slice 3 — Superficie analitica consumible

- Formalizar como el plan alimenta variance, forecast y control tower
- Declarar output minimo por scope y por periodo

## Out of Scope

- Implementar todos los escenarios avanzados en un solo release
- Reemplazar sistemas externos de FP&A si existieran
- Resolver consolidacion multi-entidad completa dentro de esta task

## Detailed Spec

El planning engine debe distinguir al menos:

- `budget_baseline`
- `latest_approved_plan`
- `working_forecast`
- `best_case / base_case / downside`
- drivers estructurales versus ajustes manuales

La task debe decidir tambien como conviven input top-down y bottom-up sin perder auditabilidad.

## Acceptance Criteria

- [ ] `TASK-178` queda reencuadrada dentro del planning engine enterprise
- [ ] Existe modelo canonico de plan, drivers, escenarios y aprobacion
- [ ] Queda definido el workflow de locks y versionado
- [ ] La relacion plan -> variance -> forecast queda explicita

## Verification

- Revision manual de arquitectura y backlog
- `git diff --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedo documentado como `TASK-178` se absorbe o se re-scopea dentro de este programa

## Follow-ups

- `TASK-396`
- rolling forecast derivado si hace falta task separada
