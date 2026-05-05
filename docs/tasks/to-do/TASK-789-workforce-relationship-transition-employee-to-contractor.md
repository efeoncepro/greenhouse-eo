# TASK-789 — Workforce Relationship Transition: Employee to Contractor

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-789-workforce-relationship-transition`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la foundation para cerrar una relacion laboral dependiente y abrir una nueva relacion contractor/honorarios bajo la misma persona canonica, sin mutar historico ni reusar finiquito/payroll dependiente para la nueva etapa.

## Why This Task Exists

El caso Valentina muestra una transicion valida pero riesgosa: termino de relacion `indefinido` y posible inicio contractor desde `2026-05-04`. Sin una primitive explicita, el sistema puede reactivar la relacion anterior, mezclar contratos, duplicar cargo/compensacion o tratar el pago contractor como adjustment de payroll.

## Goal

- Modelar transiciones employee -> contractor como cambio de relacion, no como update destructivo.
- Preservar historial laboral, offboarding y finiquito ya emitido/remediado.
- Exponer en People 360 el historial y la relacion activa sin ambiguedad.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Una persona conserva `identity_profile`; lo que cambia es la relacion juridica/economica.
- La relacion laboral cerrada no se reactiva ni se convierte en contractor.
- Contractor closure y employee offboarding son lifecycles distintos.

## Dependencies & Impact

### Depends on

- `TASK-760`, `TASK-761`, `TASK-762`, `TASK-783`, `TASK-784`.

### Blocks / Impacts

- Bloquea `TASK-790`, `TASK-796`, `TASK-797`.
- Impacta People 360, HR profile, offboarding history and payroll eligibility.

### Files owned

- `src/lib/person-legal-entity-relationships/**` `[verificar]`
- `src/lib/workforce/offboarding/**`
- `src/lib/person-360/**`
- `src/views/greenhouse/people/**`
- `migrations/**`

## Current Repo State

### Already exists

- Offboarding/finiquito foundation for dependent Chile relationships.
- Person legal identity and country/readiness foundation.
- Role/title governance and effective-dating backlog.

### Gap

- No explicit transition primitive employee -> contractor.
- People 360 does not yet render the contractor relationship timeline as a first-class relation.

## Scope

### Slice 1 — Relationship transition command

- Add canonical command/helper to close an existing employee relationship and create a new contractor/honorarios relationship.
- Enforce non-overlap and effective dating.
- Preserve source metadata and actor/reason.

### Slice 2 — Payroll/offboarding guardrails

- Ensure closed employee relationship stays excluded from future dependent payroll.
- Ensure contractor relationship does not unlock final settlement actions.

### Slice 3 — People 360 projection

- Surface historical employee relationship and current contractor relationship with clear labels.
- Include Valentina scenario in fixture/test narrative where feasible.

## Out of Scope

- Contractor engagement schema.
- Contractor invoices/payables.
- Provider imports.

## Acceptance Criteria

- [ ] Employee -> contractor transition creates a new relationship and preserves the old relationship unchanged.
- [ ] Overlapping active employee/contractor relationships are blocked unless an explicit policy allows them.
- [ ] Dependent payroll does not include the closed employee relation after its effective end.
- [ ] People 360 distinguishes "relacion laboral cerrada" from "relacion contractor activa".

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/person-360 src/lib/workforce/offboarding`
- Focused tests for transition helper and People 360 projection.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] Architecture/docs updated if contract changes.
