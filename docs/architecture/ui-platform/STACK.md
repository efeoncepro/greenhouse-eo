# Greenhouse UI Platform — Stack & Component System

> Parte de **Greenhouse UI Platform**. Índice + mapa "dónde vive X": [README.md](./README.md).
> Estado **vigente** (spec actual). Historial cronológico (deltas datados): [HISTORIAL.md](./HISTORIAL.md).
> Autoridad final = runtime; si este doc difiere del código, gana el runtime y este doc se actualiza (modelo 3 capas, ver `design-system-governance`).
> Stack Next.js/MUI/Vuexy, librerías disponibles, sistema de componentes Vuexy, convenciones de código UI y anti-patrones.

---

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

## Geometry Foundations

La plataforma UI consume geometry desde el theme, no desde literals route-locales ni desde valores Figma pegados:

- Spacing AXIS `Gap/Padding-N` → `theme.spacing(N)` / `Stack spacing={N}` / `sx={{ p: N }}`.
- Radius AXIS `xs..xl` → `theme.shape.customBorderRadius.{xs,sm,md,lg,xl}`.
- Radius Greenhouse `xxl=12` y `display=16` → superficies grandes con uso intencional, no cards operacionales densas.
- `Border-Round` → `9999px` para pills/capsules o `50%` para circulos.

Referencia viva interna: `/admin/design-system/geometry`. Contrato extenso: `GREENHOUSE_DESIGN_TOKENS_V1.md` §4-§5.

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
- No hardcodear spacing/radius — spacing usa `theme.spacing(N)`; radius usa `theme.shape.customBorderRadius.*`
- No crear stat displays custom cuando un card-statistics component sirve
- No usar Redux para estado local — `useState` o `react-hook-form`
- No instalar librerías nuevas sin verificar si ya están disponibles en este inventario
- No importar `lottie-react` o `framer-motion` directo — usar los wrappers en `src/libs/`
- No crear animaciones que ignoren `prefers-reduced-motion` — usar `useReducedMotion` hook
