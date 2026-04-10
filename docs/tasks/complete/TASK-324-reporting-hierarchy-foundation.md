# TASK-324 — Modelo canonico de jerarquia de reporte, historial y delegaciones

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
- Branch: `feature/codex-task-324-reporting-hierarchy`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la foundation canonica de jerarquia de reporte en Greenhouse: estado actual, historial efectivo, delegaciones temporales y readers reutilizables para supervisor actual, cadena ascendente, reportes directos e indirectos. La meta es convertir la relacion hoy dispersa en una capability durable y auditable.

## Why This Task Exists

Greenhouse ya tiene `greenhouse_core.members.reports_to_member_id`, pero eso no alcanza para operar una jerarquia enterprise:

- no hay historial de cambios
- no hay delegaciones temporales
- no hay readers canonicos de subarbol
- no hay source metadata ni motivo del cambio
- no hay compatibilidad robusta entre consumers actuales y futuras surfaces

Si la jerarquia queda modelada solo como una FK actual sin historia, approvals, visibilidad y auditoria quedan fragiles.

## Goal

- Modelar jerarquia de reporte y delegaciones como capability canonica
- Mantener compatibilidad con consumers actuales que leen `reports_to_member_id`
- Publicar readers y serving helpers para subarbol, cadena y supervisor efectivo
- Formalizar que `greenhouse_core.members.reports_to_member_id` sigue siendo el snapshot actual operativo durante el primer corte y no puede romperse sin compatibilidad explicita

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

- `supervisor` sigue siendo una relacion, no un role code.
- `greenhouse_core.members.reports_to_member_id` no debe eliminarse en el primer corte; debe seguir como compat layer o snapshot actual.
- Toda query debe preservar tenant isolation y compatibilidad con `person_hr_360` / `Person 360`.
- El modelo debe soportar cambio temporal y auditoria, no solo overwrite del estado actual.
- La foundation nueva no reemplaza de golpe el contrato vivo de `reports_to_member_id`; debe convivir con dual-write / sync explicito mientras existan consumers legacy o views dependientes.
- La primera iteracion no define todavia la policy completa de precedence entre fuentes manuales y externas; eso queda en `TASK-330`.
- Si se reutiliza delegacion temporal existente, debe quedar explicito como se conecta con `greenhouse_core.operational_responsibilities` y `responsibility_type = approval_delegate`, evitando duplicar un segundo modelo con semantica equivalente.

## Normative Docs

- `docs/tasks/to-do/TASK-323-hierarchy-supervisor-approval-program.md`

## Dependencies & Impact

### Depends on

- `src/lib/hr-core/service.ts`
- `src/lib/person-360/get-person-hr.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/types/db.d.ts`

### Blocks / Impacts

- `docs/tasks/complete/TASK-325-hierarchy-admin-crud.md`
- `docs/tasks/to-do/TASK-326-approval-authority-workflow-snapshots.md`
- `docs/tasks/to-do/TASK-327-supervisor-scope-subtree-access.md`
- `docs/tasks/to-do/TASK-328-supervisor-workspace-my-team.md`
- `docs/tasks/to-do/TASK-329-org-chart-hierarchy-explorer.md`
- `docs/tasks/to-do/TASK-330-hierarchy-sync-drift-governance.md`

### Files owned

- `src/lib/hr-core/service.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/person-360/get-person-hr.ts`
- `src/app/api/hr/core/members/options/route.ts`
- `src/types/db.d.ts`
- `docs/architecture/schema-snapshot-baseline.sql`
- `migrations/`

## Current Repo State

### Already exists

- `greenhouse_core.members.reports_to_member_id` como FK a `greenhouse_core.members(member_id)`
- `src/lib/person-360/get-person-hr.ts` ya expone `supervisorMemberId` y `supervisorName`
- `src/lib/hr-core/postgres-leave-store.ts` ya usa `reports_to_member_id` para resolver supervisor en leave
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` ya formaliza que supervisoria es un plano separado
- `greenhouse_hr.leave_requests.supervisor_member_id` ya congela snapshot de supervisor al submit para leave
- `greenhouse_core.operational_responsibilities` ya existe como registry scoped con `approval_delegate`, aunque no reemplaza por si solo el modelo de reporting hierarchy

### Gap

- no existe historial efectivo de supervisoria
- no existe una integracion canonica y explicita entre reporting hierarchy y delegacion temporal vigente
- no existen readers de subarbol / cadena ascendente como contrato compartido
- no existe source metadata ni audit trail del cambio de jerarquia
- no existen guardrails de grafo compartidos para self-reporting, ciclos u overlaps invalidos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Storage canonico de jerarquia y delegacion

- Introducir la foundation canonica de relaciones de reporte y delegaciones temporales en `greenhouse_core`
- Mantener `greenhouse_core.members.reports_to_member_id` como snapshot actual o compat layer para consumers ya existentes
- Registrar vigencia, actor, motivo y source metadata del cambio
- Definir explicitamente si la delegacion temporal reutiliza `approval_delegate` en `operational_responsibilities`, o si requiere una extension minima de ese carril, antes de crear storage paralelo

### Slice 2 — Readers y serving contract

- Publicar helpers para:
  - supervisor actual efectivo
  - reportes directos
  - reportes indirectos
  - cadena ascendente
  - miembros sin supervisor
- Reusar esos helpers en HR Core y Person 360 para no recalcular la jerarquia en cada consumer

### Slice 3 — Backfill, compatibilidad y audit events

- Backfill del estado actual desde `reports_to_member_id` al modelo canonico
- Mantener compatibilidad con readers y workflows ya existentes
- Emitir eventos audit para cambios de jerarquia y delegacion

## Out of Scope

- UI admin de jerarquias
- approvals por dominio
- subtree visibility
- organigrama visual

## Detailed Spec

- La primera iteracion debe privilegiar compatibilidad y auditabilidad antes que sofisticacion visual.
- No introducir una jerarquia paralela desligada de `member_id`.
- La primera iteracion debe mantener `members.reports_to_member_id` sincronizado con el estado actual efectivo de la jerarquia formal mientras los consumers existentes sigan leyendo ese campo o views derivadas.
- `supervisor efectivo` en esta task significa resolver la relacion formal actual y, cuando aplique, la delegacion temporal vigente asociada a esa relacion. Los fallbacks por dominio (`hr_manager`, `finance_admin`, etc.) pertenecen a `TASK-326`, no a `TASK-324`.
- La task debe introducir validaciones de integridad minima del grafo:
  - no self-reporting
  - no ciclos
  - no multiples relaciones formales vigentes incompatibles para el mismo miembro y fecha
- Si se requieren nombres nuevos de tablas o views, confirmarlos durante Plan Mode; el archivo no fija naming final de objetos nuevos en esta etapa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe foundation canonica para jerarquia de reporte y delegaciones con vigencia e historial
- [x] Los consumers actuales que leen supervisor siguen funcionando sin ruptura
- [x] Hay readers reutilizables para direct reports, indirect reports y cadena ascendente
- [x] Los cambios de jerarquia quedan auditables

## Verification

- [x] `pnpm pg:connect:migrate`
- [x] `pnpm exec tsc --noEmit --incremental false`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`

## Closing Protocol

- [x] Actualizar arquitectura y baseline SQL si el modelo canonico agrega tablas o views nuevas

## Follow-ups

- `docs/tasks/to-do/TASK-330-hierarchy-sync-drift-governance.md`
- support futuro para jerarquias matrix / dotted-line
