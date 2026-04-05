# TASK-263 — Permission Sets: CRUD enterprise para asignacion de vistas por persona y perfil

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementacion completa — pendiente migracion + deploy`
- Rank: `TBD`
- Domain: `identity`, `admin`, `ui`
- Blocked by: `none`
- Branch: `task/TASK-263-permission-sets-enterprise-view-access`
- Legacy ID: —
- GitHub Issue: —

## Summary

El sistema de View Access Governance (TASK-136) funciona a nivel tecnico pero la UX de asignacion no escala. La matriz de 60+ vistas × N roles es potente pero no es el workflow diario. No hay forma de gestionar permisos desde la ficha del usuario, los overrides son individuales (no hay agrupacion reutilizable), y no existe "effective permissions" con source attribution. Esta task introduce Permission Sets (bundles nombrados de vistas, modelo Salesforce-inspired) como capa intermedia entre roles y overrides, con CRUD completo, asignacion bidireccional, y vista de effective permissions por usuario.

## Why This Task Exists

1. **Friction operativo real:** Para asignar "acceso a Finanzas completo" a un usuario, el admin debe ir a `/admin/views`, buscar al usuario en Preview, y agregar 9 overrides individuales con razon obligatoria. Con Permission Sets, seria 1 operacion.

2. **No hay agrupacion reutilizable:** Cuando se incorpora un nuevo miembro con el mismo perfil (ej: otro Finance Manager), hay que repetir los mismos overrides manualmente. Un Permission Set "Gestion Financiera" se asigna en 1 click.

3. **No hay effective permissions con fuente:** Ante la pregunta "por que Humberly ve X?", el admin debe cruzar roles + overrides manualmente. El effective view con source attribution lo resuelve.

4. **Benchmark enterprise:** Salesforce, HubSpot, Google Workspace, Microsoft Entra — todos usan algun concepto de "permission set" o "named bundle" como capa intermedia. Es el patron validado por la industria.

## Goal

- Los admins pueden crear Permission Sets (bundles de vistas) reutilizables y asignarlos a usuarios
- Los admins pueden ver y gestionar los permisos de un usuario desde su ficha (roles, sets, overrides, effective views)
- La resolucion de vistas autorizadas integra la capa de Permission Sets: `Rol ∪ PermSets ∪ Overrides`
- Cada vista efectiva muestra su fuente (rol, permission set, override, fallback)
- Todo cambio queda en audit log con actor, razon y timestamp

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md` — spec completa del modelo (tablas, API, resolucion, UI)
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — identity system, roles, route groups
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — patrones UI, componentes disponibles

Reglas obligatorias:

- `resolveAuthorizedViewsForUser()` es la unica funcion de resolucion — extender, no duplicar
- Permission Sets son ADITIVOS — solo pueden agregar vistas, nunca revocar lo que el rol otorga
- User Overrides (capa 3) siguen siendo la unica forma de revocar una vista especifica
- Toda operacion debe registrarse en `view_access_log` y emitir evento outbox
- Permission Sets de sistema (`is_system=true`) no son editables por admin desde UI

## Normative Docs

- `docs/architecture/GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md` — spec completa
- `docs/tasks/complete/TASK-136-admin-view-access-governance.md` — sistema actual
- `src/lib/admin/view-access-store.ts` — logica de resolucion existente
- `src/lib/admin/view-access-catalog.ts` — catalogo de 60+ view codes
- `src/lib/admin/role-management.ts` — gestion de roles (patron de referencia para guardrails)
- `scripts/setup-postgres-view-access.sql` — DDL de tablas existentes

## Dependencies & Impact

### Depends on

- TASK-136 completada — sistema de view access con 4 tablas + resolucion 3 capas
- `VIEW_REGISTRY` en `view-access-catalog.ts` con 60+ view codes
- `resolveAuthorizedViewsForUser()` en `view-access-store.ts`
- `view_access_log` para audit trail
- API endpoint `PUT /api/admin/team/roles/:userId` (recien creado) para gestion de roles

### Blocks / Impacts

- Admin UX para onboarding de nuevos colaboradores (asignar permisos en 1 click)
- Perfiles de acceso temporal (auditores, consultores) con expiracion
- Futuro: Permission Set Groups (agrupacion de sets, como Salesforce)

### Files owned

- `src/lib/admin/permission-sets.ts` — CRUD + asignacion de Permission Sets (NUEVO)
- `src/app/api/admin/views/sets/route.ts` — API list + create sets
- `src/app/api/admin/views/sets/[setId]/route.ts` — API get + update + delete set
- `src/app/api/admin/views/sets/[setId]/users/route.ts` — API assign/list users
- `src/app/api/admin/team/roles/[userId]/effective-views/route.ts` — API effective views
- `src/views/greenhouse/admin/permission-sets/` — UI components (NUEVO)
- `migrations/XXXXXXX_permission-sets-tables.sql` — DDL de tablas nuevas

## Current Repo State

### Already exists

- `greenhouse_core.view_registry` — catalogo de vistas en DB
- `greenhouse_core.role_view_assignments` — asignaciones por rol
- `greenhouse_core.user_view_overrides` — overrides por usuario con expiracion
- `greenhouse_core.view_access_log` — audit trail inmutable
- `resolveAuthorizedViewsForUser()` — resolucion 3 capas (rol → persisted → override)
- `VIEW_REGISTRY` — catalogo hardcoded con 60+ view codes
- `AdminViewAccessGovernanceView.tsx` — UI con tabs Permisos, Preview, Roadmap
- `POST /api/admin/views/assignments` — API para asignar vistas por rol
- `POST /api/admin/views/overrides` — API para overrides por usuario
- `PUT /api/admin/team/roles/:userId` — API para gestionar roles de un usuario
- `hasAuthorizedViewCode()` — check runtime en pages y menu

### Gap

- No existe tabla `permission_sets` ni `user_permission_set_assignments`
- No existe concepto de "bundle nombrado" reutilizable
- No existe endpoint de effective views con source attribution
- No existe UI para gestionar permisos desde la ficha del usuario
- `resolveAuthorizedViewsForUser()` no consulta Permission Sets
- No hay seed de Permission Sets de sistema

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migracion: tablas + seed de Permission Sets de sistema

- Crear migracion con `pnpm migrate:create permission-sets-tables`
- DDL: `greenhouse_core.permission_sets` + `greenhouse_core.user_permission_set_assignments`
- Seed: 6 Permission Sets de sistema (`is_system=true`) segun spec de arquitectura
- Constraints: UNIQUE(user_id, set_id), FK a `client_users` y `permission_sets`
- Regenerar tipos con `pnpm db:generate-types`

### Slice 2 — Lib: CRUD + resolucion de Permission Sets

- `src/lib/admin/permission-sets.ts`:
  - `listPermissionSets()` — con count de usuarios asignados
  - `getPermissionSet(setId)` — detalle + usuarios asignados
  - `createPermissionSet({ name, description, section, viewCodes, createdBy })`
  - `updatePermissionSet(setId, { name, description, viewCodes, updatedBy })`
  - `deletePermissionSet(setId)` — soft delete, guardrail: no borrar `is_system`
  - `assignUsersToSet(setId, userIds, { assignedBy, reason, expiresAt })`
  - `removeUserFromSet(setId, userId)`
  - `getUserPermissionSets(userId)` — sets asignados a un usuario
  - `resolvePermissionSetViews(userId)` — view codes derivados de sets activos
  - Audit: registrar en `view_access_log` con acciones `grant_set`, `revoke_set`, `create_set`, `update_set`, `delete_set`
  - Outbox: emitir `viewAccessSetAssigned` / `viewAccessSetRevoked`
- Modificar `resolveAuthorizedViewsForUser()` en `view-access-store.ts`:
  - Agregar llamada a `resolvePermissionSetViews(userId)` y unir al set de vistas
  - Mantener backward compatibility: si tabla no existe, skip silencioso

### Slice 3 — API endpoints para Permission Sets

- `GET /api/admin/views/sets` — listar sets
- `POST /api/admin/views/sets` — crear set
- `GET /api/admin/views/sets/:setId` — detalle
- `PUT /api/admin/views/sets/:setId` — editar
- `DELETE /api/admin/views/sets/:setId` — soft delete
- `GET /api/admin/views/sets/:setId/users` — usuarios del set
- `POST /api/admin/views/sets/:setId/users` — asignar usuarios (bulk)
- `DELETE /api/admin/views/sets/:setId/users/:userId` — desasignar
- Todos requieren `requireAdminTenantContext()`

### Slice 4 — API effective views con source attribution

- `GET /api/admin/team/roles/:userId/effective-views`
- Retorna cada vista con su fuente: `role`, `role_fallback`, `permission_set`, `user_override`
- Incluye sourceId y sourceName para trazabilidad
- Requiere `requireAdminTenantContext()`

### Slice 5 — UI: Permission Set editor en Admin Views

- Nuevo tab "Sets" en `AdminViewAccessGovernanceView.tsx` o componente separado
- Lista de sets con nombre, descripcion, count vistas, count usuarios, badge `sistema` si `is_system`
- Click en set → editor: campos nombre/descripcion + checkboxes de vistas agrupados por seccion
- Tab interno "Usuarios" → lista de usuarios asignados + boton "Asignar usuarios" (buscador)
- Boton "Crear set" con dialog

### Slice 6 — UI: Ficha de accesos por usuario

- Nuevo componente accesible desde Person Detail o User Admin Detail
- Secciones:
  - **Roles** — chips con nombre + route groups
  - **Permission Sets** — cards con nombre, descripcion, count vistas, boton asignar/revocar
  - **Overrides** — tabla con viewCode, tipo, razon, expiracion
  - **Effective Views** — lista agrupada por seccion con icono de fuente (rol, set, override)
- Permite asignar/revocar sets y agregar overrides directamente desde la ficha

## Out of Scope

- Permission Set Groups (agrupacion de sets) — futuro
- Muting Permission Sets (revocar dentro de un set) — futuro
- Data-scoping dentro de vistas (ej: "solo sus propios registros") — futuro
- Cambios al catalogo de vistas (`VIEW_REGISTRY`) — ya completo
- Cambios a la matriz rol × vista existente
- PIM / Just-In-Time access (modelo Microsoft Entra) — futuro
- Mobile-specific UX

## Detailed Spec

### Schema SQL

```sql
-- Permission Sets
CREATE TABLE greenhouse_core.permission_sets (
  set_id          TEXT PRIMARY KEY,
  set_name        TEXT NOT NULL,
  description     TEXT,
  section         TEXT,
  view_codes      TEXT[] NOT NULL DEFAULT '{}',
  is_system       BOOLEAN NOT NULL DEFAULT false,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      TEXT
);

CREATE INDEX idx_permission_sets_active ON greenhouse_core.permission_sets (active, section);

-- User ↔ Permission Set assignments
CREATE TABLE greenhouse_core.user_permission_set_assignments (
  assignment_id       TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id),
  set_id              TEXT NOT NULL REFERENCES greenhouse_core.permission_sets(set_id),
  active              BOOLEAN NOT NULL DEFAULT true,
  expires_at          TIMESTAMPTZ,
  reason              TEXT,
  assigned_by_user_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, set_id)
);

CREATE INDEX idx_upsa_user ON greenhouse_core.user_permission_set_assignments (user_id, active);
CREATE INDEX idx_upsa_set ON greenhouse_core.user_permission_set_assignments (set_id, active);
```

### Resolucion modificada (pseudocodigo)

```typescript
// En resolveAuthorizedViewsForUser(), agregar despues de roleViews:
const setViews = await resolvePermissionSetViews(userId)
const allViews = new Set([...roleViews, ...setViews])
// Luego aplicar overrides como hoy
```

### Effective Views response shape

```json
{
  "userId": "user-...",
  "effectiveViews": [
    {
      "viewCode": "finanzas.resumen",
      "label": "Resumen financiero",
      "section": "finanzas",
      "source": "permission_set",
      "sourceId": "pset-gestion-financiera",
      "sourceName": "Gestion Financiera"
    }
  ],
  "summary": {
    "totalViews": 24,
    "fromRoles": 12,
    "fromRoleFallback": 5,
    "fromPermissionSets": 6,
    "fromOverrides": 1
  }
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Tablas `permission_sets` y `user_permission_set_assignments` creadas via migracion
- [ ] 6 Permission Sets de sistema seeded con `is_system=true`
- [ ] CRUD completo de Permission Sets via API (list, create, get, update, delete)
- [ ] Asignacion/revocacion de usuarios a sets via API (bulk assign, single remove)
- [ ] `resolveAuthorizedViewsForUser()` integra Permission Sets en la resolucion
- [ ] Effective views API retorna cada vista con source attribution (role, set, override, fallback)
- [ ] UI de Permission Set editor funcional (crear, editar, ver usuarios, asignar)
- [ ] UI de ficha de accesos por usuario funcional (roles, sets, overrides, effective views)
- [ ] Todas las operaciones registradas en `view_access_log`
- [ ] Permission Sets de sistema no son eliminables desde UI
- [ ] Backward compatibility: si tablas no existen, resolucion funciona como antes
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit` pasan sin errores

## Verification

- `pnpm build`
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm migrate:up` (crea tablas + seed)
- Validacion manual: crear set, asignar usuario, verificar effective views, logout/login y verificar menu

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md` con cambios de implementacion
- [ ] Actualizar `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` con seccion Permission Sets
- [ ] Verificar que la resolucion sigue funcionando para usuarios sin Permission Sets

## Follow-ups

- Permission Set Groups (agrupacion de sets para asignar como unidad)
- Muting Permission Sets (revocar vistas especificas dentro de un set)
- Data-scoping por vista (ej: "solo registros de su space")
- PIM / Just-In-Time access con aprobacion y ventana de tiempo
- Sync de Permission Sets a BigQuery para analytics de acceso
- Dashboard de governance: cuantos usuarios tienen cada nivel de acceso

## Open Questions

Todas resueltas (2026-04-05):

- ~~Los Permission Sets de sistema deberian ser editables o fijos?~~ **决definido: editables en vistas (admin puede agregar/quitar vistas) pero no eliminables.**
- ~~Usuarios deben reloguearse tras cambio de set?~~ **Decidido: si, requiere re-login porque `authorizedViews` vive en el JWT. Futuro: evaluar TTL de refresh.**
- ~~Limite maximo de Permission Sets por usuario?~~ **Decidido: sin limite, pero warning visual en UI si > 5 sets asignados.**
