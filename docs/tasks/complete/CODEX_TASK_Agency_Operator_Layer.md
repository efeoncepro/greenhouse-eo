# CODEX TASK — Agency Operator Layer: Vista de Agencia para Greenhouse

## Resumen

Implementar la **capa de operador de agencia** en el portal Greenhouse. Hoy el portal tiene dos roles (`client` y `admin`), pero le falta un nivel intermedio: la vista donde el equipo Efeonce navega entre todos los Spaces de clientes, ve métricas agregadas, y accede a la data de Efeonce-como-cliente-interno sin privilegios de administración destructiva.

**El problema:** Efeonce es cliente de sí mismo. Su marca interna pasa por el mismo Creative Supply Chain, consume capacidad del equipo y genera métricas ICO como cualquier otro cliente. Pero el equipo que opera la agencia necesita *además* una vista panorámica que ningún cliente externo debería ver: KPIs agregados de todos los Spaces, capacidad global del equipo, y la habilidad de saltar entre Spaces sin cerrar sesión.

**La solución:** Un tercer nivel de acceso (`operator`) con una sección de sidebar exclusiva ("Agencia") que contiene Pulse Global, lista de Spaces, y Capacidad agregada. Efeonce se mantiene como un Space normal dentro del pool de clientes — no se saca, no se trata diferente. Lo que cambia es que los usuarios con rol `operator` o `admin` pueden ver todos los Spaces y tienen una landing page propia.

**Esta tarea NO cambia la experiencia del cliente.** La vista de cliente (`role: 'client'`) queda idéntica. Todo el trabajo es aditivo: nuevos componentes, nuevas rutas, extensión del modelo de auth.

---

## Alineación obligatoria con Greenhouse 360 Object Model

Esta task debe ejecutarse alineada con:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

1. **Agency no crea un nuevo objeto “Space” paralelo al Cliente**
   - en runtime, `Space` es la expresión de producto del objeto `Client`
   - la identidad canónica sigue siendo `greenhouse.clients.client_id`

2. **La vista Agency debe leer el mismo graph de objetos compartidos**
   - clientes desde `greenhouse.clients`
   - capacidades desde `client_service_modules`
   - colaboradores desde `team_members` y assignments
   - proyectos y sprints desde sus contratos canónicos o read models compartidos

3. **Agency es una capa de lectura transversal**
   - no debe crear tablas maestras propias de clientes, proyectos o capacidad solo para “operación de agencia”
   - si necesita agregados, debe apoyarse en read models o marts

4. **Los overrides de contexto no deben romper identidad**
   - cambiar de `Space` o contexto no cambia el objeto subyacente
   - solo cambia qué `Client` canónico está activo en la lectura

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/agency-operator-layer`
- **Framework:** Next.js 14+ (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **UI Library:** MUI (Material UI) v5
- **Charts:** ApexCharts (incluido en Vuexy)
- **Deploy:** Vercel (auto-deploy desde `main`, preview desde feature branches)
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`
- **BigQuery datasets:** `notion_ops`, `hubspot_crm`, `greenhouse`

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `Greenhouse_Portal_Spec_v1.md` | Arquitectura base, schema de auth, API routes |
| `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` | Nomenclatura UI, design tokens, GH_COLORS, tipografía |
| `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md` | Modelo de capas, sidebar dinámico, Capability Registry |
| `docs/tasks/to-do/CODEX_TASK_Typography_Hierarchy_Fix.md` | Reglas de Poppins vs DM Sans (normativo) |
| `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Redesign.md` | Patrones de KPI cards, empty states, ghost slots, charts |
| `docs/tasks/complete/CODEX_TASK_Space_Admin_View_Redesign.md` | Patrones de stat cards, tabs, headers compactos |
| `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` | Schema de team_members, capacity, role_category colors |
| `Brand_Guideline_Efeonce_v1.docx` | Paleta de colores, reglas de marca |

---

## Dependencias previas

Esta tarea asume que lo siguiente ya está implementado o en progreso:

- [ ] Auth con NextAuth.js funcionando (CODEX_TASK_Microsoft_SSO o Google_SSO)
- [ ] Dataset `greenhouse` creado en BigQuery
- [ ] Tabla `greenhouse.clients` creada con schema de spec v1
- [ ] Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con acceso a BigQuery
- [ ] Pipeline `notion-bigquery` operativo sincronizando `notion_ops.tareas`, `notion_ops.proyectos`, `notion_ops.sprints`
- [ ] Sidebar dinámico implementado (de Capabilities Architecture, fase C0)
- [ ] Efeonce registrado como Space en `greenhouse.clients` con `client_id: 'efeonce'`

---

## Modelo de acceso: de 2 a 3 niveles

### Estado actual

```
role: 'client' | 'admin'
```

- `client`: ve un solo Space (el suyo), métricas propias, capabilities contratadas.
- `admin`: ve todo + puede editar governance, crear Spaces, gestionar usuarios.

### Estado objetivo

```
role: 'client' | 'operator' | 'admin'
```

| Rol | Quién | Qué ve | Qué puede hacer |
|-----|-------|--------|-----------------|
| `client` | Contacto externo (CMO de Acme Corp) | Su Space, sus métricas, sus capabilities | Lectura de su data. Nada más. |
| `operator` | Equipo Efeonce (Valentina, Daniela, Andrés...) | Todos los Spaces + vista agregada de agencia | Lectura global. Navegar entre Spaces. Ver Pulse Global y Capacidad. NO puede editar governance, crear Spaces ni gestionar usuarios. |
| `admin` | Julio, operadores senior | Todo lo de operator + panel admin completo | Crear/editar Spaces, governance, usuarios, feature flags. |

### Regla de contexto

Un usuario `operator` o `admin` opera en **dos contextos** que el portal debe distinguir visualmente:

1. **Contexto Agencia:** Vista panorámica. No está dentro de ningún Space específico. Ve métricas agregadas de todos los clientes.
2. **Contexto Space:** Está dentro de un Space específico (puede ser Efeonce o cualquier cliente). Ve exactamente lo que un `client` vería, más badges/controles adicionales según su rol.

El cambio de contexto ocurre cuando el operador selecciona un Space de la lista. El breadcrumb y el sidebar reflejan en qué contexto está.

---

## Extensión del schema de auth

### Cambio en `greenhouse.clients`

Agregar campo `can_view_all_spaces`:

| Campo | Tipo | Descripción | Default |
|-------|------|-------------|---------|
| role | STRING | `'client'` \| `'operator'` \| `'admin'` | `'client'` |
| can_view_all_spaces | BOOLEAN | Si el usuario puede navegar a cualquier Space | `false` |

**Regla:** `client` → `can_view_all_spaces = false` siempre. `operator` → `can_view_all_spaces = true`. `admin` → `can_view_all_spaces = true`.

El campo `can_view_all_spaces` existe como safety net explícito — no se infiere del role para evitar escalaciones accidentales. Si en el futuro un operador necesita ver solo un subset de Spaces, este campo se puede cambiar a un array.

### Cambio en el JWT (NextAuth session)

El token JWT debe incluir:

```typescript
interface GreenhouseSession {
  user: {
    clientId: string              // ID del Space asociado (o 'efeonce' para internos)
    clientName: string
    email: string
    role: 'client' | 'operator' | 'admin'
    canViewAllSpaces: boolean
    projectIds: string[]          // Notion project IDs (del Space primario)
    hubspotCompanyId: string
  }
}
```

Para operadores y admins, `projectIds` contiene los IDs de su Space primario (Efeonce). Cuando navegan a otro Space, la API recibe el `spaceId` del contexto actual como query parameter — NO se cambia la sesión.

---

## Arquitectura de navegación

### Sidebar: 4 secciones jerárquicas

El sidebar se estructura en secciones que aparecen/desaparecen según el rol y el contexto:

```
┌─────────────────────────────────┐
│  AGENCIA                        │  ← Solo visible si role = operator | admin
│  ├ Pulse Global                 │    KPIs agregados de todos los Spaces
│  ├ Spaces                       │    Lista navegable de clientes
│  └ Capacidad                    │    Team capacity global
├─────────────────────────────────┤
│  OPERACIÓN                      │  ← Visible para todos, contextual al Space activo
│  ├ Pulse                        │    KPIs del Space seleccionado
│  ├ Proyectos                    │    Proyectos del Space
│  └ Ciclos                       │    Sprints del Space
├─────────────────────────────────┤
│  SERVICIOS                      │  ← Capabilities del Space (dinámico)
│  ├ Creative Hub                 │    (si aplica)
│  └ ...                          │    (otros módulos según contratación)
├─────────────────────────────────┤
│  CUENTA                         │  ← Siempre visible
│  ├ Mi Greenhouse                │    Settings / perfil
│  └ Admin                        │    Solo si role = admin
└─────────────────────────────────┘
```

### Comportamiento del sidebar según contexto

**Contexto Agencia (landing, sin Space seleccionado):**
- Sección "Agencia" visible y activa.
- Secciones "Operación" y "Servicios" colapsadas/grayed con label: "Selecciona un Space para ver su operación."
- Sección "Cuenta" visible.

**Contexto Space (dentro de un Space específico):**
- Sección "Agencia" visible pero con indicador de "contexto activo" que muestra el nombre del Space actual.
- Secciones "Operación" y "Servicios" activas, con data del Space seleccionado.
- Sección "Cuenta" visible.

**Rol client (siempre en contexto de su Space):**
- Sección "Agencia" NO visible.
- Secciones "Operación" y "Servicios" activas con su data.
- Sección "Cuenta" visible sin opción "Admin".

---

## Rutas nuevas

| Ruta | Vista | Rol mínimo | Prioridad |
|------|-------|------------|-----------|
| `/agency` | Pulse Global — KPIs agregados de todos los Spaces | operator | P0 |
| `/agency/spaces` | Lista de Spaces navegable | operator | P0 |
| `/agency/spaces/[spaceId]` | Redirect → `/dashboard` con contexto del Space | operator | P0 |
| `/agency/capacity` | Capacidad global del equipo | operator | P1 |

Las rutas existentes (`/dashboard`, `/proyectos`, `/sprints`, etc.) siguen funcionando igual. La diferencia es que cuando un operador navega desde `/agency/spaces/[spaceId]`, el portal establece una cookie o state de contexto (`activeSpaceId`) que las API routes existentes usan como override del `clientId` de sesión.

### Patrón de contexto de Space

```typescript
// /src/lib/space-context.ts

export function getActiveSpaceId(session: GreenhouseSession, searchParams: URLSearchParams): string {
  // 1. Si hay un spaceId explícito en query params, usarlo (operador navegando)
  const overrideSpaceId = searchParams.get('space')
  if (overrideSpaceId && session.user.canViewAllSpaces) {
    return overrideSpaceId
  }
  
  // 2. Si no, usar el clientId de la sesión (comportamiento normal de client)
  return session.user.clientId
}
```

Las API routes existentes (`/api/dashboard/kpis`, `/api/projects`, etc.) se extienden para leer `?space=xxx` como override cuando el usuario tiene `canViewAllSpaces = true`. El filtro de BigQuery funciona igual — solo cambia de dónde viene el `client_id`:

```typescript
// En cada API route
const spaceId = getActiveSpaceId(session, request.nextUrl.searchParams)
const [rows] = await bq.query({
  query: `SELECT ... WHERE proyecto IN UNNEST(@ids)`,
  params: { ids: getProjectIdsForSpace(spaceId) }
})
```

---

## VISTA 1: Pulse Global (`/agency`)

Landing page para operadores. Métricas ICO agregadas de **todos los Spaces activos.**

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ZONA 1: Header                                              │
│  Título: "Pulse Global"                                      │
│  Subtítulo: "La operación completa de Efeonce, en un vistazo"│
│  Metadata: "X Spaces activos · Y proyectos · Última sync:..." │
├─────────────────────────────────────────────────────────────┤
│  ZONA 2: KPI cards (fila de 4)                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ RpA      │ │ Assets   │ │ OTD%     │ │ Feedback │       │
│  │ Global   │ │ Activos  │ │ Global   │ │ Pendiente│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│  ZONA 3: Charts (2x2)                                        │
│  ┌────────────────────┐ ┌────────────────────┐              │
│  │ RpA por Space      │ │ Volume por Space   │              │
│  │ (bar horizontal)   │ │ (stacked bar)      │              │
│  └────────────────────┘ └────────────────────┘              │
│  ┌────────────────────┐ ┌────────────────────┐              │
│  │ Status global      │ │ Activity timeline  │              │
│  │ (donut)            │ │ (line, 3 meses)    │              │
│  └────────────────────┘ └────────────────────┘              │
├─────────────────────────────────────────────────────────────┤
│  ZONA 4: Health table                                        │
│  Tabla de Spaces con semáforo rápido                         │
│  [Space] [RpA] [OTD%] [Activos] [Semáforo] [→]             │
└─────────────────────────────────────────────────────────────┘
```

### Zona 1: Header

Card compacta con identidad de la vista.

```tsx
<Card sx={{ p: 2.5, mb: 3 }}>
  <Typography variant="h5" sx={{ fontFamily: 'Poppins', fontWeight: 700 }}>
    Pulse Global
  </Typography>
  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'DM Sans', mt: 0.5 }}>
    La operación completa de Efeonce, en un vistazo
  </Typography>
  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans', mt: 0.5 }}>
    {activeSpaces} Spaces activos · {totalProjects} proyectos · Última sync: {lastSync}
  </Typography>
</Card>
```

**Reglas de diseño:**
- Título: Poppins Bold (700), 24px. Color: `GH_COLORS.neutral.textPrimary` (#022a4e).
- Subtítulo: DM Sans Regular (400), 14px. Color: `GH_COLORS.neutral.textSecondary` (#848484).
- Metadata: DM Sans Regular (400), 12px. Color: `GH_COLORS.neutral.textSecondary`.
- Padding: 20px (2.5 en MUI spacing). Margen inferior: 24px.
- Sin borde, sin sombra agresiva — el card usa la elevación default de Vuexy (elevation 0 + border sutil `GH_COLORS.neutral.border`).

### Zona 2: KPI Cards

Fila de 4 stat cards. **Mismo patrón que el dashboard de cliente** (`docs/tasks/complete/CODEX_TASK_Client_Dashboard_Redesign.md`), pero con data agregada de todos los Spaces.

| Card | Métrica | Query (agregada) | Semáforo |
|------|---------|-------------------|----------|
| 1 | **RpA Global** | `AVG(rpa)` de todas las tareas de todos los Spaces activos | ≤1.5 Óptimo, ≤2.5 Atención, >2.5 Alerta |
| 2 | **Assets activos** | `COUNT(*)` tareas con estado NOT IN ('Listo', 'Cancelado'), todos los Spaces | N/A — solo número + trend |
| 3 | **OTD% Global** | Promedio ponderado de OTD% por Space (o global si hay campo) | ≥90% Óptimo, ≥70% Atención, <70% Alerta |
| 4 | **Feedback pendiente** | `SUM(open_frame_comments)` de todos los Spaces | Badge si > 0 |

**Patrón Vuexy:** Usar stat cards de `full-version/src/views/pages/widget-examples/statistics/`. Número hero Poppins 700 28px. Título DM Sans 500 14px. Trend DM Sans 600 13px. Descriptor DM Sans 400 13px.

**Regla de colores de semáforo:**
- Óptimo: `GH_COLORS.semaphore.green` (#6ec207)
- Atención: `GH_COLORS.semaphore.yellow` (#ff6500)
- Alerta: `GH_COLORS.semaphore.red` (#bb1954)
- Siempre incluir ícono + label textual, no solo color (accesibilidad WCAG).

### Zona 3: Charts

**Chart 1 — RpA por Space (bar chart horizontal):**
- Eje Y: nombre del Space (client_name).
- Eje X: RpA promedio.
- Línea de referencia vertical en 2.0 (máximo ICO). Dashed, color `GH_COLORS.semaphore.yellow`.
- Barras coloreadas según semáforo: verde si ≤1.5, naranja si ≤2.5, rojo si >2.5.
- Orden: de mayor RpA a menor (peor rendimiento arriba = atención primero).
- Click en barra navega al Space correspondiente.

**Chart 2 — Volumen por Space (stacked bar chart):**
- Eje X: últimas 8 semanas.
- Eje Y: tareas completadas.
- Stack por Space (cada Space un color distinto, tomados de `GH_COLORS.service` cíclicamente si hay más Spaces que colores).
- Tooltip: nombre del Space + conteo.

**Chart 3 — Status global (donut):**
- Mismo donut que el dashboard de cliente pero con data de todos los Spaces.
- Segmentos: En curso, Listo para revisión, Cambios Solicitados, Listo.
- Colores consistentes con los del dashboard de cliente.

**Chart 4 — Activity timeline (line chart):**
- Tareas completadas por semana, últimos 3 meses.
- Línea agregada (todas los Spaces) + tooltip con breakdown por Space.

**Usar ApexCharts.** Ver patrones en `full-version/src/views/dashboards/`.

**Empty states de charts:** Si no hay data suficiente, NO mostrar ejes vacíos. Mostrar card con ícono centrado + texto: "Se necesitan al menos 2 semanas de actividad para generar esta gráfica." Fondo: `GH_COLORS.neutral.bgSurface` (#f7f7f5). Texto: DM Sans 400, 14px, `GH_COLORS.neutral.textSecondary`.

### Zona 4: Health table (Space health overview)

Tabla compacta con un resumen de salud de cada Space activo. Es el punto de entrada para navegar a un Space específico.

| Columna | Tipo | Nota |
|---------|------|------|
| Space | Texto + avatar (inicial + color) | Click navega al Space |
| Línea de servicio | Badge de color (`GH_COLORS.service`) | Globe, Efeonce Digital, etc. |
| RpA | Número + semáforo | Con dot indicator de color |
| OTD% | Porcentaje + semáforo | Con dot indicator |
| Assets activos | Número | — |
| Feedback pendiente | Número + badge naranja si > 0 | — |
| Acción | Ícono "→" | Navega a `/agency/spaces/[spaceId]` |

**Reglas de diseño de la tabla:**
- Sin paginación si hay ≤20 Spaces. Scroll si hay más.
- Header: Poppins Medium (500), 12px, uppercase, tracking +1px, color `GH_COLORS.neutral.textSecondary`.
- Celdas: DM Sans Regular (400), 14px. Nombres en DM Sans SemiBold (600).
- Row hover: `background: GH_COLORS.neutral.bgSurface` (#f7f7f5).
- Alternating row colors: NO. Fondo blanco uniforme con dividers horizontales sutiles (`GH_COLORS.neutral.border`).
- Avatar de Space: cuadrado 32x32px, border-radius 8px, fondo del color de la línea de servicio (`GH_COLORS.service[linea].bg`), inicial en color (`GH_COLORS.service[linea].text`), font: Poppins 500 13px.

**Columna "Space" — indicador de Efeonce:**
Cuando el Space es Efeonce (`client_id: 'efeonce'`), agregar un chip discreto "Interno" al lado del nombre. Chip: fondo `GH_COLORS.neutral.bgSurface`, texto `GH_COLORS.neutral.textSecondary`, DM Sans 500 10px. Este es el único lugar donde se marca que Efeonce es diferente — en todo lo demás se trata como cualquier otro Space.

---

## VISTA 2: Spaces (`/agency/spaces`)

Lista completa de Spaces con capacidad de filtro y búsqueda. Versión expandida de la Health table.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Spaces" + subtítulo + campo de búsqueda           │
├─────────────────────────────────────────────────────────────┤
│  Filtros inline: [Línea de servicio ▾] [Status ▾]           │
├─────────────────────────────────────────────────────────────┤
│  Grid de Space cards                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Acme Corp   │ │ DDSoft      │ │ Efeonce     │          │
│  │ Globe       │ │ Wave        │ │ Globe       │          │
│  │ RpA: 1.2 ● │ │ RpA: 0.8 ● │ │ RpA: 1.5 ● │          │
│  │ 12 assets   │ │ 5 assets    │ │ 8 assets    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Space card

Cada Space se representa como un card compacto. Grid de 3 columnas en desktop, 2 en tablet, 1 en mobile.

```
┌───────────────────────────────────────┐
│ ┌──┐  Acme Corporation          [→]  │
│ │AC│  Globe · Agencia Creativa        │
│ └──┘                                  │
│─────────────────────────────────────│
│  RpA         OTD%       Assets        │
│  1.2 ●       92% ●      12           │
│  Óptimo      Óptimo     activos      │
│                                       │
│  Feedback pendiente: 3 ⚠             │
└───────────────────────────────────────┘
```

**Anatomía del card:**

| Zona | Contenido | Tipografía |
|------|-----------|------------|
| Header izq | Avatar (36x36, cuadrado, border-radius 10px, color de línea de servicio) | — |
| Header centro | Nombre del Space | Poppins 500 15px, color `textPrimary` |
| Header centro sub | Línea de servicio + servicios (chips) | DM Sans 400 12px, color `textSecondary` |
| Header der | Botón ícono "→" (navegar) | — |
| Separator | Divider sutil | Color `GH_COLORS.neutral.border`, 1px |
| Métricas | 3 columnas: RpA + OTD% + Assets | Número: Poppins 500 18px. Label: DM Sans 400 11px |
| Semáforo | Dot indicator (6px circle) al lado del número | Color de semáforo |
| Alerta | "Feedback pendiente: N" (solo si > 0) | DM Sans 500 12px, color `GH_COLORS.semaphore.yellow` |

**Interacción:**
- Click en cualquier parte del card (excepto el botón "→") navega al Space.
- Hover: elevación sutil (de 0 a 2 en MUI), border-color transition a `GH_COLORS.neutral.textSecondary` al 20% opacity.
- Cursor: pointer.

**Filtros:**
- **Línea de servicio:** Dropdown con opciones: Todas, Globe, Efeonce Digital, Reach, Wave, CRM Solutions. Usa badges de color (`GH_COLORS.service`) dentro del dropdown.
- **Status:** Dropdown: Activos, Inactivos, Todos.
- **Búsqueda:** Campo de texto con ícono de lupa. Filtra por nombre o client_id. Debounce de 300ms.

**Empty state:** "No hay Spaces que coincidan con tu búsqueda." DM Sans 400, 14px, centrado, con ícono de búsqueda en gris.

---

## VISTA 3: Capacidad global (`/agency/capacity`) — P1

Vista de capacidad agregada del equipo Efeonce distribuida por Space. Reutiliza y extiende los componentes del CODEX_TASK_Team_Identity_Capacity_System.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Capacidad" + "Carga operativa global del equipo"   │
├─────────────────────────────────────────────────────────────┤
│  KPI cards (3)                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ FTE Total    │ │ Utilización  │ │ Horas mes    │        │
│  │ 8.5          │ │ 72%     ●    │ │ 918 / 1360h  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  Distribución de FTE por Space (stacked bar horizontal)      │
├─────────────────────────────────────────────────────────────┤
│  Tabla: persona × Space (heatmap)                            │
│  [Persona] [Space 1] [Space 2] [Space 3] [Total] [Util%]   │
└─────────────────────────────────────────────────────────────┘
```

**Nota:** Esta vista depende de que `greenhouse.client_team_assignments` esté poblada (CODEX_TASK_Team_Identity_Capacity_System). Si no hay data, mostrar empty state: "Los datos de capacidad se están configurando. Estarán disponibles cuando el sistema de equipo esté activo."

---

## API Routes nuevas

| Endpoint | Método | Retorna | Rol mínimo |
|----------|--------|---------|------------|
| `/api/agency/pulse` | GET | KPIs agregados de todos los Spaces activos | operator |
| `/api/agency/pulse/charts` | GET | Data para charts de Pulse Global | operator |
| `/api/agency/spaces` | GET | Lista de Spaces con métricas de salud | operator |
| `/api/agency/capacity` | GET | FTE, utilización, distribución por Space | operator |

### Patrón de auth para rutas de agencia

```typescript
// /src/lib/require-operator.ts

import { getServerSession } from 'next-auth'

export async function requireOperator() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!['operator', 'admin'].includes(session.user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}
```

### Queries para Pulse Global

```sql
-- KPIs agregados
SELECT
  AVG(SAFE_CAST(rpa AS FLOAT64)) AS rpa_global,
  COUNT(CASE WHEN estado NOT IN ('Listo', 'Cancelado') THEN 1 END) AS assets_activos,
  SUM(CASE WHEN open_frame_comments > 0 THEN open_frame_comments ELSE 0 END) AS feedback_pendiente,
  COUNT(CASE WHEN estado = 'Listo' THEN 1 END) AS deliveries
FROM `efeonce-group.notion_ops.tareas` t
WHERE t.proyecto IN (
  SELECT UNNEST(SPLIT(notion_project_ids, ','))
  FROM `efeonce-group.greenhouse.clients`
  WHERE active = true
)

-- Health por Space (para la tabla)
SELECT
  c.client_id,
  c.client_name,
  h.linea_de_servicio,
  AVG(SAFE_CAST(t.rpa AS FLOAT64)) AS rpa_avg,
  COUNT(CASE WHEN t.estado NOT IN ('Listo', 'Cancelado') THEN 1 END) AS assets_activos,
  SUM(CASE WHEN t.open_frame_comments > 0 THEN t.open_frame_comments ELSE 0 END) AS feedback_pendiente
FROM `efeonce-group.greenhouse.clients` c
JOIN `efeonce-group.hubspot_crm.companies` h
  ON c.hubspot_company_id = CAST(h.hs_object_id AS STRING)
LEFT JOIN `efeonce-group.notion_ops.tareas` t
  ON t.proyecto IN UNNEST(SPLIT(c.notion_project_ids, ','))
WHERE c.active = true
GROUP BY c.client_id, c.client_name, h.linea_de_servicio
```

---

## Navegación entre contextos

### Breadcrumb de contexto

Cuando un operador está dentro de un Space, el breadcrumb muestra el contexto completo:

```
Agencia > Spaces > Acme Corporation > Pulse
Agencia > Spaces > Acme Corporation > Proyectos > [Nombre del proyecto]
Agencia > Spaces > Efeonce > Creative Hub
```

Cuando un operador está en vista de agencia:

```
Agencia > Pulse Global
Agencia > Spaces
Agencia > Capacidad
```

Cuando un cliente está en su Space:

```
Pulse > Proyectos > [Nombre del proyecto]
```

(Sin prefijo de Agencia — el cliente no sabe que existe.)

### Indicador de Space activo en sidebar

Cuando el operador está dentro de un Space, el sidebar muestra un "context chip" debajo de la sección "Agencia":

```
┌─ AGENCIA ──────────────────────┐
│  Pulse Global                   │
│  Spaces                         │
│  Capacidad                      │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 📋 Acme Corporation  ✕  │   │  ← Context chip
│  └─────────────────────────┘   │
├─ OPERACIÓN ────────────────────┤
│  Pulse                          │
│  Proyectos                      │
│  Ciclos                         │
└─────────────────────────────────┘
```

**El context chip:**
- Fondo: `GH_COLORS.neutral.bgSurface` (#f7f7f5).
- Borde: `GH_COLORS.neutral.border` (#dbdbdb).
- Texto: DM Sans 500, 12px, `GH_COLORS.neutral.textPrimary`.
- Avatar pequeño (20x20, border-radius 6px) con color de línea de servicio.
- Botón "✕" que vuelve a `/agency/spaces` (sale del contexto de Space).
- Border-radius: 8px. Padding: 6px 10px. Margin: 8px 12px.

---

## Efeonce como Space

Efeonce se registra como un Space normal con la siguiente config:

```json
{
  "client_id": "efeonce",
  "client_name": "Efeonce Group",
  "email": "admin@efeonce.org",
  "active": true,
  "role": "client",
  "hubspot_company_id": "[ID real de la Company Efeonce en HubSpot]",
  "notion_project_ids": "[IDs de los proyectos internos de la marca Efeonce]",
  "can_view_all_spaces": false
}
```

**Nota:** El registro del Space es `role: 'client'` porque es el perfil del Space, no del usuario. Los *usuarios* del equipo Efeonce tienen sus propios registros con `role: 'operator'` o `role: 'admin'`.

**Diferenciación visual mínima:**
- En la lista de Spaces, Efeonce muestra un chip "Interno" al lado del nombre (ya definido en Vista 1).
- En la breadcrumb, cuando el operador está dentro del Space Efeonce, se lee normalmente: "Agencia > Spaces > Efeonce Group > Pulse".
- En todo lo demás (dashboard, métricas, capabilities, equipo), Efeonce se trata idéntico a cualquier otro Space.

---

## Middleware de protección de rutas

```typescript
// /src/middleware.ts (o extender el existente)

import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const path = req.nextUrl.pathname
      
      // Rutas /agency/* requieren operator o admin
      if (path.startsWith('/agency')) {
        return ['operator', 'admin'].includes(token?.role as string)
      }
      
      // Rutas /admin/* requieren admin
      if (path.startsWith('/admin')) {
        return token?.role === 'admin'
      }
      
      // El resto requiere autenticación básica
      return !!token
    }
  }
})

export const config = {
  matcher: ['/agency/:path*', '/admin/:path*', '/dashboard/:path*', '/proyectos/:path*', '/sprints/:path*']
}
```

---

## Estructura de archivos nuevos

```
/src
├── app/
│   ├── agency/
│   │   ├── layout.tsx                     # Layout de agencia con guard de rol
│   │   ├── page.tsx                       # Pulse Global (landing)
│   │   ├── spaces/
│   │   │   ├── page.tsx                   # Lista de Spaces
│   │   │   └── [spaceId]/
│   │   │       └── page.tsx               # Redirect al dashboard del Space con contexto
│   │   └── capacity/
│   │       └── page.tsx                   # Capacidad global (P1)
│   └── api/
│       └── agency/
│           ├── pulse/
│           │   ├── route.ts               # KPIs agregados
│           │   └── charts/route.ts        # Data de charts
│           ├── spaces/route.ts            # Lista de Spaces con métricas
│           └── capacity/route.ts          # Data de capacidad global
├── components/
│   └── agency/
│       ├── PulseGlobalHeader.tsx           # Header de Pulse Global
│       ├── PulseGlobalKpis.tsx             # Fila de 4 KPI cards
│       ├── PulseGlobalCharts.tsx           # Grid de 4 charts
│       ├── SpaceHealthTable.tsx            # Tabla de salud de Spaces
│       ├── SpaceCard.tsx                   # Card individual de Space
│       ├── SpaceContextChip.tsx            # Chip de contexto en sidebar
│       ├── CapacityOverview.tsx            # Vista de capacidad (P1)
│       └── SpaceFilters.tsx               # Filtros de línea + status + search
├── lib/
│   ├── space-context.ts                   # Helper de contexto activo
│   ├── require-operator.ts                # Guard de auth para rutas de agencia
│   └── agency-queries.ts                  # Query builders para BigQuery (Pulse Global)
└── layouts/
    └── components/
        └── sidebar/
            └── AgencySidebarSection.tsx    # Sección "Agencia" del sidebar
```

---

## Paleta de colores (todos de GH_COLORS)

| Uso | Token | Hex |
|-----|-------|-----|
| Título de página | `neutral.textPrimary` | #022a4e |
| Texto secundario / subtítulos | `neutral.textSecondary` | #848484 |
| Bordes | `neutral.border` | #dbdbdb |
| Fondo de surface | `neutral.bgSurface` | #f7f7f5 |
| Semáforo Óptimo | `semaphore.green.source` | #6ec207 |
| Semáforo Atención | `semaphore.yellow.source` | #ff6500 |
| Semáforo Alerta | `semaphore.red.source` | #bb1954 |
| Badge Globe | `service.globe` | #bb1954 / #f9ecf1 |
| Badge Efeonce Digital | `service.efeonce_digital` | #023c70 / #eaeff3 |
| Badge Reach | `service.reach` | #ff6500 / #fff2ea |
| Badge Wave | `service.wave` | #0375db / #eaf3fc |
| Badge CRM Solutions | `service.crm_solutions` | #633f93 / #f2eff6 |

**Regla:** Ningún color hex en componentes. Todo sale de `GH_COLORS` en `greenhouse-nomenclature.ts`.

---

## Tipografía (reglas de Typography Hierarchy Fix)

| Elemento | Familia / Peso | Tamaño |
|----------|---------------|--------|
| Título de página ("Pulse Global", "Spaces") | Poppins Bold (700) | 24px |
| Subtítulo de página | DM Sans Regular (400) | 14px |
| Metadata (contadores, timestamps) | DM Sans Regular (400) | 12px |
| Número hero (KPI cards) | Poppins Bold (700) | 28px |
| Título de KPI card | Poppins Medium (500) | 14px |
| Trend indicator (+11, -3%) | DM Sans SemiBold (600) | 13px |
| Descriptor / helper | DM Sans Regular (400) | 13px |
| Header de tabla (uppercase) | Poppins Medium (500) | 12px, tracking +1px |
| Celda de tabla | DM Sans Regular (400) | 14px |
| Nombre de Space (tabla/card) | DM Sans SemiBold (600) | 14-15px |
| Badge / chip | DM Sans Medium (500) | 11-12px |
| Sidebar section header | Poppins Medium (500) | 11px, uppercase, tracking +1.5px |
| Sidebar nav label | Poppins Medium (500) | 14px |
| Sidebar nav subtitle | DM Sans Regular (400) | 12px |
| Context chip (Space activo) | DM Sans Medium (500) | 12px |

---

## Lo que NO cambia

- **La experiencia de un `role: 'client'`.** El cliente externo nunca ve la sección "Agencia", nunca sabe que existe, y su dashboard funciona exactamente como hoy.
- **Las API routes existentes** (`/api/dashboard/*`, `/api/projects/*`, `/api/sprints/*`, `/api/capabilities/*`). Se extienden con el parámetro `?space=` para operadores, pero siguen funcionando sin él para clientes.
- **El modelo de Capabilities.** Las capabilities se resuelven por Space — un operador navegando al Space de Acme Corp ve las capabilities de Acme Corp, no las de Efeonce.
- **El panel de admin.** Sigue siendo exclusivo de `role: 'admin'`. El operador ve la data pero no puede crear/editar Spaces ni governance.
- **Los schemas de BigQuery.** `notion_ops.*` y `hubspot_crm.*` no se tocan. Solo se agrega `can_view_all_spaces` a `greenhouse.clients`.

---

## Lo que SÍ cambia

| Componente | Cambio | Impacto |
|------------|--------|---------|
| `greenhouse.clients` schema | Agregar campo `can_view_all_spaces: BOOLEAN` | Migratable — valor default `false` |
| `greenhouse.clients` schema | Ampliar `role` de 2 a 3 valores | Retrocompatible — `client` y `admin` siguen igual |
| NextAuth JWT | Incluir `role` y `canViewAllSpaces` en el token | Cambio en `authOptions` |
| Sidebar | Agregar sección "Agencia" condicional al rol | Extensión del componente existente |
| Middleware | Agregar protección de `/agency/*` | Nuevo matcher |
| API routes existentes | Leer `?space=` como override de contexto para operadores | Cambio menor en cada route |

---

## Orden de ejecución sugerido

### Fase 1: Infraestructura (P0)

1. **Actualizar schema de `greenhouse.clients`:** Agregar `can_view_all_spaces` BOOLEAN DEFAULT false. Actualizar `role` para aceptar 'operator'.
2. **Actualizar NextAuth config:** Incluir `role` y `canViewAllSpaces` en el JWT.
3. **Crear `space-context.ts`:** Helper para resolver el Space activo.
4. **Crear `require-operator.ts`:** Guard de auth para rutas de agencia.
5. **Actualizar middleware:** Agregar matcher para `/agency/*`.
6. **Registrar Efeonce como Space** en `greenhouse.clients` con data real.

### Fase 2: Sidebar y navegación (P0)

7. **Crear `AgencySidebarSection.tsx`:** Sección "Agencia" con Pulse Global, Spaces, Capacidad.
8. **Crear `SpaceContextChip.tsx`:** Chip de contexto que muestra el Space activo.
9. **Integrar en sidebar existente:** Condicionar visibilidad al rol.
10. **Extender API routes existentes** con soporte para `?space=` override.

### Fase 3: Pulse Global (P0)

11. **Crear `agency-queries.ts`:** Query builders para métricas agregadas.
12. **Crear API `/api/agency/pulse`:** KPIs agregados.
13. **Crear API `/api/agency/pulse/charts`:** Data para charts.
14. **Crear API `/api/agency/spaces`:** Lista con métricas de salud.
15. **Crear componente `PulseGlobalHeader.tsx`.**
16. **Crear componente `PulseGlobalKpis.tsx`** con 4 stat cards.
17. **Crear componente `PulseGlobalCharts.tsx`** con 4 charts.
18. **Crear componente `SpaceHealthTable.tsx`.**
19. **Crear página `/agency/page.tsx`** que compone todo.

### Fase 4: Spaces list (P0)

20. **Crear componente `SpaceCard.tsx`.**
21. **Crear componente `SpaceFilters.tsx`.**
22. **Crear página `/agency/spaces/page.tsx`.**
23. **Crear redirect `/agency/spaces/[spaceId]/page.tsx`.**

### Fase 5: Capacidad global (P1)

24. **Crear API `/api/agency/capacity`.**
25. **Crear componente `CapacityOverview.tsx`.**
26. **Crear página `/agency/capacity/page.tsx`.**

### Fase 6: Polish y testing

27. **Verificar breadcrumbs** en ambos contextos (agencia y Space).
28. **Verificar que client role NO ve nada de /agency.**
29. **Verificar responsive** en 1440px, 1024px, 768px.
30. **Verificar empty states** en Pulse Global cuando hay 0 Spaces activos.
31. **Verificar que navegar al Space de Efeonce funciona idéntico a cualquier otro Space.**

---

## Criterio de aceptación

### Modelo de acceso

- [ ] `greenhouse.clients` tiene campo `can_view_all_spaces: BOOLEAN` con default `false`.
- [ ] `role` acepta 3 valores: `'client'`, `'operator'`, `'admin'`.
- [ ] JWT de NextAuth incluye `role` y `canViewAllSpaces`.
- [ ] Un usuario con `role: 'client'` NO ve la sección "Agencia" en el sidebar.
- [ ] Un usuario con `role: 'client'` recibe 403 al intentar acceder a `/agency/*`.
- [ ] Un usuario con `role: 'operator'` ve la sección "Agencia" y puede navegar entre Spaces.
- [ ] Un usuario con `role: 'operator'` NO ve la opción "Admin" en el sidebar.
- [ ] Un usuario con `role: 'admin'` ve "Agencia" + "Admin".

### Navegación

- [ ] El sidebar muestra secciones condicionadas al rol.
- [ ] En contexto Agencia, las secciones "Operación" y "Servicios" están grayed/colapsadas.
- [ ] En contexto Space, el context chip muestra el nombre del Space activo con botón "✕".
- [ ] Click en "✕" del context chip vuelve a `/agency/spaces`.
- [ ] Breadcrumbs reflejan el contexto completo (Agencia > Spaces > [nombre] > vista).
- [ ] Las API routes existentes responden correctamente al parámetro `?space=` para operadores.
- [ ] Las API routes existentes ignoran `?space=` si el usuario es `client`.

### Pulse Global

- [ ] 4 KPI cards con data agregada de todos los Spaces activos.
- [ ] 4 charts funcionales con data de todos los Spaces.
- [ ] Health table con un row por Space activo, navegable.
- [ ] Chart de RpA por Space es clickable → navega al Space.
- [ ] Empty states diseñados cuando no hay data suficiente.
- [ ] Semáforos con ícono + label textual (accesibilidad).

### Spaces list

- [ ] Grid de Space cards con avatar, métricas, semáforo, badge de línea de servicio.
- [ ] Filtros por línea de servicio y status.
- [ ] Búsqueda por nombre de Space.
- [ ] Efeonce aparece con chip "Interno" discreto.
- [ ] Click en card navega al Space con contexto.

### UI y diseño

- [ ] Todos los colores de `GH_COLORS` — cero hex hardcodeados.
- [ ] Poppins solo para títulos, números hero, sidebar nav, overlines, botones.
- [ ] DM Sans para body, descriptores, tabla, badges, captions.
- [ ] Semáforos usan colores de marca (Neon Lime, Sunset Orange, Crimson Magenta), no genéricos.
- [ ] Responsive funcional en 1440px, 1024px, 768px.
- [ ] Skeleton loaders en cada sección al cargar.
- [ ] Error boundaries independientes por zona.

### Efeonce como Space

- [ ] Efeonce registrado en `greenhouse.clients` con `client_id: 'efeonce'` y data real.
- [ ] Efeonce aparece en la lista de Spaces como cualquier otro.
- [ ] Dashboard de Efeonce muestra métricas ICO reales de los proyectos internos.
- [ ] No hay tratamiento especial de Efeonce en queries ni API routes — mismo código path que cualquier Space.

---

## Notas para el agente

- **Lee los documentos normativos antes de escribir código.** La nomenclatura, los colores y la tipografía ya están definidos. No inventes.
- **Reutiliza componentes existentes.** Los patrones de stat cards, charts, health tables y empty states ya están definidos en otros Codex tasks. No reimplementes — importa y extiende.
- **El sidebar dinámico ya debería existir** (de Capabilities Architecture, C0). Extiéndelo con la sección "Agencia" — no lo reescribas.
- **No toques las API routes de admin.** La sección Admin sigue separada. Esta tarea solo agrega la capa de operador.
- **El `?space=` override es el mecanismo central.** No crees sesiones paralelas ni cookies separadas para el contexto de Space. Un query parameter es suficiente y mantiene la URL compartible.
- **Usa `next/link` con `?space=xxx`** en toda la navegación interna cuando el operador está dentro de un Space. Así el contexto se preserva sin estado global.
- **Branch naming:** `feature/agency-operator-layer` — es un feature nuevo, no un fix.
- **Cada push a `develop` genera preview en Vercel.** Usa ese preview para QA visual antes de merge a `main`.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo.*
