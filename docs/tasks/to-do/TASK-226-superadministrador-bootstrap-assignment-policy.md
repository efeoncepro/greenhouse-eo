# TASK-226 - Superadministrador Bootstrap & Assignment Policy

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `42`
- Domain: `identity / platform / admin`

## Summary

Formalizar la policy de asignación del rol `Superadministrador` dentro de Greenhouse para que el perfil owner/founder del portal tenga un contrato claro, consistente y operable.

La task debe convertir en política institucional la respuesta práctica de qué rol corresponde al owner del sistema y cómo se bootstrappea, asigna, combina y audita ese alcance.

## Why This Task Exists

La arquitectura ya reconoce a `efeonce_admin` como el rol visible más amplio del sistema y el runtime ya quedó alineado para heredar todos los `routeGroups` del portal.

Pero todavía falta cerrar una policy específica para:

- el perfil owner/founder de Greenhouse
- el bootstrap inicial del tenant interno
- la combinación correcta entre `efeonce_admin` y `collaborator`
- el control operativo sobre quién puede recibir o perder ese alcance

Hoy ya podemos responder que el perfil natural del owner es:

- `efeonce_admin`
- `collaborator`

Pero esa respuesta aún no está formalizada como lane ejecutable con criterio de implementación y gobernanza.

## Goal

- Formalizar que el perfil owner/founder de Greenhouse se modela como `Superadministrador` + `Colaborador`.
- Definir la policy de bootstrap inicial para usuarios internos con acceso total.
- Definir quién puede asignar, revocar y auditar el rol `Superadministrador`.
- Dejar claro que `Superadministrador` siempre implica acceso total a todas las vistas posibles del portal.
- Preparar follow-ons de implementación en seeds, onboarding admin y governance UI si hace falta.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`

Reglas obligatorias:

- `Superadministrador` debe seguir usando `efeonce_admin` como `role_code` técnico actual.
- el owner/founder no debe perder su experiencia personal; por eso la combinación target incluye también `collaborator`.
- la asignación de `Superadministrador` debe tratarse como una capacidad excepcional y auditable, no como un rol operativo común.
- cualquier auto-bootstrap o default assignment debe quedar explícito y no depender de heurísticas silenciosas no documentadas.

## Dependencies & Impact

### Depends on

- `TASK-225` — contrato base de roles internos, jerarquías y matriz de vistas
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `src/config/role-codes.ts`
- `src/lib/tenant/role-route-mapping.ts`

### Impacts to

- provisioning de usuarios internos
- `/admin/users`
- `/admin/roles`
- `/admin/views`
- políticas de invitación interna
- seeds o setup inicial de identidad

### Files owned

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `src/app/api/admin/invite/route.ts`
- `src/lib/admin/role-management.ts`
- `src/lib/tenant/role-route-mapping.ts`
- futuros seeds/bootstrap identity scripts

## Current Repo State

### Ya existe

- `efeonce_admin` ya está definido como nombre visible `Superadministrador`
- el runtime canónico ya le da todos los `routeGroups`
- `collaborator` ya existe como rol base de experiencia personal
- la arquitectura ya sugiere que una persona como founder/owner naturalmente debe combinar ambos

### Gap actual

- no existe una task específica que formalice esa policy como backlog ejecutable
- no está cerrada la regla exacta de bootstrap inicial para owners/admins fundadores
- no está definido con suficiente precisión quién puede otorgar o revocar `Superadministrador`
- falta un contrato explícito de auditoría y control para el rol más sensible del portal

## Scope

### Slice 1 - Policy de asignación del owner/founder

- formalizar que el perfil owner/founder recomendado es `efeonce_admin` + `collaborator`
- documentar por qué no basta con `efeonce_admin` solo
- definir el criterio visible y operativo para este perfil

### Slice 2 - Bootstrap y onboarding inicial

- definir cómo nace el primer `Superadministrador` del tenant interno
- definir si el bootstrap es por seed, script, migration-safe bootstrap o acción explícita en admin
- dejar claro cómo se recupera el acceso si no existe ningún `Superadministrador` activo

### Slice 3 - Governance y auditoría

- definir quién puede asignar/revocar `Superadministrador`
- definir requisitos de audit log para cambios de este rol
- definir guardrails mínimos para evitar escalación accidental

### Slice 4 - Follow-on de implementación

- listar readers, APIs, seeds o surfaces admin que deben alinearse
- dejar follow-ons concretos si no se implementa todo en la misma lane

## Out of Scope

- rediseñar todo el modelo RBAC
- cambiar el `role_code` de `efeonce_admin`
- introducir una jerarquía nueva distinta a la ya fijada en `TASK-225`
- implementar todavía delegaciones temporales complejas

## Acceptance Criteria

- [ ] la task deja explícito que el perfil owner/founder recomendado es `efeonce_admin` + `collaborator`
- [ ] la task define una policy clara para bootstrap del primer `Superadministrador`
- [ ] la task define quién puede asignar o revocar ese rol
- [ ] la task declara que `Superadministrador` implica acceso total a todas las vistas posibles del portal
- [ ] la task deja requisitos mínimos de auditoría y control para cambios sobre este rol
- [ ] la task deja follow-ons concretos si quedan readers o surfaces sin alinear

## Verification

- revisión manual contra:
  - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
  - `src/lib/tenant/role-route-mapping.ts`
  - `src/app/api/admin/invite/route.ts`
