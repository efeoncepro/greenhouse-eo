# GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1

> **Version:** 1.1
> **Creado:** 2026-04-05 por Claude (investigacion) + Julio Reyes (brief)
> **Ultima actualizacion:** 2026-04-05 — implementacion completada
> **Estado:** Implementado (TASK-263 completado 2026-04-05)

## 1. Problema

El sistema de View Access Governance (TASK-136) funciona correctamente a nivel tecnico: 60+ view codes, resolucion 3 capas (rol → persisted → override), audit log, expiracion automatica. Sin embargo, la UX de asignacion no escala:

- La matriz rol × vista (60+ filas × N roles) es potente pero no es el workflow diario del admin.
- No hay forma de gestionar permisos desde la ficha del usuario — hay que ir a `/admin/views`.
- Los overrides por usuario son individuales (grant/revoke por vista) — no hay agrupacion reutilizable.
- No hay "effective permissions" con source attribution (de donde viene cada permiso).

## 2. Benchmark Enterprise

| Plataforma | Modelo | Takeaway para Greenhouse |
|---|---|---|
| **Salesforce** | Profile (1) + Permission Sets (N, aditivos) + Groups + Muting Sets | Permission Sets como bundles nombrados y reutilizables. "View Summary of Access" para debugging. |
| **HubSpot** | Templates + per-user toggles + seat gating | Templates como punto de partida. Per-user toggles no escalan (snowflakes). |
| **Google Workspace** | Pre-built roles + Custom roles (arbol de privilegios) + OUs | Arbol jerarquico con checkboxes parent/child. |
| **Microsoft Entra** | Directory roles + App roles + Groups + PIM (Just-In-Time) | Roles elegibles vs activos. Ventana de tiempo con aprobacion. |

**Conclusion:** el modelo Salesforce (Profile + Permission Sets aditivos) es el mas escalable y auditable. Greenhouse ya tiene la capa de Profile (roles) y overrides. Falta la capa intermedia: Permission Sets.

## 3. Modelo Target: 3 Capas

```
RESOLUCION = Rol(base) ∪ PermissionSets(aditivos) ∪ UserOverrides(excepciones)
```

### Capa 1 — Roles (base, ya existe)

Cada usuario tiene 1-N roles. Cada rol tiene `route_group_scope` y opcionalmente `role_view_assignments` persistidos. Esto determina la linea base de acceso.

- Tabla: `greenhouse_core.roles`
- Tabla: `greenhouse_core.user_role_assignments`
- Tabla: `greenhouse_core.role_view_assignments`

Sin cambios. Funciona como hoy.

### Capa 2 — Permission Sets (bundles nombrados, NUEVO)

Un Permission Set es un bundle nombrado y reutilizable de view codes. Se asigna a usuarios. Es aditivo: solo puede AGREGAR acceso, nunca revocar lo que el rol base otorga.

**Tabla: `greenhouse_core.permission_sets`**

| Columna | Tipo | Descripcion |
|---|---|---|
| `set_id` | TEXT PK | ID canonico: `pset-{slug}` |
| `set_name` | TEXT NOT NULL | Nombre display: "Gestion Financiera" |
| `description` | TEXT | Descripcion del bundle |
| `section` | TEXT | Seccion UI para agrupar: `gestion`, `finanzas`, `equipo`, etc. |
| `view_codes` | TEXT[] NOT NULL | Array de view codes incluidos |
| `is_system` | BOOLEAN DEFAULT false | true = no editable por admin (provisionado por migracion) |
| `active` | BOOLEAN DEFAULT true | Soft delete |
| `created_by` | TEXT | user_id del creador |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ | — |
| `updated_by` | TEXT | — |

**Tabla: `greenhouse_core.user_permission_set_assignments`**

| Columna | Tipo | Descripcion |
|---|---|---|
| `assignment_id` | TEXT PK | `upsa-{userId}-{setId}` |
| `user_id` | TEXT FK NOT NULL | — |
| `set_id` | TEXT FK NOT NULL | — |
| `active` | BOOLEAN DEFAULT true | — |
| `expires_at` | TIMESTAMPTZ | Opcional: asignacion temporal |
| `reason` | TEXT | Por que se asigno |
| `assigned_by_user_id` | TEXT | — |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ | — |

**Constraint:** UNIQUE(user_id, set_id)

**Permission Sets de sistema (seed):**

| Set ID | Nombre | View Codes |
|---|---|---|
| `pset-gestion-financiera` | Gestion Financiera | `finanzas.*` (11 vistas) |
| `pset-nomina-completa` | Nomina Completa | `equipo.nomina`, `equipo.nomina_proyectada`, `equipo.permisos` |
| `pset-agencia-ops` | Agencia Operaciones | `gestion.agencia`, `gestion.spaces`, `gestion.equipo`, `gestion.delivery`, `gestion.campanas` |
| `pset-solo-lectura-agencia` | Solo Lectura Agencia | `gestion.agencia`, `gestion.spaces`, `gestion.delivery` |
| `pset-admin-plataforma` | Admin Plataforma | `administracion.*` (12 vistas) |
| `pset-mi-ficha-completa` | Mi Ficha Completa | `mi_ficha.*` (8 vistas) |

### Capa 3 — User Overrides (excepciones puntuales, ya existe)

Para casos edge: agregar o revocar una vista especifica a un usuario con razon y opcionalmente expiracion. No cambia.

- Tabla: `greenhouse_core.user_view_overrides`

### Resolucion

```typescript
function resolveAuthorizedViews(user): string[] {
  const roleViews = resolveRoleBaseViews(user.roleCodes)         // Capa 1
  const setViews = resolvePermissionSetViews(user.userId)         // Capa 2 (NUEVO)
  const overrides = resolveUserOverrides(user.userId)             // Capa 3

  let views = new Set([...roleViews, ...setViews])

  for (const override of overrides) {
    if (override.type === 'grant') views.add(override.viewCode)
    if (override.type === 'revoke') views.delete(override.viewCode)
  }

  return [...views]
}
```

## 4. API Endpoints

### Permission Sets CRUD

| Method | Path | Descripcion |
|---|---|---|
| `GET` | `/api/admin/views/sets` | Listar todos los sets con count de usuarios |
| `POST` | `/api/admin/views/sets` | Crear un set nuevo |
| `GET` | `/api/admin/views/sets/:setId` | Detalle del set + usuarios asignados |
| `PUT` | `/api/admin/views/sets/:setId` | Editar nombre, descripcion, view codes |
| `DELETE` | `/api/admin/views/sets/:setId` | Soft delete (active=false) |

### User Assignment

| Method | Path | Descripcion |
|---|---|---|
| `GET` | `/api/admin/views/sets/:setId/users` | Usuarios asignados a este set |
| `POST` | `/api/admin/views/sets/:setId/users` | Asignar usuarios al set (bulk) |
| `DELETE` | `/api/admin/views/sets/:setId/users/:userId` | Desasignar usuario del set |

### Effective Permissions por usuario

| Method | Path | Descripcion |
|---|---|---|
| `GET` | `/api/admin/team/roles/:userId/effective-views` | Vista efectiva con source attribution |

Response shape:
```json
{
  "userId": "user-efeonce-internal-humberly-henriquez",
  "effectiveViews": [
    { "viewCode": "finanzas.resumen", "source": "permission_set", "sourceId": "pset-gestion-financiera", "sourceName": "Gestion Financiera" },
    { "viewCode": "equipo.nomina", "source": "role", "sourceId": "hr_payroll", "sourceName": "HR Payroll" },
    { "viewCode": "gestion.agencia", "source": "role_fallback", "sourceId": "efeonce_operations", "sourceName": "Efeonce Operations" },
    { "viewCode": "finanzas.asignaciones_costos", "source": "user_override", "sourceId": null, "sourceName": "Override manual" }
  ],
  "roles": [...],
  "permissionSets": [...],
  "overrides": [...]
}
```

## 5. Superficies UI

### 5.1 Ficha de accesos por usuario (NUEVO)

Accesible desde la vista de Person Detail (`/people/:slug`) o User Detail como un tab o seccion. Muestra:

- **Roles actuales** — chips con route groups derivados
- **Permission Sets asignados** — cards con nombre, descripcion, count de vistas, boton asignar/revocar
- **Overrides activos** — tabla con viewCode, tipo (grant/revoke), razon, expiracion
- **Effective Views** — lista completa con source attribution (icono + color por fuente)

### 5.2 Permission Set editor (NUEVO)

Tab adicional en `/admin/views`. Muestra:

- Lista de sets con nombre, descripcion, count de vistas, count de usuarios
- Click en un set → editor: nombre, descripcion, checkboxes de vistas agrupados por seccion
- Tab "Usuarios" dentro del set → lista de usuarios asignados + boton asignar

### 5.3 Matriz rol × vista (ya existe, sin cambios)

Sigue funcionando como hoy para configurar la base por rol.

## 6. Audit Trail

Todas las operaciones se registran en `greenhouse_core.view_access_log`:

| Action | Descripcion |
|---|---|
| `grant_set` | Permission Set asignado a usuario |
| `revoke_set` | Permission Set revocado de usuario |
| `create_set` | Permission Set creado |
| `update_set` | Permission Set modificado (vistas cambiadas) |
| `delete_set` | Permission Set desactivado |

Adicionalmente, cada asignacion de set emite un evento outbox `viewAccessSetAssigned` / `viewAccessSetRevoked` para notificaciones.

## 7. Migracion y Backward Compatibility

- Las tablas nuevas (`permission_sets`, `user_permission_set_assignments`) se crean via migracion.
- El seed de Permission Sets de sistema se ejecuta en la misma migracion.
- La funcion `resolveAuthorizedViewsForUser()` se extiende para incluir la capa de Permission Sets.
- Si las tablas no existen (entorno sin migracion), el fallback actual sigue funcionando sin cambios.
- No se modifican tablas existentes.

## 8. Diferencia con el modelo actual

| Aspecto | Hoy | Con Permission Sets |
|---|---|---|
| Asignar "Finanzas completo" a Humberly | Ir a `/admin/views` → tab Preview → buscar Humberly → agregar 9 overrides individuales con razon | PUT `/api/admin/views/sets/pset-gestion-financiera/users` con `[humberly-id]` — 1 operacion |
| Saber por que Humberly ve finanzas.resumen | Revisar roles + overrides manualmente | `GET /effective-views` → `"source": "permission_set", "sourceName": "Gestion Financiera"` |
| Crear un perfil nuevo para "Auditor Externo" | Crear un rol nuevo + migracion + deploy | Crear Permission Set "Auditor Externo" con las vistas necesarias — sin deploy |
| Revocar acceso temporal | Override individual con `expires_at` | Asignar set con `expires_at` — revoca todas las vistas del set de una vez |
