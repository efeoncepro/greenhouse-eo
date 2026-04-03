# Greenhouse Portal — Sistema de UI / Frontend

> Versión: 2.1
> Fecha: 2026-04-02
> Actualizado: Rutas completadas (55+ páginas), vistas de módulos (25+ directorios), componentes compartidos (40+), patrones AI con AssistantUI, PDF/Excel export, Rich text editor Tiptap

---

## Stack de UI

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| React | 19.2.3 | Runtime de UI |
| Material UI (MUI) | 7.3.6 | Librería de componentes base |
| Emotion | 11.14 | CSS-in-JS (styled, sx prop) |
| Tailwind CSS | 4.1.17 | Utility classes (complementario) |
| Vuexy | — | Shell, navegación, tema base, patrones UI |
| ApexCharts | 3.49.0 | Gráficos primarios |
| Recharts | 3.6.0 | Gráficos secundarios |
| Redux Toolkit | 2.11.2 | State management global |
| React Hook Form | 7.69.0 | Manejo de formularios |
| Valibot | 1.2.0 | Validación de schemas |
| TanStack React Table | 8.21.3 | Tablas con sorting/filtering/paginación |
| FullCalendar | 6.1.20 | Calendario |
| Mapbox GL / react-map-gl | 3.17.0 / 8.1.0 | Mapas |
| keen-slider | 6.8.6 | Carouseles |
| cmdk | 1.1.1 | Command palette |
| react-toastify | 11.0.5 | Notificaciones toast |
| Tiptap | 3.14.0 | Rich text editing (editor extensible, con color, list, placeholder, text-align, text-style, underline) |
| React Email | — | Templates de email transaccional |
| Resend | — | Envío de emails transaccionales |
| @react-pdf/renderer | — | Generación de PDFs en React |
| ExcelJS | — | Generación de archivos Excel |
| @assistant-ui/react | — | AI Chat UI framework |

---

## Rutas de la aplicación

### Grupos de rutas (Route Groups)

#### Dashboard y navegación principal

**`(dashboard)/`** — Layout compartido con navegación

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/dashboard` | `GreenhouseDashboard` | Dashboard ejecutivo |
| `/settings` | `SettingsView` | Configuración del usuario |
| `/notifications` | `NotificationsView` | Centro de notificaciones |
| `/updates` | `UpdatesView` | Cambios y updates |
| `/reviews` | `ReviewsView` | Reviews del sistema |
| `/about` | `AboutView` | Acerca de |

#### Mi área personal (`my/*`)

| Ruta | Propósito |
|------|----------|
| `/my/assignments` | Asignaciones personales |
| `/my/delivery` | Mi delivery/proyectos |
| `/my/leave` | Solicitudes y saldo de licencias |
| `/my/organization` | Mi contexto organizacional |
| `/my/payroll` | Mi nómina y compensación |
| `/my/performance` | Mi desempeño |
| `/my/profile` | Mi perfil personal |

#### Proyectos y campañas

| Ruta | Propósito |
|------|----------|
| `/projects/[id]` | Detalle de proyecto |
| `/sprints/[id]` | Detalle de sprint |
| `/campaigns/[campaignId]` | Detalle de campaña |
| `/proyectos/[id]` | Proyectos (versión ES) |
| `/campanas/[campaignId]` | Campañas (versión ES) |

#### Finanzas (12 páginas)

| Ruta | Propósito |
|------|----------|
| `/finance/dashboard` | Dashboard financiero |
| `/finance/income` | Ingresos |
| `/finance/expenses` | Gastos |
| `/finance/suppliers` | Proveedores |
| `/finance/reconciliation` | Reconciliación |
| `/finance/intelligence` | Intelligence y reporting |
| `/finance/quotes` | Cotizaciones |
| `/finance/purchase-orders` | Órdenes de compra |
| `/finance/hes` | Hojas de especificación |
| `/finance/clients` | Análisis de clientes |
| `/finance/cost-allocations` | Asignación de costos |
| `/finance/economics` | Economía y análisis |

#### Recursos Humanos (4 páginas)

| Ruta | Propósito |
|------|----------|
| `/hr/payroll` | Nómina y períodos |
| `/hr/departments` | Departamentos |
| `/hr/leave` | Gestión de licencias |
| `/hr/attendance` | Asistencia |

#### Agencia (10 páginas)

| Ruta | Propósito |
|------|----------|
| `/agency/campaigns` | Campañas agencia |
| `/agency/capacity` | Capacidad de equipo |
| `/agency/delivery` | Delivery operativo |
| `/agency/economics` | Economía agencia |
| `/agency/operations` | Operaciones |
| `/agency/organizations` | Organizaciones |
| `/agency/services` | Servicios |
| `/agency/spaces` | Espacios/cuentas |
| `/agency/staff-augmentation` | Personal augmentation |
| `/agency/team` | Equipo agencia |

#### Admin (14 páginas)

| Ruta | Propósito |
|------|----------|
| `/admin/ai-tools` | Herramientas de IA |
| `/admin/business-lines` | Líneas de negocio |
| `/admin/cloud-integrations` | Integraciones cloud |
| `/admin/email-delivery` | Entrega de email |
| `/admin/integrations` | Integraciones externas |
| `/admin/notifications` | Configuración de notificaciones |
| `/admin/operational-calendar` | Calendario operativo |
| `/admin/ops-health` | Salud operacional |
| `/admin/roles` | Roles y permisos |
| `/admin/scim-tenant-mappings` | Mappings SCIM |
| `/admin/team` | Gestión de equipo |
| `/admin/tenants` | Configuración de tenants |
| `/admin/users` | Gestión de usuarios |
| `/admin/views` | Configuración de vistas |

#### Personas y equipo

| Ruta | Propósito |
|------|----------|
| `/people/[memberId]` | Perfil de persona |
| `/capabilities/[moduleId]` | Detalle de capability |
| `/equipo` | Lista de equipo (ES) |
| `/analytics` | Analytics de personas |

#### Interno

| Ruta | Propósito |
|------|----------|
| `/internal/dashboard` | Dashboard interno |

#### Desarrolladores

| Ruta | Propósito |
|------|----------|
| `/developers/api` | Documentación de API |

### Rutas de autenticación

| Ruta | Propósito |
|------|----------|
| `/login` | Login |
| `/reset-password` | Reset de password |
| `/forgot-password` | Recuperación de password |
| `/accept-invite` | Aceptar invitación |
| `/access-denied` | Acceso denegado |

---

## Jerarquía de componentes

### Nivel 1: Vuexy Base (`@core`, `@layouts`, `@menu`)

Componentes heredados de Vuexy que forman el shell de la aplicación. Greenhouse los usa sin modificar:

**`@core/components/`** — Componentes MUI extendidos
- `custom-inputs/` — Inputs personalizados
- `customizer/` — Theme customizer
- `mui/` — Overrides de MUI
- `option-menu/` — Menús de opciones
- `scroll-to-top/` — Botón scroll-to-top

**`@core/contexts/`** — Contexts de settings y theme
**`@core/hooks/`** — Hooks utilitarios
**`@core/styles/`** — Estilos base (horizontal, vertical)
**`@core/theme/`** — Tema MUI con overrides
**`@core/utils/`** — Utilidades base

**`@layouts/`** — Shell de la aplicación
- `components/horizontal/` — Layout horizontal
- `components/vertical/` — Layout vertical
- `styles/` — Estilos de layout (horizontal, vertical, shared)

**`@menu/`** — Sistema de navegación
- `horizontal-menu/` — Menú horizontal
- `vertical-menu/` — Menú vertical (sidebar)
- `contexts/` — Menu state contexts
- `hooks/` — Menu hooks

### Nivel 2: Componentes de Dominio (`src/components/`)

Componentes específicos de Greenhouse construidos sobre MUI.

#### `src/components/greenhouse/` (40+ archivos)

**Cards y Layout:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `ExecutiveCardShell` | title, subtitle, action, children, cardSx, contentSx | Wrapper base para todas las cards del dashboard |
| `ExecutiveHeroCard` | eyebrow, title, description, highlights, summaryLabel/Value/Detail, badges | Banner hero de dashboard |
| `ExecutiveMiniStatCard` | — | KPI card compacta |
| `CapacityOverviewCard` | title, subtitle, summaryItems, members, variant, insightTitle/Subtitle/Items, coverageLabel/Tone | Card de capacidad con miembros |
| `MetricStatCard` | chipLabel, chipTone, title, value, detail | Card de métrica individual |
| `MetricList` | items: MetricListItem[] | Lista de métricas |
| `SectionHeading` | title, subtitle, action | Heading de sección |
| `SectionErrorBoundary` | children, fallback | Error boundary por sección |

**Team:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `TeamDossierSection` | — (fetch interno) | Sección completa de equipo con API integration |
| `TeamMemberCard` | member: TeamMemberResponse | Card de miembro individual |
| `TeamAvatar` | name, avatarUrl, roleCategory, size | Avatar con color por rol |
| `TeamIdentityBadgeGroup` | providers, confidence | Badges de identity providers |
| `TeamSignalChip` | signal: 'healthy' \| 'warning' \| 'critical' | Indicator chip de estado |
| `TeamProgressBar` | current, total, label | Barra de progreso |
| `TeamLoadBar` | items | Barra de carga por categoría |
| `TeamCapacitySection` | — | Sección de capacidad |
| `AccountTeamDossierSection` | — | Equipo de cuenta |
| `ProjectTeamSection` | — | Equipo de proyecto |
| `SprintTeamVelocitySection` | — | Velocidad de equipo en sprint |

**Data Display:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `MetricStatCard` | chipLabel, chipTone, title, value, detail, trend | Card de métrica |
| `ChipGroup` | items: ChipGroupItem[] | Grupo de chips |
| `EmptyState` | icon, title, description, action, minHeight | Estado vacío |

**Branding:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `BrandLogo` | size | Logo de Greenhouse |
| `BrandWordmark` | size | Wordmark textual |
| `BusinessLineBadge` | businessLine, size | Badge de línea de negocio con color |

**Formularios:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `GreenhouseFileUploader` | accept, maxSize, onUpload | Upload de archivos |
| `GreenhouseCalendar` | value, onChange, minDate, maxDate | Selector de calendario |
| `GreenhouseDatePicker` | value, onChange, format | Date picker |
| `GreenhouseDragList` | items, onReorder, renderItem | Lista reordenable |
| `IdentityImageUploader` | onUpload, currentImage | Upload de avatar/logo |

**AI:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `NexaFloatingButton` | — | Botón flotante para chat AI, usa `@assistant-ui/react` con `AssistantRuntimeProvider` y custom `ChatModelAdapter` para streaming |

**Utilidades:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `UpsellBanner` | message, action, onClose | Banner de upsell |
| `RequestDialog` | open, intent, onClose, data | Diálogo de solicitudes |

**Config:**

| Archivo | Rol |
|---------|-----|
| `brand-assets.ts` | Mappings de brand assets y `getBrandDisplayLabel()` (EN/ES) |
| `greenhouse-nomenclature.ts` | Nomenclatura completa (66KB), nav taxonomy EN/ES, 200+ labels |
| `capability-registry.ts` | Catálogo de capabilities |
| `role-codes.ts` | Códigos de rol y mappings |
| `nexa-models.ts` | Configuración de modelos AI para Nexa |

#### `src/components/agency/` (3 archivos)

| Componente | Props | Uso |
|-----------|-------|-----|
| `CapacityOverview` | capacity: AgencyCapacityOverview | KPIs de capacidad agencia |
| `SpaceCard` | space: AgencySpaceHealth | Card de espacio/cuenta |
| `SpaceHealthTable` | spaces: SpaceHealth[] | Tabla de salud de espacios |
| `PulseGlobalCharts` | — | Charts globales de pulse |
| `PulseGlobalHeader` | — | Header de pulse |
| `PulseGlobalKpis` | — | KPIs globales con semáforo |

#### `src/components/capabilities/` (2 archivos)

| Componente | Props | Uso |
|-----------|-------|-----|
| `CapabilityOverviewHero` | eyebrow, title, description, highlights, summary*, badges | Hero de capability |
| `ModuleLayout` | — | Layout wrapper |

#### `src/components/auth/` (1 archivo)

| Componente | Props | Uso |
|-----------|-------|-----|
| `AuthSessionProvider` | session, children | Wrapper de NextAuth SessionProvider |

### Nivel 3: Vistas Compuestas (`src/views/greenhouse/`)

Componentes de vista completa que componen componentes de Nivel 1 y 2 para formar páginas. 25+ directorios con 100+ archivos de vista.

#### Módulos y sus vistas

| Módulo | Directorio | Archivos | Descripción |
|--------|-----------|----------|-------------|
| Admin | `admin/` | 20 | Vistas de administración |
| Dashboard | `dashboard/` | 21 | Dashboard ejecutivo y home |
| Finanzas | `finance/` | 25 | Módulo completo de finanzas |
| Nómina | `payroll/` | 20 | Gestión de nómina |
| HR Core | `hr-core/` | 6 | HR y licencias |
| Personas | `people/` | 13 | Directorio de personas |
| Agencia | `agency/` | 3 | Vistas de agencia |
| IA Tools | `ai-tools/` | 3 | Herramientas de IA |
| Campañas | `campaigns/` | 2 | Gestión de campañas |
| Home | `home/` | 2 | Vistas home |
| Mi área | `my/` | 9 | Área personal del usuario |
| Notificaciones | `notifications/` | 2 | Centro de notificaciones |
| Organizaciones | `organizations/` | 7 | Account 360 — Organizations |
| Interno | `internal/` | 1 | Vistas internas |

#### `src/views/greenhouse/organizations/` (7 componentes)

| Componente | Props | Uso |
|-----------|-------|-----|
| `OrganizationListView` | — | Lista paginada de organizaciones |
| `OrganizationView` | organizationId: string | Detalle con sidebar + tabs dinámicos |
| `OrganizationTabs` | organizationId, activeTab, onTabChange | Orquestador de tabs |
| `OrganizationLeftSidebar` | organizationId | Sidebar con metadata |
| `OverviewTab` | organizationId | Datos generales, spaces, relations |
| `PeopleTab` | organizationId | Membresías y personas |
| `FinanceTab` | organizationId | Resumen financiero |
| `IcoTab` | organizationId | Métricas ICO Engine |
| `IntegrationsTab` | organizationId | Estado HubSpot sync, webhook status |
| `EditOrganizationDrawer` | organizationId, open, onClose | Editar organización |
| `AddMembershipDrawer` | organizationId, open, onClose | Agregar persona |

---

## Sistema de navegación

### Menú vertical (sidebar)

Definido en `src/data/navigation/verticalMenuData.tsx`:

```
Dashboard     → /dashboard      (icon: tabler-smart-home)
Projects      → /proyectos      (icon: tabler-folders)
Sprints       → /sprints        (icon: tabler-timeline)
Settings      → /settings       (icon: tabler-settings)
Updates       → /updates        (icon: tabler-bell)
```

Estructura adaptativa según roles y tenant.

### Menú horizontal

Definido en `src/data/navigation/horizontalMenuData.tsx`. Estructura idéntica al vertical, optimizada para layout horizontal.

### Navegación dinámica

La navegación se adapta al contexto del tenant:
- Clientes ven solo las rutas de superficie `client`
- Usuarios internos ven rutas según sus capabilities
- Admins ven todas las rutas incluyendo admin

---

## Tema y colores

### Configuración del tema

Archivo: `src/configs/themeConfig.ts`
- Template name: "Greenhouse"
- Layout default: vertical
- Cookie name: `greenhouse-eo-portal`
- Home URL: `/dashboard`

### Paleta de colores

Archivo: `src/configs/primaryColorConfig.ts`
- Primary: `#0375DB` (main), `#3691E3` (light), `#024C8F` (dark)
- Accent: Verde, Naranja, Rojo para semáforo

### Colores semáforo

Usados para KPIs y health indicators:
- `success` (verde) — Healthy, on target
- `info` (azul) — Neutral, informativo
- `warning` (amarillo) — Atención requerida
- `error` (rojo) — Crítico, fuera de rango

### Colores por rol de equipo

`getTeamRoleTone(roleCategory)` asigna un color de tema a cada categoría de rol.

---

## Patrones de composición de vista

### Patrón estándar de dashboard

```tsx
<Grid container spacing={6}>
  {/* Hero */}
  <Grid item xs={12}>
    <ExecutiveHeroCard eyebrow="..." title="..." ... />
  </Grid>

  {/* KPI Row */}
  <Grid item xs={12} md={3}>
    <MetricStatCard chipLabel="RpA" value={data.avgRpa} ... />
  </Grid>
  {/* ... más KPIs */}

  {/* Charts Grid 2x2 */}
  <Grid item xs={12} md={6}>
    <ExecutiveCardShell title="Status Distribution">
      <ApexChart type="donut" ... />
    </ExecutiveCardShell>
  </Grid>
  {/* ... más charts */}

  {/* Data Sections */}
  <Grid item xs={12}>
    <SectionErrorBoundary>
      <TeamCapacitySection />
    </SectionErrorBoundary>
  </Grid>
</Grid>
```

### Patrón de data fetching client-side

```tsx
const [data, setData] = useState<DataType | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const controller = new AbortController()
  fetch('/api/endpoint', { signal: controller.signal, cache: 'no-store' })
    .then(res => res.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') setError(err.message)
    })
    .finally(() => setLoading(false))
  return () => controller.abort()
}, [])
```

### Patrón de tabs dinámicos por rol

Algunas vistas resuelven qué tabs mostrar según el rol del usuario. El módulo People usa `/api/people/meta` para determinar tabs visibles:

```tsx
// El server resuelve qué tabs puede ver el usuario según sus roles
const meta = await fetch('/api/people/meta')
// meta.visibleTabs: ['overview', 'assignments', 'compensation', 'payroll', 'hr', 'delivery', 'identity']
// Cada tab se renderiza condicionalmente
```

### Patrón de AI Chat con AssistantUI

```tsx
<AssistantRuntimeProvider runtime={customRuntime}>
  <NexaFloatingButton />
</AssistantRuntimeProvider>
```

La integración usa `@assistant-ui/react` con un custom `ChatModelAdapter` que consume el endpoint `/api/ai-tools/chat` con streaming.

### Patrón de PDF generation

Endpoints que generan PDFs bajo demanda:
- `/api/hr/payroll/periods/[periodId]/pdf` — Nómina
- `/api/finance/income/[id]/dte-pdf` — Documento tributario
- `/api/my/payroll/entries/[entryId]/receipt` — Recibo de nómina

Usa `@react-pdf/renderer` y `React Email` para templates.

### Patrón de Excel export

Endpoints que generan archivos Excel:
- `/api/hr/payroll/periods/[periodId]/excel` — Nómina completa

Usa `ExcelJS` para creación de workbooks.

### Patrón de error boundary

```tsx
<SectionErrorBoundary>
  {loading ? <Skeleton /> : error ? <EmptyState title="Error" /> : <DataComponent data={data} />}
</SectionErrorBoundary>
```

---

## Path aliases

```typescript
@/*         → ./src/*
@core/*     → ./src/@core/*
@layouts/*  → ./src/@layouts/*
@menu/*     → ./src/@menu/*
@assets/*   → ./src/assets/*
@components/* → ./src/components/*
@configs/*  → ./src/configs/*
@views/*    → ./src/views/*
```

---

## Accesibilidad

Los componentes de Greenhouse implementan patrones de accesibilidad:

- `aria-label` en secciones interactivas
- `role="region"` para secciones mayores
- `aria-labelledby`, `aria-describedby` para contexto
- `role="list"`, `role="listitem"` para colecciones
- `aria-hidden="true"` para elementos decorativos
- Color no como único diferenciador de estado (texto + icono acompaña al color)
- Form inputs con labels asociados
- Rich text editor Tiptap con soporte para accesibilidad

---

## Convenciones de código UI

1. **MUI-first** — Usar componentes MUI como base, extender con `sx` prop
2. **No design system paralelo** — Componer sobre Vuexy, no crear componentes que dupliquen funcionalidad existente
3. **Componentes greenhouse en `src/components/greenhouse/`** — Componentes reutilizables de dominio
4. **Vistas en `src/views/greenhouse/`** — Composición por ruta
5. **Skeletons para loading** — Siempre mostrar skeleton durante carga
6. **Empty states para sin datos** — Nunca dejar una sección vacía sin explicación
7. **Error boundaries por sección** — No dejar que un error en una sección rompa toda la página
8. **`useTheme()` para colores** — No hardcodear colores; usar el tema
9. **`alpha()` para opacidades** — Función de MUI para colores translúcidos
10. **Rich text con Tiptap** — Para campos que requieran formato: usar extensiones de Tiptap (color, list, placeholder, text-align, text-style, underline)
11. **AI chat via AssistantUI** — Integración de chat con NexaFloatingButton, streaming via custom adapter
12. **PDF/Excel export** — Usar endpoints dedicados, nunca generar en browser
