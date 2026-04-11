# TASK-336 — Person ↔ Legal Entity & Executive Economics Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-336-person-legal-entity-executive-economics-program`
- Legacy ID: `follow-on de la spec GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1`
- GitHub Issue: `none`

## Summary

Coordinar la evolución de Greenhouse para modelar relaciones explícitas `persona ↔ entidad legal`, separar `compensación ejecutiva` de `cuenta corriente accionista` y alinear `Finance`, `Payroll`, `Costs` y `360` sobre un mismo backbone canónico.

## Why This Task Exists

La arquitectura ya formalizó que `identity_profile` es la raíz humana y que `Efeonce Group SpA` debe leerse como contraparte jurídica/económica, pero el runtime todavía no tiene una lane explícita para representar esas relaciones. Hoy:

- la `CCA` está anclada principalmente a `profile_id` / `member_id` / `space_id`
- `Payroll` materializa compensación formal, pero no existe un objeto previo tipo `CompensationArrangement`
- `Costs` y `360` no tienen una forma limpia de consumir esas relaciones sin mezclar semánticas

Sin un programa coordinado, cada módulo resolvería el problema con extensiones parciales y roots paralelos.

## Goal

- Coordinar la secuencia de tasks que materializan la relación `person ↔ legal entity`
- Separar canónicamente `compensación ejecutiva`, `nómina formal` y `cuenta corriente accionista`
- Alinear los futuros readers de `Finance`, `Payroll`, `Costs` y `360` sobre la misma semántica base

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `identity_profile` sigue siendo la raíz humana canónica; no crear un root paralelo en `user`, `member` o `shareholder_account`
- `LegalEntity` es la contraparte jurídica/económica primaria; `organization`, `space` y `tenant` no deben reemplazarla automáticamente
- `executive compensation` y `shareholder current account` son carriles distintos; cualquier compensación entre ambos debe ser explícita y auditable

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-284-shareholder-current-account.md`
- `docs/tasks/complete/TASK-306-shareholder-account-canonical-traceability.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/tasks/complete/TASK-284-shareholder-current-account.md`
- `docs/tasks/complete/TASK-306-shareholder-account-canonical-traceability.md`

### Blocks / Impacts

- modelado canónico de relaciones persona ↔ entidad legal
- `Finance > Cuenta accionista`
- futura lane de compensación ejecutiva
- `Payroll` como materialización formal
- `Costs` / `Cost Intelligence`
- futuros readers o vistas ejecutivas privadas

### Files owned

- `docs/tasks/to-do/TASK-337-person-legal-entity-relationship-runtime-foundation.md`
- `docs/tasks/to-do/TASK-338-compensation-arrangement-canonical-runtime-foundation.md`
- `docs/tasks/to-do/TASK-339-shareholder-account-legal-entity-alignment.md`
- `docs/tasks/to-do/TASK-340-compensation-arrangement-payroll-bridge.md`
- `docs/tasks/to-do/TASK-341-executive-economics-360-read-model.md`
- `docs/tasks/to-do/TASK-342-executive-compensation-cost-intelligence-integration.md`

## Current Repo State

### Already exists

- la spec canónica ya vive en `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `Efeonce Group SpA` ya está institucionalizada runtime-wise como `operating entity`
- la `CCA` ya existe en:
  - `migrations/20260409002455606_shareholder-current-account-schema.sql`
  - `src/lib/finance/shareholder-account/store.ts`
  - `src/app/api/finance/shareholder-account/**`
- `Payroll` ya materializa compensación formal sobre:
  - `greenhouse_payroll.compensation_versions`
  - `greenhouse_payroll.payroll_entries`

### Gap

- no existe programa runtime explícito para bajar la spec a schema, services, bridges y readers

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Foundations

- `TASK-337` — runtime mínimo de relaciones `person ↔ legal entity`
- `TASK-338` — `CompensationArrangement` como contrato canónico

### Slice 2 — Domain bridges

- `TASK-339` — realineamiento semántico de `shareholder_account`
- `TASK-340` — puente explícito `CompensationArrangement -> Payroll`

### Slice 3 — Consumers

- `TASK-341` — read model / reader privado para economía ejecutiva
- `TASK-342` — integración con `Costs` y `Cost Intelligence`

## Out of Scope

- implementación runtime directa dentro de esta umbrella
- rediseño UI completo de una vista ejecutiva final
- contabilidad general o asientos contables full ERP

## Detailed Spec

Secuencia recomendada:

1. `TASK-337`
2. `TASK-338`
3. `TASK-339`
4. `TASK-340`
5. `TASK-342`
6. `TASK-341`

Dependencias lógicas:

- `337 -> 338`
- `337 -> 339`
- `337 + 338 -> 340`
- `338 + 340 -> 342`
- `337 + 338 + 339 + 340 -> 341`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una secuencia explícita de child tasks para schema base, compensación, CCA, bridge payroll, costs y readers
- [ ] Cada child task tiene ownership, dependencia y alcance distinguible
- [ ] La umbrella no mezcla implementación directa con coordinación de programa

## Verification

- Revisión manual de consistencia documental
- Verificar que `TASK-337` a `TASK-342` existen y están indexadas correctamente

## Closing Protocol

- [ ] Mantener `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` alineados con el programa

## Follow-ups

- re-priorizar `TASK-341` y `TASK-342` según si el negocio necesita primero visibilidad ejecutiva o primero costo empresa

## Open Questions

- si `LegalEntity` podrá vivir un tiempo como semántica sobre `greenhouse_core.organizations` o si requerirá objeto explícito propio en una fase posterior
