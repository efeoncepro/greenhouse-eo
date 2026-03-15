# Greenhouse Portal — Sistema de UI / Frontend

> Versión: 1.0
> Fecha: 2026-03-15

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

#### `src/components/greenhouse/`

**Cards y Layout:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `ExecutiveCardShell` | title, subtitle, action, children, cardSx, contentSx | Wrapper base para todas las cards del dashboard |
| `ExecutiveHeroCard` | eyebrow, title, description, highlights, summaryLabel/Value/Detail, badges | Banner hero de dashboard |
| `ExecutiveMiniStatCard` | — | KPI card compacta |
| `CapacityOverviewCard` | title, subtitle, summaryItems, members, variant, insightTitle/Subtitle/Items, coverageLabel/Tone | Card de capacidad con miembros |
| `MetricStatCard` | chipLabel, chipTone, title, value, detail | Card de métrica individual |
| `MetricList` | items: MetricListItem[] | Lista de métricas |

**Team:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `TeamDossierSection` | — (fetch interno) | Sección completa de equipo con API integration |
| `TeamMemberCard` | member: TeamMemberResponse | Card de miembro individual |
| `TeamAvatar` | name, avatarUrl, roleCategory, size | Avatar con color por rol |
| `TeamIdentityBadgeGroup` | providers, confidence | Badges de identity providers |
| `TeamSignalChip` | — | Indicator chip |
| `TeamProgressBar` | — | Barra de progreso |
| `TeamLoadBar` | — | Barra de carga |
| `TeamExpansionGhostCard` | — | Placeholder para expansión de equipo |
| `TeamCapacitySection` | — | Sección de capacidad |
| `AccountTeamDossierSection` | — | Equipo de cuenta |
| `ProjectTeamSection` | — | Equipo de proyecto |
| `SprintTeamVelocitySection` | — | Velocidad de equipo en sprint |

**Branding:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `BrandLogo` | — | Logo de Greenhouse |
| `BrandWordmark` | — | Wordmark textual |
| `BusinessLineBadge` | — | Badge de línea de negocio con color |

**Utilidades:**

| Componente | Props clave | Uso |
|-----------|------------|-----|
| `SectionErrorBoundary` | — (class component) | Error boundary por sección |
| `EmptyState` | icon, title, description, action, minHeight | Estado vacío |
| `IdentityImageUploader` | — | Upload de avatar/logo |
| `RequestDialog` | open, intent, onClose | Diálogo de solicitudes |
| `UpsellBanner` | — | Banner de upsell |
| `SectionHeading` | — | Heading de sección |
| `ChipGroup` | items: ChipGroupItem[] | Grupo de chips |

**Assets:**
- `brand-assets.ts` — Mappings de brand assets y `getBrandDisplayLabel()`

#### `src/components/agency/`

| Componente | Props | Uso |
|-----------|-------|-----|
| `CapacityOverview` | capacity: AgencyCapacityOverview | KPIs de capacidad agencia |
| `SpaceCard` | space: AgencySpaceHealth | Card de espacio/cuenta |
| `SpaceFilters` | — | Filtros para lista de espacios |
| `SpaceHealthTable` | — | Tabla de salud de espacios |
| `PulseGlobalCharts` | — | Charts globales de pulse |
| `PulseGlobalHeader` | — | Header de pulse |
| `PulseGlobalKpis` | — | KPIs globales con semáforo |

#### `src/components/capabilities/`

| Componente | Props | Uso |
|-----------|-------|-----|
| `CapabilityOverviewHero` | eyebrow, title, description, highlights, summary*, badges | Hero de capability |
| `ModuleLayout` | — | Layout wrapper |
| `CapabilityCard` | — | Card de capability |

#### `src/components/auth/`

| Componente | Props | Uso |
|-----------|-------|-----|
| `AuthSessionProvider` | session, children | Wrapper de NextAuth SessionProvider |

### Nivel 3: Vistas Compuestas (`src/views/greenhouse/`)

Componentes de vista completa que componen componentes de Nivel 1 y 2 para formar páginas.

| Directorio | Vista principal | Descripción |
|-----------|----------------|-------------|
| `dashboard/` | `GreenhouseDashboard` | Dashboard ejecutivo completo |
| `admin/tenants/` | `GreenhouseAdminTenants`, `GreenhouseAdminTenantDetail` | Admin de tenants |
| `admin/users/` | `GreenhouseAdminUsers` | Admin de usuarios |
| `finance/` | Finance views + `dialogs/`, `drawers/` | Módulo financiero |
| `payroll/` | Payroll views | Módulo de nómina |
| `people/` | `PeopleList`, `PersonView` + `components/`, `drawers/`, `tabs/` | Directorio de personas |
| `hr-core/` | HR Core views | Módulo HR |
| `internal/dashboard/` | Internal dashboard | Dashboard interno |
| `ai-tools/` | AI Tools views + `tabs/` | Módulo AI Tools |

#### `src/views/agency/`

Vistas de agency separadas del directorio greenhouse.

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

### Menú horizontal

Definido en `src/data/navigation/horizontalMenuData.tsx`. Estructura idéntica al vertical, optimizada para layout horizontal.

### Navegación dinámica

La navegación se adapta al contexto del tenant:
- Clientes ven solo las rutas de superficie `client`
- Usuarios internos ven rutas según sus route groups
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
