# TASK-362 — Assigned Team Talent Detail Drawer & Client-Safe Dossier Convergence

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-358, TASK-359, TASK-360, TASK-361`
- Branch: `task/TASK-362-assigned-team-talent-detail-drawer-client-safe-dossier`
- Legacy ID: `follow-on de TASK-318`
- GitHub Issue: `none`

## Summary

Construir el drawer enterprise de detalle individual para `Equipo asignado`, convergiendo `ClientSafeTalentCard` con la nueva semántica de dossier, coverage, idiomas, certificaciones y signals de performance visibles al cliente.

## Why This Task Exists

`TASK-318` ya resolvió el perfil individual client-safe, pero la nueva architecture pide un `talent dossier` contextualizado por assignment real. El cliente no solo debe ver quién es la persona: también debe entender capacidad, cobertura, fit de skills y confianza operacional sin exponer datos internos.

## Goal

- Evolucionar el perfil individual hacia un drawer enterprise contextual
- Reutilizar `client-safe` como base y sumar contexto de assignment/capacidad
- Mantener la seguridad field-level y la claridad visual en un espacio compacto

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`

Reglas obligatorias:

- el drawer no puede exponer atributos fuera del carril `client-safe`
- el contexto assignment/capacity debe leerse, no rearmarse desde el componente
- el drawer debe funcionar también como reusable consumer en otras surfaces

## Normative Docs

- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/ClientSafeTalentCard.tsx`
- `src/app/api/team/members/[memberId]/profile/route.ts`
- `TASK-318`
- `TASK-358`
- `TASK-359`
- `TASK-360`
- `TASK-361`

### Blocks / Impacts

- `TASK-365`
- `src/views/greenhouse/GreenhouseClientTeam.tsx`

### Files owned

- `src/components/greenhouse/ClientSafeTalentCard.tsx`
- `src/components/greenhouse/assigned-team/AssignedTalentDetailDrawer.tsx`
- `src/views/greenhouse/assigned-team/*`
- `docs/tasks/to-do/TASK-362-assigned-team-talent-detail-drawer-client-safe-dossier.md`

## Current Repo State

### Already exists

- dossier client-safe reusable de `TASK-318`
- endpoint individual `profile` por miembro

### Gap

- no existe drawer enterprise contextualizado por assignment
- no existe layout para skills + certs + idiomas + signals + coverage en detalle
- no existe convergencia entre roster y dossier

## Scope

### Slice 1 — Drawer structure

- definir header, summary rail y secciones internas del dossier
- soportar loading, partial data y no-entitlement blocks

### Slice 2 — Data convergence

- combinar perfil client-safe con assignment, capacity y signals permitidas
- resolver field masking y fallbacks consistentes

### Slice 3 — Reuse

- dejar el drawer consumible desde `/equipo`, dashboard y cards embebidas
- agregar tests de apertura/cierre, keyboard nav y responsive

## Out of Scope

- construir el semantic layer base
- exportar dossier a PDF o share link

## Acceptance Criteria

- [ ] Existe un drawer `Assigned Team` usable desde la página principal
- [ ] El detalle individual converge dossier client-safe + contexto assignment/capacity
- [ ] La navegación del drawer es accesible y reusable en otras surfaces

## Verification

- `pnpm lint`
- `pnpm test -- assigned-team drawer`
- validación manual keyboard + responsive

## Closing Protocol

- [ ] revisar que el drawer no exponga campos internos de `Person Complete 360`

## Follow-ups

- `TASK-365`
- `TASK-366`
