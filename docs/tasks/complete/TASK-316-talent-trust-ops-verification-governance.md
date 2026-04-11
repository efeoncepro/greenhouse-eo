# TASK-316 — Talent Trust Ops: Verification, Certification Governance & Review Queue

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-313`, `TASK-315`
- Branch: `task/TASK-316-talent-trust-ops-verification-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-04-11

- TASK-313 completada — ahora existe: estados de verificación (`self_declared`, `pending_review`, `verified`, `rejected`) en skills y certificaciones, APIs admin `verify`/`unverify` para skills, `VerifiedByEfeonceBadge` como componente shared, `verified_by`/`verified_at` en member_skills
- Impacto: el modelo de estados base y el badge ya existen; esta task escala hacia review queue admin, expiración/revalidación de certificaciones y auditoría formal — ya no necesita crear el state model desde cero

## Summary

Implementar la capa de confianza del perfil profesional: verificación `Verificado por Efeonce`, estados operativos, expiración de certificaciones, cola de revisión admin y auditoría de quién validó qué. Esta task convierte el perfil en señal confiable, no solo en autodeclaración.

## Why This Task Exists

Sin trust ops, el badge azul sería cosmético. El sistema necesita un workflow explícito para:

- recibir información autodeclarada
- revisarla
- verificarla o rechazarla
- detectar vencimientos
- mantener evidencia auditada

Eso es lo que hace que el perfil sea útil para staffing, cliente y compliance.

## Goal

- Formalizar verificación `Verificado por Efeonce`
- Agregar review queue y estados operativos
- Gestionar vencimiento y revalidación de certificaciones

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- `Verificado por Efeonce` solo existe cuando hay workflow, auditoría y actor verificable.
- Los certificados deben seguir usando assets privados; la verificación no puede depender solo del nombre del archivo.
- No confiar solo en color; los estados deben tener label y metadata legible.

## Normative Docs

- `docs/tasks/to-do/TASK-313-skills-certifications-profile-crud.md`
- `docs/tasks/to-do/TASK-315-talent-taxonomy-canonical-model.md`
- `docs/tasks/to-do/TASK-027-hris-document-vault.md`

## Dependencies & Impact

### Depends on

- `TASK-313`
- `TASK-315`
- `src/components/greenhouse/GreenhouseFileUploader.tsx`
- `src/app/api/assets/private/[assetId]/route.ts`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
- `src/views/greenhouse/admin/users/**`

### Blocks / Impacts

- `TASK-317`
- `TASK-318`
- `TASK-319`
- `TASK-320`

### Files owned

- `src/views/greenhouse/admin/users/**`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
- `src/lib/hr-core/service.ts`
- `src/types/hr-core.ts`
- `src/lib/agency/skills-staffing.ts`
- `src/types/agency-skills.ts`
- `src/lib/sync/event-catalog.ts`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

## Current Repo State

### Already exists

- admin user detail shell
- uploader de assets privados
- skills canónicas
- fields básicos de perfil

### Gap

- no hay estados operativos ni queue de revisión para skills/certificaciones
- no hay expiración, rechazo ni revalidación canónica
- no hay auditoría user-facing/admin-facing del badge `Verificado por Efeonce`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Verification state model

- Definir estados mínimos:
  - `autodeclarado`
  - `por_revisar`
  - `verificado`
  - `rechazado`
  - `vencido` (certificaciones)
- Persistir quién verificó, cuándo y observaciones/reason codes

### Slice 2 — Admin review queue

- Agregar una cola visible dentro de las surfaces admin existentes para:
  - pendientes de revisar
  - por vencer
  - vencidas
  - rechazadas / observadas
- Permitir acciones de verificar, rechazar, pedir corrección y desverificar

### Slice 3 — Badge and governance

- Mostrar `Verificado por Efeonce` de forma consistente en self/admin y reusable para client-safe surfaces
- El badge visible debe usar lockup inline locale-aware (`Verificado por` / `Verified by`) + wordmark SVG de Efeonce desde un componente shared, no una composición ad hoc por pantalla
- Gestionar expiry y revalidación de certificaciones
- Emitir eventos/auditoría si la arquitectura vigente lo requiere

## Out of Scope

- buscador interno de talento
- perfiles cliente
- endorsements o reputación

## Detailed Spec

El badge visible debe estar respaldado por:

- actor verificable
- timestamp
- evidencia o soporte
- estado vigente

La cola debe permitir operaciones en volumen y filtros por:

- tipo
- estado
- expiración
- persona

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un modelo de estados operativos para skills y certificaciones
- [ ] Admin puede verificar, rechazar y revalidar desde una cola o surface dedicada reutilizando el shell admin existente
- [ ] El badge `Verificado por Efeonce` solo aparece sobre items efectivamente validados
- [ ] Certificaciones vencidas o por vencer quedan distinguibles y operables

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- validación manual del workflow en `/admin/users/[id]` y la cola admin resultante

## Closing Protocol

- [ ] Documentar el contrato de verificación y expiración
- [ ] Actualizar `Handoff.md` con el workflow operativo si la task cierra

## Follow-ups

- `TASK-318`
- `TASK-320`

## Open Questions

- si la cola vive dentro de `/admin/users` o en una vista admin dedicada [verificar durante Discovery]
