# TASK-325 — Admin de jerarquias: CRUD, reasignaciones y auditoria

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Implementada`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `feature/codex-task-325-hierarchy-admin-crud-v2`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la superficie de administracion de jerarquias para HR y admin: ver lineas de reporte, asignar/cambiar supervisor, delegar temporalmente, reasignar subarboles y revisar el historial auditado de cambios. Esto convierte la jerarquia en una operacion real del portal y no en un dato escondido.

## Why This Task Exists

Hoy la jerarquia no tiene un modulo propio:

- no hay vista para administrar `reports_to`
- no hay flow claro para mover equipos cuando cambia un lead
- no hay audit trail visible para RRHH
- no hay UX dedicada para delegaciones o cambios temporales

Sin esta capa, cualquier foundation de jerarquia quedaria atrapada en scripts, APIs o formularios dispersos.

## Goal

- Dar a HR/admin una vista canonica para gestionar jerarquias
- Soportar cambios simples y bulk con reason capture
- Hacer visible el historial y el estado actual de la jerarquia

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/tasks/complete/TASK-324-reporting-hierarchy-foundation.md`

Reglas obligatorias:

- No reutilizar `HR > Departments` como si fuera el modulo de jerarquias.
- Toda mutacion debe pedir motivo y quedar auditada.
- Los selectores de supervisor deben reutilizar members/options y no inventar otro directorio paralelo.
- No habilitar drag-and-drop mutante sin historia, preview y confirmacion.
- La surface debe vivir sobre reporting hierarchy; `departments` solo puede aportar filtros o contexto visual, nunca source of truth de supervisoria.

## Normative Docs

- `docs/tasks/to-do/TASK-323-hierarchy-supervisor-approval-program.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-324-reporting-hierarchy-foundation.md`
- `src/app/api/hr/core/members/options/route.ts`
- `src/lib/reporting-hierarchy/readers.ts`
- `src/lib/reporting-hierarchy/store.ts`

### Blocks / Impacts

- `docs/tasks/to-do/TASK-328-supervisor-workspace-my-team.md`
- `docs/tasks/to-do/TASK-329-org-chart-hierarchy-explorer.md`
- operacion diaria de RRHH y liderazgo interno

### Files owned

- `src/lib/reporting-hierarchy/*`
- `src/app/api/hr/core/members/options/route.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/views/greenhouse/hr-core/HrCoreDashboard.tsx`
- `[nuevo] src/app/(dashboard)/hr/hierarchy/page.tsx`
- `[nuevo] src/views/greenhouse/hr-core/HrHierarchyView.tsx`
- `[nuevo] src/app/api/hr/core/hierarchy/**`

## Current Repo State

### Already exists

- `TASK-324` ya dejo `greenhouse_core.reporting_lines` como foundation canonica de supervisoria
- `src/app/api/hr/core/members/options/route.ts` ya existe para selectores de miembros
- `src/lib/hr-core/service.ts` ya enruta cambios de `reportsTo` por `src/lib/reporting-hierarchy/store.ts`
- `src/lib/reporting-hierarchy/readers.ts` ya expone subtree, chain, supervisor actual y supervisor efectivo
- `src/views/greenhouse/admin/responsibilities/AdminResponsibilitiesView.tsx` y `/api/admin/responsibilities` ya dan un patron CRUD reusable para delegaciones scoped
- `HR > Departments` ya tiene una surface operativa sobre PostgreSQL, pero solo como referencia de patron y entry point cercano

### Gap

- no existe una vista dedicada para jerarquia de reporte
- no existe bulk reassignment de subarbol
- no existe historial visible de cambios de supervisoria
- las delegaciones temporales no tienen UX ni control de vigencia
- no existe un API dedicado para reporting hierarchy admin
- `schema-snapshot-baseline.sql` todavia no refleja `operational_responsibilities`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Surface admin/HR de jerarquias

- Crear la vista dedicada de jerarquias con filtros por area, supervisor, estado y miembros sin supervisor
- Mostrar supervisor actual, cantidad de reportes directos, profundidad y señales de inconsistencia
- Ofrecer entry points desde HR y Admin Center sin duplicar ownership del modulo

### Slice 2 — Flows de mutacion y reasignacion

- Cambiar supervisor directo con motivo y vigencia
- Crear delegaciones temporales
- Reasignar reportes o subarboles cuando cambie un lead o haya salida temporal
- Validar ciclos y auto-reportes antes de persistir

### Slice 3 — Auditoria y timeline

- Renderizar historial de cambios y delegaciones
- Mostrar actor, fecha, motivo, vigencia y diff de la relacion
- Habilitar filtros de auditoria por miembro, supervisor y rango temporal

## Out of Scope

- resolver permisos de approvals
- subtree access para supervisors
- organigrama visual cliente de la jerarquia

## Detailed Spec

- Reusar patrones Vuexy/MUI de management existentes antes de crear primitives nuevas.
- La primera iteracion debe optimizar claridad operativa y auditabilidad; drag-and-drop puede quedar como follow-on si no pasa el liston enterprise.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] HR/admin puede ver y editar la jerarquia desde una vista dedicada
- [x] Los cambios piden motivo y quedan auditados
- [x] Existe soporte para delegacion temporal y para reasignacion de equipo
- [x] No se reutiliza `departments` como sustituto de jerarquia de reporte

## Verification

- `pnpm pg:connect:migrate`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm lint`
- `pnpm build`
- `pnpm exec vitest run src/app/api/hr/core/hierarchy/route.test.ts src/app/api/hr/core/hierarchy/history/route.test.ts src/app/api/hr/core/hierarchy/reassign/route.test.ts src/app/api/hr/core/hierarchy/delegations/route.test.ts src/views/greenhouse/hr-core/HrHierarchyView.test.tsx`
- validacion runtime de lectura sobre `greenhouse_core.reporting_lines`

## Closing Protocol

- [x] Actualizar documentacion funcional de HR si se crea una nueva surface de jerarquias

## Follow-ups

- drag-and-drop con guardrails y diff preview si la operacion lo justifica
