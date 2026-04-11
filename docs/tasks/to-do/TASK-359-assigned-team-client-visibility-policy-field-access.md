# TASK-359 — Assigned Team Client Visibility Policy & Field-Level Access

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `TASK-358`
- Branch: `task/TASK-359-assigned-team-client-visibility-policy-field-access`
- Legacy ID: `follow-on de GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Formalizar la policy enterprise de visibilidad para `Equipo asignado`: quién puede ver qué cards, qué campos y qué signals según rol, entitlement y alcance organizacional del cliente.

## Why This Task Exists

La arquitectura define que `Assigned Team` debe servir a clientes enterprise con diferentes niveles de exposición. Hoy el portal tiene permisos por vista y algunos carriles `client-safe`, pero no una policy field-level para capacidad, performance, certificaciones, backups o señales de riesgo. Sin esto, el módulo se volvería frágil o excesivamente restrictivo.

## Goal

- Crear una policy explícita por capability y por campo para `Assigned Team`
- Resolver masking y degradación progresiva sin esconder la UX completa
- Reutilizar la misma policy en página principal, drawer y cards embebidas

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- route access no reemplaza field-level policy
- `client-safe` sigue siendo condición base, no permiso suficiente para todo
- premium cards y signals avanzadas deben degradar con claridad, no fallar en silencio

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`

## Dependencies & Impact

### Depends on

- `src/lib/admin/view-access-catalog.ts`
- `src/lib/admin/view-access-store.ts`
- `src/lib/admin/permission-sets.ts`
- `src/types/permission-sets.ts`
- `src/lib/tenant/authorization.ts`
- `src/lib/tenant/access.ts`
- `TASK-358`

### Blocks / Impacts

- `TASK-361`
- `TASK-362`
- `TASK-364`
- `TASK-365`

### Files owned

- `src/lib/assigned-team/access.ts`
- `src/lib/assigned-team/field-policy.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/lib/admin/permission-sets.ts`
- `src/types/permission-sets.ts`
- `docs/tasks/to-do/TASK-359-assigned-team-client-visibility-policy-field-access.md`

## Current Repo State

### Already exists

- catálogo de vistas y permission sets bajo `src/lib/admin/*`
- enforcement base por tenant/scope bajo `src/lib/tenant/*`
- perfil individual client-safe ya saneado por `TASK-318`

### Gap

- no existe permiso canónico para `Assigned Team`
- no hay matriz de campos visibles por variant de cliente
- no hay degradación explícita para premium cards y signals de riesgo

## Scope

### Slice 1 — Policy model

- definir capability key, variants y tiers de visibilidad
- mapear bloques: composición, capacidad, skills, certificaciones, idiomas, performance, alerts

### Slice 2 — Resolver & masking

- implementar helpers server/client para filtrar campos y cards
- soportar placeholders y explanatory states para surfaces premium

### Slice 3 — Governance

- integrar el nuevo scope al catálogo/admin y tests de autorización
- documentar default policy para clientes enterprise nuevos

## Out of Scope

- implementar el reader base de portfolio
- construir la UI principal del módulo

## Acceptance Criteria

- [ ] Existe una policy field-level reutilizable por página, drawer y cards embebidas
- [ ] `Assigned Team` se puede habilitar por scope sin exponer signals fuera de policy
- [ ] Hay tests de autorización y masking para al menos tres variantes de acceso

## Verification

- `pnpm test -- assigned-team access`
- `pnpm lint`
- `pnpm tsc --noEmit`

## Closing Protocol

- [ ] actualizar `Handoff.md` con cualquier decisión de entitlement que impacte `Client Portal`

## Follow-ups

- `TASK-361`
- `TASK-362`
- `TASK-365`
