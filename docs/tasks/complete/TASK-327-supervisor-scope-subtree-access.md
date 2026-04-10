# TASK-327 — Supervisor scope: acceso subtree-aware y visibilidad limitada

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementada`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar supervisor scope real en Greenhouse: una persona con reportes directos o autoridad delegada debe poder entrar a surfaces de supervisor y ver solo su subarbol, sin convertirse en `hr_manager` ni recibir acceso amplio por accidente.

## Why This Task Exists

El problema actual es doble:

- hoy no existe una policy reusable para habilitar acceso de supervisor sin otorgar `routeGroup: hr`
- algunos readers siguen siendo `self-only` o `hr/admin`, sin una capa intermedia subtree-aware
- otros surfaces futuros ya estan documentados, pero el runtime todavia no materializa la semantica de supervisor basada en jerarquia y delegacion

La arquitectura ya dice que `supervisor` no es un role code. Falta convertir esa semantica en access runtime real.

## Goal

- Resolver subtree-aware visibility basada en jerarquia y delegacion
- Abrir surfaces de supervisor sin crear un nuevo role code global
- Mantener a HR/admin con acceso amplio y a supervisors con acceso limitado por subarbol

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/tasks/complete/TASK-263-permission-sets-enterprise-view-access.md`
- `docs/tasks/complete/TASK-324-reporting-hierarchy-foundation.md`
- `docs/tasks/complete/TASK-326-approval-authority-workflow-snapshots.md`

Reglas obligatorias:

- No introducir un role code `supervisor`.
- La visibilidad de supervisor debe ser subtree-aware y derivada de la jerarquia real o delegacion vigente.
- Un supervisor no debe recibir payroll global ni acceso irrestricto a todo People/HR.
- Los guards deben poder convivir con `hr_manager`, `efeonce_admin` y permission sets existentes.

## Normative Docs

- `docs/tasks/to-do/TASK-323-hierarchy-supervisor-approval-program.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-324-reporting-hierarchy-foundation.md`
- `docs/tasks/complete/TASK-263-permission-sets-enterprise-view-access.md`
- `docs/tasks/complete/TASK-326-approval-authority-workflow-snapshots.md`
- `src/lib/tenant/authorization.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/lib/reporting-hierarchy/readers.ts`
- `src/lib/approval-authority/store.ts`

### Blocks / Impacts

- `docs/tasks/to-do/TASK-328-supervisor-workspace-my-team.md`
- `docs/tasks/to-do/TASK-329-org-chart-hierarchy-explorer.md`
- People / HR surfaces que hoy no distinguen bien entre `hr/admin` y supervisor subtree-aware

### Files owned

- `src/lib/tenant/authorization.ts`
- `src/lib/tenant/role-route-mapping.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/lib/admin/get-admin-view-access-governance.ts`
- `src/lib/admin/permission-sets.ts`
- `src/lib/reporting-hierarchy/readers.ts`
- `src/lib/approval-authority/store.ts`
- `src/lib/hr-core/shared.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/people/permissions.ts`
- `src/lib/people/organization-scope.ts`
- `src/app/api/people/route.ts`
- `src/app/api/people/[memberId]/route.ts`
- `src/app/api/people/[memberId]/hr/route.ts`
- `src/app/api/hr/core/leave/requests/route.ts`

## Current Repo State

### Already exists

- `src/lib/tenant/authorization.ts` y `role-route-mapping.ts` ya gobiernan el access runtime
- `src/lib/admin/view-access-catalog.ts` y permission sets ya modelan vistas persistidas
- `TASK-324` ya dejo `reporting_lines`, readers de subtree y `getEffectiveSupervisor()`
- `TASK-326` ya dejo `workflow_approval_snapshots` y leave ya consume visibilidad por snapshot para approvals
- la arquitectura documenta que `/hr/approvals` debe existir para users with direct reports o HR/admin, pero esa route todavia no esta materializada; el surface operativo actual es `/hr/leave`

### Gap

- el access runtime no materializa subtree access para supervisoria
- no existe distincion fuerte entre `hr_manager` y supervisor con equipo a cargo
- el sistema no expone una capability clara `hasDirectReports` / `hasDelegatedAuthority`
- People detail, Person HR y People list todavia no aplican un guard subtree-aware reutilizable
- `greenhouse_core.reporting_lines` y `greenhouse_hr.workflow_approval_snapshots` no tienen `space_id`; esta capability debe resolverse con tenant context + jerarquia + guards, no con filtro fisico directo por tabla

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Policy matrix de supervisor scope

- Definir que surfaces puede ver un supervisor directo o delegado
- Distinguir lectura de subarbol, aprobaciones, team health y People drilldown limitado
- Conservar accesos amplios solo para `hr_manager` y `efeonce_admin`

### Slice 2 — Guards y helpers subtree-aware

- Agregar helpers para saber si el actor:
  - tiene reportes directos
  - tiene autoridad delegada vigente
  - puede ver un `memberId` o una request por pertenecer a su subarbol
- Integrar esos helpers al authorization runtime

### Slice 3 — Cutover de readers y APIs sensibles

- Aplicar subtree checks a People/HR readers relevantes
- Alinear surfaces de supervisor sin romper los accesos ya existentes de HR/admin
- Documentar la compatibilidad con permission sets y view access governance

## Out of Scope

- crear el workspace visual de supervisor
- CRUD de jerarquias
- organigrama visual

## Detailed Spec

- La implementacion debe materializar una capability de supervisoria derivada, no un nuevo role code.
- Cuando un actor califica por subarbol y por rol amplio, debe prevalecer la semantica mas segura del reader.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Un supervisor con reportes directos puede acceder a surfaces de supervisor sin ser `hr_manager`
- [x] Ese acceso queda limitado a su subarbol o autoridad delegada vigente
- [x] HR/admin conservan acceso amplio
- [x] No se introduce un role code global `supervisor`

## Verification

- `pnpm exec tsc --noEmit --incremental false`
- `pnpm lint`
- `pnpm test`
- validacion manual con usuario supervisor, usuario HR y usuario sin equipo a cargo

## Closing Protocol

- [x] Actualizar la documentacion de Identity Access si cambian guards o surfaces visibles

## Follow-ups

- `docs/tasks/to-do/TASK-328-supervisor-workspace-my-team.md`
- `docs/tasks/to-do/TASK-329-org-chart-hierarchy-explorer.md`
