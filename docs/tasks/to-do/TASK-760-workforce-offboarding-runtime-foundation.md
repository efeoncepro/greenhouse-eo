# TASK-760 — Workforce Offboarding Runtime Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-010`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-760-workforce-offboarding-runtime-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementa la foundation runtime del agregado canónico `WorkRelationshipOffboardingCase` para que Greenhouse pueda modelar una salida laboral o contractual como un caso formal y no como suma de checklists, flags sueltos o desactivaciones de acceso. Esta task es el prerrequisito funcional para cualquier motor serio de finiquitos.

## Delta 2026-05-03 — People runtime gap verificado en codebase

Revisión directa del repo confirmó que la ficha/persona hoy no tiene una fecha canónica de término laboral:

- `src/types/hr-core.ts` expone `hireDate` y `contractEndDate`, pero no `terminationDate`, `effectiveExitDate` ni `lastWorkingDay`.
- `src/lib/hr-core/service.ts` persiste `hireDate`/`contractEndDate`; no existe lifecycle de salida laboral.
- `src/lib/hr-core/leave-domain.ts` calcula vacaciones desde `hireDate`, pero no recibe una fecha canónica de salida para cierre proporcional.
- `src/lib/team-admin/mutate-team.ts` tiene `deactivateMember`, que solo baja `greenhouse_core.members.active = false` y cierra asignaciones con `CURRENT_DATE`; eso es desactivación administrativa, no offboarding laboral.
- No existe runtime/migración bajo `src/lib/workforce/offboarding/**` ni tablas de caso `offboarding_case`.

Decisión: `contractEndDate` queda como dato contractual o señal de revisión, no como término laboral efectivo. La fuente de verdad de salida debe ser el agregado `WorkRelationshipOffboardingCase` con `effective_date` y `last_working_day`.

## Why This Task Exists

Hoy Greenhouse sabe:

- hacer checklists legacy de offboarding
- revocar accesos por SCIM/Admin
- bloquear algunas operaciones Payroll con `termination_pending`

Pero no sabe todavía representar formalmente:

- quién sale
- de qué relación sale
- bajo qué causal sale
- en qué fecha se hace efectiva
- qué lane downstream se abre para payroll/documentos/acceso

Sin ese caso canónico, cualquier funcionalidad de finiquito nace huérfana y termina acoplada a cambios de `member.active`, checklists HRIS o payloads manuales.

## Goal

- Crear el agregado canónico `WorkRelationshipOffboardingCase`.
- Modelar estado, causal, relación afectada, lane y fechas efectivas.
- Conectar triggers mínimos: HR manual, SCIM/identity signal y checklist legacy como child object o reference.
- Exponer surfaces mínimas read/write para operar el caso.
- Dejar hooks explícitos para lane de payroll final, sin calcular aún el finiquito.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`

Reglas obligatorias:

- Offboarding no puede modelarse como “desactivar usuario”.
- El agregado vive sobre una relación de trabajo, no solo sobre una persona.
- No agregar un `terminationDate` plano a `greenhouse_core.members` ni a `HrMemberProfile` como source of truth de salida; People debe leer el estado desde el caso canónico o un read-model derivado.
- `contract_end_date` / `contractEndDate` puede abrir una revisión o sugerir un caso, pero no ejecuta offboarding ni habilita finiquito por sí solo.
- `member.active = false` es efecto downstream de un caso ejecutado, o fallback administrativo explícito, nunca la fuente de verdad laboral.
- No hard delete de histórico.
- `SCIM` puede abrir o actualizar casos, pero no saltarse el agregado.
- La task debe distinguir claramente `views`/surface visible y `entitlements`/acciones autorizadas.

## Normative Docs

- `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`
- `src/lib/approval-authority/config.ts`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `greenhouse_hr.workflow_approval_snapshots` / workflow domain `offboarding`

### Blocks / Impacts

- Bloquea `TASK-761` (finiquito engine) como prerequisito funcional.
- Impacta surfaces `HR`, `People`, Identity/Access y futuras colas de lifecycle.
- Recontextualiza `TASK-030` como child/legacy consumer del caso.

### Files owned

- `migrations/<ts>_task-760-offboarding-case-foundation.sql`
- `src/lib/workforce/offboarding/**`
- `src/app/api/hr/offboarding/**`
- `src/views/greenhouse/hr/offboarding/**`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/documentation/hr/offboarding.md`
- `docs/manual-de-uso/hr/offboarding.md`

## Current Repo State

### Already exists

- Workflow domain `offboarding`
- Checklist/template legacy en HRIS
- Signals de identity/admin/scim
- Spec canónica especializada de Offboarding

### Gap

- No existe el agregado runtime canónico.
- No existe state machine formal ejecutable.
- No hay lane canónica de payroll final.
- No hay cola/surface propia de casos de offboarding.
- No existe fecha de término laboral real en People/HR profile; solo existen `hireDate` y `contractEndDate`.
- No existe card/read-model en People 360 que distinga `fecha de ingreso`, `fin de contrato`, `salida programada`, `último día trabajado` y `estado de offboarding`.
- La acción actual `Desactivar` puede confundirse con offboarding si no se rodea de guardrails.

## Scope

### Slice 1 — Aggregate schema

- Tabla base `work_relationship_offboarding_cases`
- Campos mínimos: relationship, causal, `effective_date`, `last_working_day`, source, status, lane, notes
- Snapshot contractual mínimo: `contract_end_date_snapshot`, tipo de relación, régimen/país y empleador legal si aplica
- Guardrail: `effective_date` requerido antes de `approved`, `scheduled` o `executed`.
- Guardrail: `last_working_day` requerido antes de `scheduled` o `executed`.
- Guardrail: `last_working_day` no debe quedar después de `effective_date` salvo excepción explícita y auditada.
- Guardrail: `contract_end_date_snapshot` no reemplaza `effective_date`.
- Índices, status model y audit trail

### Slice 2 — Lane resolution + state model

- Resolver `rule_lane` mínimo según relación/regimen
- Estados V1: `draft`, `needs_review`, `approved`, `scheduled`, `blocked`, `executed`, `cancelled`
- Guards de transición básicos

### Slice 3 — Trigger sources

- Crear caso manual desde HR
- Abrir `needs_review` desde `contractEndDate` próximo/vencido cuando aplique, sin ejecutar offboarding automáticamente
- Abrir `needs_review` desde señales SCIM/Admin cuando aplique
- Enlazar checklist legacy como consumer o child object
- Hacer que cualquier flujo administrativo de `deactivateMember` que afecte una relación laboral derive al caso de offboarding cuando corresponda.
- Si `deactivateMember` se usa como excepción, registrar explícitamente que fue desactivación administrativa/identity-only y no salida laboral.

### Slice 4 — Surfaces + access model

- Surface `HR > Offboarding` o equivalente
- Detail case view con tabs o secciones por lane
- Entitlements mínimas:
  - `offboarding_case.create`
  - `offboarding_case.review`
  - `offboarding_case.approve`
  - `offboarding_case.execute`
  - `offboarding_case.cancel`

### Slice 5 — People 360 lifecycle integration

- Agregar read-model/helper para que People 360 muestre fecha de ingreso (`hireDate`), fin de contrato si existe (`contractEndDate`), salida programada (`effective_date`), último día trabajado (`last_working_day`) y estado del caso de offboarding.
- CTA autorizado `Iniciar offboarding` desde la ficha/persona cuando no haya caso activo.
- Evitar que `Desactivar` sea la acción primaria de salida laboral.

### Slice 6 — Legacy deactivation guardrail

- Mantener `deactivateMember` como operación de acceso/administración de bajo nivel.
- Agregar warning, audit trail o wrapper de dominio para impedir que se use silenciosamente como offboarding laboral.
- Un caso `executed` puede llamar downstream a revocación de acceso/desactivación, pero no al revés.

## Out of Scope

- No calcular aún finiquitos.
- No emitir documentos de término.
- No reemplazar todos los consumers legacy en la primera etapa.
- No construir Onboarding.

## Acceptance Criteria

- [ ] Existe agregado canónico `OffboardingCase` con estado y lane formal.
- [ ] Se puede abrir y operar un caso de renuncia manualmente desde HR.
- [ ] People/HR distingue fecha de ingreso, fin de contrato, salida efectiva y último día trabajado.
- [ ] `contractEndDate` no se usa como fuente de verdad de término laboral ni como input directo de finiquito.
- [ ] `deactivateMember` no representa silenciosamente un término laboral; queda guardrail o derivación a offboarding.
- [ ] Existe hook explícito para lane de payroll final sin calcular todavía el finiquito.
- [ ] La task no depende de implementar Onboarding.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- Validación manual de crear y mover un caso de offboarding en preview/local
- Test unitario/read-model que pruebe `contractEndDate` vs `effective_date` como conceptos distintos
- Grep/revisión: no introducir `terminationDate` plano como owner canónico fuera del agregado/read-model derivado

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo movido a la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] docs funcionales/arquitectura actualizadas si cambió contrato

## Follow-ups

- `TASK-761`
- `TASK-762`
