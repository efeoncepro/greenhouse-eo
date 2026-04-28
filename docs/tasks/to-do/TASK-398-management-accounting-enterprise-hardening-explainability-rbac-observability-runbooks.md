# TASK-398 — Management Accounting Enterprise Hardening: Explainability, RBAC, Observability & Runbooks

## Delta 2026-04-28 — Subordinada al programa Member Loaded Cost Model

Esta task **endurece los endpoints y proyecciones del programa Member Loaded Cost Model** definido en `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`. RBAC (admin / finance / client read-only), explainability (trace de cada peso atribuido al expense origen via Fact 1 + Fact 2), observability (signals de coverage, drift, snapshot integrity) y runbooks aplican sobre las VIEWs y materializers definidos en MLCM_V1. Scope técnico no cambia.

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
- Branch: `task/TASK-398-management-accounting-enterprise-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Esta task cierra el modulo con calidad enterprise: explainability por numero, overrides gobernados, RBAC granular, observabilidad de materializaciones, exports auditables, runbooks operativos y business testing. Es el bloque que convierte un modulo funcional en un modulo robusto, escalable y operable por equipos reales.

## Why This Task Exists

Un modulo de Management Accounting puede verse potente en demos y aun asi fracasar en operacion diaria. Sin explainability, nadie confia en el numero. Sin RBAC, el riesgo de exposicion crece. Sin observabilidad, las materializaciones fallan en silencio. Sin runbooks, cualquier incidente se vuelve artesanal. Esta task documenta y endurece todo eso.

## Goal

- Formalizar el hardening enterprise del modulo completo
- Definir controles de acceso, trazabilidad y observabilidad
- Dejar el modulo listo para operacion sostenida, soporte y auditoria

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- Todo numero material del modulo debe poder explicarse desde origen, transformacion y version
- Los permisos deben separar lectura ejecutiva, lectura sensible, operacion finance y administracion tecnica
- Las materializaciones y recalculos deben tener observabilidad, alertas y runbooks

## Normative Docs

- `docs/tasks/to-do/TASK-174-finance-data-integrity-hardening.md`
- `docs/tasks/to-do/TASK-175-finance-core-test-coverage.md`
- `docs/tasks/to-do/TASK-393-management-accounting-period-governance-restatements-reclassification.md`
- `docs/tasks/to-do/TASK-396-management-accounting-variance-forecast-executive-control-tower.md`
- `docs/tasks/to-do/TASK-397-management-accounting-financial-costs-integration-factoring-fx-fees-treasury.md`

## Dependencies & Impact

### Depends on

- `TASK-392`
- `TASK-174`
- `TASK-175`
- `TASK-393`
- `TASK-396`
- `TASK-397`

### Blocks / Impacts

- release enterprise / beta estable del modulo
- soporte operativo y confianza ejecutiva en los numeros

### Files owned

- `docs/tasks/to-do/TASK-398-management-accounting-enterprise-hardening-explainability-rbac-observability-runbooks.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/documentation/finance/`
- `Handoff.md`

## Current Repo State

### Already exists

- Arquitectura del modulo con seccion de enterprise hardening
- Base de quality / testing en tasks previas del dominio finance
- Superficies financieras y materializaciones existentes

### Gap

- No existe backlog operativo detallado para explainability, RBAC, observabilidad y runbooks
- Faltan politicas explicitas para overrides, exports y soporte
- El modulo aun no tiene checklist de salida enterprise aterrizado a ejecución

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Explainability, overrides y audit trail

- Definir trazabilidad por numero, lineage, razones de override y bitacora de cambios
- Documentar politica de ajustes manuales permitidos y prohibidos

### Slice 2 — RBAC, seguridad y exports

- Diseñar permisos por rol / tenant / scope / sensibilidad
- Formalizar politicas de export, snapshot firmado, lectura compartida y acceso temporal

### Slice 3 — Observabilidad, operaciones y soporte

- Definir telemetria, alertas, health checks, backfill playbooks y runbooks de incidente
- Aterrizar business testing y regression suite del modulo

## Out of Scope

- Rehacer todo el modelo funcional del modulo
- Sustituir sistemas externos de IAM o SIEM
- Meter automatizacion pesada de soporte sin antes definir runbooks y ownership

## Detailed Spec

La salida esperada incluye como minimo:

- explainability contract por numero
- modelo de overrides gobernado
- RBAC multi-scope
- observabilidad de materializacion y consumo
- runbooks de cierre, restatement, backfill y recuperacion
- business tests sobre escenarios criticos

## Acceptance Criteria

- [ ] Existe backlog y contrato claro de explainability del modulo
- [ ] Existe modelo de RBAC y export governance para datos sensibles
- [ ] Hay politica de observabilidad, alerting y runbooks
- [ ] El modulo tiene checklist de salida enterprise verificable

## Verification

- Revision manual de arquitectura, backlog y documentación funcional
- `git diff --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedaron definidos los runbooks minimos para operar el modulo

## Follow-ups

- tasks derivadas puntuales de RBAC, exports o observabilidad si el tamano lo justifica
