# TASK-227 - Operational Responsibility Registry

## Delta 2026-04-05

- Implementación completa del registry:
  - Migración DDL: `greenhouse_core.operational_responsibilities`
  - Config canónico: `src/config/responsibility-codes.ts`
  - Event catalog: `responsibility.assigned`, `responsibility.revoked`, `responsibility.updated`
  - Store (CRUD + outbox): `src/lib/operational-responsibility/store.ts`
  - Readers: `src/lib/operational-responsibility/readers.ts`
  - API Admin: `GET/POST /api/admin/responsibilities`, `PATCH/DELETE /api/admin/responsibilities/[id]`
  - UI Admin: `/admin/responsibilities` con panel CRUD
  - Consumer Agency: Space 360 OverviewTab muestra ownership badges
- Migración aplicada en `greenhouse-pg-dev` (staging)
- Kysely types regenerados (162 tablas)
- Store y readers migrados de raw SQL a Kysely tipado

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Completada 2026-04-05`
- Rank: `[pending]`
- Domain: `identity / agency / platform`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Implementar el registry canónico de responsabilidades operativas scoped definido en `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` sección 4.

Este registry permite responder "¿quién responde por esta cuenta/space/proyecto?" de forma explícita, en vez de inferirlo desde `departments`, `reports_to_member_id` o `client_team_assignments`.

## Why This Task Exists

La arquitectura de roles y jerarquías (TASK-225) formalizó 4 planos:

1. Access Role (RBAC) — ya implementado
2. Reporting Hierarchy (supervisoría) — ya implementado (`reports_to_member_id`)
3. Structural Hierarchy (departamentos) — ya implementado
4. **Operational Responsibility — NO implementado**

Hoy el ownership operativo está fragmentado:
- `client_team_assignments` cubre asignaciones de equipo a clientes
- `owner_member_id` en objetos operativos (proyectos, deals)
- roles como `efeonce_account` sugieren responsabilidad comercial pero no la formalizan por scope

Falta un registry único que permita modelar: account lead, delivery lead, finance reviewer, approval delegate, etc.

## Goal

- Schema canónico en `greenhouse_core` para responsabilidades operativas scoped
- API de lectura/escritura con tenant isolation
- Consumo desde Agency (account health), Delivery (project ownership), Finance (reviewers), HR (approvals delegados)

## Scope

### Slice 1 - Schema y CRUD

Tabla propuesta (de la spec de arquitectura):

| Campo | Propósito |
|-------|-----------|
| `responsibility_id` | PK |
| `member_id` | miembro responsable |
| `scope_type` | `organization` / `space` / `project` / `department` |
| `scope_id` | entidad responsable |
| `responsibility_type` | `account_lead` / `delivery_lead` / `finance_reviewer` / `approval_delegate` |
| `is_primary` | owner principal |
| `effective_from` / `effective_to` | vigencia |

### Slice 2 - API y consumers

- API route con GET/POST/DELETE
- Integración con Agency (account health usa ownership)
- Integración con Delivery (project detail usa owner)

### Slice 3 - UI

- Admin panel para asignar responsabilidades
- Badges de ownership en vistas de Space, Project, Organization

## Dependencies & Impact

### Depends on

- `TASK-225 - Internal Roles, Hierarchies & Approval Ownership Model`
- `greenhouse_core.members`
- `greenhouse_core.spaces`
- `greenhouse_core.organizations`

### Impacts to

- `TASK-161 - Agency Permissions, Retention & Onboarding`
- `TASK-028 - HRIS Expense Reports` (approval delegates)
- `TASK-031 - HRIS Performance Evaluations` (reviewer assignments)
- Agency account health readers
- Delivery project ownership
- Finance scoped reviewers

### Files owned

- `docs/tasks/to-do/TASK-227-operational-responsibility-registry.md`
- `migrations/` (new table)
- `src/lib/operational-responsibility/` (new module)
- `src/app/api/admin/responsibilities/` (new routes)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` — sección 4
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

## Acceptance Criteria

- [ ] Tabla `greenhouse_core.operational_responsibilities` creada con migración
- [ ] API CRUD con tenant isolation
- [ ] Al menos un consumer (Agency account health) usa el registry en vez de inferir ownership
- [ ] UI admin para asignar/revocar responsabilidades
- [ ] Docs de arquitectura actualizados

## Verification

- `pnpm build`
- `pnpm lint`
- `pnpm migrate:up`
- Validación funcional: asignar account_lead a un space y verificar que Agency lo refleja
