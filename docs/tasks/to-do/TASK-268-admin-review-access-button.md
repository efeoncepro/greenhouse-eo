# TASK-268 — Boton "Revisar acceso" navega al tab Accesos del usuario

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `admin`, `ui`
- Blocked by: `none`
- Branch: `task/TASK-268-admin-review-access-button`
- Legacy ID: —
- GitHub Issue: —

## Summary

El boton "Revisar acceso" en la ficha de usuario de Admin (`/admin/users/[id]`) es un placeholder sin funcionalidad. Debe navegar al tab "Accesos" del mismo usuario, que ya existe y muestra roles, sets de permisos, ajustes manuales y vistas efectivas (implementado en TASK-263).

## Why This Task Exists

El boton existe en `UserDetailHeader.tsx` sin `onClick`. Al hacer click no pasa nada. El tab "Accesos" ya existe y contiene toda la informacion de acceso del usuario — solo falta cablear la navegacion.

## Goal

- El boton "Revisar acceso" cambia al tab "Accesos" del usuario activo
- No requiere backend — es navegacion interna del componente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md` — tab Accesos

Reglas obligatorias:

- No crear endpoints nuevos — es solo UI
- Mantener el patron de tabs existente con TabContext

## Normative Docs

- `src/views/greenhouse/admin/users/UserDetailHeader.tsx` — boton placeholder (linea ~95)
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx` — TabContext con 5 tabs, el tab `access` ya existe

## Dependencies & Impact

### Depends on

- TASK-263 completada — tab "Accesos" (`UserAccessTab`) ya implementado

### Blocks / Impacts

- Ninguno

### Files owned

- `src/views/greenhouse/admin/users/UserDetailHeader.tsx` — agregar onClick
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx` — exponer setter de tab al header (si necesario)

## Current Repo State

### Already exists

- `UserDetailHeader.tsx` con boton "Revisar acceso" sin onClick
- `GreenhouseAdminUserDetail.tsx` con `activeTab` state y tab `access`
- `UserAccessTab.tsx` con roles, sets, ajustes manuales, vistas efectivas

### Gap

- No hay onClick en el boton
- El header no tiene acceso al setter de `activeTab` del parent

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cablear boton "Revisar acceso"

- Pasar `onReviewAccess` callback desde `GreenhouseAdminUserDetail` al `UserDetailHeader`
- En el parent: `onReviewAccess={() => setActiveTab('access')}`
- En el header: `onClick={onReviewAccess}` en el boton

## Out of Scope

- Cambios al tab Accesos
- Nuevos endpoints
- Cualquier logica de backend

## Acceptance Criteria

- [ ] Al hacer click en "Revisar acceso", el tab activo cambia a "Accesos"
- [ ] El scroll se posiciona en el contenido del tab
- [ ] `pnpm build`, `pnpm lint` pasan sin errores

## Verification

- `pnpm build`
- `pnpm lint`
- Verificacion manual: click en "Revisar acceso" navega al tab Accesos

## Closing Protocol

- [ ] Verificar en staging

## Follow-ups

- Ninguno
