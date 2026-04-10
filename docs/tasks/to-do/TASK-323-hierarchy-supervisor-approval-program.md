# TASK-323 — Programa enterprise de jerarquias, supervisoria y permisos de aprobacion

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
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-323-hierarchy-supervisor-approval-program`
- Legacy ID: `programa nuevo sobre foundations ya existentes de HR + Identity`
- GitHub Issue: `none`

## Summary

Coordinar la evolucion de Greenhouse desde una relacion aislada `reports_to_member_id` hacia una capability enterprise de jerarquias reales: supervisoria formal, delegaciones, permisos de aprobacion por dominio, visibilidad limitada por subarbol, workspace de supervisor y organigrama visual.

## Why This Task Exists

Hoy Greenhouse ya tiene piezas sueltas de jerarquia:

- `greenhouse_core.members.reports_to_member_id`
- `person_hr_360` y `Person 360` muestran supervisor
- leave approvals ya derivan supervisor desde esa relacion
- `Greenhouse_HRIS_Architecture_v1.md` documenta `/hr/org-chart` y `/hr/approvals`

Pero no existe una capability integral:

- no hay modulo de jerarquias
- no hay historial ni delegaciones
- no hay subtree visibility para supervisors
- no hay experiencia `Mi equipo`
- no hay organigrama implementado
- no hay politica robusta de source of truth cuando cambie la jerarquia

Sin un programa coordinado, Greenhouse correria el riesgo de implementar solo una UI de organigrama encima de un modelo debil o de mezclar `role_code`, cargo visible y supervisoria como si fueran lo mismo.

## Goal

- Formalizar una capability canonica de jerarquias internas y supervisoria
- Separar claramente rol de acceso, jerarquia de reporte, estructura y autoridad de aprobacion
- Habilitar vistas y permisos limitados para supervisors sin crear un role code global `supervisor`
- Dar soporte a organigrama, approvals y `Mi equipo` sobre el mismo modelo canonico

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/schema-snapshot-baseline.sql`

Reglas obligatorias:

- `supervisor` no es un `role_code`; es una relacion derivada de la jerarquia de reporte.
- `departments` no reemplaza jerarquia de reporte ni ownership operativo.
- La capability no puede limitarse a un organigrama visual; debe cubrir modelo, permisos, approvals y UX.
- Un supervisor no recibe acceso global a HR por defecto; su visibilidad debe ser subtree-aware.

## Normative Docs

- `docs/tasks/to-do/TASK-028-hris-expense-reports.md`
- `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`
- `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md`
- `docs/tasks/to-do/TASK-263-permission-sets-enterprise-view-access.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

### Blocks / Impacts

- `docs/tasks/to-do/TASK-028-hris-expense-reports.md`
- `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`
- `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md`
- `docs/tasks/to-do/TASK-263-permission-sets-enterprise-view-access.md`
- supervisores internos que hoy ven demasiado o demasiado poco

### Files owned

- `docs/tasks/to-do/TASK-324-reporting-hierarchy-foundation.md`
- `docs/tasks/complete/TASK-325-hierarchy-admin-crud.md`
- `docs/tasks/complete/TASK-326-approval-authority-workflow-snapshots.md`
- `docs/tasks/complete/TASK-327-supervisor-scope-subtree-access.md`
- `docs/tasks/to-do/TASK-328-supervisor-workspace-my-team.md`
- `docs/tasks/to-do/TASK-329-org-chart-hierarchy-explorer.md`
- `docs/tasks/to-do/TASK-330-hierarchy-sync-drift-governance.md`

## Current Repo State

### Already exists

- `greenhouse_core.members.reports_to_member_id` ya existe en PostgreSQL
- `src/lib/person-360/get-person-hr.ts` y `src/views/greenhouse/people/**` ya exponen supervisor
- `src/lib/hr-core/postgres-leave-store.ts` y `src/lib/hr-core/service.ts` ya derivan supervisor para leave approvals
- `src/lib/admin/view-access-catalog.ts` y `src/lib/tenant/authorization.ts` ya contienen la capa actual de visibilidad y permisos

### Gap

- no existe foundation canonica de jerarquias con historial, delegacion y subtree readers
- no existe modulo admin/HR para gestionar jerarquias
- no existe matriz generica de autoridad de aprobacion
- no existe subtree access para supervisors
- `/hr/org-chart` y `/hr/approvals` estan documentadas pero no implementadas como capability real

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Foundation y gobierno

- `TASK-324` — modelo canonico de jerarquia, historial y delegaciones
- `TASK-325` — surfaces admin/HR para CRUD y reasignaciones auditables
- `TASK-330` — source governance, sync y drift

### Slice 2 — Permisos y workflows

- `TASK-326` — autoridad de aprobacion y snapshots de workflow
- `TASK-327` — subtree-aware visibility y access gating

### Slice 3 — Experiencia visible

- `TASK-328` — workspace de supervisor
- `TASK-329` — organigrama y explorador de jerarquias

## Out of Scope

- implementar codigo dentro de esta umbrella
- inventar un role code global `supervisor`
- usar organigrama visual como sustituto de un modelo canonico

## Detailed Spec

Secuencia recomendada:

1. `TASK-324`
2. `TASK-325`
3. `TASK-326`
4. `TASK-327`
5. `TASK-328`
6. `TASK-329`
7. `TASK-330`

Dependencias logicas:

- `324 -> 325`
- `324 -> 326`
- `324 -> 327`
- `326 + 327 -> 328`
- `324 + 327 -> 329`
- `324 -> 330`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una secuencia explicita de tasks para foundation, admin CRUD, approvals, subtree access, workspace supervisor, organigrama y source governance
- [ ] La umbrella separa modelo, permisos y UX en child tasks distinguibles
- [ ] Ninguna child task trata `supervisor` como role code global

## Verification

- Revision manual de consistencia documental
- Verificar que `TASK-324` a `TASK-330` existen y estan indexadas correctamente

## Closing Protocol

- [ ] Mantener `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` alineados con el programa

## Follow-ups

- dotted-line / matrix org como follow-on posterior, no baseline inicial
- integracion futura con evaluaciones y goals cuando sus lanes entren en implementacion real

## Open Questions

- si la primera iteracion de `TASK-330` debe limitarse a Entra/manual o si tambien prepara hooks para Deel desde el inicio
