# Greenhouse EO — UI Platform Architecture V1

> **Version:** 1.0
> **Created:** 2026-03-30
> **Audience:** Frontend engineers, UI/UX architects, agents implementing views

---

## Overview

Greenhouse EO es un portal Next.js 16 App Router con MUI 7.x envuelto por el starter-kit Vuexy. Este documento es la referencia canónica de la plataforma UI: stack, librerías disponibles, patrones de componentes, convenciones de estado, y reglas de adopción.

## Delta 2026-04-05 — Permission Sets UI patterns (TASK-263)

### Keyboard-accessible interactive cards

Pattern para cards clickeables que abren un panel de detalle. Usado en la lista de sets de permisos.

```tsx
<Card
  role='button'
  tabIndex={0}
  aria-label={`Ver detalle de ${set.setName}`}
  onClick={() => selectItem(set.id)}
  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectItem(set.id) } }}
  sx={{
    cursor: 'pointer',
    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
    '&:hover': { boxShadow: theme => theme.shadows[4] }
  }}
>
```

Regla: toda `<Card>` con `onClick` debe incluir `role="button"`, `tabIndex={0}`, `onKeyDown` y `focus-visible`.

### Confirmation dialogs para acciones destructivas

Pattern estandar para confirmacion antes de eliminar o revocar:

```tsx
<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth='xs' fullWidth aria-labelledby='confirm-title'>
  <DialogTitle id='confirm-title'>¿Eliminar «{itemName}»?</DialogTitle>
  <DialogContent>
    <DialogContentText>Esta acción no se puede deshacer. [consecuencia específica].</DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
    <Button variant='contained' color='error' onClick={handleConfirm}>Eliminar [objeto]</Button>
  </DialogActions>
</Dialog>
```

Reglas:
- Titulo como pregunta con nombre del objeto entre comillas latinas (« »)
- Body describe la consecuencia, no repite el titulo
- Boton destructivo: `variant='contained' color='error'`, label especifico ("Eliminar set", "Revocar acceso")
- Boton cancelar: sin variant (default), siempre "Cancelar"

### Toast feedback pattern (react-toastify)

```tsx
import { toast } from 'react-toastify'

// Success — auto-dismiss
toast.success('Cambios guardados.')
toast.success('Set de permisos creado.')

// Error — persistent
toast.error('No se pudo guardar. Intenta de nuevo.')
```

Regla: toda operacion de escritura exitosa muestra toast de exito. Copy en espanol, sin exclamaciones, confirma que se hizo.

### Autocomplete user picker

Pattern para asignar usuarios desde un buscador en vez de IDs crudos:

```tsx
<Autocomplete
  multiple
  options={availableUsers}
  getOptionLabel={opt => `${opt.fullName} (${opt.email})`}
  isOptionEqualToValue={(opt, val) => opt.userId === val.userId}
  renderInput={params => <TextField {...params} label='Buscar usuarios' placeholder='Escribe un nombre...' size='small' />}
  renderTags={(value, getTagProps) => value.map((opt, i) => <Chip {...getTagProps({ index: i })} key={opt.userId} label={opt.fullName} size='small' />)}
  noOptionsText='No se encontraron usuarios disponibles'
/>
```

Fuente: `GET /api/admin/views/sets/:setId/users?scope=assignable` retorna lista de usuarios activos.

### SECTION_ACCENT shared constant

Mapa de colores por seccion de governance, exportado desde `src/lib/admin/view-access-catalog.ts`:

```tsx
export const SECTION_ACCENT: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'secondary'> = {
  gestion: 'info', equipo: 'success', finanzas: 'warning', ia: 'secondary',
  administracion: 'primary', mi_ficha: 'secondary', cliente: 'success'
}
```

Importar desde `@/lib/admin/view-access-catalog` en vez de duplicar en cada componente.

### Archivos clave

| Archivo | Proposito |
|---------|-----------|
| `src/views/greenhouse/admin/permission-sets/PermissionSetsTab.tsx` | Tab CRUD de sets de permisos |
| `src/views/greenhouse/admin/users/UserAccessTab.tsx` | Tab "Accesos" en detalle de usuario |
| `src/lib/admin/permission-sets.ts` | CRUD + resolucion de Permission Sets |
| `src/lib/admin/view-access-catalog.ts` | VIEW_REGISTRY, GOVERNANCE_SECTIONS, SECTION_ACCENT |

## Delta 2026-04-05 — Vuexy User View Pattern: sidebar profile + tabs (referencia para Mi Perfil)

Patron enterprise de detalle de usuario extraido del full-version de Vuexy (`apps/user/view`). Aplicable a vistas self-service ("Mi *") donde el usuario ve su propia informacion.

### Estructura en Vuexy full-version

```
# Ubicacion: vuexy-admin-v10.11.1/nextjs-version/typescript-version/full-version/

src/app/[lang]/(dashboard)/(private)/apps/user/view/
  page.tsx                          ← entry point: Grid lg=4/lg=8

src/views/apps/user/view/
  user-left-overview/
    index.tsx                       ← contenedor: UserDetails + UserPlan
    UserDetails.tsx                 ← card: avatar 120px, stats, key-value details, Edit/Suspend
    UserPlan.tsx                    ← card: plan info (no aplica a Greenhouse)
  user-right/
    index.tsx                       ← TabContext + CustomTabList pill style
    overview/
      index.tsx                     ← ProjectListTable + UserActivityTimeline + InvoiceListTable
      ProjectListTable.tsx          ← @tanstack/react-table con fuzzy search
      UserActivityTimeline.tsx      ← MUI Lab Timeline
      InvoiceListTable.tsx          ← tabla de facturas
    security/                       ← ChangePassword, RecentDevice, TwoStepVerification
    billing-plans/                  ← CurrentPlan, PaymentMethod, BillingAddress
    notifications/                  ← tabla de notificaciones
    connections/                    ← conexiones sociales
```

### Patron: Sidebar Profile + Tabbed Content

```
┌────────────────┬──────────────────────────────────────────┐
│  SIDEBAR (4)   │  TABS (8)                                │
│                │  [Overview] [Security] [Billing] [...]    │
│  Avatar 120px  ├──────────────────────────────────────────┤
│  Name          │                                          │
│  Role Chip     │  Tab content                             │
│                │  (dynamic() lazy loaded)                 │
│  Stats:        │                                          │
│  ✓ 1.23k tasks │                                          │
│  ✓ 568 projects│                                          │
│                │                                          │
│  Details:      │                                          │
│  Email: ...    │                                          │
│  Phone: ...    │                                          │
│  Status: ...   │                                          │
│                │                                          │
│  [Edit][Suspend]│                                         │
└────────────────┴──────────────────────────────────────────┘
```

### Decisiones de diseno

| Decision | Justificacion |
|----------|---------------|
| Sidebar 4 + Tabs 8 | Identidad siempre visible; content area maximizada para tablas y forms |
| `CustomTabList pill='true'` | Tabs con pill style coherente con el resto del portal |
| `dynamic()` en cada tab | Lazy loading — solo carga el tab activo, mejor performance |
| Stats con `CustomAvatar` + Typography | Patron reusable de Vuexy: icon avatar + numero + label |
| Key-value details con `Typography font-medium` | Patron consistente: label bold + value regular |
| `OpenDialogOnElementClick` para acciones | Dialogs modales para edit/delete/suspend sin navegacion |

### Diferencia con Person Detail View (TASK-168)

| Aspecto | Person Detail View | User View (Mi Perfil) |
|---------|-------------------|----------------------|
| Layout | Horizontal header full-width + tabs below | Sidebar left + tabs right |
| Uso | Admin ve a otro usuario | Usuario ve su propio perfil |
| Actions | OptionMenu con acciones admin | Edit dialog (o read-only) |
| Stats | `CardStatsSquare` en header | Stats inline en sidebar |
| Tabs | 5 tabs domain-oriented (Profile, Economy, Delivery, Assignments, Activity) | Tabs self-service (Resumen, Seguridad, Mi Nomina, Mi Delivery) |

### Cuando aplicar cada patron

- **Person Detail View (horizontal header)**: cuando un admin o manager ve el perfil de OTRA persona. Necesita max content area para tablas de datos ajenos.
- **User View (sidebar + tabs)**: cuando el usuario ve SU PROPIA informacion. La identidad fija en sidebar refuerza contexto personal.

### Componentes core reutilizables (ya migrados)

| Componente | Archivo | Rol en User View |
|-----------|---------|------------------|
| `CustomAvatar` | `src/@core/components/mui/Avatar.tsx` | Avatar 120px rounded en sidebar |
| `CustomTabList` | `src/@core/components/mui/TabList.tsx` | Tabs con pill style |
| `CustomTextField` | `src/@core/components/mui/TextField.tsx` | Inputs en dialogs de edicion |
| `CustomChip` | `src/@core/components/mui/Chip.tsx` | Chip de rol/estado en sidebar |
| `OpenDialogOnElementClick` | `src/components/dialogs/OpenDialogOnElementClick.tsx` | Edit dialog trigger |
| `CardStatsSquare` | `src/components/card-statistics/CardStatsSquare.tsx` | KPIs compactos |
| `TablePaginationComponent` | `src/components/TablePaginationComponent.tsx` | Paginacion en tablas de tabs |

### Task de implementacion

TASK-257 aplica este patron a Mi Perfil (`/my/profile`).

## Delta 2026-04-04 — TanStack React Table: componentes avanzados extraídos de Vuexy full-version

Se extrajeron los patrones avanzados de tabla del full-version de Vuexy como componentes reutilizables.

### Componentes disponibles

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| `EditableCell` | `src/components/EditableCell.tsx` | Celda editable inline con `onBlur` → `table.options.meta.updateData()` |
| `ColumnFilter` | `src/components/ColumnFilter.tsx` | Filtro por columna: texto (búsqueda) o numérico (min/max range) |
| `DebouncedInput` | `src/components/DebouncedInput.tsx` | Input con debounce 500ms para búsqueda global |
| `TablePaginationComponent` | `src/components/TablePaginationComponent.tsx` | Paginación MUI integrada con TanStack |
| `fuzzyFilter` | `src/components/tableUtils.ts` | Fuzzy filter via `@tanstack/match-sorter-utils` |
| `buildSelectionColumn` | `src/components/tableUtils.ts` | Column definition de checkbox para row selection |
| `getToggleableColumns` | `src/components/tableUtils.ts` | Helper para obtener columnas que pueden ocultarse |
| `getColumnFacetedRange` | `src/components/tableUtils.ts` | Helper para obtener min/max de una columna numérica |

### Patrón de tabla full-featured

```tsx
import { fuzzyFilter, buildSelectionColumn, getToggleableColumns } from '@/components/tableUtils'
import EditableCell from '@/components/EditableCell'
import ColumnFilter from '@/components/ColumnFilter'
import DebouncedInput from '@/components/DebouncedInput'
import TablePaginationComponent from '@/components/TablePaginationComponent'

const table = useReactTable({
  data,
  columns: [buildSelectionColumn<MyRow>(), ...myColumns],
  filterFns: { fuzzy: fuzzyFilter },
  globalFilterFn: fuzzyFilter,
  enableRowSelection: true,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
  getFacetedMinMaxValues: getFacetedMinMaxValues(),
  getPaginationRowModel: getPaginationRowModel(),
  meta: {
    updateData: (rowIndex, columnId, value) => {
      setData(old => old.map((row, i) => i === rowIndex ? { ...row, [columnId]: value } : row))
    }
  }
})
```

### TableMeta augmentation

`tableUtils.ts` augmenta `TableMeta` con `updateData` para que `EditableCell` funcione sin type errors:
```typescript
declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: unknown) => void
  }
}
```

## Delta 2026-04-04 — PeriodNavigator: componente reutilizable de navegación de período

**Archivo**: `src/components/greenhouse/PeriodNavigator.tsx`

Componente compartido para navegación de período mensual (año + mes). Consolida 3 patrones que estaban duplicados en 7+ vistas.

### Variantes

| Variante | Render | Caso de uso |
|----------|--------|-------------|
| `arrows` (default) | `< [Hoy] Abril 2026 >` | Header de cards, vistas de detalle |
| `dropdowns` | `[Año ▼] [Mes ▼] [Hoy]` | Filtros de período en dashboards |
| `compact` | `< Abr 2026 >` | Inline en tablas o espacios reducidos |

### Props

```typescript
interface PeriodNavigatorProps {
  year: number
  month: number
  onChange: (period: { year: number; month: number }) => void
  variant?: 'arrows' | 'dropdowns' | 'compact'  // default: 'arrows'
  minYear?: number          // default: 2024
  maxYear?: number          // default: currentYear + 1
  showToday?: boolean       // default: true
  todayLabel?: string       // default: 'Hoy'
  size?: 'small' | 'medium' // default: 'small'
  disabled?: boolean
}
```

### Uso

```tsx
import PeriodNavigator from '@/components/greenhouse/PeriodNavigator'

<PeriodNavigator
  year={year}
  month={month}
  onChange={({ year, month }) => { setYear(year); setMonth(month) }}
  variant='arrows'
/>
```

### Vistas candidatas a migrar

Las siguientes vistas usan selectores duplicados que deberían migrarse a `PeriodNavigator`:
- `CostAllocationsView` (dropdowns inline)
- `ProjectedPayrollView` (arrows inline)
- `OrganizationEconomicsTab` (dropdowns inline)
- `OrganizationFinanceTab` (dropdowns inline)
- `OrganizationIcoTab` (dropdowns inline)
- `ClientEconomicsView` (dropdowns inline)
- `PersonActivityTab` (dropdowns inline)

### Accesibilidad

- Botones prev/next tienen `aria-label` ("Mes anterior" / "Mes siguiente")
- Tooltips descriptivos en cada control
- Botón "Hoy" indica si ya estás en el período actual
- `disabled` prop deshabilita todos los controles

## Delta 2026-04-03 — Cost Intelligence Dashboard (cost-allocations redesign)

La vista `/finance/cost-allocations` fue rediseñada de un CRUD vacío a un dashboard de inteligencia de costos:

- Tab 1 "Atribución comercial" (default): KPIs con comparativa vs mes anterior + tabla de clientes con drill-down + donut de composición
- Tab 2 "Ajustes manuales": CRUD original preservado para overrides

Patrón aplicado: fetch paralelo de health actual + health período anterior para computar deltas. Las 4 KPI cards usan `HorizontalWithSubtitle` con `trend`/`trendNumber`/`statusLabel`/`footer` siguiendo el patrón canónico documentado abajo.

Para costos: aumento = `'negative'` (rojo), disminución = `'positive'` (verde). Para conteos (clientes, personas): aumento = `'positive'`.

## Delta 2026-04-03 — GreenhouseFunnelCard: componente reutilizable de embudo

**Archivo**: `src/components/greenhouse/GreenhouseFunnelCard.tsx`

Componente de visualización de embudo/funnel para procesos secuenciales con etapas. Usa Recharts `FunnelChart` + `Funnel` (ya instalado, v3.6).

### Props

```typescript
interface FunnelStage {
  name: string
  value: number
  color?: string                                    // Override de color por etapa
  status?: 'success' | 'warning' | 'error'          // Semáforo override
}

interface GreenhouseFunnelCardProps {
  title: string
  subtitle?: string
  avatarIcon?: string                               // Default: 'tabler-filter'
  avatarColor?: ThemeColor                          // Default: 'primary'
  data: FunnelStage[]
  height?: number                                   // Default: 280
  showConversionBadges?: boolean                    // Default: true
  showFooterSummary?: boolean                       // Default: true
  onStageClick?: (stage: FunnelStage, index: number) => void
}
```

### Paleta secuencial por defecto (cuando no hay semáforo)

| Posición | Token | Hex | Razón |
|----------|-------|-----|-------|
| Etapa 1 (tope) | `primary` | `#7367F0` | Punto de entrada |
| Etapa 2 | `info` | `#00BAD1` | Calificación |
| Etapa 3 | `warning` | `#ff6500` | Punto de decisión |
| Etapa 4 | `error` | `#bb1954` | Punto crítico de conversión |
| Etapa 5+ (fondo) | `success` | `#6ec207` | Completación |

### Footer inteligente

Auto-genera dos insights:
1. **Conversión total**: `lastStage.value / firstStage.value × 100`
2. **Etapa crítica**: la etapa con mayor caída % vs anterior. Si todas ≥ 80% → "Flujo saludable"

### Accesibilidad

- `<figure role="img" aria-label="...">` con `<figcaption class="sr-only">` detallando cada etapa
- Respeta `prefers-reduced-motion` desactivando animaciones
- Cada trapezoide tiene 24px mínimo de altura (target de interacción)
- Labels de texto en cada etapa (no depende solo de color)
- Si `onStageClick` presente: etapas focusables con `tabIndex={0}` y `role="button"`

### Casos de uso

- Pipeline CSC (Delivery): Briefing → Producción → Revisión → Cambios → Entrega
- Pipeline CRM: Leads → Calificados → Propuesta → Negociación → Cierre
- Onboarding: Contacto → Propuesta → Contrato → Setup → Activo
- Cualquier proceso secuencial con `FunnelStage[]`

## Delta 2026-04-03 — Helpers canónicos de comparativa + patrones de KPI cards

### Helpers reutilizables de comparativa

Dos archivos canónicos para cualquier vista que necesite mostrar deltas entre períodos o monedas:

**`src/lib/finance/currency-comparison.ts`** — funciones puras, importable desde client Y server:

| Función | Propósito | Ejemplo de uso |
|---------|-----------|----------------|
| `consolidateCurrencyEquivalents(totals, usdToClp)` | Convierte multi-currency `{ USD, CLP }` a totales consolidados CLP y USD | Cards de Nómina, Finance |
| `computeCurrencyDelta(current, compare, rate, label)` | Computa `grossDeltaPct`, `netDeltaPct`, `compareLabel`, `grossReference`, `netReference` | Cards con "vs oficial" o "vs 2026-03" |
| `payrollTrendDirection(deltaPct)` | Para costos: subir = `'negative'`, bajar = `'positive'` | Prop `trend` de `HorizontalWithSubtitle` |
| `formatDeltaLabel(deltaPct, label)` | `"5% vs 2026-03"` | Prop `trendNumber` de `HorizontalWithSubtitle` |

**`src/lib/payroll/period-comparison.ts`** — server-only, queries PostgreSQL:

| Función | Propósito |
|---------|-----------|
| `getPreviousOfficialPeriodTotals(beforePeriodId)` | Último período oficial (`approved`/`exported`) anterior al dado |
| `getOfficialPeriodTotals(periodId)` | Oficial del mismo período |

Patrón de uso en API routes:
```typescript
import { consolidateCurrencyEquivalents } from '@/lib/finance/currency-comparison'
import { getPreviousOfficialPeriodTotals } from '@/lib/payroll/period-comparison'

const previousOfficial = await getPreviousOfficialPeriodTotals(periodId)
const consolidated = consolidateCurrencyEquivalents(totals, usdToClp)
```

Patrón de uso en views (client):
```typescript
import { computeCurrencyDelta, payrollTrendDirection, formatDeltaLabel } from '@/lib/finance/currency-comparison'

const delta = computeCurrencyDelta(current, compareSource, fxRate, 'vs 2026-03')
// → { grossDeltaPct: 5, netDeltaPct: 3, compareLabel: 'vs 2026-03', grossReference: 3120000, netReference: 2800000 }

<HorizontalWithSubtitle
  trend={payrollTrendDirection(delta.grossDeltaPct)}      // 'negative' (costo subió)
  trendNumber={formatDeltaLabel(delta.grossDeltaPct, delta.compareLabel)}  // "5% vs 2026-03"
  footer={`Anterior: ${formatCurrency(delta.grossReference, 'CLP')}`}
/>
```

### Helpers de tendencia para ICO/Delivery

**`trendDelta()`** en `AgencyDeliveryView.tsx` — helper local para comparativas mes-a-mes en trend arrays:

```typescript
// trendDelta(trend, field) → { text, number, direction, prevLabel } | null
// - text: "+3pp vs Mar" (formatted for display)
// - number: "3pp" (absolute delta for HorizontalWithSubtitle.trendNumber)
// - direction: 'positive' | 'negative' | 'neutral'
// - Para RPA (lower is better), direction is INVERTED: decrease = positive
```

### Patrones de cards Vuexy para data storytelling

1. **Hero KPI** (BarChartRevenueGrowth pattern): `Card` con KPI `h3` grande + `CustomChip` trend + mini bar chart ApexCharts. Usar para la métrica principal de cada vista.
2. **Rich KPI** (`HorizontalWithSubtitle` con todas las props): `trend` + `trendNumber` + `statusLabel`/`statusColor`/`statusIcon` + `footer`. Usar para métricas secundarias con comparativa.
3. **Attention card** (accent left border): `Card` con `borderLeft: 4px solid` color semáforo. Usar para items que requieren acción.

### Regla

Toda vista que muestre métricas operativas debe incluir comparativa vs período anterior. No mostrar números aislados sin contexto.

## Delta 2026-03-31 — Shared uploader pattern

`TASK-173` ya deja un patrón canónico de upload para el portal:
- componente shared `src/components/greenhouse/GreenhouseFileUploader.tsx`
- base visual y funcional:
  - `react-dropzone`
  - `src/libs/styles/AppReactDropzone.ts`

Regla de plataforma:
- si una surface del portal necesita adjuntos, debe intentar reutilizar `GreenhouseFileUploader` antes de crear un uploader propio
- la personalización por módulo debe vivir en props, labels, allowed mime types y aggregate context
- no copiar el demo de Vuexy inline en cada módulo

## Delta 2026-03-30 — View Governance UI ya es parte de la plataforma

`/admin/views` ya no debe leerse como experimento aislado.

La plataforma UI ahora asume un patrón explícito de gobernanza de vistas:
- catálogo de superficies gobernables por `view_code`
- matrix por rol como superficie de administración
- preview por usuario con lectura efectiva
- enforcement page-level/layout-level por `view_code`
- auditoría y overrides como parte del mismo módulo

Esto convierte `Admin Center > Vistas y acceso` en un componente de plataforma, no en una pantalla ad hoc.

## Delta 2026-03-30 — capability modules cliente entran al modelo gobernable

La sección `Módulos` del portal cliente ya no debe tratarse como navegación libre derivada solo desde `routeGroups`.

Estado vigente:
- `cliente.modulos` es el access point gobernable del carril `/capabilities/**`
- el menú solo debe exponer capability modules cuando la sesión conserve esa vista
- el acceso al layout dinámico debe pasar dos checks:
  - `view_code` broad del carril (`cliente.modulos`)
  - autorización específica del módulo (`verifyCapabilityModuleAccess`)

Esto deja explícito que los capability modules son parte del modelo de gobierno del portal y no un apéndice fuera de `/admin/views`.

## Delta 2026-03-31 — Person Detail View: Enterprise Redesign Pattern (TASK-168)

La vista de detalle de persona (`/people/:slug`) fue rediseñada como referencia canónica de un patrón enterprise aplicable a cualquier entity detail view del portal.

### Patrón: Horizontal Profile Header + Consolidated Tabs

Reemplaza el patrón anterior de sidebar izquierdo + contenido derecho con:

```
┌──────────────────────────────────────────────────────────────────┐
│  PROFILE HEADER (full-width Card)                                │
│  Avatar(80px) + Name + Role + Email + Integration Chips          │
│  3x CardStatsSquare (FTE, Hrs, Spaces) + Status Chip + ⚙ Admin  │
├──────────────────────────────────────────────────────────────────┤
│  [Tab1] [Tab2] [Tab3] [Tab4] [Tab5]  ← máx 5-6 tabs, sin scroll │
├──────────────────────────────────────────────────────────────────┤
│  Tab content (full-width, Accordion sections)                    │
└──────────────────────────────────────────────────────────────────┘
```

### Decisiones de diseño validadas (research enterprise UX 2026)

| Decisión | Justificación |
|----------|---------------|
| Header horizontal > sidebar | Top-rail layout maximiza content area ([Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)) |
| Tabs consolidados (9→5) | Máx 5-6 tabs evitan overflow; agrupar por dominio lógico |
| Progressive disclosure (Accordion) | "Carefully sequencing when users encounter features" ([FuseLab 2026](https://fuselabcreative.com/enterprise-ux-design-guide-2026-best-practices/)) |
| Campos vacíos omitidos | Reducir ruido: no renderizar "—" dashes en DOM |
| Admin actions en OptionMenu | Quick actions accesibles desde cualquier tab, sin clutterear la UI |
| Integration status con chips | Texto + icon + color (no solo ✓/✗) para WCAG 2.2 AA |
| Legacy URL redirects | Backward-compatible: `?tab=compensation` → `?tab=economy` |

### Componentes del patrón

| Componente | Archivo | Rol |
|-----------|---------|-----|
| `PersonProfileHeader` | `views/greenhouse/people/PersonProfileHeader.tsx` | Header horizontal con avatar, KPIs, admin OptionMenu |
| `PersonProfileTab` | `views/greenhouse/people/tabs/PersonProfileTab.tsx` | 3 Accordion sections: datos laborales, identidad, actividad |
| `PersonEconomyTab` | `views/greenhouse/people/tabs/PersonEconomyTab.tsx` | Compensación card + nómina accordion + costos accordion |
| `CardStatsSquare` | `components/card-statistics/CardStatsSquare.tsx` | KPI pill compacto en headers |

### Cuándo aplicar este patrón

Usar para **cualquier entity detail view** que tenga:
- Identidad (avatar, nombre, estado)
- 4+ secciones de contenido
- Acciones admin contextuales
- Múltiples dominios de datos (HR, Finance, Delivery, etc.)

Candidatos: Organization Detail, Space Detail, Client Detail, Provider Detail.

### Reglas de Accordion en detail views

- `defaultExpanded` solo para la primera sección (la más usada)
- Secciones sin datos no se renderizan (no empty states dentro de accordions)
- Cada accordion header: `Avatar variant='rounded' skin='light'` + `Typography h6` + subtitle
- Divider entre summary y details
- `disableGutters elevation={0}` en el Accordion interno, Card wrapper con border

## Stack Principal

| Capa | Tecnología | Versión | Rol |
|------|-----------|---------|-----|
| Framework | Next.js App Router | 16.1 | Server/client components, routing, layouts |
| UI Library | MUI (Material UI) | 7.3 | Core components, theme system, sx prop |
| Theme Layer | Vuexy Starter Kit | 5.0 | MUI overrides, card patterns, layout system |
| Styling | Emotion + sx prop | 11.14 | CSS-in-JS, no Tailwind en runtime |
| Charts (compact) | ApexCharts | 3.49 | Sparklines, radial bars, donut, heatmaps |
| Charts (dashboard) | Recharts | 3.6 | Full-width charts, multi-series, tooltips |
| Data Tables | TanStack React Table | 8.21 | Sorting, filtering, pagination, row selection |
| Icons | Iconify (Tabler set) | 2.0 | `tabler-*` icon names via Iconify |
| Font | DM Sans | — | `var(--font-dm-sans)`, monospace para IDs |

## Librerías Disponibles — Inventario Completo

### Activamente usadas

| Librería | Archivos que la usan | Para qué |
|----------|---------------------|----------|
| `@mui/material` + `@mui/lab` | 200+ | Core UI: Button, Card, Table, Dialog, Chip, etc. |
| `recharts` | 15+ | Dashboard charts, trend lines, bar comparisons |
| `apexcharts` / `react-apexcharts` | 10+ | KPI sparklines, radial gauges, donut charts |
| `@tanstack/react-table` | 20+ | Tables con sorting, filtering, pagination |
| `react-toastify` | 17 | Toast notifications (success, error, info) |
| `react-perfect-scrollbar` | 10 | Custom scrollbars en sidebar y paneles |
| `react-use` | 7 | Hooks utilitarios (useDebounce, useMedia, etc.) |
| `date-fns` | 10+ | Formateo y manipulación de fechas |
| `@react-pdf/renderer` | 5+ | Generación de PDFs (recibos, reportes) |
| `@react-email/components` | 6+ | Templates de email transaccional |
| `@assistant-ui/react` | 3+ | Nexa AI assistant UI |
| `@sentry/nextjs` | 4 | Error tracking y observability |
| `lottie-react` | 1+ | Animated illustrations en empty states (dynamic import, SSR-safe) |
| `framer-motion` | 1+ | Micro-interacciones numéricas (AnimatedCounter en KPIs) |

### Instaladas pero NO usadas (oportunidad de activación)

| Librería | Paquetes | Potencial | Módulos beneficiados |
|----------|----------|-----------|---------------------|
| **`react-hook-form`** + **`@hookform/resolvers`** | 2 | **Crítico** | Todo form del portal (30+ forms con useState manual) |
| **`@fullcalendar/*`** | 6 (core, daygrid, timegrid, list, interaction, react) | **Alto** | Calendario operativo, leave management, payroll deadlines, sprints |
| **`react-datepicker`** | 1 (usado en 1 archivo) | **Alto** | Date range filters, override expiration, period selectors |
| **`@formkit/drag-and-drop`** | 1 | **Medio** | View reorder, kanban, priority drag |
| **`@tiptap/*`** | 10 (core, react, starter-kit, extensions) | **Medio** | Rich text editor para notas, descripciones, templates |
| **`react-dropzone`** | 1 | **Medio** | File upload (documentos, avatars, attachments) |
| **`react-colorful`** | 1 (usado en 1 archivo) | **Bajo** | Color picker (ya usado mínimamente) |
| **`react-player`** | 1 | **Bajo** | Video playback (Creative Hub futuro) |
| **`@reduxjs/toolkit`** + **`react-redux`** | 2 | **No recomendado** | Server components + useState son suficientes |
| **`@floating-ui/*`** | 2 | **Bajo** | Positioning (MUI Popper ya lo cubre) |

## Vuexy Component System

### Wrappers (@core/components/mui/)

Vuexy envuelve componentes MUI con estilizado consistente:

| Wrapper | MUI Base | Agrega |
|---------|----------|--------|
| `CustomAvatar` | Avatar | Props `color`, `skin` ('light'/'filled'), `size` |
| `CustomChip` | Chip | Prop `round`, tonal variants |
| `CustomTabList` | TabList | Styled tab navigation |
| `CustomTextField` | TextField | Pre-themed input |
| `CustomIconButton` | IconButton | `variant` ('tonal'/'outlined'/'contained') |
| `CustomBadge` | Badge | `tonal` option |

**Regla:** Siempre usar wrappers Vuexy cuando existan en vez de MUI raw.

### Card Statistics (KPI displays)

| Component | Cuándo usar | Props clave |
|-----------|------------|-------------|
| `HorizontalWithSubtitle` | KPI con trend arrow | `title, stats, subtitle, avatarIcon, avatarColor, trend` |
| `HorizontalWithBorder` | KPI con borde inferior coloreado | `title, stats, trendNumber, avatarIcon, color` |
| `HorizontalWithAvatar` | Métrica simple con ícono | `stats, title, avatarIcon, avatarColor` |
| `Vertical` | Métrica centrada con chip | `title, stats, avatarIcon, chipText, chipColor` |
| `StatsWithAreaChart` | Métrica con sparkline | `stats, title, chartColor, chartSeries` |
| `ExecutiveMiniStatCard` | KPI de Admin Center | `title, value, detail, icon, tone` |

### Layout Patterns

| Pattern | Implementación |
|---------|---------------|
| Section header | `ExecutiveCardShell` con `title` + `subtitle` |
| Outlined card | `Card variant='outlined'` |
| Accent border | `borderLeft: '4px solid'` + palette color |
| KPI row (4 cols) | `Box` con `gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }` |
| Content 8/4 split | `Grid` con `xs={12} md={8}` + `xs={12} md={4}` |
| Entity detail view | `Stack spacing={6}` → ProfileHeader → Tabs → TabContent (full-width) |
| Accordion section | `Card border` → `Accordion disableGutters` → `AccordionSummary` (Avatar+h6) → `Divider` → `AccordionDetails` |

### Admin Center Patterns

| Pattern | Componente | Usado en |
|---------|-----------|----------|
| Domain card | `DomainCard` en `AdminCenterView` | Landing de Admin Center |
| Ops action button | `AdminOpsActionButton` | Cloud & Integrations, Ops Health, Notifications |
| Health chip | `Chip variant='tonal'` con color semáforo | Ops Health, Cloud posture |
| Delivery health bar | `LinearProgress` + `Chip` de estado | Notifications, Webhooks |
| View access matrix | `AdminViewAccessGovernanceView` | `/admin/views` |
| Effective access preview | `AdminViewAccessGovernanceView` | `/admin/views` |

## View Governance Architecture

### Objetivo

Separar:
- navegación broad por `routeGroups`
- autorización fina de superficies por `view_code`

La UI debe ayudar a responder tres preguntas:
1. qué ve un rol hoy
2. qué override tiene un usuario
3. qué terminará viendo realmente esa sesión

### Modelo UI canónico

`/admin/views` debe conservar estas capas:
- **hero + KPIs**
  - registrar cobertura
  - exponer drift entre persistido y fallback
- **matrix por rol**
  - editar `granted/revoked`
  - mostrar origen `persisted` vs `hardcoded_fallback`
- **preview por usuario**
  - baseline visible por rol
  - grants extra por override
  - revokes efectivos
  - auditoría reciente
- **roadmap / follow-on**
  - dejar explícito qué parte del modelo sigue transicional

### Tokens semánticos

Convención operativa para la UI:
- `success`
  - concesión activa
  - grant extra
- `warning`
  - cambio pendiente
  - override activo
- `error`
  - revoke efectivo
  - fallback que aún debe modelarse mejor
- `info`
  - baseline persistido o lectura neutra

### Reglas de UX para matrix y preview

1. La matrix no debe presentarse como pared indiferenciada de checks.
2. Debe existir foco explícito para:
   - cambios pendientes
   - fallback heredado
   - impacto efectivo por usuario
3. El preview debe distinguir siempre:
   - baseline por rol
   - override grant
   - override revoke
4. La auditoría visible debe convivir con la edición; no debe quedar escondida fuera del flujo.
5. Si una vista sigue dependiendo de fallback hardcoded, la UI debe hacerlo visible.

### Regla de implementación

Cuando nazca una nueva superficie gobernable:
- agregar `view_code` en `src/lib/admin/view-access-catalog.ts`
- alinear menú si corresponde
- agregar guard page-level o layout-level
- reflejarla automáticamente en `/admin/views`

No abrir nuevas pantallas visibles relevantes sin decidir al menos una de estas dos posturas:
- `tiene view_code propio`
- `queda explícitamente fuera del modelo porque es una ruta base transversal`

### Excepción documentada actual

`/home` queda explícitamente fuera del modelo de `view_code`.

Razón de plataforma:
- es el landing base de internos vía `portalHomePath`
- funciona como shell de arranque para Nexa, quick access y tareas
- su contenido ya se restringe indirectamente por:
  - módulos resueltos
  - notificaciones visibles
  - rutas destino posteriores

Eso significa:
- no debe aparecer en `/admin/views` como vista gobernable por ahora
- no debe bloquearse con `hasAuthorizedViewCode()` mientras siga siendo la entrada transversal segura de la sesión interna

## State Management

### Patrón actual

| Contexto | Mecanismo | Cuándo |
|----------|-----------|--------|
| Server data | Server Components + `async` | Páginas que leen datos (90% del portal) |
| Client interacción | `useState` + `useReducer` | Forms, toggles, modals |
| Sesión | NextAuth JWT | Identity, roles, routeGroups |
| Tema | MUI ThemeProvider | Dark/light mode |
| Toast | `react-toastify` | Feedback transient |
| Operating entity | `OperatingEntityContext` | Tenant switching |

### Patrón recomendado post-activación

| Contexto | Mecanismo | Cuándo |
|----------|-----------|--------|
| Forms complejos | `react-hook-form` | Forms con validación, dirty tracking, error handling |
| Forms simples | `useState` | Toggle, input simple, modal open/close |
| Server data | Server Components | Sin cambio |
| Estado global client | `useState` + Context | Sin cambio (no necesita Redux) |

## Form Architecture

### Situación actual (deuda técnica)

30+ forms en el portal usan `useState` manual:

```typescript
// Patrón actual — verbose, sin validación declarativa
const [email, setEmail] = useState('')
const [error, setError] = useState('')
const handleSubmit = async () => {
  if (!email) { setError('required'); return }
  // ... submit
}
```

### Patrón objetivo con react-hook-form

```typescript
// Patrón enterprise — declarativo, performante
const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
  defaultValues: { email: '' }
})
const onSubmit = handleSubmit(async (data) => { /* ... */ })
// isDirty tracking automático, no re-render por keystroke
```

### Activación real inicial

- `src/views/Login.tsx`
  - migrado a `react-hook-form` como referencia canónica para credenciales
  - **TASK-130**: loading states enterprise-grade, transición post-auth, errores categorizados
- `src/app/(blank-layout-pages)/auth/forgot-password/page.tsx`
  - migrado a `react-hook-form` como segundo ejemplo liviano de auth form
- Helper canónico inicial:
  - `src/lib/forms/greenhouse-form-patterns.ts`
- Regla práctica vigente:
  - wrappers MUI/Vuexy + helpers reutilizables primero
  - no introducir schemas pesados mientras no exista una necesidad real de Zod/Yup

### Auth form loading states & transitions (TASK-130)

Login.tsx implementa un flujo de estados completo para auth:

| Estado | UI | Interacción |
|--------|-----|-------------|
| **Idle** | Form activo, botones habilitados | Usuario puede interactuar |
| **Validating** | `LoadingButton` con spinner, `LinearProgress` top, inputs deshabilitados | Todo deshabilitado |
| **SSO Loading** | Botón SSO con `CircularProgress` + "Redirigiendo a {provider}...", `LinearProgress` | Todo deshabilitado |
| **Transitioning** | Logo + spinner + "Preparando tu espacio de trabajo...", form oculto | Sin interacción |
| **Error** | `Alert` con severity categorizada + botón cerrar, form re-habilitado | Reintentar |

Componentes MUI usados:
- `LoadingButton` (`@mui/lab`) — botón credenciales con spinner integrado
- `CircularProgress` (`@mui/material`) — loading individual por SSO provider
- `LinearProgress` (`@mui/material`) — señal global indeterminada en top del card
- `Alert` con `onClose` — errores categorizados con severity warning/error

Error categorization (`mapAuthError`):
- `CredentialsSignin` → `login_error_credentials` (severity: error)
- `AccessDenied` → `login_error_account_disabled` (severity: error)
- `SessionRequired` → `login_error_session_expired` (severity: error)
- fetch/network errors → `login_error_network` (severity: warning)
- provider timeout → `login_error_provider_unavailable` (severity: warning)

Loading skeleton para resolución de sesión:
- `src/app/auth/landing/loading.tsx` — Next.js loading convention, logo + spinner + "Preparando tu espacio de trabajo..."
- Elimina pantalla en blanco entre login exitoso y dashboard

### Reglas de adopción

1. **Nuevos forms** → siempre `react-hook-form`
2. **Forms existentes** → migrar cuando se toquen por otra task (no migrar proactivamente)
3. **Forms de 1-2 campos** → `useState` sigue siendo aceptable
4. **Validación** → `@hookform/resolvers` con schemas inline (no Zod — no está instalado)

## Calendar Architecture

### Capacidad disponible (sin usar)

FullCalendar está instalado con 6 paquetes:
- `@fullcalendar/core` — motor
- `@fullcalendar/react` — wrapper React
- `@fullcalendar/daygrid` — vista mes/semana
- `@fullcalendar/timegrid` — vista día con horas
- `@fullcalendar/list` — vista lista
- `@fullcalendar/interaction` — drag, resize, click

### Casos de uso en el portal

| Módulo | Vista | Eventos |
|--------|-------|---------|
| HR / Leave | Calendario de permisos | Leave requests, aprobaciones |
| Payroll | Deadlines operativos | Cierre, cálculo, exportación por período |
| Delivery | Timeline de sprints | Ciclos, milestones, deadlines |
| Calendario operativo | Vista unificada | `src/lib/calendar/operational-calendar.ts` ya existe |

### Reglas de adopción

1. Usar `@fullcalendar/react` como wrapper
2. Eventos vienen de server components (no fetch client-side)
3. Colores del semáforo Greenhouse para estados de eventos
4. Locale `es` para labels en español
5. No mezclar con MUI DatePicker para selección de fechas (FullCalendar es para visualización)

### Activación real inicial

- Wrapper canónico:
  - `src/components/greenhouse/GreenhouseCalendar.tsx`
- Primera vista real:
  - `src/app/(dashboard)/admin/operational-calendar/page.tsx`
  - `src/views/greenhouse/admin/AdminOperationalCalendarView.tsx`
- Fuente de datos inicial:
  - `src/lib/calendar/get-admin-operational-calendar-overview.ts`
  - reutiliza `operational-calendar.ts` + `nager-date-holidays.ts`

## Date Handling

### Librerías disponibles

| Librería | Para qué | Cuándo usar |
|----------|----------|-------------|
| `date-fns` | Formateo, parsing, cálculos | Lógica de negocio, formateo en server |
| `react-datepicker` | Input de fecha en forms | Override expiration, filtros de rango |
| `@fullcalendar` | Visualización de calendario | Vistas de calendario completas |

### Timezone canónica

- Base: `America/Santiago` vía IANA del runtime
- Feriados: `Nager.Date` + overrides en Greenhouse
- Helper canónico: `src/lib/calendar/operational-calendar.ts`

### Date picker canónico inicial

- Wrapper:
  - `src/components/greenhouse/GreenhouseDatePicker.tsx`
- Primer uso real:
  - selector mensual en `AdminOperationalCalendarView`
- Criterio:
  - usar este wrapper para inputs de fecha del portal antes de introducir inputs manuales

## Rich Text (disponible, sin activar)

Tiptap está instalado con 10 paquetes pero sin uso. Potencial para:
- Notas en fichas de persona
- Descripciones de proyectos
- Templates de notificación
- Comentarios en revisiones

No activar hasta que un caso de uso lo requiera explícitamente.

## Drag and Drop (disponible, sin activar)

`@formkit/drag-and-drop` está instalado. Potencial para:
- Reorder de vistas en sidebar (TASK-136)
- Kanban de tareas en Delivery
- Priorización visual de backlog
- Reorder de KPIs en dashboards

Activar cuando un caso de uso lo requiera.

### Activación real inicial

- Wrapper canónico:
  - `src/components/greenhouse/GreenhouseDragList.tsx`
- Primer uso real:
  - reorder local de domain cards en `src/views/greenhouse/admin/AdminCenterView.tsx`
- Persistencia inicial:
  - `localStorage`
- Evolución esperada:
  - mover a preferencias de usuario cuando exista contrato shared de layout personalization

## File Upload (disponible, sin activar)

`react-dropzone` está instalado. Potencial para:
- Upload de documentos en HRIS (TASK-027)
- Avatars de usuario
- Attachments en expense reports (TASK-028)
- Import de CSVs

## Convenciones de Código UI

### Imports

```typescript
// 1. React
import { useState } from 'react'

// 2. Next.js
import Link from 'next/link'

// 3. MUI (con wrappers Vuexy cuando existan)
import Button from '@mui/material/Button'
import CustomTextField from '@core/components/mui/TextField'

// 4. Greenhouse components
import { ExecutiveCardShell } from '@/components/greenhouse'

// 5. Greenhouse config
import { GH_MESSAGES } from '@/config/greenhouse-nomenclature'

// 6. Types
import type { OperationsOverview } from '@/lib/operations/get-operations-overview'
```

### Naming

- Views: `Admin{Feature}View.tsx` (e.g., `AdminNotificationsView.tsx`)
- Components: `{Feature}{Type}.tsx` (e.g., `ViewPermissionMatrix.tsx`)
- Pages: `page.tsx` in route directory
- Tests: co-located `*.test.tsx`

### sx Prop (no className, no styled())

```typescript
// Correcto — sx prop
<Box sx={{ display: 'flex', gap: 2, p: 3 }}>

// Incorrecto — className o styled
<Box className="flex gap-2 p-3">
<StyledBox>
```

## Animation Architecture (TASK-230)

### Stack

| Librería | Wrapper | Uso principal |
|----------|---------|---------------|
| `lottie-react` | `src/libs/Lottie.tsx` | Ilustraciones animadas (empty states, loading, onboarding) |
| `framer-motion` | `src/libs/FramerMotion.tsx` | Micro-interacciones (counters, transitions, layout animations) |

Ambas se cargan via dynamic import o `'use client'` re-export para evitar problemas SSR.

### Accesibilidad — prefers-reduced-motion (obligatorio)

Toda animación nueva DEBE respetar `prefers-reduced-motion: reduce`. El hook canónico:

```tsx
import useReducedMotion from '@/hooks/useReducedMotion'
const prefersReduced = useReducedMotion()
// Si true → renderizar estado final sin animación
```

Cuando `prefersReduced` es `true`:
- `EmptyState` muestra el icono estático (fallback `icon`)
- `AnimatedCounter` renderiza el valor final instantáneamente
- Componentes futuros deben seguir el mismo contrato

### Componentes

#### AnimatedCounter

Transición numérica para KPIs. Anima al entrar en viewport (una vez).

```tsx
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'

<AnimatedCounter value={42} format='integer' />           // "42"
<AnimatedCounter value={1250000} format='currency' />      // "$1.250.000"
<AnimatedCounter value={94.5} format='percentage' />       // "94,5%"
<AnimatedCounter value={42} format='integer' duration={1.2} />  // duración custom
```

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `value` | `number` | (requerido) | Valor numérico final |
| `format` | `'currency' \| 'percentage' \| 'integer'` | `'integer'` | Formato de salida |
| `currency` | `string` | `'CLP'` | Código ISO para formato currency |
| `duration` | `number` | `0.8` | Duración en segundos |
| `locale` | `string` | `'es-CL'` | Locale para Intl.NumberFormat |

Para usar dentro de `HorizontalWithSubtitle` (el prop `stats` acepta `string | ReactNode`):

```tsx
<HorizontalWithSubtitle
  title='DSO'
  stats={<><AnimatedCounter value={42} format='integer' /> días</>}
  subtitle='Days Sales Outstanding'
  avatarIcon='tabler-clock-dollar'
  avatarColor='success'
/>
```

#### EmptyState — prop animatedIcon

```tsx
<EmptyState
  icon='tabler-calendar-off'                    // fallback estático (siempre requerido)
  animatedIcon='/animations/empty-inbox.json'   // Lottie JSON path (opcional)
  title='No hay períodos'
  description='Cambia el filtro para ver otros meses.'
/>
```

- Si `animatedIcon` se pasa y carga correctamente → muestra animación Lottie (64×64px, loop)
- Si falla la carga → fallback silencioso al `icon` estático
- Si `prefers-reduced-motion` → siempre muestra `icon` estático

### Assets Lottie

Directorio: `public/animations/`

| Archivo | Uso |
|---------|-----|
| `empty-inbox.json` | Empty states genéricos (sin datos, sin períodos) |
| `empty-chart.json` | Empty states de charts/visualizaciones |

Para agregar assets nuevos:
1. Descargar JSON desde [LottieFiles](https://lottiefiles.com) (formato Bodymovin JSON, no dotLottie)
2. Guardar en `public/animations/` con nombre descriptivo kebab-case
3. Usar colores neutros o de la paleta Greenhouse (los assets se renderizan tal cual)
4. Tamaño recomendado del canvas: 120×120px

### Reglas de adopción

- **Reutilizar `AnimatedCounter`** antes de crear otro componente de transición numérica
- **Reutilizar `useReducedMotion`** para cualquier animación condicional
- **No importar `framer-motion` directo** — usar `src/libs/FramerMotion.tsx` para re-exports centralizados
- **No importar `lottie-react` directo** — usar `src/libs/Lottie.tsx` (dynamic import SSR-safe)
- **Lottie JSON < 50KB** recomendado para cada asset individual
- **No usar GSAP ni Three.js** para micro-interacciones — están fuera del scope de animación UI (Three.js se reserva para TASK-233 logo animation)
- **El prop `animatedIcon` es opt-in** — no reemplazar empty states masivamente sin validación visual

### Pilotos activos

| Vista | Componente | Instancias |
|-------|-----------|------------|
| Finance Dashboard | `AnimatedCounter` | 3 (DSO, DPO, Ratio nómina/ingresos) |
| Finance Period Closure | `EmptyState` + `animatedIcon` | 2 (períodos vacíos, snapshots vacíos) |

## Error Handling & Feedback Patterns (TASK-236)

### Fetch error states

Toda vista que hace `fetch()` client-side DEBE tener un estado `error` con feedback accionable. Nunca dejar un spinner girando indefinidamente.

```tsx
const [error, setError] = useState<string | null>(null)

const loadData = useCallback(async () => {
  setLoading(true)
  setError(null)
  try {
    const res = await fetch('/api/...')
    const json = await res.json()
    setData(json)
  } catch {
    setError('No pudimos cargar los datos. Verifica tu conexión e intenta de nuevo.')
    setData(null)
  } finally {
    setLoading(false)
  }
}, [...])

// En el render:
{loading ? (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
    <CircularProgress />
    <Typography variant='body2' color='text.secondary'>Cargando datos...</Typography>
  </Box>
) : error ? (
  <EmptyState
    icon='tabler-cloud-off'
    title='No pudimos cargar los datos'
    description={error}
    action={<Button variant='outlined' onClick={() => loadData()}>Reintentar</Button>}
  />
) : /* render normal data */}
```

### Mutation feedback (toasts)

Toda mutación (POST, PATCH, PUT, DELETE) debe mostrar feedback via toast:

```tsx
import { toast } from 'react-toastify'

// Después de mutation exitosa:
toast.success('Cambios guardados')

// En catch de mutation fallida:
toast.error('No se pudieron guardar los cambios. Intenta de nuevo.')
```

### Loading text contextual

Los spinners standalone deben incluir texto descriptivo en español:

- "Cargando servicios..." (no solo CircularProgress sin texto)
- "Cargando detalle del servicio..."
- "Calculando métricas ICO..."

### Empty states para tablas vacías

Toda tabla que puede estar vacía debe usar `EmptyState` (no tabla vacía silenciosa):

```tsx
items.length === 0 ? (
  <EmptyState
    icon='tabler-package-off'
    animatedIcon='/animations/empty-inbox.json'
    title='Sin servicios'
    description='No se encontraron servicios con los filtros seleccionados.'
  />
) : /* render table */
```

### Vistas que ya implementan este patrón

| Vista | Error state | Empty state | Toast | Loading text |
|-------|------------|------------|-------|-------------|
| Agency ServicesListView | Retry button | EmptyState animado | — | Contextual |
| Agency ServiceDetailView | Error/not-found | EmptyState | — | Contextual |
| Agency StaffAugmentationListView | Retry button | EmptyState animado | — | Contextual |
| Agency PlacementDetailView | Error/not-found | EmptyState | Onboarding update | Contextual |
| Agency CreatePlacementDialog | Alert inline | — | Placement creado | — |
| Agency Workspace (3 lazy tabs) | Retry button | — | — | Skeletons |

## Breadcrumbs Pattern (TASK-238)

Para vistas de detalle con jerarquía de navegación, usar **MUI Breadcrumbs** en vez de botones "Volver":

```tsx
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from 'next/link'

<Breadcrumbs aria-label='breadcrumbs' sx={{ mb: 2 }}>
  <Typography component={Link} href='/agency?tab=spaces' color='inherit' variant='body2'
    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
    Agencia
  </Typography>
  <Typography component={Link} href='/agency?tab=spaces' color='inherit' variant='body2'
    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
    Spaces
  </Typography>
  <Typography color='text.primary' variant='body2'>
    {detail.clientName}
  </Typography>
</Breadcrumbs>
```

**Reglas:**
- Breadcrumbs reemplazan botones "Volver a X" — no duplicar ambos
- Cada nivel intermedio es un link, el último nivel es texto estático
- `variant='body2'` para tamaño compacto
- Links con `textDecoration: 'none'` y hover underline
- `aria-label='breadcrumbs'` para accesibilidad
- Implementado en: Agency Space 360, Greenhouse Project Detail, Sprint Detail

## Progressive Disclosure Pattern (TASK-237)

Para vistas data-dense con más de 10 tarjetas en scroll vertical, usar **Accordion colapsable** para agrupar secciones secundarias:

```tsx
<Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
  <Accordion disableGutters elevation={0}>
    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <i className='tabler-heartbeat' style={{ fontSize: 20 }} />
        <Typography variant='h6'>Salud de entrega</Typography>
        <CustomChip size='small' round variant='tonal' color='success' label='Mejorando' />
      </Box>
    </AccordionSummary>
    <AccordionDetails>
      {/* contenido colapsable */}
    </AccordionDetails>
  </Accordion>
</Card>
```

**Reglas:**
- KPIs primarios siempre visibles (no colapsar)
- Charts siempre visibles (no colapsar)
- Scorecards/tablas siempre visibles
- Reports detallados → Accordion colapsado por defecto
- Cada Accordion summary muestra chip con estado/resumen para que el usuario sepa si vale la pena expandir
- Implementado en: Agency ICO Engine tab (3 Accordions para performance report)

## Anti-Patterns

- No usar MUI raw cuando existe wrapper Vuexy
- No usar Tailwind classes en runtime (solo PostCSS para global)
- No usar `elevation > 0` en cards internas (usar `variant='outlined'`)
- No mezclar español e inglés en la misma surface
- No hardcodear colores — siempre `theme.palette.*`
- No crear stat displays custom cuando un card-statistics component sirve
- No usar Redux para estado local — `useState` o `react-hook-form`
- No instalar librerías nuevas sin verificar si ya están disponibles en este inventario
- No importar `lottie-react` o `framer-motion` directo — usar los wrappers en `src/libs/`
- No crear animaciones que ignoren `prefers-reduced-motion` — usar `useReducedMotion` hook
