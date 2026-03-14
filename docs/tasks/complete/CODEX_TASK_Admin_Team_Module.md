# CODEX TASK — Admin de Colaboradores: CRUD de Equipo y Asignaciones

## Resumen

Implementar el **módulo de administración de colaboradores** en el portal Greenhouse. Este módulo permite al admin gestionar el equipo Efeonce: crear/editar personas, asignarlas a Spaces con FTE y horas, y ver una radiografía completa de cada colaborador (carga distribuida, historial, cuentas asignadas).

**El problema hoy:** Las tablas `greenhouse.team_members` y `greenhouse.client_team_assignments` (definidas en CODEX_TASK_Team_Identity_Capacity_System.md) se provisionan manualmente via SQL. No hay UI para gestionar equipo. El README del repo lista "Modelar team/capacity antes de exponer equipo asignado" como próximo paso pendiente. Las vistas cliente de equipo (Dossier, Capacity en Pulse, Equipo por proyecto) dependen de esta data y hoy muestran información incompleta o mock.

**La solución:** Un módulo admin en `/admin/team` con tres superficies:
1. **Lista de colaboradores** — tabla filtrable con estado, carga y cuentas
2. **Detalle de colaborador** — ficha completa con tabs (Perfil, Asignaciones, Actividad)
3. **Asignación rápida** — drawer para asignar/desasignar personas a Spaces

**Este módulo NO cambia la experiencia del cliente.** Todo vive bajo `/admin/` y requiere rol admin. La data que se gestiona aquí es la que alimenta las vistas cliente de equipo ya definidas en otros CODEX tasks.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/admin-team`
- **Framework:** Next.js 16.1.1 (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **UI Library:** MUI 7.x
- **React:** 19.2.3
- **TypeScript:** 5.9.3
- **Charts:** ApexCharts (incluido en Vuexy)
- **Deploy:** Vercel (auto-deploy desde `main`, preview desde feature branches)
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`
- **BigQuery dataset:** `greenhouse`

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `AGENTS.md` (en el repo) | Reglas operativas del repo, convenciones de branch, flujo de trabajo |
| `GREENHOUSE_ARCHITECTURE_V1.md` (en el repo) | Arquitectura maestro, modelo multi-tenant, fases |
| `GREENHOUSE_IDENTITY_ACCESS_V1.md` (en el repo) | Schema de `client_users`, roles, scopes, session payload |
| `GREENHOUSE_SERVICE_MODULES_V1.md` (en el repo) | Service modules, `getTenantContext()` |
| `Greenhouse_Nomenclatura_Portal_v3.md` (proyecto Claude) | Nomenclatura, design tokens, GH_COLORS, tipografía |
| `CODEX_TASK_Team_Identity_Capacity_System.md` (proyecto Claude) | Schema de `team_members`, `client_team_assignments`, API routes, vistas |
| `CODEX_TASK_Space_Admin_View_Redesign.md` (proyecto Claude) | Patrones de vista admin: stats, tabs, drawer |
| `Brand_Guideline_Efeonce_v1.docx` (proyecto Claude) | Paleta de colores, tipografía |
| `CODEX_TASKS_ALIGNMENT_UPDATE_v1.md` (proyecto Claude) | Deltas entre CODEX tasks y estado real del repo |

---

## Dependencias previas

### Infraestructura que DEBE existir

- [x] Auth con NextAuth.js funcionando con `client_users`, roles, scopes
- [x] BigQuery dataset `greenhouse` creado
- [x] Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con acceso a BigQuery
- [x] Rutas admin existentes (`/admin`, `/admin/users`, `/admin/tenants`)
- [x] Guard server-side para rutas admin (`src/app/(dashboard)/admin/layout.tsx`)
- [x] Patrones Vuexy de tablas, cards, tabs disponibles en `full-version`

### Infraestructura que PUEDE no existir (verificar)

- [ ] Tabla `greenhouse.team_members` — si no existe, crearla (Parte A de este task)
- [ ] Tabla `greenhouse.client_team_assignments` — si no existe, crearla (Parte A de este task)
- [ ] `GH_COLORS` en `src/config/greenhouse-nomenclature.ts` — si no existe, implementar colores de role

### Infraestructura que NO es prerequisito

- Pipeline `notion-bq-sync` con campo Responsable — útil pero no bloqueante
- Vistas cliente de equipo — este task alimenta esas vistas, no depende de ellas

### Match entre sistemas

El email es el denominador común entre sistemas, pero cada miembro del equipo tiene **dos emails:**

- **`email`** → `@efeoncepro.com` — email público/comercial (ej: `jreyes@efeoncepro.com`)
- **`email_internal`** → `@efeonce.org` — email interno, usado en Entra ID (Azure AD), SSO, cuentas internas (ej: `julio.reyes@efeonce.org`)

El JOIN con Azure AD/Entra se hace por `email_internal`. El JOIN con HubSpot se hace por `hubspot_owner_id`. El JOIN con Notion se hace por `notion_display_name` (texto) o `notion_user_id` (UUID).

---

## PARTE A: Infraestructura BigQuery

### A1. Verificar o crear tabla `greenhouse.team_members`

Verificar si existe:

```bash
bq show efeonce-group:greenhouse.team_members
```

Si no existe, crear según el schema de CODEX_TASK_Team_Identity_Capacity_System.md (Parte A1). Resumen del schema:

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.team_members` (
  member_id STRING NOT NULL,
  display_name STRING NOT NULL,
  email STRING NOT NULL,                        -- Email corporativo público: 'jreyes@efeoncepro.com'
  email_internal STRING,                        -- Email interno (Entra ID / SSO): 'julio.reyes@efeonce.org'
  azure_oid STRING,
  notion_user_id STRING,
  notion_display_name STRING,
  hubspot_owner_id STRING,
  role_title STRING NOT NULL,
  role_category STRING NOT NULL,  -- operations | design | strategy | development | media | account
  avatar_url STRING,
  relevance_note STRING,
  contact_channel STRING DEFAULT 'teams',
  contact_handle STRING,
  expected_monthly_throughput INT64 DEFAULT 20,  -- assets/mes esperados por esta persona
  active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A2. Verificar o crear tabla `greenhouse.client_team_assignments`

```bash
bq show efeonce-group:greenhouse.client_team_assignments
```

Si no existe, crear según CODEX_TASK_Team_Identity_Capacity_System.md (Parte A2):

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.client_team_assignments` (
  assignment_id STRING NOT NULL,
  client_id STRING NOT NULL,
  member_id STRING NOT NULL,
  fte_allocation FLOAT64 NOT NULL DEFAULT 1.0,
  hours_per_month INT64,
  role_title_override STRING,
  relevance_note_override STRING,
  contact_channel_override STRING,
  contact_handle_override STRING,
  active BOOL DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A3. Seed data

Insertar datos del equipo actual si las tablas están vacías:

```sql
INSERT INTO `efeonce-group.greenhouse.team_members`
  (member_id, display_name, email, email_internal, role_title, role_category, hubspot_owner_id, notion_display_name, contact_channel, active)
VALUES
  ('julio-reyes', 'Julio Reyes', 'jreyes@efeoncepro.com', 'julio.reyes@efeonce.org', 'Managing Director & GTM', 'account', '75788512', 'Julio Reyes', 'teams', TRUE),
  ('valentina-hoyos', 'Valentina Hoyos', 'vhoyos@efeoncepro.com', 'valentina.hoyos@efeonce.org', 'Account Manager', 'account', '82653513', 'Valentina Hoyos', 'teams', TRUE),
  ('daniela-ferreira', 'Daniela Ferreira', 'dferreira@efeoncepro.com', 'daniela.ferreira@efeonce.org', 'Creative Operations Lead', 'operations', '76007063', 'Daniela Ferreira', 'teams', TRUE),
  ('humberly-henriquez', 'Humberly Henriquez', 'hhumberly@efeoncepro.com', 'humberly.henriquez@efeonce.org', 'Content Strategist', 'strategy', '84992210', 'Humberly Henriquez', 'teams', TRUE),
  ('melkin-hernandez', 'Melkin Hernandez', 'mhernadez@efeoncepro.com', 'melkin.hernandez@efeonce.org', 'Senior Visual Designer', 'design', NULL, 'Melkin Hernandez', 'teams', TRUE),
  ('andres-carlosama', 'Andres Carlosama', 'acarlosama@efeoncepro.com', 'andres.carlosama@efeonce.org', 'Senior Visual Designer', 'design', '86190996', 'Andres Carlosama', 'teams', TRUE),
  ('luis-reyes', 'Luis Eduardo Reyes', 'lreyes@efeoncepro.com', 'luis.reyes@efeonce.org', 'Technology Lead', 'development', '86856220', 'Luis Eduardo Reyes', 'teams', TRUE);
```

---

## PARTE B: API Routes

Todas las API routes de este módulo viven bajo `/api/admin/team/`. Requieren autenticación y rol `admin`.

### B1. `GET /api/admin/team/members`

Lista de todos los colaboradores con métricas agregadas.

**Response shape:**

```typescript
interface TeamMemberListItem {
  memberId: string
  displayName: string
  email: string
  roleTitle: string
  roleCategory: string
  avatarUrl: string | null
  active: boolean
  // Métricas agregadas
  totalAssignments: number        // Cuántos Spaces tiene asignados (activos)
  totalFte: number                // Suma de FTE en todos sus assignments
  totalHoursPerMonth: number      // Suma de horas/mes
  activeAssetsCount: number       // Tareas activas en notion_ops (si hay match)
}
```

**Query:**

```sql
SELECT
  tm.member_id,
  tm.display_name,
  tm.email,
  tm.role_title,
  tm.role_category,
  tm.avatar_url,
  tm.active,
  COALESCE(agg.total_assignments, 0) AS total_assignments,
  COALESCE(agg.total_fte, 0) AS total_fte,
  COALESCE(agg.total_hours, 0) AS total_hours_per_month
FROM `efeonce-group.greenhouse.team_members` tm
LEFT JOIN (
  SELECT
    member_id,
    COUNT(*) AS total_assignments,
    SUM(fte_allocation) AS total_fte,
    SUM(COALESCE(hours_per_month, CAST(fte_allocation * 160 AS INT64))) AS total_hours
  FROM `efeonce-group.greenhouse.client_team_assignments`
  WHERE active = TRUE
  GROUP BY member_id
) agg ON tm.member_id = agg.member_id
ORDER BY
  CASE tm.role_category
    WHEN 'account' THEN 1
    WHEN 'operations' THEN 2
    WHEN 'strategy' THEN 3
    WHEN 'design' THEN 4
    WHEN 'development' THEN 5
    WHEN 'media' THEN 6
    ELSE 7
  END,
  tm.display_name
```

### B2. `GET /api/admin/team/members/[memberId]`

Detalle completo de un colaborador incluyendo todos sus assignments.

**Response shape:**

```typescript
interface TeamMemberDetail {
  // Datos base
  memberId: string
  displayName: string
  email: string
  roleTitle: string
  roleCategory: string
  avatarUrl: string | null
  contactChannel: string
  contactHandle: string | null
  relevanceNote: string | null
  expectedMonthlyThroughput: number
  active: boolean
  createdAt: string
  updatedAt: string
  // IDs externos
  azureOid: string | null
  notionUserId: string | null
  notionDisplayName: string | null
  hubspotOwnerId: string | null
  // Assignments
  assignments: TeamAssignment[]
  // Métricas operativas (de notion_ops si hay match)
  operationalMetrics: {
    activeAssets: number
    completedThisMonth: number
    avgRpa: number | null
  } | null
}

interface TeamAssignment {
  assignmentId: string
  clientId: string
  clientName: string           // JOIN con clients/tenants
  fteAllocation: number
  hoursPerMonth: number
  roleTitleOverride: string | null
  relevanceNoteOverride: string | null
  active: boolean
  startDate: string | null
  endDate: string | null
}
```

### B3. `POST /api/admin/team/members`

Crear un nuevo miembro del equipo.

**Request body:**

```typescript
interface CreateTeamMember {
  displayName: string           // Requerido
  email: string                 // Requerido, validar formato
  roleTitle: string             // Requerido
  roleCategory: string          // Requerido, validar enum
  avatarUrl?: string
  contactChannel?: string       // Default 'teams'
  contactHandle?: string
  relevanceNote?: string
  expectedMonthlyThroughput?: number  // Default 20
  // IDs externos (opcionales)
  azureOid?: string
  notionUserId?: string
  notionDisplayName?: string
  hubspotOwnerId?: string
}
```

**Lógica:**
- Generar `member_id` como slug del `displayName` (kebab-case, sin acentos)
- Validar que `email` no exista ya en `team_members`
- Validar `roleCategory` contra enum: `account`, `operations`, `strategy`, `design`, `development`, `media`
- INSERT en BigQuery
- Retornar el member creado

### B4. `PATCH /api/admin/team/members/[memberId]`

Actualizar campos de un miembro. Solo los campos enviados se actualizan.

**Campos editables:** todos los de CreateTeamMember + `active` (para desactivar).

**Lógica:**
- Verificar que el member existe
- Construir UPDATE dinámico con solo los campos que vienen en el body
- Setear `updated_at = CURRENT_TIMESTAMP()`
- Retornar el member actualizado

### B5. `GET /api/admin/team/assignments`

Lista de todas las asignaciones activas, agrupable por Space o por persona.

**Query params:** `?groupBy=space|member` (default: `space`)

### B6. `POST /api/admin/team/assignments`

Crear una nueva asignación (persona → Space).

**Request body:**

```typescript
interface CreateAssignment {
  clientId: string              // ID del Space/tenant
  memberId: string              // ID del team member
  fteAllocation: number         // 0.1 a 2.0
  hoursPerMonth?: number        // Se calcula como fte * 160 si no se envía
  roleTitleOverride?: string
  relevanceNoteOverride?: string
  contactChannelOverride?: string
  contactHandleOverride?: string
  startDate?: string            // ISO date
}
```

**Lógica:**
- Validar que `clientId` existe en tenants/clients activos
- Validar que `memberId` existe y está activo
- Validar que no exista ya un assignment activo para esa combinación client+member
- Generar `assignment_id` como `{clientId}_{memberId}`
- Si no viene `hoursPerMonth`, calcular como `CAST(fteAllocation * 160 AS INT64)`
- INSERT en BigQuery
- Retornar la asignación creada

### B7. `PATCH /api/admin/team/assignments/[assignmentId]`

Actualizar una asignación (cambiar FTE, horas, overrides, desactivar).

### B8. `DELETE /api/admin/team/assignments/[assignmentId]`

Soft delete: setear `active = FALSE` y `end_date = CURRENT_DATE()`.

---

## PARTE C: Vistas UI

### C1. `/admin/team` — Lista de colaboradores

**Layout:** Tabla filtrable estilo Vuexy (referencia: `full-version/src/views/apps/user/list/`).

**Estructura de la página:**

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Equipo Efeonce" + subtítulo + botón "+ Agregar"    │
├─────────────────────────────────────────────────────────────┤
│  Stats row: 4 stat cards compactas                           │
│  [Colaboradores activos] [FTE total] [Spaces cubiertos] [Utilización]│
├─────────────────────────────────────────────────────────────┤
│  Filtros inline: [Rol ▾] [Estado ▾] [Búsqueda...]           │
├─────────────────────────────────────────────────────────────┤
│  Tabla de colaboradores                                      │
│  Avatar | Nombre + email | Cargo | Spaces | FTE total | ··· │
└─────────────────────────────────────────────────────────────┘
```

**Columnas de la tabla:**

| Columna | Dato | Formato |
|---------|------|---------|
| Avatar + Nombre | Avatar con iniciales coloreadas por `roleCategory` + nombre + email debajo | Stack vertical |
| Cargo | `roleTitle` | DM Sans 400 13px |
| Rol | Badge con color de `GH_COLORS.role[category]` | Chip compacto |
| Spaces asignados | Número de assignments activos | Número + tooltip con nombres |
| FTE total | Suma de FTE en todos sus assignments | Número con 1 decimal |
| Estado | Active / Inactive | Dot indicator verde/gris |
| Acciones | Ver detalle / Editar / Asignar a Space | Menú ··· |

**Stat cards:**

| Card | Dato | Cálculo |
|------|------|---------|
| Colaboradores activos | Conteo de `team_members` con `active = TRUE` | COUNT(*) |
| FTE total asignado | Suma de FTE de todos los assignments activos | SUM(fte_allocation) |
| Spaces cubiertos | Conteo distinto de `client_id` en assignments activos | COUNT(DISTINCT client_id) |
| Utilización promedio | Promedio de (total_fte / expected capacity) por persona | Calculado |

**Filtros:**
- **Rol:** multi-select por `roleCategory` (Account, Operations, Strategy, Design, Development, Media)
- **Estado:** Active / Inactive / Todos
- **Búsqueda:** sobre `display_name` y `email`

**Acciones en la tabla:**
- Click en fila → navega a `/admin/team/[memberId]`
- Botón "+" arriba → abre drawer de creación
- Menú "···" por fila → "Ver detalle", "Editar", "Asignar a Space"

### C2. `/admin/team/[memberId]` — Detalle de colaborador

**Layout:** Vista de detalle con tabs estilo Vuexy (referencia: `full-version/src/views/apps/user/view/`). Reinterpretar los tabs overview/security/billing como:
- **overview** → Perfil + radiografía de asignaciones
- **security** → IDs externos + integraciones (Azure, Notion, HubSpot)
- **billing** → NO usar este tab — no aplica para colaboradores

**Estructura:**

```
┌─────────────────────────────────────────────────────────────┐
│  Header card: Avatar grande + nombre + cargo + badges        │
│  [role_category badge] [active/inactive] [X Spaces]          │
│  Botones: [Editar] [Asignar a Space] [Desactivar]           │
├──────────────────────┬──────────────────────────────────────┤
│  Left column (1/3)   │  Right column (2/3)                   │
│                      │                                       │
│  Info card:          │  Tab: Asignaciones                    │
│  - Email             │  Tabla de Spaces asignados con FTE,   │
│  - Canal de contacto │  horas, rol override, estado          │
│  - Fecha de alta     │  + Botón "Asignar a nuevo Space"      │
│  - IDs externos      │                                       │
│  - Nota de           │  Tab: Actividad operativa             │
│    relevancia        │  Assets activos, completados,          │
│    (default)         │  RpA, distribución por proyecto        │
│                      │  (requiere match con notion_ops)       │
│  Métricas card:      │                                       │
│  - FTE total         │  Tab: Historial                       │
│  - Horas/mes         │  Timeline de asignaciones              │
│  - Spaces asignados  │  (activas + finalizadas)               │
│  - Throughput        │                                       │
│    esperado          │                                       │
└──────────────────────┴──────────────────────────────────────┘
```

**Tab: Asignaciones (default)**

Tabla con una fila por assignment:

| Columna | Dato |
|---------|------|
| Space | Nombre del Space/tenant (link a `/admin/tenants/[id]`) |
| FTE | `fte_allocation` |
| Horas/mes | `hours_per_month` o calculado |
| Rol override | `role_title_override` o "—" (usa el default) |
| Desde | `start_date` |
| Estado | Active / Ended con fecha |
| Acciones | Editar FTE / Desasignar |

Botón "Asignar a nuevo Space" abre el Drawer de asignación (C3).

**Tab: Actividad operativa**

Si hay match entre `notion_display_name` del member y el campo `responsable_nombre` en `notion_ops.tareas`:

- Assets activos (tareas en curso asignadas a esta persona)
- Completados este mes
- RpA promedio de esta persona
- Distribución por proyecto (bar chart horizontal)

Si no hay match, mostrar empty state: "No hay datos operativos disponibles. Verifica que el nombre en Notion coincida con el nombre registrado: [notion_display_name]."

**Tab: Historial**

Timeline vertical con:
- Asignaciones creadas (fecha + Space + FTE)
- Asignaciones finalizadas (fecha + Space + motivo si existe)
- Cambios de FTE (fecha + Space + FTE anterior → nuevo)

**Fuente:** `client_team_assignments` ordenado por `created_at` DESC, incluyendo assignments con `active = FALSE`.

### C3. Drawer de asignación / creación

**Drawer lateral derecho, 480px de ancho** (mismo patrón que GovernanceDrawer en Space Admin).

**Dos modos:**

**Modo 1: Crear colaborador**
- Campos: Nombre, Email, Cargo, Categoría de rol (select), Canal de contacto, Avatar URL, Nota de relevancia
- IDs externos como sección colapsable "Integraciones" (Azure OID, Notion User ID, Notion Display Name, HubSpot Owner ID)
- Botón "Crear colaborador" en footer del drawer

**Modo 2: Asignar a Space**
- Select de Space (autocomplete sobre tenants activos)
- FTE (slider 0.1 a 2.0 con steps de 0.1)
- Horas/mes (auto-calculado pero editable)
- Override de cargo (opcional)
- Override de nota de relevancia (opcional, con placeholder del default)
- Fecha de inicio (datepicker, default hoy)
- Botón "Asignar" en footer del drawer

---

## PARTE D: Tipos TypeScript

```typescript
// src/types/team-admin.ts

export type RoleCategory = 'account' | 'operations' | 'strategy' | 'design' | 'development' | 'media'

export interface TeamMember {
  memberId: string
  displayName: string
  email: string                   // Email público @efeoncepro.com
  emailInternal: string | null    // Email interno @efeonce.org (Entra ID / SSO)
  roleTitle: string
  roleCategory: RoleCategory
  avatarUrl: string | null
  contactChannel: string
  contactHandle: string | null
  relevanceNote: string | null
  expectedMonthlyThroughput: number
  active: boolean
  azureOid: string | null
  notionUserId: string | null
  notionDisplayName: string | null
  hubspotOwnerId: string | null
  createdAt: string
  updatedAt: string
}

export interface TeamMemberListItem extends Pick<TeamMember,
  'memberId' | 'displayName' | 'email' | 'roleTitle' | 'roleCategory' | 'avatarUrl' | 'active'
> {
  totalAssignments: number
  totalFte: number
  totalHoursPerMonth: number
}

export interface TeamAssignment {
  assignmentId: string
  clientId: string
  clientName: string
  memberId: string
  memberName: string
  fteAllocation: number
  hoursPerMonth: number
  roleTitleOverride: string | null
  relevanceNoteOverride: string | null
  contactChannelOverride: string | null
  contactHandleOverride: string | null
  active: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTeamMemberInput {
  displayName: string
  email: string                    // @efeoncepro.com
  emailInternal?: string           // @efeonce.org
  roleTitle: string
  roleCategory: RoleCategory
  avatarUrl?: string
  contactChannel?: string
  contactHandle?: string
  relevanceNote?: string
  expectedMonthlyThroughput?: number
  azureOid?: string
  notionUserId?: string
  notionDisplayName?: string
  hubspotOwnerId?: string
}

export interface CreateAssignmentInput {
  clientId: string
  memberId: string
  fteAllocation: number
  hoursPerMonth?: number
  roleTitleOverride?: string
  relevanceNoteOverride?: string
  contactChannelOverride?: string
  contactHandleOverride?: string
  startDate?: string
}
```

---

## PARTE E: Convenciones de UI

### Colores por role_category

Usar `GH_COLORS.role` de `Greenhouse_Nomenclatura_Portal_v3.md` (sección 14.3):

| Categoría | Color source | Badge bg | Badge text |
|-----------|-------------|----------|------------|
| account | `#023c70` (Deep Azure) | `#eaeff3` | `#023c70` |
| operations | `#024c8f` (Royal Blue) | `#eaeff5` | `#024c8f` |
| strategy | `#633f93` (Purple) | `#f2eff6` | `#633f93` |
| design | `#bb1954` (Crimson Magenta) | `#f9ecf1` | `#bb1954` |
| development | `#0375db` (Efeonce Blue) | `#eaf3fc` | `#0375db` |
| media | `#ff6500` (Sunset Orange) | `#fff2ea` | `#ff6500` |

### Avatares sin foto

Iniciales del `displayName`, fondo = `GH_COLORS.role[category].bg`, texto = `GH_COLORS.role[category].text`. Border-radius: 50% para avatar circular.

### Tipografía

Seguir reglas de CODEX_TASK_Typography_Hierarchy_Fix.md:
- **Poppins 500-600:** Títulos de página, stat numbers, nombre del colaborador en header
- **DM Sans 400-500:** Todo lo demás (tablas, labels, badges, descripciones, formularios)

### Regla de componentes

Antes de crear un componente nuevo, verificar si debe vivir en `src/components/greenhouse/*` (compartido) o en `src/views/greenhouse/team-admin/*` (específico de este módulo).

Componentes reutilizables que DEBEN vivir en `src/components/greenhouse/*`:
- `RoleCategoryBadge.tsx` — badge de categoría de rol con colores
- `MemberAvatar.tsx` — avatar con iniciales coloreadas por rol (si no existe ya de Team Identity task)

Componentes específicos de admin en `src/views/greenhouse/team-admin/*`:
- `TeamMemberTable.tsx`
- `TeamMemberDetail.tsx`
- `AssignmentDrawer.tsx`
- `CreateMemberDrawer.tsx`
- `MemberAssignmentsTab.tsx`
- `MemberActivityTab.tsx`
- `MemberHistoryTab.tsx`

---

## PARTE F: Estructura de archivos

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── team/
│   │           ├── page.tsx                          # C1: Lista de colaboradores
│   │           └── [memberId]/
│   │               └── page.tsx                      # C2: Detalle de colaborador
│   └── api/
│       └── admin/
│           └── team/
│               ├── members/
│               │   ├── route.ts                      # GET (lista) + POST (crear)
│               │   └── [memberId]/
│               │       └── route.ts                  # GET (detalle) + PATCH (actualizar)
│               └── assignments/
│                   ├── route.ts                      # GET (lista) + POST (crear)
│                   └── [assignmentId]/
│                       └── route.ts                  # PATCH (actualizar) + DELETE (soft delete)
├── components/
│   └── greenhouse/
│       ├── RoleCategoryBadge.tsx                     # Badge reutilizable
│       └── MemberAvatar.tsx                          # Avatar reutilizable
├── views/
│   └── greenhouse/
│       └── team-admin/
│           ├── TeamMemberTable.tsx                   # Tabla de la lista
│           ├── TeamMemberDetail.tsx                  # Composición del detalle
│           ├── TeamMemberStats.tsx                   # Stats row
│           ├── AssignmentDrawer.tsx                  # Drawer de asignación
│           ├── CreateMemberDrawer.tsx                # Drawer de creación
│           ├── MemberAssignmentsTab.tsx              # Tab de asignaciones
│           ├── MemberActivityTab.tsx                 # Tab de actividad
│           └── MemberHistoryTab.tsx                  # Tab de historial
├── lib/
│   └── team-admin/
│       ├── get-team-members.ts                      # Query builder para lista
│       ├── get-team-member-detail.ts                # Query builder para detalle
│       ├── get-team-assignments.ts                  # Query builder para assignments
│       └── mutate-team.ts                           # INSERT/UPDATE helpers
└── types/
    └── team-admin.ts                                # Interfaces TypeScript
```

---

## PARTE G: Navegación

### Sidebar

Agregar "Equipo" como ítem dentro de la sección Admin del sidebar.

En `src/data/navigation/`:

```typescript
// Dentro del grupo Admin (ya existente)
{
  title: 'Equipo',
  icon: 'tabler-users-group',  // o el ícono Tabler que corresponda
  path: '/admin/team',
  // Solo visible si role incluye admin
}
```

**Posición en el sidebar:** Después de "Tenants" y antes de "Roles" (o después de "Users" — verificar orden actual).

### Breadcrumbs

- `/admin/team` → Admin > Equipo
- `/admin/team/[memberId]` → Admin > Equipo > [displayName]

---

## PARTE H: Orden de ejecución

### Fase 1: Infraestructura (sin dependencia de UI)

1. Verificar/crear tablas BigQuery (A1, A2)
2. Insertar seed data (A3)
3. Crear types TypeScript (D)
4. Crear query builders en `src/lib/team-admin/`
5. Implementar `GET /api/admin/team/members` (B1)
6. Implementar `GET /api/admin/team/members/[memberId]` (B2)
7. Implementar `POST /api/admin/team/members` (B3)
8. Implementar `PATCH /api/admin/team/members/[memberId]` (B4)
9. Implementar endpoints de assignments (B5, B6, B7, B8)

### Fase 2: Componentes base

10. Crear `RoleCategoryBadge.tsx` (reutilizable)
11. Crear `MemberAvatar.tsx` (reutilizable)
12. Crear `TeamMemberStats.tsx`
13. Crear `TeamMemberTable.tsx`

### Fase 3: Vistas

14. Crear página `/admin/team/page.tsx` con lista (C1)
15. Crear `CreateMemberDrawer.tsx`
16. Crear `AssignmentDrawer.tsx` (C3)
17. Crear `MemberAssignmentsTab.tsx`
18. Crear `MemberActivityTab.tsx`
19. Crear `MemberHistoryTab.tsx`
20. Crear página `/admin/team/[memberId]/page.tsx` con detalle (C2)

### Fase 4: Integración

21. Agregar "Equipo" al sidebar admin
22. Verificar guard de auth admin en la nueva ruta
23. Verificar responsive en 1440px, 1024px, 768px
24. Verificar que las mutaciones (crear, editar, asignar) persisten en BigQuery
25. Verificar que los datos aparecen en las vistas cliente de equipo (si están implementadas)

---

## Criterios de aceptación

### Infraestructura

- [ ] Tabla `greenhouse.team_members` existe con el schema especificado
- [ ] Tabla `greenhouse.client_team_assignments` existe con el schema especificado
- [ ] Seed data insertado con mínimo 5 personas del equipo actual
- [ ] Todos los API routes retornan datos correctos y validan auth

### Lista de colaboradores (`/admin/team`)

- [ ] Stats row con 4 cards: colaboradores activos, FTE total, Spaces cubiertos, utilización
- [ ] Tabla filtrable con avatar coloreado por rol, nombre, cargo, spaces, FTE, estado
- [ ] Filtros por rol (multi-select), estado, búsqueda por nombre/email
- [ ] Click en fila navega a detalle
- [ ] Botón "+" abre drawer de creación
- [ ] Crear colaborador desde drawer funciona y persiste en BigQuery

### Detalle de colaborador (`/admin/team/[memberId]`)

- [ ] Header con avatar grande, nombre, cargo, badges de rol y estado
- [ ] Info card izquierda con email, canal de contacto, IDs externos, métricas
- [ ] Tab Asignaciones con tabla de Spaces y botón "Asignar a nuevo Space"
- [ ] Asignar a Space desde drawer funciona y persiste en BigQuery
- [ ] Editar FTE de una asignación funciona
- [ ] Desasignar (soft delete) funciona
- [ ] Tab Actividad muestra métricas operativas si hay match con Notion (o empty state si no)
- [ ] Tab Historial muestra timeline de asignaciones

### UI y diseño

- [ ] Colores de avatar/badge por `roleCategory` usando `GH_COLORS.role`
- [ ] Cero hex hardcodeados en componentes
- [ ] Poppins solo para títulos y stat numbers, DM Sans para todo lo demás
- [ ] Responsive funcional en 1440px, 1024px, 768px
- [ ] Skeleton loaders en cada sección al cargar
- [ ] Error boundaries por componente

### Seguridad

- [ ] Todas las API routes validan que el usuario tiene rol admin
- [ ] Un usuario con rol `client` recibe 403 al intentar acceder a `/admin/team`
- [ ] Las mutaciones (POST, PATCH, DELETE) registran en `audit_events` si la tabla existe

---

## Lo que NO incluye esta tarea

- Sync automático de Azure AD → team_members (foto, cargo) — manual por ahora
- Sync automático de HubSpot owners → team_members — manual por ahora
- Upload de foto de avatar — se usa URL externa o iniciales
- Vistas CLIENTE de equipo (Dossier, Capacity en Pulse) — esas son tareas separadas que CONSUMEN esta data
- Vista de capacidad global de agencia (eso es Agency Operator Layer)
- Time tracking real — la actividad operativa usa conteo de assets como proxy
- Notificaciones cuando se asigna/desasigna un miembro — tarea futura

---

## Notas para el agente

- **Lee `AGENTS.md` del repo antes de empezar.** Tiene reglas operativas específicas del repo.
- **Lee `GREENHOUSE_IDENTITY_ACCESS_V1.md`** para entender el modelo de auth actual (`client_users`, roles, scopes).
- **Usa los patrones existentes de `/admin/users` y `/admin/tenants`** como referencia directa. No inventes patrones nuevos — extiende los que ya existen.
- **BigQuery mutations son lentas.** Las operaciones INSERT/UPDATE en BigQuery no son instantáneas como en Postgres. Implementar optimistic updates en la UI cuando sea posible.
- **`full-version` de Vuexy es tu referencia visual.** `src/views/apps/user/list/*` para la tabla, `src/views/apps/user/view/*` para el detalle con tabs.
- **Verifica qué componentes de `src/components/greenhouse/*` ya existen** antes de crear nuevos. Puede haber avatares, badges o cards que ya resuelven lo que necesitas.
- **Branch naming:** `feature/admin-team`.
- **Cada push a `develop` genera preview en Vercel.** Usa ese preview para QA visual.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo. Referencia normativa para implementación.*
