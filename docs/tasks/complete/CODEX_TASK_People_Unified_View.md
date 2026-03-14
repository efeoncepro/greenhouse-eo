# CODEX TASK — People: Vista Operativa del Equipo Efeonce

## Resumen

Implementar **`/people`** como la vista operativa del equipo Efeonce dentro de Greenhouse. Cada colaborador se asigna a cuentas de clientes, opera la producción creativa, ve KPIs y contribuye a los resultados del sistema ICO. Esta vista es donde se gestiona **quién trabaja en qué cuenta, con cuánta capacidad, y con qué resultados**.

**El propósito de Greenhouse es operativo.** Los colaboradores no son un recurso administrativo — son los operadores del sistema. `/people` es la vista donde un admin o un operador entiende de un vistazo: en qué cuentas está cada persona, cuánto FTE tiene asignado, cuál es su RpA, su OTD%, y su carga real. La nómina es un addon de HR que vive como tab adicional, no como eje de la vista.

**El problema:** La información de un colaborador vive dispersa entre Admin Team (`/admin/team`) y operación (`notion_ops`). No hay un lugar donde ver la radiografía operativa completa de una persona: sus cuentas asignadas, su carga, su performance, y opcionalmente su compensación.

**La solución:** Un route group `/people` con:
- **Lista de colaboradores** (`/people`) — tabla filtrable con métricas operativas
- **Ficha de persona** (`/people/[memberId]`) — vista con tabs extensibles

**Jerarquía de tabs (por importancia, no por orden técnico):**
1. **Asignaciones** — core: en qué cuentas trabaja, con cuánto FTE ← lo que todo operador necesita
2. **Actividad** — core: RpA, OTD%, tasks completadas, distribución por proyecto ← performance operativa
3. **Compensación** — addon HR: salario, bonos, previsión ← solo visible para HR y admin
4. **Nómina** — addon HR: historial de pagos ← solo visible para HR y admin

**Patrón Vuexy:** Se basa directamente en `full-version/src/views/apps/user/view/` (layout de 2 columnas con left sidebar + right tabbed content) y `full-version/src/views/apps/user/list/` (tabla filtrable con stats). Adaptar al contexto Greenhouse, no copiar ciego.

**Impacto en otros tasks:**
- `CODEX_TASK_Admin_Team_Module.md` → la lista se mueve a `/people`, el detalle se mueve a `/people/[memberId]`. `/admin/team` desaparece o redirige.
- `CODEX_TASK_HR_Payroll_Module_v2.md` → la vista `/hr/payroll/member/[memberId]` se absorbe como tab "Nómina" dentro de `/people/[memberId]`. El módulo HR mantiene su panel de períodos en `/hr/payroll`.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/people-view`
- **Framework:** Next.js 16.1.1 (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **UI Library:** MUI 7.x
- **React:** 19.2.3
- **TypeScript:** 5.9.3
- **Deploy:** Vercel
- **GCP Project:** `efeonce-group`
- **BigQuery dataset:** `greenhouse`, `notion_ops`

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `AGENTS.md` (en el repo) | Reglas operativas del repo |
| `GREENHOUSE_IDENTITY_ACCESS_V1.md` (en el repo) | Modelo de roles, route groups, guards |
| `project_context.md` (en el repo) | Schema real de `notion_ops.tareas`, estrategia de identidad |
| `authorization.ts` (en el repo) | Sistema de autorización, cómo se validan route groups |
| `CODEX_TASK_Admin_Team_Module.md` (proyecto Claude) | Schema de `team_members`, `client_team_assignments` |
| `CODEX_TASK_HR_Payroll_Module_v2.md` (proyecto Claude) | Schema de `compensation_versions`, `payroll_entries` |
| `Greenhouse_Nomenclatura_Portal_v3.md` (proyecto Claude) | Design tokens, GH_COLORS, tipografía |
| `Brand_Guideline_Efeonce_v1.docx` (proyecto Claude) | Poppins / DM Sans, paleta |

### Referencia Vuexy (LEER ANTES DE IMPLEMENTAR)

| Archivo en full-version | Para qué sirve |
|-------------------------|-----------------|
| `src/views/apps/user/list/index.tsx` | Patrón de tabla filtrable con stats row |
| `src/views/apps/user/list/TableFilters.tsx` | Filtros por rol, plan, status |
| `src/views/apps/user/list/UserListTable.tsx` | Tabla con avatar, nombre, email, rol, status |
| `src/views/apps/user/view/index.tsx` | Layout 2 columnas: left sidebar + right tabs |
| `src/views/apps/user/view/user-left-overview/index.tsx` | Card izquierda: avatar, info, stats |
| `src/views/apps/user/view/user-right/index.tsx` | TabContext con tabs dinámicos |
| `src/views/apps/user/view/user-right/overview/index.tsx` | Tab overview |
| `src/views/apps/user/view/user-right/security/index.tsx` | Tab security |
| `src/views/apps/user/view/user-right/billing-plans/index.tsx` | Tab billing (reinterpretar) |

---

## Dependencias previas

### DEBE existir

- [x] Auth con NextAuth.js, roles, scopes
- [x] Tabla `greenhouse.team_members` (con seed data)
- [x] Guard server-side para rutas protegidas
- [x] Patrones Vuexy disponibles en `full-version`

### PUEDE no existir (verificar, implementar si falta)

- [ ] Campo `country` en `greenhouse.team_members` — agregar si no existe
- [ ] Tabla `greenhouse.client_team_assignments`
- [ ] Tabla `greenhouse.compensation_versions` (del HR Payroll task)
- [ ] Tabla `greenhouse.payroll_entries` (del HR Payroll task)

**Regla:** La vista People funciona con lo que exista. Si `compensation_versions` no existe aún, el tab Compensación muestra empty state. Si `payroll_entries` no existe, el tab Nómina muestra empty state. Los tabs se renderizan condicionalmente según data disponible Y permisos del usuario.

---

## PARTE A: Cambio en schema de `team_members`

Agregar campo `country` a `greenhouse.team_members`:

```sql
ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS country STRING;  -- 'CL' | 'CO' | 'MX' | 'PE' | 'US' etc. (ISO 3166-1 alpha-2)
```

Actualizar seed data:

```sql
UPDATE `efeonce-group.greenhouse.team_members` SET country = 'CL' WHERE member_id IN ('julio-reyes', 'valentina-hoyos', 'daniela-ferreira', 'humberly-henriquez', 'melkin-hernandez', 'andres-carlosama');
UPDATE `efeonce-group.greenhouse.team_members` SET country = 'VE' WHERE member_id = 'luis-reyes';
-- Ajustar según nacionalidad/residencia real de cada persona
```

**Derivación automática de régimen de pago:**
- `country = 'CL'` → `pay_regime = 'chile'`, `currency = 'CLP'`
- Cualquier otro → `pay_regime = 'international'`, `currency = 'USD'`

Esta derivación se usa como **default** al crear la primera `compensation_version`. HR puede override si necesita.

---

## PARTE B: Modelo de acceso

### Route group: `people`

`/people` es accesible por múltiples roles, pero cada tab tiene control de visibilidad:

| Rol | Ve la lista `/people` | Ve ficha `/people/[id]` | Tabs visibles |
|-----|----------------------|------------------------|---------------|
| `efeonce_admin` | Sí | Sí | Todos (Perfil, Asignaciones, Compensación, Actividad, Nómina) |
| `hr` | Sí | Sí | Perfil (lectura), Compensación, Nómina |
| `operator` | Sí | Sí | Perfil (lectura), Asignaciones, Actividad |
| `client` | No | No | — |

**Implementación:**
1. Crear route group `people` accesible por `efeonce_admin`, `hr`, y `operator`
2. Sublayout `src/app/(dashboard)/people/layout.tsx` valida pertenencia a al menos uno de esos route groups
3. Cada tab dentro de la ficha verifica permisos antes de renderizar. Si el usuario no tiene permiso para un tab, el tab no aparece en la navegación.

### Guard de tab server-side

Las API routes que alimentan cada tab ya validan permisos por separado:
- `/api/admin/team/*` → requiere `efeonce_admin`
- `/api/hr/payroll/*` → requiere `hr` o `efeonce_admin`
- KPIs de `notion_ops` → accesible por `operator`, `hr`, `efeonce_admin`

La UI no necesita un guard extra por tab — si la API retorna 403, el tab muestra "Sin acceso". Pero para UX limpia, los tabs se ocultan client-side según el rol del JWT.

---

## PARTE C: Vistas

### C1. `/people` — Lista de colaboradores

**Patrón Vuexy:** `full-version/src/views/apps/user/list/`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Equipo" + "X colaboradores activos" + [+ Agregar]  │
├─────────────────────────────────────────────────────────────┤
│  Stats row: 4 stat cards (patrón Vuexy widget-statistics)    │
│  [Activos] [FTE total] [Spaces cubiertos] [Chile / Intl]    │
├─────────────────────────────────────────────────────────────┤
│  Filtros (patrón Vuexy TableFilters):                        │
│  [Rol ▾] [País ▾] [Estado ▾] [Búsqueda...]                  │
├─────────────────────────────────────────────────────────────┤
│  Tabla (patrón Vuexy UserListTable):                         │
│  Avatar | Nombre + email | Cargo | País | Spaces | FTE | ···│
└─────────────────────────────────────────────────────────────┘
```

**Stat cards** (patrón `full-version/src/views/pages/widget-examples/statistics/`):

| Card | Ícono | Número | Subtítulo |
|------|-------|--------|-----------|
| Activos | `tabler-users` | COUNT active | "colaboradores activos" |
| FTE asignado | `tabler-clock-hour-4` | SUM fte_allocation | "FTE distribuido en cuentas" |
| Spaces cubiertos | `tabler-building` | COUNT DISTINCT client_id | "cuentas con equipo" |
| Distribución | `tabler-world` | "X CL · Y Intl" | "por régimen de pago" |

**Columnas de la tabla:**

| Columna | Componente Vuexy | Dato |
|---------|------------------|------|
| Colaborador | Avatar + Typography stack | Avatar coloreado por `roleCategory` + nombre (Poppins 500 14px) + email (DM Sans 400 12px `text.secondary`) |
| Cargo | Typography | `roleTitle` (DM Sans 400 13px) |
| Rol | Chip | Badge con color `GH_COLORS.role[category]` |
| País | Chip con flag | Bandera emoji + código ISO (ej: 🇨🇱 CL) |
| Spaces | Typography | Número. Tooltip lista nombres. |
| FTE | Typography | Número con 1 decimal |
| Estado | Dot + label | Verde "Activo" / Gris "Inactivo" |
| Acciones | IconButton menu | Ver ficha · Editar · Asignar a Space |

**Filtros** (patrón `TableFilters.tsx`):
- **Rol:** Select multi con opciones por `roleCategory`
- **País:** Select multi con los países presentes en la data
- **Estado:** Select simple (Activo / Inactivo / Todos)
- **Búsqueda:** TextField sobre `display_name` y `email`

**Acciones globales:**
- Botón "+" abre drawer de creación de colaborador (del Admin Team Module)
- Click en fila navega a `/people/[memberId]`

### C2. `/people/[memberId]` — Ficha de persona

**Patrón Vuexy:** `full-version/src/views/apps/user/view/`

Layout de 2 columnas: left sidebar fija (1/3) + right tabbed content (2/3).

#### Left sidebar (patrón `user-left-overview`)

```
┌─────────────────────────┐
│      ┌──────────┐       │
│      │  Avatar  │       │  Avatar grande (120px), iniciales si no hay foto
│      │  120px   │       │  Fondo: GH_COLORS.role[category].bg
│      └──────────┘       │  Texto: GH_COLORS.role[category].text
│                         │
│   Daniela Ferreira      │  Poppins 500 18px
│   Creative Ops Lead     │  DM Sans 400 14px text.secondary
│                         │
│   ┌─────────────────┐   │
│   │ operations      │   │  Chip de roleCategory con color
│   └─────────────────┘   │
│   🇨🇱 Chile              │  País con flag
│                         │
├─────────────────────────┤
│  DATOS DE CONTACTO      │  Section header (DM Sans 500 11px uppercase)
│                         │
│  📧 dferreira@...com    │  Email público
│  📧 daniela.ferreira@   │  Email interno (@efeonce.org)
│     efeonce.org         │
│  💬 Teams               │  Canal de contacto + handle
│                         │
├─────────────────────────┤
│  MÉTRICAS               │
│                         │
│  FTE total      2.5     │  Suma de assignments activos
│  Horas/mes      400     │  FTE × 160
│  Spaces         3       │  Assignments activos
│  Throughput     20/mes  │  expected_monthly_throughput
│                         │
├─────────────────────────┤
│  INTEGRACIONES          │  Section header
│                         │
│  Azure AD    ✓ Linked   │  azure_oid existe → check verde
│  Notion      ✓ Linked   │  notion_user_id existe → check verde
│  HubSpot     ✓ Linked   │  hubspot_owner_id existe → check verde
│              ○ Not set  │  Si no existe → gris
│                         │
├─────────────────────────┤
│  [Editar perfil]        │  Botón outline → abre drawer
│  [Desactivar]           │  Solo admin. Texto rojo, confirmación.
└─────────────────────────┘
```

#### Right tabs (patrón `user-right` con TabContext)

```typescript
// Tabs disponibles — se renderizan según rol del usuario
// Los dos primeros son core operativo, los dos últimos son addon HR
const tabs = [
  // --- Core operativo (visibles para admin y operator) ---
  { value: 'assignments', label: 'Asignaciones', icon: 'tabler-briefcase', roles: ['efeonce_admin', 'operator'] },
  { value: 'activity', label: 'Actividad', icon: 'tabler-chart-bar', roles: ['efeonce_admin', 'operator'] },
  // --- Addon HR (visibles solo para admin y hr) ---
  { value: 'compensation', label: 'Compensación', icon: 'tabler-cash', roles: ['efeonce_admin', 'hr'] },
  { value: 'payroll', label: 'Nómina', icon: 'tabler-receipt-2', roles: ['efeonce_admin', 'hr'] },
]
```

---

### Tab: Asignaciones

**Visible para:** `efeonce_admin`, `operator`
**Data source:** `greenhouse.client_team_assignments` + `greenhouse.clients` (o tenants)

Tabla con fila por assignment:

| Columna | Dato |
|---------|------|
| Space/Cuenta | Nombre del tenant (link a `/admin/tenants/[id]`) |
| FTE | `fte_allocation` con slider visual |
| Horas/mes | Calculado o override |
| Rol en cuenta | `role_title_override` o "Mismo cargo" en `text.secondary` |
| Desde | `start_date` formateado |
| Estado | Active badge verde / Ended badge gris con fecha |
| Acciones | Editar FTE · Desasignar |

**Footer de la tabla:**
- "FTE total asignado: X.X de capacidad disponible"
- Botón "Asignar a nueva cuenta" → abre drawer de asignación

**Ghost slot** al final de las filas activas: borde dashed, "+" icono, "Asignar a nueva cuenta".

---

### Tab: Actividad

**Visible para:** `efeonce_admin`, `operator`
**Data source:** `notion_ops.tareas` (match por `identity_profile_id` o `notion_user_id`)

**Este es el tab de performance operativa.** Aquí se ve cómo rinde la persona en producción creativa — los mismos KPIs que determinan si califica a bonos, pero mostrados en contexto operativo, no de nómina.

**Si no hay match:** Empty state: "No hay datos operativos. Verifica que el ID de Notion esté vinculado."

**Si hay match:**

**KPI cards (fila de 3):**

| KPI | Dato | Semáforo |
|-----|------|----------|
| RpA promedio | AVG de rpa del mes | <2 verde, ≥2 rojo |
| Tasks completadas | COUNT del mes | Trend vs mes anterior |
| OTD% | Calculado o N/A | ≥89% verde, <89% rojo |

**Chart:** Bar chart horizontal de distribución de assets por proyecto (últimos 30 días).

**Tabla de assets activos:** Tareas asignadas a esta persona en estado no-terminal, con proyecto, estado, RpA, última actividad.

---

### Tab: Compensación (addon HR)

**Visible para:** `efeonce_admin`, `hr`
**Data source:** `greenhouse.compensation_versions`

**Si no existe compensación configurada:** Empty state con botón "Configurar compensación".

**Si existe:**

**Card principal** con la versión vigente (`is_current = TRUE`):

```
┌─────────────────────────────────────────────────────────────┐
│  COMPENSACIÓN VIGENTE          desde 1 mar 2026    [Editar] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Salario base          $1.200.000 CLP                        │
│  Asig. teletrabajo     $30.000 CLP                           │
│  Régimen               Chile (CLP)                           │
│                                                              │
│  ── Bonos variables ──                                       │
│  Bono OTD (si ≥89%)   $50.000 — $150.000                    │
│  Bono RpA (si <2.0)   $30.000 — $100.000                    │
│                                                              │
│  ── Previsión (Chile) ──                                     │
│  AFP                   Habitat (11.44%)                      │
│  Salud                 Fonasa (7%)                            │
│  Contrato              Indefinido (cesantía 0.6%)            │
│  APV                   No                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Historial de versiones** debajo:

Timeline vertical con cards colapsadas:
- "v2 — 1 mar 2026 — Ajuste por evaluación Q1" (vigente)
- "v1 — 1 ene 2026 — Configuración inicial" (cerrada)

Click en versión anterior expande el desglose de esa versión.

**Drawer de compensación** (patrón drawer lateral 480px):
- Sección 1: Régimen y moneda (select Chile/Internacional, moneda auto-derivada de país)
- Sección 2: Salario base (input numérico con formato de moneda)
- Sección 3: Asignación teletrabajo
- Sección 4: Bonos variables (4 inputs: OTD min/max, RpA min/max)
- Sección 5: Previsión Chile (solo si régimen = Chile): AFP (select + tasa), salud (Fonasa/Isapre), tipo contrato, cesantía auto-calculada, APV
- Sección 6: Motivo del cambio (textarea, obligatorio)
- Footer: "Guardar nueva versión"

---

### Tab: Nómina (addon HR)

**Visible para:** `efeonce_admin`, `hr`
**Data source:** `greenhouse.payroll_entries` de períodos aprobados

**Si no hay entries:** Empty state: "No hay nóminas procesadas para esta persona."

**Si hay entries:**

**Line chart** de evolución del neto mensual (últimos 12 meses).

**Tabla de nóminas:**

| Columna | Dato |
|---------|------|
| Período | "Marzo 2026" (link al período en `/hr/payroll`) |
| Bruto | Formateado con moneda |
| Bonos | OTD + RpA + Otro (desglose en tooltip) |
| Descuentos | Solo Chile. Tooltip con desglose. |
| Neto | Número destacado |
| Estado | Badge (Aprobado / Exportado) |

---

## PARTE D: API Routes

La vista People **consume APIs existentes** de Admin Team y HR Payroll, más una API nueva para la ficha consolidada.

### D1. `GET /api/people` (nueva)

Lista de colaboradores con métricas agregadas. Fusiona lo que era `/api/admin/team/members` con data de país y compensación.

**Accesible por:** `efeonce_admin`, `hr`, `operator`

### D2. `GET /api/people/[memberId]` (nueva)

Ficha consolidada. Retorna datos base + assignments + compensación vigente + KPIs + últimas entries de nómina. Filtra secciones según rol del solicitante.

**Response shape:**

```typescript
interface PersonDetail {
  // Base (siempre visible)
  member: TeamMember & { country: string | null }

  // Assignments (admin, operator)
  assignments?: TeamAssignment[]

  // Compensación vigente (admin, hr)
  currentCompensation?: CompensationVersion | null

  // KPIs del mes (admin, operator)
  operationalMetrics?: {
    rpaAvg: number | null
    otdPercent: number | null
    tasksCompleted: number
    tasksActive: number
  } | null

  // Últimas 3 nóminas (admin, hr)
  recentPayroll?: PayrollEntry[]
}
```

El server-side lee el rol del JWT y omite las secciones que el usuario no tiene permiso de ver (retorna `undefined`, no `null` — así el frontend sabe que no tiene permiso, no que no hay data).

### D3. APIs existentes que se reutilizan

| API | Módulo origen | Tab que la consume |
|-----|---------------|-------------------|
| `GET /api/admin/team/members/[id]` | Admin Team | Left sidebar + Asignaciones |
| `POST /api/admin/team/assignments` | Admin Team | Drawer de asignación |
| `PATCH /api/admin/team/assignments/[id]` | Admin Team | Edición de FTE |
| `GET /api/hr/payroll/compensation` | HR Payroll | Tab Compensación |
| `POST /api/hr/payroll/compensation` | HR Payroll | Drawer de nueva versión |
| `GET /api/hr/payroll/members/[id]/history` | HR Payroll | Tab Nómina |

---

## PARTE E: Tipos TypeScript

```typescript
// src/types/people.ts

// Re-export types de los módulos que consume
export type { TeamMember, TeamMemberListItem, TeamAssignment } from './team-admin'
export type { CompensationVersion, PayrollEntry } from './payroll'

// Tipos propios de People
export interface PersonListItem {
  memberId: string
  displayName: string
  email: string
  emailInternal: string | null
  roleTitle: string
  roleCategory: string
  avatarUrl: string | null
  country: string | null
  active: boolean
  totalAssignments: number
  totalFte: number
  payRegime: 'chile' | 'international' | null  // null si no tiene compensación configurada
}

export interface PersonDetail {
  member: TeamMember & { country: string | null }
  assignments?: TeamAssignment[]
  currentCompensation?: CompensationVersion | null
  operationalMetrics?: {
    rpaAvg: number | null
    otdPercent: number | null
    tasksCompleted: number
    tasksActive: number
  } | null
  recentPayroll?: PayrollEntry[]
}

// Tab visibility por rol — core operativo primero, addon HR después
export type PersonTab = 'assignments' | 'activity' | 'compensation' | 'payroll'

export const TAB_PERMISSIONS: Record<PersonTab, string[]> = {
  // Core operativo
  assignments: ['efeonce_admin', 'operator'],
  activity: ['efeonce_admin', 'operator'],
  // Addon HR
  compensation: ['efeonce_admin', 'hr'],
  payroll: ['efeonce_admin', 'hr'],
}
```

---

## PARTE F: Estructura de archivos

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── people/
│   │       ├── layout.tsx                              # Guard: admin || hr || operator
│   │       ├── page.tsx                                # C1: Lista
│   │       └── [memberId]/
│   │           └── page.tsx                            # C2: Ficha
│   └── api/
│       └── people/
│           ├── route.ts                                # GET lista
│           └── [memberId]/
│               └── route.ts                            # GET ficha consolidada
├── views/
│   └── greenhouse/
│       └── people/
│           ├── PeopleList.tsx                           # Composición lista (patrón user/list)
│           ├── PeopleListStats.tsx                      # Stats row
│           ├── PeopleListTable.tsx                      # Tabla (patrón UserListTable)
│           ├── PeopleListFilters.tsx                    # Filtros (patrón TableFilters)
│           ├── PersonView.tsx                           # Composición ficha (patrón user/view)
│           ├── PersonLeftSidebar.tsx                    # Left column (patrón user-left-overview)
│           ├── PersonRightTabs.tsx                      # Right tabs (patrón user-right)
│           ├── tabs/
│           │   ├── AssignmentsTab.tsx                   # Tab Asignaciones
│           │   ├── CompensationTab.tsx                  # Tab Compensación
│           │   ├── ActivityTab.tsx                      # Tab Actividad
│           │   └── PayrollTab.tsx                       # Tab Nómina
│           ├── drawers/
│           │   ├── EditProfileDrawer.tsx                # Edición de perfil
│           │   ├── CompensationDrawer.tsx               # Nueva versión de compensación
│           │   └── AssignmentDrawer.tsx                 # Asignar a Space
│           └── cards/
│               ├── CompensationCard.tsx                 # Card de compensación vigente
│               ├── CompensationTimeline.tsx             # Historial de versiones
│               └── PayrollHistoryChart.tsx              # Line chart de neto mensual
├── components/
│   └── greenhouse/
│       ├── RoleCategoryBadge.tsx                        # (reutilizable, puede existir ya)
│       ├── MemberAvatar.tsx                             # (reutilizable, puede existir ya)
│       ├── CountryFlag.tsx                              # Bandera + código ISO
│       └── IntegrationStatus.tsx                        # Check verde / gris para IDs externos
├── lib/
│   └── people/
│       ├── get-people-list.ts                           # Query con JOINs agregados
│       └── get-person-detail.ts                         # Query consolidada por rol
└── types/
    └── people.ts
```

---

## PARTE G: Navegación

### Sidebar

Nueva sección "EQUIPO" en el sidebar, visible para admin, hr, operator:

```typescript
{
  sectionTitle: 'EQUIPO',
  items: [
    {
      title: 'Personas',
      icon: 'tabler-users-group',
      path: '/people',
      // Visible si routeGroups incluye 'people', 'hr', o 'admin'
    }
  ]
}
```

**Posición:** Después de "OPERACIÓN" (Pulse, Proyectos, Ciclos) y antes de "SERVICIOS" (Creative Hub, etc.).

### Redirect desde `/admin/team`

Si `/admin/team` existe, agregar redirect 301 → `/people`. Así los links existentes no se rompen.

---

## PARTE H: Impacto en otros CODEX tasks

### CODEX_TASK_Admin_Team_Module.md

**Cambios:**
- La lista `/admin/team` se reemplaza por `/people`
- El detalle `/admin/team/[memberId]` se reemplaza por `/people/[memberId]`
- Las API routes de team (`/api/admin/team/*`) se mantienen — People las consume
- El drawer de creación de colaborador se mueve a People
- El drawer de asignación se mueve a People

**Lo que se mantiene del Admin Team Module:**
- Infraestructura BigQuery (tablas, seed data)
- API routes de CRUD
- Tipos TypeScript

### CODEX_TASK_HR_Payroll_Module_v2.md

**Cambios:**
- La vista `/hr/payroll/member/[memberId]` se absorbe como tab "Nómina" en `/people/[memberId]`
- El panel principal `/hr/payroll` se mantiene como está (gestión de períodos, cálculo, aprobación)

**Lo que se mantiene del HR Payroll Module:**
- Todo el flujo de períodos, cálculo, aprobación, export
- API routes
- Tablas BigQuery
- El tab Compensaciones de `/hr/payroll` se reemplaza por el tab Compensación de `/people/[memberId]` (la misma UI, distinto lugar)

---

## PARTE I: Orden de ejecución

### Fase 1: Infraestructura

1. Agregar `country` a `greenhouse.team_members` (ALTER TABLE + UPDATE seed)
2. Crear types TypeScript (`src/types/people.ts`)
3. Crear `GET /api/people` (lista consolidada)
4. Crear `GET /api/people/[memberId]` (ficha consolidada con filtrado por rol)

### Fase 2: Lista

5. Crear `PeopleListStats.tsx` (stat cards)
6. Crear `PeopleListFilters.tsx` (filtros patrón Vuexy)
7. Crear `PeopleListTable.tsx` (tabla patrón Vuexy)
8. Crear `PeopleList.tsx` (composición)
9. Crear `CountryFlag.tsx` componente reutilizable
10. Crear `/people/page.tsx`

### Fase 3: Ficha — left sidebar

11. Crear `PersonLeftSidebar.tsx` (patrón user-left-overview)
12. Crear `IntegrationStatus.tsx` componente reutilizable

### Fase 4: Ficha — tabs

13. Crear `AssignmentsTab.tsx` (migrado de Admin Team detail)
14. Crear `CompensationTab.tsx` + `CompensationCard.tsx` + `CompensationTimeline.tsx`
15. Crear `CompensationDrawer.tsx` (migrado/adaptado de HR Payroll)
16. Crear `ActivityTab.tsx` (migrado de Admin Team activity)
17. Crear `PayrollTab.tsx` + `PayrollHistoryChart.tsx`
18. Crear `PersonRightTabs.tsx` con TabContext dinámico por permisos
19. Crear `PersonView.tsx` (composición 2 columnas)
20. Crear `/people/[memberId]/page.tsx`

### Fase 5: Drawers y acciones

21. Crear `EditProfileDrawer.tsx` (edición de perfil base)
22. Crear `AssignmentDrawer.tsx` (migrado de Admin Team)
23. Agregar "Personas" al sidebar
24. Agregar redirect `/admin/team` → `/people`

### Fase 6: Polish

25. Verificar responsive (1440px, 1024px, 768px)
26. Verificar que tabs se ocultan según rol
27. Verificar empty states en cada tab cuando no hay data
28. Verificar que la ficha funciona con data parcial (sin compensación, sin nómina)

---

## Criterios de aceptación

### Lista

- [ ] Stats row con 4 cards funcionales
- [ ] Tabla con avatar coloreado, nombre, email, cargo, país con bandera, spaces, FTE, estado
- [ ] Filtros por rol, país, estado, búsqueda
- [ ] Click en fila navega a `/people/[memberId]`
- [ ] Botón "+" abre drawer de creación

### Ficha — left sidebar

- [ ] Avatar grande con iniciales coloreadas por `roleCategory`
- [ ] Nombre, cargo, chip de rol, país con bandera
- [ ] Datos de contacto: ambos emails, canal de contacto
- [ ] Métricas: FTE total, horas/mes, spaces, throughput
- [ ] Integraciones: check verde/gris para Azure, Notion, HubSpot
- [ ] Botones "Editar perfil" y "Desactivar" (admin only)

### Ficha — tabs por rol

- [ ] Admin ve los 4 tabs: Asignaciones, Actividad (core operativo) + Compensación, Nómina (addon HR)
- [ ] Operator ve Asignaciones y Actividad (los tabs core operativos)
- [ ] HR ve Compensación y Nómina (los tabs addon HR) + sidebar de perfil en lectura
- [ ] Client no accede a `/people` en absoluto
- [ ] Tabs no visibles no aparecen en la navegación (no se muestran disabled)
- [ ] El tab default al abrir la ficha es Asignaciones (no Compensación)

### Tab Asignaciones

- [ ] Tabla de assignments con Space, FTE, horas, rol override, fecha, estado
- [ ] Ghost slot "Asignar a nueva cuenta"
- [ ] Editar FTE y desasignar funcionan

### Tab Compensación

- [ ] Card con compensación vigente (salario, bonos, teletrabajo, previsión Chile)
- [ ] Timeline de versiones anteriores
- [ ] Drawer para crear nueva versión (con motivo obligatorio)
- [ ] Régimen auto-derivado del país pero editable
- [ ] Sección Chile solo visible si régimen = Chile

### Tab Actividad

- [ ] 3 KPI cards (RpA, tasks completadas, OTD%)
- [ ] Chart de distribución por proyecto
- [ ] Empty state si no hay match con Notion

### Tab Nómina

- [ ] Line chart de evolución del neto
- [ ] Tabla de nóminas con desglose
- [ ] Empty state si no hay entries

### UI y diseño

- [ ] Patrones Vuexy respetados (user/list para lista, user/view para ficha)
- [ ] Poppins solo para títulos y stat numbers
- [ ] DM Sans para todo lo demás
- [ ] Colores de `GH_COLORS` — cero hex hardcodeados
- [ ] Responsive en 1440px, 1024px, 768px
- [ ] Skeleton loaders en cada sección

---

## Lo que NO incluye esta tarea

- Creación de las tablas BigQuery de team o payroll — eso es de los otros tasks
- Lógica de cálculo de nómina — eso es del HR Payroll Module
- Endpoints CRUD de team members y assignments — eso es del Admin Team Module
- Time tracking real
- Upload de foto de avatar

---

## Notas para el agente

- **Lee los archivos de `full-version/src/views/apps/user/`** antes de empezar. El layout de 2 columnas, los stat cards, la tabla filtrable y los tabs ya están ahí. Adapta, no reinventa.
- **La ficha debe funcionar con data parcial.** Si `compensation_versions` no existe todavía, el tab Compensación muestra empty state. No crashear.
- **Reutiliza APIs existentes** de Admin Team y HR Payroll. La API `/api/people/[memberId]` es una capa de orquestación que llama a las queries existentes y filtra por rol.
- **Los componentes de `src/components/greenhouse/*`** como `RoleCategoryBadge` y `MemberAvatar` pueden existir ya del Admin Team Module. Verificar antes de crear duplicados.
- **Branch naming:** `feature/people-view`.
- **Este task se puede ejecutar en paralelo** con Admin Team y HR Payroll — solo necesita las tablas BigQuery y las API routes, no las UIs de esos módulos.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo. Referencia normativa para implementación.*
