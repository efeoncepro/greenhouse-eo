# TASK-136 — Admin Center: View Access Governance

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Admin Center / Identity & Access / UX |
| Sequence | Independiente, evoluciona la gobernanza de acceso existente |

## Summary

Crear un módulo de gobernanza de vistas en Admin Center que permita a admins visualizar, asignar y revocar acceso a módulos/secciones del portal por perfil de rol, con override por usuario individual cuando sea necesario. Reemplaza el mapping hardcoded `role → route_groups` en `deriveRouteGroups()` por una tabla configurable desde la UI, sin perder el failsafe de la resolución actual.

## Why This Task Exists

Hoy la visibilidad de vistas está 100% hardcoded en `src/lib/tenant/access.ts`:

```typescript
// deriveRouteGroups() — cada cambio requiere un PR
if (roleCode === 'efeonce_admin') routeGroups.add('admin')
if (roleCode === 'hr_payroll') { routeGroups.add('internal'); routeGroups.add('hr') }
```

Problemas actuales:
- **Rigidez** — agregar un route group a un rol requiere un deploy
- **Opacidad** — el admin no sabe qué ve cada rol sin leer código
- **Sin excepciones** — si un usuario necesita acceso temporal a Finance pero su rol no lo incluye, hay que cambiar su rol completo o modificar código
- **Sin auditoría** — no hay registro de quién cambió qué acceso ni cuándo
- **Sin preview** — el admin no puede verificar cómo se ve el portal desde la perspectiva de otro usuario antes de hacer cambios

### Superficie actual

| Dato | Valor |
|------|-------|
| Páginas totales | 80 |
| Route groups | 10 (`client`, `internal`, `admin`, `agency`, `hr`, `finance`, `my`, `people`, `ai_tooling`, `employee`) |
| Roles definidos | 11+ |
| Secciones sidebar | 9 (Primary, Módulos, Gestión, Equipo, Finanzas, IA, Administración, Mi Ficha, Mi Organización) |
| Layout guards | 8 layouts con checks de route group |

## Architecture

### Data Model

```
┌─────────────────────┐     ┌──────────────────────────┐
│  view_registry       │     │  role_view_assignments    │
│  (catálogo de vistas)│     │  (qué ve cada rol)       │
├─────────────────────┤     ├──────────────────────────┤
│  view_code (PK)      │◄───│  view_code (FK)           │
│  section             │     │  role_code (FK)           │
│  label               │     │  granted (bool)           │
│  description         │     │  granted_by               │
│  route_group         │     │  granted_at               │
│  route_path          │     │  UNIQUE(view_code,        │
│  icon                │     │         role_code)         │
│  display_order       │     └──────────────────────────┘
│  parent_view_code    │
│  requires_route_group│     ┌──────────────────────────┐
│  active              │     │  user_view_overrides      │
└─────────────────────┘     │  (excepciones por usuario)│
                             ├──────────────────────────┤
                             │  user_id                  │
                             │  view_code (FK)           │
                             │  override_type            │
                             │    ('grant' | 'revoke')   │
                             │  reason                   │
                             │  expires_at (nullable)    │
                             │  granted_by               │
                             │  granted_at               │
                             │  UNIQUE(user_id,          │
                             │         view_code)         │
                             └──────────────────────────┘

                             ┌──────────────────────────┐
                             │  view_access_log          │
                             │  (auditoría de cambios)   │
                             ├──────────────────────────┤
                             │  action                   │
                             │    ('grant_role',         │
                             │     'revoke_role',        │
                             │     'grant_user',         │
                             │     'revoke_user',        │
                             │     'expire_user')        │
                             │  target_role_code         │
                             │  target_user_id           │
                             │  view_code                │
                             │  performed_by             │
                             │  reason                   │
                             │  created_at               │
                             └──────────────────────────┘
```

### Resolution Hierarchy

```
1. view_registry                    → catálogo de todas las vistas disponibles
2. role_view_assignments            → qué vistas tiene cada rol (reemplaza hardcoded)
3. user_view_overrides (grant)      → acceso adicional por usuario (excepciones)
4. user_view_overrides (revoke)     → restricciones por usuario (excepciones)
5. expires_at check                 → overrides temporales se auto-revocan
6. deriveRouteGroups() fallback     → si no hay assignments en BD, usa el hardcoded actual

Resultado: session.authorizedViews[] → sidebar + layout guards
```

### Migration Safety

El cambio es **opt-in con fallback**:
1. Si `role_view_assignments` está vacía para un rol, `deriveRouteGroups()` usa el mapping hardcoded actual
2. Si tiene rows, las usa en vez del hardcoded
3. Un seed inicial pobla `role_view_assignments` con el mapping actual exacto
4. El admin puede modificar desde la UI sin riesgo de lockout

## Dependencies & Impact

- **Depende de:**
  - TASK-108 (Admin Center Shell) — `complete`
  - Roles management UI (`/admin/roles`) — ya existe
  - `greenhouse_core.roles` + `user_role_assignments` — ya existen
- **Impacta a:**
  - `src/lib/tenant/access.ts` — `deriveRouteGroups()` lee de BD en vez de hardcoded
  - `src/components/layout/vertical/VerticalMenu.tsx` — sidebar lee `authorizedViews`
  - Todos los `layout.tsx` guards — respetan `authorizedViews` en sesión
  - Session payload — se agrega `authorizedViews: string[]`

## Scope

### Slice 1 — Data model + seed (~2h)

**Tablas en `greenhouse_core`:**

1. `view_registry` — catálogo inmutable de vistas:

```sql
CREATE TABLE greenhouse_core.view_registry (
  view_code         TEXT PRIMARY KEY,
  section           TEXT NOT NULL,     -- 'gestion', 'equipo', 'finanzas', 'admin', 'mi_ficha', 'client'
  label             TEXT NOT NULL,     -- 'Nómina', 'Espacios', 'Ingresos'
  description       TEXT,
  route_group       TEXT NOT NULL,     -- route group que esta vista requiere
  route_path        TEXT NOT NULL,     -- '/hr/payroll', '/finance/income'
  icon              TEXT,              -- 'tabler-currency-dollar'
  display_order     INT DEFAULT 0,
  parent_view_code  TEXT REFERENCES greenhouse_core.view_registry(view_code),
  active            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

2. `role_view_assignments` — mapping configurable:

```sql
CREATE TABLE greenhouse_core.role_view_assignments (
  role_code    TEXT NOT NULL REFERENCES greenhouse_core.roles(role_code),
  view_code    TEXT NOT NULL REFERENCES greenhouse_core.view_registry(view_code),
  granted      BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by   TEXT,
  granted_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (role_code, view_code)
);
```

3. `user_view_overrides` — excepciones por usuario:

```sql
CREATE TABLE greenhouse_core.user_view_overrides (
  user_id        TEXT NOT NULL,
  view_code      TEXT NOT NULL REFERENCES greenhouse_core.view_registry(view_code),
  override_type  TEXT NOT NULL CHECK (override_type IN ('grant', 'revoke')),
  reason         TEXT,
  expires_at     TIMESTAMPTZ,     -- NULL = permanente
  granted_by     TEXT NOT NULL,
  granted_at     TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, view_code)
);
```

4. `view_access_log` — auditoría:

```sql
CREATE TABLE greenhouse_core.view_access_log (
  log_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action         TEXT NOT NULL,  -- grant_role, revoke_role, grant_user, revoke_user, expire_user
  target_role    TEXT,
  target_user    TEXT,
  view_code      TEXT NOT NULL,
  performed_by   TEXT NOT NULL,
  reason         TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

**Seed script** que pobla `view_registry` con las 80 páginas y `role_view_assignments` con el mapping actual exacto de `deriveRouteGroups()`.

### Slice 2 — View resolution engine (~1.5h)

Crear `src/lib/admin/view-access-resolver.ts`:

```typescript
export interface ResolvedViewAccess {
  viewCode: string
  section: string
  label: string
  routePath: string
  icon: string | null
  accessSource: 'role' | 'override_grant' | 'hardcoded_fallback'
  expiresAt: string | null
}

/**
 * Resolve authorized views for a user based on:
 * 1. role_view_assignments (BD)
 * 2. user_view_overrides (grants/revokes)
 * 3. deriveRouteGroups() fallback (if no BD assignments)
 */
export async function resolveAuthorizedViews(
  userId: string,
  roleCodes: string[],
  tenantType: string
): Promise<ResolvedViewAccess[]>
```

- Si `role_view_assignments` tiene rows para los roles del usuario → usa BD
- Si no → fallback a `deriveRouteGroups()` actual (zero risk migration)
- Aplica overrides: `grant` agrega vistas, `revoke` quita vistas
- Filtra overrides expirados (`expires_at < NOW()`)
- Retorna lista ordenada por `section → display_order`

### Slice 3 — Session integration (~1h)

Modificar `src/lib/tenant/access.ts`:

1. Llamar a `resolveAuthorizedViews()` durante build de `TenantContext`
2. Agregar `authorizedViews: string[]` al contexto de sesión
3. Derivar `routeGroups` desde las vistas autorizadas (union de `route_group` de cada vista)
4. Mantener `deriveRouteGroups()` como fallback

Modificar `src/types/next-auth.d.ts`:
- Agregar `authorizedViews?: string[]` al session type

### Slice 4 — Admin UI: Permission Matrix (~3h)

**Vista principal: `/admin/views`**

```
┌──────────────────────────────────────────────────────────────────┐
│ Admin Center  >  Vistas y acceso                                 │
│ Configura qué secciones del portal ve cada perfil de rol.        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [KPI]              [KPI]              [KPI]             [KPI]   │
│  Vistas             Roles              Overrides         Cambios │
│  registradas        configurados       activos           30d     │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌── Matriz de permisos ─────────────────────────────────────┐   │
│  │                                                           │   │
│  │               │ admin │ ops  │ hr   │ finance │ client │  │   │
│  │  ─────────────┼───────┼──────┼──────┼─────────┼────────│  │   │
│  │  GESTIÓN      │       │      │      │         │        │  │   │
│  │  ├ Agencia    │  ✓    │  ✓   │  ○   │   ○     │   ○    │  │   │
│  │  ├ Spaces     │  ✓    │  ✓   │  ○   │   ○     │   ○    │  │   │
│  │  ├ Economía   │  ✓    │  ✓   │  ○   │   ✓     │   ○    │  │   │
│  │  EQUIPO       │       │      │      │         │        │  │   │
│  │  ├ Personas   │  ✓    │  ✓   │  ✓   │   ○     │   ○    │  │   │
│  │  ├ Nómina     │  ✓    │  ○   │  ✓   │   ○     │   ○    │  │   │
│  │  FINANZAS     │       │      │      │         │        │  │   │
│  │  ├ Dashboard  │  ✓    │  ○   │  ○   │   ✓     │   ○    │  │   │
│  │  ├ Ingresos   │  ✓    │  ○   │  ○   │   ✓     │   ○    │  │   │
│  │  ...          │       │      │      │         │        │  │   │
│  │                                                           │   │
│  │  ✓ = Concedido por rol   ○ = Sin acceso                  │   │
│  │  ⊕ = Override grant      ⊖ = Override revoke             │   │
│  │                                                           │   │
│  │  [Guardar cambios]          Última modificación: hace 2h  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌── Overrides por usuario ──────────────────────────────────┐   │
│  │                                                           │   │
│  │  Usuario          │ Vista        │ Tipo    │ Expira │ Razón│  │
│  │  ─────────────────┼──────────────┼─────────┼────────┼──── │  │
│  │  mlopez@...       │ Finanzas     │ ⊕ grant │ 30 abr │ Q1  │  │
│  │  jperez@...       │ Nómina       │ ⊖ revoke│  —     │ baja│  │
│  │                                                           │   │
│  │  [+ Agregar override]                                     │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌── Preview "Ver como" ─────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Seleccionar usuario: [___________________] [Previsualizar]│  │
│  │                                                           │   │
│  │  Sidebar simulado:                                        │   │
│  │  ┌──────────────────┐                                     │   │
│  │  │ Home             │ ← lo que vería este usuario         │   │
│  │  │ GESTIÓN          │                                     │   │
│  │  │ ├ Agencia        │                                     │   │
│  │  │ ├ Spaces         │                                     │   │
│  │  │ EQUIPO           │                                     │   │
│  │  │ ├ Personas       │                                     │   │
│  │  │ MI FICHA         │                                     │   │
│  │  │ ├ Mi Perfil      │                                     │   │
│  │  └──────────────────┘                                     │   │
│  │                                                           │   │
│  │  8 vistas autorizadas · Rol: efeonce_operations           │   │
│  │  1 override activo (⊕ Finanzas, expira 30 abr)            │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌── Historial de cambios ───────────────────────────────────┐   │
│  │                                                           │   │
│  │  Quién          │ Acción              │ Vista    │ Cuándo  │  │
│  │  jreyes@...     │ grant_role          │ Finanzas │ hace 2h │  │
│  │  jreyes@...     │ grant_user (mlopez) │ Nómina   │ hace 1d │  │
│  │  sistema        │ expire_user (jperez)│ HR       │ hace 3d │  │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Componentes:**
- `ViewPermissionMatrix` — tabla checkbox interactiva (roles × vistas agrupadas por sección)
- `UserOverridePanel` — tabla CRUD de overrides con selector de usuario, vista, tipo, expiración y razón
- `ViewPreviewPanel` — simulación del sidebar que vería un usuario seleccionado
- `ViewAccessLogTable` — timeline de auditoría de cambios

**Interacción de la matrix:**
- Click en celda togglea `granted` para ese rol × vista
- Cambios se acumulan en estado local hasta que el admin clickea "Guardar cambios"
- Bulk save con transacción (todo o nada)
- Confirmación antes de guardar: "Vas a modificar X permisos para Y roles. Continuar?"

### Slice 5 — API routes (~2h)

```
GET    /api/admin/views                      → lista view_registry + assignments
POST   /api/admin/views/assignments          → bulk update role_view_assignments
GET    /api/admin/views/overrides             → lista overrides activos
POST   /api/admin/views/overrides             → crear/actualizar override
DELETE /api/admin/views/overrides/:id         → revocar override
GET    /api/admin/views/preview/:userId       → simular vistas de un usuario
GET    /api/admin/views/log                   → historial de cambios
POST   /api/admin/views/seed                  → poblar desde hardcoded actual (una vez)
```

### Slice 6 — Sidebar + layout guard integration (~1.5h)

1. `VerticalMenu.tsx` cambia de evaluar `routeGroups` a evaluar `authorizedViews`:

```typescript
// Antes (hardcoded):
const isFinanceUser = session?.user?.routeGroups?.includes('finance')

// Después (configurable):
const hasFinanceAccess = session?.user?.authorizedViews?.some(v => v.startsWith('finance.'))
```

2. Layout guards se mantienen como safety net pero respetan `authorizedViews`:

```typescript
// layout.tsx — doble check
const hasViewAccess = tenant.authorizedViews?.some(v => viewRegistry[v]?.routeGroup === 'finance')
const hasRouteGroupAccess = tenant.routeGroups.includes('finance')
if (!hasViewAccess && !hasRouteGroupAccess) redirect(tenant.portalHomePath)
```

### Slice 7 — Admin Center integration (~30min)

1. Domain card "Vistas y acceso" en `AdminCenterView.tsx`
2. Sidebar entry en VerticalMenu
3. Nomenclatura en `GH_INTERNAL_NAV`

### Slice 8 — Outbox event + notification (~30min)

1. Emitir `identity.view_access.changed` al outbox cuando se modifica un assignment o override
2. Agregar mapping en `notification-mapping.ts`:
   - `identity.view_access.changed` → notificar al usuario afectado: "Tu acceso al portal fue actualizado"
   - `actionUrl: '/notifications/preferences'`

### Slice 9 — Tests (~1.5h)

1. Unit tests para `view-access-resolver.ts`:
   - Resolución por rol (BD)
   - Fallback a hardcoded cuando BD vacía
   - Override grant agrega vista
   - Override revoke quita vista
   - Override expirado se ignora
2. Unit tests para API routes
3. Test de integración: seed → modify → resolve → verify

## UX para el operador (admin)

### Principios

1. **La matrix es la verdad** — el admin ve de un vistazo qué puede ver cada rol
2. **Preview antes de guardar** — siempre puede simular el resultado antes de aplicar
3. **Overrides son excepciones explícitas** — con razón obligatoria y expiración opcional
4. **Auditoría completa** — cada cambio queda registrado con quién, qué, cuándo y por qué
5. **Zero lockout** — si el admin se quita acceso a Admin, el fallback hardcoded lo protege

### UX del override temporal

Caso de uso: "María de Operaciones necesita ver Finanzas por 30 días para el cierre de Q1"

1. Admin abre Overrides → "Agregar override"
2. Selecciona usuario: `mlopez@efeoncepro.com`
3. Selecciona vista: `finanzas.dashboard`
4. Tipo: `grant` (acceso adicional)
5. Expira: `2026-04-30`
6. Razón: `Cierre Q1 — acceso temporal a dashboard financiero`
7. Guardar → María ve Finanzas en su sidebar inmediatamente
8. El 30 de abril el override expira automáticamente → se registra `expire_user` en el log

## UX para el consumidor (usuario final)

### Principios

1. **Solo ve lo que puede** — el sidebar muestra únicamente las vistas autorizadas
2. **Sin frustración** — si navega a una URL sin acceso, ve un mensaje claro con contexto
3. **Transparencia** — en su perfil puede ver qué vistas tiene y por qué
4. **Request access** — puede solicitar acceso a una vista que no tiene (mejora futura)

### Access Denied UX

Cuando un usuario navega a una ruta sin acceso (e.g., URL compartida por un colega):

```
┌────────────────────────────────────────────┐
│                                            │
│   🔒  No tienes acceso a esta sección     │
│                                            │
│   Tu perfil actual (Operaciones) no        │
│   incluye acceso a Finanzas.               │
│                                            │
│   Si necesitas acceso, contacta a tu       │
│   administrador.                           │
│                                            │
│   [Volver al inicio]                       │
│                                            │
└────────────────────────────────────────────┘
```

## Out of Scope

- Request access flow (usuario solicita acceso) — mejora futura
- Herencia de permisos (org → team → user) — overkill para el tamaño actual
- Time-based access schedules (acceso solo en horario laboral) — no necesario
- API key access control (para consumers externos) — diferente concern
- Permission groups/policies (agrupar vistas en paquetes) — mejora futura si la matrix crece
- Migrar capabilities (client modules) al mismo sistema — mantener separado por ahora

## Acceptance Criteria

- [ ] `view_registry` poblado con las 80+ vistas del portal
- [ ] `role_view_assignments` seeded con el mapping actual exacto
- [ ] `resolveAuthorizedViews()` resuelve correctamente por rol + overrides
- [ ] Fallback a `deriveRouteGroups()` cuando BD está vacía (zero risk)
- [ ] Permission matrix interactiva en Admin Center con bulk save
- [ ] Override CRUD con expiración temporal y razón obligatoria
- [ ] Preview "Ver como" muestra sidebar simulado para cualquier usuario
- [ ] Historial de cambios con auditoría completa
- [ ] Sidebar dinámico basado en `authorizedViews` de sesión
- [ ] Layout guards respetan `authorizedViews` con fallback a route groups
- [ ] Access denied page con contexto cuando usuario navega a ruta sin acceso
- [ ] Outbox event + notificación cuando cambia el acceso de un usuario
- [ ] Override expirado se auto-revoca y registra en log
- [ ] Domain card en Admin Center landing
- [ ] Tests unitarios para resolver, API routes y matrix
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Accessibility Checklist

- [ ] Matrix de permisos navegable por teclado (arrow keys entre celdas)
- [ ] Checkboxes con `aria-label` descriptivo ("Acceso a Nómina para rol HR Payroll: concedido")
- [ ] Preview panel con `aria-live="polite"` para anunciar cambios
- [ ] Confirmación de bulk save como dialog con `aria-modal`
- [ ] Color nunca es el único indicador — ✓/○/⊕/⊖ siempre con texto
- [ ] Tablas con `<caption>` y `scope="col/row"`
- [ ] Focus trap en modal de override

## UX Specification

### Layout blueprint

```
┌──────────────────────────────────────────────────────────────────┐
│  [Chip: Vistas y acceso]                                         │
│  Gobernanza de acceso a vistas del portal                        │
│  Configura qué secciones ve cada perfil de rol.                  │
├──────────────────────────────────────────────────────────────────┤
│  [KPI]              [KPI]              [KPI]             [KPI]   │
│  Vistas             Roles              Overrides         Cambios │
│  registradas        configurados       activos           30d     │
│  80                 11                 2                  5       │
│  tabler-layout      tabler-shield      tabler-user-edit  tabler- │
│  -grid              -lock              -2                history  │
├──────────────────────────────────────────────────────────────────┤
│  [Tab: Permisos]  [Tab: Excepciones]  [Tab: Preview]  [Tab: Log]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TAB: PERMISOS                                                   │
│  ┌── Matriz de permisos ─────────────────────────────────────┐   │
│  │  [Buscar vista...]                      [Guardar cambios] │   │
│  │                                                           │   │
│  │  ┌────────────────┬────────┬───────┬──────┬─────────┬───┐ │   │
│  │  │                │ Admin  │ Ops   │ HR   │ Finance │...│ │   │
│  │  ├────────────────┼────────┼───────┼──────┼─────────┼───┤ │   │
│  │  │ GESTIÓN        │        │       │      │         │   │ │   │
│  │  │  Agencia       │  [✓]   │ [✓]   │ [ ]  │  [ ]    │   │ │   │
│  │  │  Spaces        │  [✓]   │ [✓]   │ [ ]  │  [ ]    │   │ │   │
│  │  │  Economía      │  [✓]   │ [✓]   │ [ ]  │  [✓]    │   │ │   │
│  │  │ EQUIPO         │        │       │      │         │   │ │   │
│  │  │  Personas      │  [✓]   │ [✓]   │ [✓]  │  [ ]    │   │ │   │
│  │  │  Nómina        │  [✓]   │ [ ]   │ [✓]  │  [ ]    │   │ │   │
│  │  │ FINANZAS       │        │       │      │         │   │ │   │
│  │  │  Dashboard     │  [✓]   │ [ ]   │ [ ]  │  [✓]    │   │ │   │
│  │  │  Ingresos      │  [✓]   │ [ ]   │ [ ]  │  [✓]    │   │ │   │
│  │  │ ADMIN          │        │       │      │         │   │ │   │
│  │  │  Admin Center  │  [✓]   │ [ ]   │ [ ]  │  [ ]    │   │ │   │
│  │  │ MI FICHA       │        │       │      │         │   │ │   │
│  │  │  Mi Perfil     │  [✓]   │ [✓]   │ [✓]  │  [✓]    │   │ │   │
│  │  └────────────────┴────────┴───────┴──────┴─────────┴───┘ │   │
│  │                                                           │   │
│  │  Última modificación: hace 2 horas por jreyes@...         │   │
│  │  3 cambios pendientes sin guardar                         │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  TAB: EXCEPCIONES                                                │
│  ┌── Overrides activos ──────────────────────────────────────┐   │
│  │                                                           │   │
│  │  [+ Agregar excepción]                                    │   │
│  │                                                           │   │
│  │  Persona         │ Vista        │ Tipo     │ Expira  │ ⋮  │   │
│  │  ─────────────────────────────────────────────────────────│   │
│  │  María López     │ Finanzas     │ ⊕ Acceso │ 30 abr  │ ⋮  │   │
│  │  Juan Pérez      │ Nómina       │ ⊖ Restricción│ —   │ ⋮  │   │
│  │                                                           │   │
│  │  ┌── Dialog: Nueva excepción ─────────────────────────┐   │   │
│  │  │  Persona:    [Autocomplete ___________________]    │   │   │
│  │  │  Vista:      [Select _________________________]    │   │   │
│  │  │  Tipo:       (●) Conceder acceso  (○) Restringir  │   │   │
│  │  │  Expira:     [DatePicker ___________] o □ Permanente│  │   │
│  │  │  Razón:      [TextField ____________________] *    │   │   │
│  │  │                                                    │   │   │
│  │  │  [Cancelar]                  [Guardar excepción]   │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  TAB: PREVIEW                                                    │
│  ┌── Ver como ───────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Persona: [Autocomplete _______________] [Previsualizar]  │   │
│  │                                                           │   │
│  │  ┌──────────────────────┐  ┌────────────────────────────┐ │   │
│  │  │ Sidebar simulado     │  │ Resumen de acceso          │ │   │
│  │  │ ──────────────────── │  │                            │ │   │
│  │  │ Home                 │  │ Rol: efeonce_operations    │ │   │
│  │  │                      │  │ 12 vistas autorizadas      │ │   │
│  │  │ GESTIÓN              │  │ 1 excepción activa         │ │   │
│  │  │  Agencia             │  │                            │ │   │
│  │  │  Spaces              │  │ Acceso por sección:        │ │   │
│  │  │  Economía            │  │  Gestión: 5 de 8           │ │   │
│  │  │                      │  │  Equipo: 2 de 4            │ │   │
│  │  │ EQUIPO               │  │  Finanzas: 1 de 7 (⊕)     │ │   │
│  │  │  Personas            │  │  Admin: 0 de 10            │ │   │
│  │  │  Nómina              │  │  Mi Ficha: 4 de 4          │ │   │
│  │  │                      │  │                            │ │   │
│  │  │ FINANZAS (⊕)         │  │ ⊕ = concedida por         │ │   │
│  │  │  Dashboard           │  │     excepción              │ │   │
│  │  │                      │  │                            │ │   │
│  │  │ MI FICHA             │  │ Expira: 30 abr 2026       │ │   │
│  │  │  Mi Perfil           │  │ Razón: Cierre Q1          │ │   │
│  │  │  Mis Asignaciones    │  │                            │ │   │
│  │  │  Mi Nómina           │  │                            │ │   │
│  │  │  Mi Desempeño        │  │                            │ │   │
│  │  └──────────────────────┘  └────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  TAB: HISTORIAL                                                  │
│  ┌── Cambios recientes ──────────────────────────────────────┐   │
│  │                                                           │   │
│  │  ● jreyes@ concedió Finanzas a rol Operaciones    hace 2h│   │
│  │  ● jreyes@ creó excepción ⊕ Finanzas → mlopez@   hace 1d│   │
│  │  ● sistema  expiró excepción HR → jperez@         hace 3d│   │
│  │  ● jreyes@ revocó Nómina de rol Cliente           hace 5d│   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Component manifest

| Section | Componente | Props / Pattern |
|---------|-----------|----------------|
| Header | `Chip` + `Typography h5` + `Typography body2` | Same pattern as AdminNotificationsView |
| KPIs | `ExecutiveMiniStatCard` × 4 | `xs={12} sm={6} md={3}` grid |
| KPI — Vistas | `ExecutiveMiniStatCard` | `icon='tabler-layout-grid', tone='primary'` |
| KPI — Roles | `ExecutiveMiniStatCard` | `icon='tabler-shield-lock', tone='info'` |
| KPI — Overrides | `ExecutiveMiniStatCard` | `icon='tabler-user-edit', tone='warning'` |
| KPI — Cambios | `ExecutiveMiniStatCard` | `icon='tabler-history', tone='success'` |
| Tab container | `CustomTabList` inside `Card variant='outlined'` | 4 tabs: Permisos, Excepciones, Preview, Historial |
| Matrix | `Table size='small'` with `Checkbox` cells | Sticky first column + sticky header, section group rows |
| Section row | `TableRow` with `colSpan` | `bgcolor: 'action.hover'`, `Typography variant='overline'` |
| Cell granted | `Checkbox checked color='success'` | `aria-label='Acceso a {vista} para {rol}: concedido'` |
| Cell not granted | `Checkbox unchecked color='default'` | `aria-label='Acceso a {vista} para {rol}: sin acceso'` |
| Cell override grant | `Checkbox checked color='warning'` + `Tooltip` | Tooltip: "Concedido por excepción para {user}" |
| Cell override revoke | `Checkbox checked` with strikethrough icon | Tooltip: "Restringido por excepción" |
| Save button | `Button variant='contained'` | Disabled when no pending changes |
| Pending badge | `Chip size='small' color='warning'` | "{n} cambios pendientes" |
| Override table | `Table size='small'` with `OptionMenu` actions | Edit, Eliminar |
| Add override | `Button variant='outlined' startIcon` | Opens dialog |
| Override dialog | `Dialog` with form | `aria-modal='true'`, focus trap, Escape to close |
| User selector | `Autocomplete` with `CustomTextField` | Searches users by name/email |
| View selector | `Select` grouped by section | `<ListSubheader>` for section groups |
| Type radio | `RadioGroup` | "Conceder acceso" / "Restringir acceso" |
| Expiration | `DatePicker` + `Checkbox` "Permanente" | When permanent checked, DatePicker disabled |
| Reason field | `CustomTextField multiline rows={2}` | `aria-required='true'`, helper: "Describe por qué..." |
| Preview sidebar | `Card variant='outlined'` with `List` | Mini sidebar with icons + section headers |
| Preview override badge | `Chip size='small' variant='tonal' color='warning'` | "⊕" label |
| Preview summary | `Card variant='outlined'` | Access breakdown by section |
| Audit timeline | MUI Lab `Timeline` | `TimelineDot color` by action type |
| Confirm dialog | `Dialog` | Title as question, consequence text, specific button labels |

### Visual hierarchy

1. **KPIs** — volumen y salud de un vistazo (cuántas vistas, roles, overrides, actividad)
2. **Tabs** — separación clara de concerns (configurar vs. excepcionar vs. previsualizar vs. auditar)
3. **Matrix** — la herramienta principal, ocupa la mayor parte del viewport
4. **Overrides** — excepciones son secundarias al flujo principal
5. **Preview** — validación antes de aplicar, tercer nivel de importancia
6. **Historial** — referencia y auditoría, último

### Color assignments

| Elemento | Color | Razón |
|----------|-------|-------|
| Checkbox granted | `success` | Estado positivo, acceso concedido |
| Checkbox not granted | `default` | Neutral, sin acceso |
| Override grant cell | `warning` | Excepción — llama la atención |
| Override revoke cell | `error` | Restricción activa |
| Section header row | `action.hover` | Separador visual, no interactivo |
| Pending changes badge | `warning` | Cambios sin guardar, requiere acción |
| Expired override | `secondary` | Desactivado, ya no aplica |

### Responsive

- **Desktop (≥1200px):** Matrix completa con todas las columnas de roles visibles
- **Tablet (768-1199px):** Matrix con scroll horizontal, primera columna sticky
- **Mobile (<768px):** Tabs stack vertical, matrix en scroll horizontal completo, preview a full width

### Interaction notes

- **Matrix checkbox click:** Toggle local state, incrementa pending count, no guarda hasta click "Guardar"
- **Guardar cambios:** Confirmation dialog → bulk POST → success toast → refresh
- **Override expirado:** Row aparece con opacity 0.5 y `Chip 'Expirada'` en vez del tipo
- **Preview user change:** `aria-live='polite'` anuncia "Previsualizando acceso de {nombre}"
- **Hover en celda override:** Tooltip muestra usuario, razón y fecha de expiración
- **Keyboard en matrix:** Arrow keys navegan entre celdas, Space/Enter togglea checkbox

### Loading states

- Matrix: `Skeleton` rectangular (full table height) while loading
- Preview: `Skeleton` del mini-sidebar + summary card
- Audit log: `Skeleton` con 5 lines placeholder
- Override save: `LoadingButton` con spinner

## Copy Specification

### Nomenclatura — textos para `greenhouse-nomenclature.ts`

```typescript
// ── Admin Views & Access ──
admin_views_title: 'Vistas y acceso',
admin_views_subtitle: 'Configura qué secciones del portal ve cada perfil de rol.',

// KPIs
admin_views_kpi_views: 'Vistas registradas',
admin_views_kpi_views_detail: 'Páginas y secciones configurables del portal.',
admin_views_kpi_roles: 'Roles configurados',
admin_views_kpi_roles_detail: 'Perfiles con asignación de vistas activa.',
admin_views_kpi_overrides: 'Excepciones activas',
admin_views_kpi_overrides_detail: 'Accesos concedidos o restringidos por persona.',
admin_views_kpi_changes: 'Cambios 30d',
admin_views_kpi_changes_detail: 'Modificaciones de acceso en los últimos 30 días.',

// Tabs
admin_views_tab_permissions: 'Permisos',
admin_views_tab_overrides: 'Excepciones',
admin_views_tab_preview: 'Preview',
admin_views_tab_log: 'Historial',

// Matrix
admin_views_matrix_title: 'Matriz de permisos',
admin_views_matrix_subtitle: 'Marca qué vistas puede ver cada rol. Los cambios se aplican al guardar.',
admin_views_matrix_search_placeholder: 'ej. Nómina, Finanzas',
admin_views_matrix_save: 'Guardar cambios',
admin_views_matrix_saving: 'Guardando...',
admin_views_matrix_pending: '{n} cambio(s) pendiente(s)',
admin_views_matrix_last_modified: 'Última modificación: {date} por {user}',
admin_views_matrix_no_changes: 'Sin cambios pendientes',

// Matrix cell states (aria-labels)
admin_views_cell_granted: 'Acceso a {view} para {role}: concedido',
admin_views_cell_not_granted: 'Acceso a {view} para {role}: sin acceso',
admin_views_cell_override_grant: 'Acceso a {view} concedido por excepción para {user}',
admin_views_cell_override_revoke: 'Acceso a {view} restringido por excepción para {user}',

// Overrides
admin_views_overrides_title: 'Excepciones por persona',
admin_views_overrides_subtitle: 'Accesos individuales que sobreescriben los permisos del rol.',
admin_views_overrides_add: 'Agregar excepción',
admin_views_overrides_col_person: 'Persona',
admin_views_overrides_col_view: 'Vista',
admin_views_overrides_col_type: 'Tipo',
admin_views_overrides_col_expires: 'Expira',
admin_views_overrides_col_reason: 'Razón',
admin_views_overrides_type_grant: 'Conceder acceso',
admin_views_overrides_type_revoke: 'Restringir acceso',
admin_views_overrides_permanent: 'Permanente',
admin_views_overrides_expired: 'Expirada',
admin_views_overrides_reason_placeholder: 'Describe por qué esta persona necesita esta excepción',
admin_views_overrides_reason_helper: 'Obligatorio. Queda registrado en el historial de cambios.',

// Override dialog
admin_views_override_dialog_title_new: 'Nueva excepción de acceso',
admin_views_override_dialog_title_edit: 'Editar excepción',
admin_views_override_dialog_person_label: 'Persona',
admin_views_override_dialog_person_placeholder: 'ej. María López',
admin_views_override_dialog_view_label: 'Vista',
admin_views_override_dialog_type_label: 'Tipo de excepción',
admin_views_override_dialog_expires_label: 'Fecha de expiración',
admin_views_override_dialog_reason_label: 'Razón',
admin_views_override_dialog_save: 'Guardar excepción',
admin_views_override_dialog_cancel: 'Cancelar',

// Preview
admin_views_preview_title: 'Previsualizar acceso',
admin_views_preview_subtitle: 'Selecciona una persona para ver cómo se ve su portal.',
admin_views_preview_person_label: 'Persona',
admin_views_preview_person_placeholder: 'Buscar por nombre o correo',
admin_views_preview_button: 'Previsualizar',
admin_views_preview_sidebar_title: 'Sidebar simulado',
admin_views_preview_summary_title: 'Resumen de acceso',
admin_views_preview_summary_role: 'Rol: {role}',
admin_views_preview_summary_views: '{n} vistas autorizadas',
admin_views_preview_summary_overrides: '{n} excepción(es) activa(s)',
admin_views_preview_summary_section: '{section}: {granted} de {total}',
admin_views_preview_override_badge: '⊕',
admin_views_preview_override_tooltip: 'Concedida por excepción. Expira: {date}. Razón: {reason}',

// Audit log
admin_views_log_title: 'Historial de cambios',
admin_views_log_subtitle: 'Registro de todas las modificaciones de acceso.',
admin_views_log_col_who: 'Quién',
admin_views_log_col_action: 'Acción',
admin_views_log_col_view: 'Vista',
admin_views_log_col_when: 'Cuándo',
admin_views_log_col_reason: 'Razón',
admin_views_log_action_grant_role: 'Concedió a rol {role}',
admin_views_log_action_revoke_role: 'Revocó de rol {role}',
admin_views_log_action_grant_user: 'Concedió excepción a {user}',
admin_views_log_action_revoke_user: 'Revocó excepción de {user}',
admin_views_log_action_expire_user: 'Excepción expirada para {user}',

// Confirmation dialog
admin_views_confirm_title: 'Guardar cambios de permisos?',
admin_views_confirm_body: 'Vas a modificar {n} permiso(s) para {r} rol(es). Los cambios se aplican de inmediato a todas las sesiones activas.',
admin_views_confirm_save: 'Guardar permisos',
admin_views_confirm_cancel: 'Seguir editando',

// Delete override dialog
admin_views_delete_override_title: 'Eliminar esta excepción?',
admin_views_delete_override_body: '{user} perderá el acceso concedido a {view}. Su acceso volverá a depender de su rol.',
admin_views_delete_override_confirm: 'Eliminar excepción',

// Toasts
admin_views_toast_saved: 'Permisos actualizados. {n} cambio(s) aplicado(s).',
admin_views_toast_save_error: 'No pudimos guardar los cambios. Intenta de nuevo.',
admin_views_toast_override_created: 'Excepción creada para {user}.',
admin_views_toast_override_deleted: 'Excepción eliminada.',

// Empty states
admin_views_empty_overrides: 'Sin excepciones activas. Todos los accesos se rigen por el rol asignado.',
admin_views_empty_log: 'Sin cambios registrados en los últimos 30 días.',
admin_views_empty_preview: 'Selecciona una persona para previsualizar su acceso al portal.',

// Access denied page (consumer-facing)
admin_views_access_denied_title: 'No tienes acceso a esta sección',
admin_views_access_denied_body: 'Tu perfil actual ({role}) no incluye acceso a {section}. Si necesitas acceso, contacta a tu administrador.',
admin_views_access_denied_cta: 'Volver al inicio',
```

### Screen reader (aria-labels)

```typescript
// KPIs
aria_views_kpi_views: 'Vistas registradas en el portal: {n}',
aria_views_kpi_roles: 'Roles con permisos configurados: {n}',
aria_views_kpi_overrides: 'Excepciones de acceso activas: {n}',
aria_views_kpi_changes: 'Cambios de acceso en los últimos 30 días: {n}',

// Matrix
aria_views_matrix: 'Matriz de permisos: vistas del portal por rol',
aria_views_matrix_section: 'Sección {section}',

// Preview
aria_views_preview_sidebar: 'Sidebar simulado mostrando las vistas que vería {user}',
aria_views_preview_changed: 'Previsualizando acceso de {user}: {n} vistas autorizadas',

// Audit
aria_views_log: 'Historial de cambios de acceso a vistas',
```

## File Reference

| Archivo | Cambio |
|---------|--------|
| `scripts/setup-view-access-governance.sql` | DDL + seed (nuevo) |
| `src/lib/admin/view-access-resolver.ts` | Resolution engine (nuevo) |
| `src/lib/admin/get-admin-views-overview.ts` | Data source para la UI (nuevo) |
| `src/app/(dashboard)/admin/views/page.tsx` | Server component (nuevo) |
| `src/views/greenhouse/admin/AdminViewsView.tsx` | Client view (nuevo) |
| `src/views/greenhouse/admin/ViewPermissionMatrix.tsx` | Matrix interactiva (nuevo) |
| `src/views/greenhouse/admin/UserOverridePanel.tsx` | Override CRUD (nuevo) |
| `src/views/greenhouse/admin/ViewPreviewPanel.tsx` | Preview sidebar (nuevo) |
| `src/app/api/admin/views/**` | API routes (nuevos) |
| `src/lib/tenant/access.ts` | Modificar `deriveRouteGroups()` para leer de BD |
| `src/components/layout/vertical/VerticalMenu.tsx` | Sidebar dinámico |
| `src/types/next-auth.d.ts` | Agregar `authorizedViews` |
| `src/views/greenhouse/admin/AdminCenterView.tsx` | Domain card |
| `src/config/greenhouse-nomenclature.ts` | Textos |
