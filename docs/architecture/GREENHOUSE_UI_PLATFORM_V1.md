# Greenhouse EO — UI Platform Architecture V1

> **Version:** 1.0
> **Created:** 2026-03-30
> **Audience:** Frontend engineers, UI/UX architects, agents implementing views

---

## Overview

Greenhouse EO es un portal Next.js 16 App Router con MUI 7.x envuelto por el starter-kit Vuexy. Este documento es la referencia canónica de la plataforma UI: stack, librerías disponibles, patrones de componentes, convenciones de estado, y reglas de adopción.

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
- `src/app/(blank-layout-pages)/auth/forgot-password/page.tsx`
  - migrado a `react-hook-form` como segundo ejemplo liviano de auth form
- Helper canónico inicial:
  - `src/lib/forms/greenhouse-form-patterns.ts`
- Regla práctica vigente:
  - wrappers MUI/Vuexy + helpers reutilizables primero
  - no introducir schemas pesados mientras no exista una necesidad real de Zod/Yup

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

## Anti-Patterns

- No usar MUI raw cuando existe wrapper Vuexy
- No usar Tailwind classes en runtime (solo PostCSS para global)
- No usar `elevation > 0` en cards internas (usar `variant='outlined'`)
- No mezclar español e inglés en la misma surface
- No hardcodear colores — siempre `theme.palette.*`
- No crear stat displays custom cuando un card-statistics component sirve
- No usar Redux para estado local — `useState` o `react-hook-form`
- No instalar librerías nuevas sin verificar si ya están disponibles en este inventario
