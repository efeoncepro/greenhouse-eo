# TASK-789 — Workforce Relationship Transition: Employee to Contractor

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Complete`
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

- `src/lib/person-legal-entity-relationships/**`
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

- Cerrado por TASK-789: `src/lib/workforce/relationship-transition/transitionEmployeeToContractor()` cierra la relacion `employee` y abre una relacion `contractor` separada.
- Cerrado por TASK-789: People 360 renderiza timeline de relaciones con labels separados para historico laboral y contractor/honorarios activo.

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

- [x] Employee -> contractor transition creates a new relationship and preserves the old relationship unchanged.
- [x] Overlapping active employee/contractor relationships are blocked unless an explicit policy allows them.
- [x] Dependent payroll does not include the closed employee relation after its effective end.
- [x] People 360 distinguishes "relacion laboral cerrada" from "relacion contractor activa".

## Closing Notes

- `honorarios` V1 se representa como `relationship_type='contractor'` + `metadata_json.relationshipSubtype='honorarios'` porque el constraint runtime actual no permite `honorarios` como tipo propio.
- La command no muta `members.contract_type`, no crea `compensation_versions`, no crea `payroll_adjustments` y no habilita `final_settlements`.
- No hubo migrations nuevas; se reutilizo `greenhouse_core.person_legal_entity_relationships`.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm test src/lib/workforce/relationship-transition/employee-to-contractor.test.ts src/views/greenhouse/people/tabs/person-hr-profile-view-model.test.ts src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx src/lib/workforce/offboarding/lane.test.ts`
- `pnpm design:lint`
- `pnpm build`

## Closing Protocol

- [x] Lifecycle and folder synchronized.
- [x] `docs/tasks/README.md` synchronized.
- [x] `Handoff.md` updated.
- [x] Architecture/docs updated if contract changes.
