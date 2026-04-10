# TASK-328 — Workspace de supervisor: Mi equipo y cola de aprobaciones

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
- Blocked by: `TASK-326, TASK-327`
- Branch: `task/TASK-328-supervisor-workspace-my-team`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la experiencia real del supervisor dentro de Greenhouse: un workspace `Mi equipo` con reportes directos e indirectos, aprobaciones pendientes, calendario/ausencias clave y acceso seguro a drilldowns de su subarbol. Esto resuelve el gap entre ver demasiado y no ver nada.

## Why This Task Exists

Hoy el supervisor cae en un limbo:

- puede terminar viendo surfaces HR demasiado amplias
- o no tiene una vista concreta para operar a su equipo

El repo ya tiene piezas utiles (`HrCoreDashboard`, `HrLeaveView`, People, Team Calendar documentado), pero no una experiencia integrada de supervisor.

## Goal

- Dar al supervisor un home operativo claro para su equipo
- Unificar approvals, señales de equipo y drilldowns limitados al subarbol
- Reusar surfaces HR/People existentes con filtros y alcance correctos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/tasks/complete/TASK-326-approval-authority-workflow-snapshots.md`
- `docs/tasks/complete/TASK-327-supervisor-scope-subtree-access.md`

Reglas obligatorias:

- La experiencia debe ser limitada al subarbol del supervisor o delegacion vigente.
- No se debe reciclar el dashboard HR global como si fuera workspace de supervisor.
- La UI debe priorizar decisiones operativas: quien falta, que aprobacion espera, que miembro requiere atencion.
- Reusar componentes y tablas existentes antes de crear una surface completamente paralela.

## Normative Docs

- `docs/tasks/to-do/TASK-323-hierarchy-supervisor-approval-program.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-326-approval-authority-workflow-snapshots.md`
- `docs/tasks/complete/TASK-327-supervisor-scope-subtree-access.md`
- `src/views/greenhouse/hr-core/HrCoreDashboard.tsx`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `src/views/greenhouse/people/PeopleList.tsx`

### Blocks / Impacts

- managers/supervisors internos
- experience de approvals y seguimiento de equipo

### Files owned

- `src/app/(dashboard)/hr/page.tsx`
- `src/app/(dashboard)/hr/leave/page.tsx`
- `src/views/greenhouse/hr-core/HrCoreDashboard.tsx`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `src/views/greenhouse/people/PeopleList.tsx`
- `[verificar] src/app/(dashboard)/hr/approvals/page.tsx`
- `[verificar] src/app/(dashboard)/hr/team/page.tsx`
- `[verificar] src/views/greenhouse/hr-core/SupervisorWorkspaceView.tsx`

## Current Repo State

### Already exists

- `HrCoreDashboard` y `HrLeaveView` ya existen como surfaces HR
- `PeopleList` y Person 360 ya existen para drilldown de miembros
- la arquitectura ya documenta `/hr/approvals` y `Calendario de equipo`

### Gap

- no existe un workspace de supervisor con alcance limitado
- `/hr/approvals` no esta materializado como route real
- no existe vista integrada `Mi equipo`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Landing supervisor

- Crear un landing de supervisor con:
  - total de reportes directos e indirectos
  - pendientes de aprobacion
  - ausencias/proximos eventos del equipo
  - alertas operativas del subarbol
- Definir entry point claro desde HR o desde la experiencia personal segun el access model de `TASK-327`

### Slice 2 — Mi equipo

- Crear la vista de equipo para supervisors con tabla/lista limitada a su subarbol
- Permitir drilldown seguro a People/Person 360 con redaccion y guards segun scope
- Reusar filtros y tablas donde convenga

### Slice 3 — Cola de aprobaciones

- Materializar `/hr/approvals` o surface equivalente para supervisors
- Mostrar leave pendiente y dejar preparado el carril para expenses
- Priorizar legibilidad operacional y estado de cada caso

## Out of Scope

- CRUD de jerarquias
- organigrama visual
- evaluaciones o goals completos

## Detailed Spec

- La primera iteracion puede priorizar leave como dominio operativo real ya existente.
- La surface de supervisor debe sentirse distinta de HR admin: menos global, mas accionable y mas acotada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una vista `Mi equipo` o equivalente para supervisors
- [ ] Existe una cola de aprobaciones limitada al subarbol del supervisor
- [ ] Los drilldowns a miembros respetan subtree access
- [ ] HR/admin siguen teniendo su experiencia amplia sin degradacion

## Verification

- `pnpm exec tsc --noEmit --incremental false`
- `pnpm lint`
- `pnpm test`
- validacion manual con supervisor real o fixture con reportes directos

## Closing Protocol

- [ ] Actualizar documentacion funcional de HR/supervisor si se crea una surface visible nueva

## Follow-ups

- integracion con expenses cuando `TASK-028` aterrice sobre el motor de autoridad
