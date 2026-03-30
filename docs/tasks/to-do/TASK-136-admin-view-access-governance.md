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
