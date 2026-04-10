# TASK-326 — Autoridad de aprobacion por dominio y snapshots de workflow

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-324`
- Branch: `task/TASK-326-approval-authority-workflow-snapshots`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Generalizar la autoridad de aprobacion derivada de la jerarquia para que Greenhouse sepa quien puede aprobar cada dominio y deje snapshots auditables al momento del submit. La primera iteracion cubre leave y prepara expenses, onboarding/offboarding y evaluaciones sin recalcular aprobadores en cada render.

## Why This Task Exists

El repo ya tiene una pieza importante: leave approvals guardan `supervisor_member_id` al submit. Eso cierra un gap puntual, pero no crea un motor reusable:

- la resolucion de aprobador sigue estando acoplada a leave
- no hay matriz canonica por dominio
- no hay delegacion temporal integrada
- no hay un contrato unico de snapshot para notifications, dashboards y futuras approvals

Si cada modulo resuelve aprobadores por su cuenta, la capacidad de jerarquias no escala.

## Goal

- Definir la autoridad de aprobacion por dominio sobre la jerarquia canonica
- Resolver aprobador efectivo y congelarlo al submit del workflow
- Preparar un contrato reusable para leave, expenses y futuros flujos HR

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/tasks/to-do/TASK-028-hris-expense-reports.md`
- `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md`
- `docs/tasks/to-do/TASK-324-reporting-hierarchy-foundation.md`

Reglas obligatorias:

- El aprobador por supervisoria se deriva de la relacion de reporte, no de un role code `supervisor`.
- Un workflow no debe reevaluar el aprobador efectivo en cada render si ya fue submitido.
- HR/admin puede overridear, pero el override debe quedar explicito y auditado.
- La primera iteracion no debe mezclar aprobaciones operativas con ownership comercial scoped.

## Normative Docs

- `docs/tasks/to-do/TASK-323-hierarchy-supervisor-approval-program.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-324-reporting-hierarchy-foundation.md`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/hr-core/leave-domain.ts`
- `src/lib/sync/projections/notifications.ts`

### Blocks / Impacts

- `docs/tasks/to-do/TASK-028-hris-expense-reports.md`
- `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`
- `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md`
- `docs/tasks/to-do/TASK-328-supervisor-workspace-my-team.md`

### Files owned

- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/hr-core/service.ts`
- `src/lib/hr-core/leave-domain.ts`
- `src/app/api/hr/core/leave/requests/route.ts`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `src/lib/sync/projections/notifications.ts`
- `src/config/notification-categories.ts`

## Current Repo State

### Already exists

- `leave` ya resuelve supervisor desde `reports_to_member_id`
- `supervisor_member_id` ya se persiste al submit del leave request
- notifications de leave ya distinguen supervisor vs HR

### Gap

- no existe matriz generica `dominio -> autoridad de aprobacion`
- no existe soporte canonico para delegaciones temporales dentro del resolver
- no existe contrato compartido para snapshot y override de aprobadores
- `expenses` y futuros workflows todavia dependen de specs, no de un engine reusable

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Resolver canonico de autoridad

- Definir el contrato reusable para resolver aprobador primario, delegado, fallback de dominio y override administrativo
- Formalizar dominios iniciales: leave, expenses; preparar extensibilidad para evaluations y onboarding/offboarding
- Exponer un helper compartido en vez de resolver aprobadores inline por modulo

### Slice 2 — Cutover de leave al resolver compartido

- Mantener el comportamiento actual de leave, pero pasando por el resolver canonico
- Persistir snapshot del aprobador efectivo, incluyendo delegacion u override si aplica
- Alinear counters, filtros y labels del inbox de leave al contrato nuevo

### Slice 3 — Notificaciones y preparacion cross-domain

- Alinear payloads y recipients de notificaciones al snapshot de autoridad
- Dejar el contrato listo para `TASK-028` y futuros workflows HR sin duplicar logica
- Documentar la semantica de fallback cuando no hay supervisor o cuando hay un top-of-tree

## Out of Scope

- UI de administracion de jerarquias
- subtree visibility general
- organigrama
- implementar expenses/evaluations completas dentro de esta task

## Detailed Spec

- La resolucion de autoridad debe distinguir:
  - aprobador primario por supervisoria
  - delegado temporal
  - fallback de dominio (`hr_manager`, `finance_admin` u otro segun corresponda)
  - override excepcional
- La semantica de snapshot debe ser comun para readers, notificaciones y dashboards.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un resolver compartido de autoridad de aprobacion por dominio
- [ ] Leave usa ese resolver sin perder el snapshot actual del aprobador efectivo
- [ ] Delegacion, fallback y override quedan auditables en el snapshot
- [ ] El contrato resultante sirve como base para expenses y futuros workflows

## Verification

- `pnpm exec tsc --noEmit --incremental false`
- `pnpm lint`
- `pnpm test`
- validacion manual de submit/review de leave con y sin supervisor

## Closing Protocol

- [ ] Actualizar la documentacion de HR/Identity si cambia el contrato de aprobacion o snapshot

## Follow-ups

- `docs/tasks/to-do/TASK-028-hris-expense-reports.md`
- `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md`
