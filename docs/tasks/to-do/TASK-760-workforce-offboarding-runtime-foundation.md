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

## Scope

### Slice 1 — Aggregate schema

- Tabla base `work_relationship_offboarding_cases`
- Campos mínimos: relationship, causal, fecha efectiva, last working day, source, status, lane, notes
- Índices, status model y audit trail

### Slice 2 — Lane resolution + state model

- Resolver `rule_lane` mínimo según relación/regimen
- Estados V1: `draft`, `needs_review`, `approved`, `scheduled`, `blocked`, `executed`, `cancelled`
- Guards de transición básicos

### Slice 3 — Trigger sources

- Crear caso manual desde HR
- Abrir `needs_review` desde señales SCIM/Admin cuando aplique
- Enlazar checklist legacy como consumer o child object

### Slice 4 — Surfaces + access model

- Surface `HR > Offboarding` o equivalente
- Detail case view con tabs o secciones por lane
- Entitlements mínimas:
  - `offboarding_case.create`
  - `offboarding_case.review`
  - `offboarding_case.approve`
  - `offboarding_case.execute`
  - `offboarding_case.cancel`

## Out of Scope

- No calcular aún finiquitos.
- No emitir documentos de término.
- No reemplazar todos los consumers legacy en la primera etapa.
- No construir Onboarding.

## Acceptance Criteria

- [ ] Existe agregado canónico `OffboardingCase` con estado y lane formal.
- [ ] Se puede abrir y operar un caso de renuncia manualmente desde HR.
- [ ] Existe hook explícito para lane de payroll final sin calcular todavía el finiquito.
- [ ] La task no depende de implementar Onboarding.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- Validación manual de crear y mover un caso de offboarding en preview/local

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo movido a la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] docs funcionales/arquitectura actualizadas si cambió contrato

## Follow-ups

- `TASK-761`
- `TASK-762`
