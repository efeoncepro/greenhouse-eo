# TASK-230 — Portal Animation Library Integration

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui / platform`
- Blocked by: `none`
- Branch: `task/TASK-230-portal-animation-library`
- GitHub Issue: `[pending]`

## Summary

Integrar librerias de animacion al portal Greenhouse para enriquecer iconos interactivos, empty states, loading states y micro-interacciones en visualizaciones de datos. Hoy el portal no tiene ninguna libreria de animacion — solo 2 animaciones CSS aisladas.

## Why This Task Exists

El portal usa exclusivamente animaciones CSS inline aisladas (pulsing dot en PeriodNavigator, fade-in en NexaThread). No existe un sistema de animacion centralizado. Los empty states usan iconos estaticos de Tabler, los loading states son MUI Skeleton basicos, y las transiciones de datos en charts no tienen micro-interacciones. Esto limita la calidad percibida del portal operativo, especialmente en areas de alta densidad de datos como Finance, Agency y ICO dashboards.

## Goal

- Instalar y configurar un stack de animacion minimo: Lottie (ilustraciones), Lordicon (iconos interactivos), Framer Motion (micro-interacciones)
- Integrar animaciones en el componente EmptyState centralizado
- Agregar micro-interacciones en KPI cards y visualizaciones de datos
- Respetar `prefers-reduced-motion` como ya lo hace el patron existente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- Styling via MUI sx prop + Emotion. Las animaciones deben convivir con este patron, no reemplazarlo.
- Next.js App Router — librerias que usen `window` o `document` deben ser dynamic imports con `ssr: false` (mismo patron que `src/libs/ApexCharts.tsx`).
- `prefers-reduced-motion: reduce` debe desactivar o simplificar toda animacion nueva.

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/EmptyState.tsx` — componente centralizado, 8+ consumers
- `src/libs/ApexCharts.tsx` — patron de dynamic import existente
- `src/libs/Recharts.tsx` — re-exports de Recharts

### Blocks / Impacts

- Todos los views que usan EmptyState (cambio backward-compatible: el prop `icon` estatico sigue funcionando)
- KPI cards en Finance, Agency, ICO dashboards
- Potencialmente TASK-118 (ICO AI Core) si define interacciones de UI

### Files owned

- `src/libs/Lottie.tsx` (nuevo — wrapper con dynamic import)
- `src/libs/Lordicon.tsx` (nuevo — wrapper con dynamic import)
- `src/components/greenhouse/EmptyState.tsx` (modificar — agregar soporte para animated icons)
- `src/components/greenhouse/AnimatedCounter.tsx` (nuevo — KPI number transitions)
- `public/animations/` (nuevo — directorio para assets Lottie JSON)

## Current Repo State

### Already exists

- `src/components/greenhouse/EmptyState.tsx` — centralizado, usa Tabler icon strings, 8+ consumers
- `src/libs/ApexCharts.tsx` — patron de dynamic import con `ssr: false`
- `src/libs/Recharts.tsx` — re-exports
- 2 animaciones CSS con `@keyframes`: `periodDotPulse` en PeriodNavigator, `nexa-msg-in` en NexaThread
- Patron de `prefers-reduced-motion` ya establecido en PeriodNavigator
- MUI Skeleton con pulse animation nativo para loading states

### Gap

- Cero librerias de animacion instaladas
- EmptyState no soporta iconos animados
- No existe componente de transicion numerica para KPIs
- No hay directorio ni patron para assets de animacion (Lottie JSON)
- Charts (ApexCharts/Recharts) no usan micro-interacciones mas alla de los defaults de cada libreria

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Library installation + wrappers

- `pnpm add lottie-react @lordicon/react framer-motion`
- Crear `src/libs/Lottie.tsx` — dynamic import wrapper (patron ApexCharts)
- Crear `src/libs/Lordicon.tsx` — dynamic import wrapper
- Crear `public/animations/` con un asset de prueba
- Verificar que el build no rompe con las nuevas dependencias

### Slice 2 — EmptyState animated icon support

- Extender `EmptyState.tsx` para aceptar opcionalmente un Lottie JSON o Lordicon icon ademas del Tabler icon string existente
- Backward-compatible: si se pasa `icon` como string, sigue funcionando igual
- Nuevo prop opcional (e.g., `animatedIcon`) para pasar una animacion
- Respetar `prefers-reduced-motion` — si esta activo, mostrar el primer frame estatico

### Slice 3 — AnimatedCounter component

- Crear `src/components/greenhouse/AnimatedCounter.tsx` usando Framer Motion
- Anima transiciones numericas en KPI cards (e.g., revenue, headcount, ICO scores)
- Props: `value`, `duration`, `format` (currency, percentage, integer)
- Respetar `prefers-reduced-motion` — si esta activo, renderizar el valor final sin animacion

### Slice 4 — Pilot integration in one dashboard

- Elegir un dashboard existente (sugerido: Finance o Agency) para pilotear
- Reemplazar 2-3 empty states con iconos animados
- Reemplazar 2-3 KPI numbers con AnimatedCounter
- Documentar el patron de uso para que otros views lo adopten

## Out of Scope

- Reemplazar todos los empty states del portal — esta task es el pilot, la adopcion masiva es follow-up
- Animaciones 3D (Three.js, Spline) — no hay caso de uso claro hoy
- Reemplazar ApexCharts o Recharts por otra libreria de charts
- Crear animaciones custom en After Effects / Lottie Editor — usar assets existentes de LottieFiles o Lordicon
- GSAP o librerias de animacion complejas con licencia comercial

## Detailed Spec

### Wrapper pattern (Slice 1)

Seguir el patron existente de `src/libs/ApexCharts.tsx`:

```tsx
// src/libs/Lottie.tsx
import dynamic from 'next/dynamic'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

export default Lottie
```

### EmptyState extension (Slice 2)

```tsx
// Backward-compatible: icon string sigue funcionando
<EmptyState icon="tabler:inbox" title="Sin datos" />

// Nuevo: animated icon
<EmptyState
  animatedIcon="/animations/empty-inbox.json"
  title="Sin datos"
/>
```

Si se pasan ambos (`icon` + `animatedIcon`), `animatedIcon` toma prioridad. Si `animatedIcon` falla al cargar, fallback al `icon` estatico.

### AnimatedCounter (Slice 3)

```tsx
<AnimatedCounter value={1250000} format="currency" currency="CLP" />
<AnimatedCounter value={94.5} format="percentage" />
<AnimatedCounter value={12} format="integer" />
```

Usa Framer Motion `useSpring` + `useTransform` para interpolar el valor visible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `lottie-react` y `framer-motion` instalados y el build pasa sin errores
- [x] Wrappers con dynamic import creados en `src/libs/`
- [x] EmptyState acepta un prop `animatedIcon` sin romper los 37 consumers existentes que usan `icon` string
- [x] AnimatedCounter renderiza transiciones numericas para currency, percentage e integer
- [x] Todas las animaciones nuevas respetan `prefers-reduced-motion: reduce`
- [x] Dashboard piloto Finance usa 2 empty states animados y 3 AnimatedCounter
- [x] `pnpm build`, `pnpm lint` y `pnpm test` pasan sin errores nuevos

## Verification

- [x] `pnpm build` — OK
- [x] `pnpm lint` — OK
- [x] `npx tsc --noEmit` — OK
- [x] `pnpm test` — 218 test files, 914 tests pass
- [ ] Preview manual del dashboard piloto con animaciones activas
- [ ] Preview manual con `prefers-reduced-motion: reduce` activado en el OS — confirmar que animaciones se desactivan

## Closing Protocol

- [x] Documentar en Detailed Spec el patron final de uso para que otros views adopten las animaciones
- [x] Listar en Follow-ups que views son candidatos prioritarios para adopcion

## Implementation Notes (2026-04-04)

### Decisions taken

- **Lordicon dropped**: `@lordicon/react` requires web component runtime, has poor SSR/React 19 compat. Lottie JSON covers the same icon use case. Any Lordicon asset can be exported as Lottie JSON.
- **Stack final**: `lottie-react` (animated illustrations) + `framer-motion` (micro-interactions). Two libraries instead of three.
- **Pilot dashboard**: Finance (FinanceDashboardView + FinancePeriodClosureDashboardView) — has both prominent KPI cards and empty states.

### Usage patterns for adoption

**Animated EmptyState:**
```tsx
<EmptyState
  icon='tabler-calendar-off'            // static fallback
  animatedIcon='/animations/empty-inbox.json'  // Lottie JSON path
  title='No hay períodos'
  description='...'
/>
```
- `animatedIcon` takes priority over `icon`
- Falls back to `icon` on load error
- Automatically static when `prefers-reduced-motion: reduce`

**AnimatedCounter in KPI cards:**
```tsx
<HorizontalWithSubtitle
  title='DSO'
  stats={<><AnimatedCounter value={42} format='integer' /> días</>}
  subtitle='...'
/>
```
- `format`: `'currency'` | `'percentage'` | `'integer'`
- `currency`: defaults to `'CLP'`
- Animates on scroll into view (once)
- Instant render when `prefers-reduced-motion: reduce`

**useReducedMotion hook:**
```tsx
import useReducedMotion from '@/hooks/useReducedMotion'
const prefersReduced = useReducedMotion()
```

### Files created/modified

| File | Action |
|------|--------|
| `src/libs/Lottie.tsx` | Created — dynamic import wrapper |
| `src/libs/FramerMotion.tsx` | Created — client re-export |
| `src/hooks/useReducedMotion.ts` | Created — matchMedia hook |
| `src/components/greenhouse/AnimatedCounter.tsx` | Created — KPI number transitions |
| `src/components/greenhouse/EmptyState.tsx` | Modified — added `animatedIcon` prop |
| `src/components/greenhouse/EmptyState.test.tsx` | Modified — added reduced motion test |
| `src/components/greenhouse/index.ts` | Modified — export AnimatedCounter |
| `src/components/card-statistics/HorizontalWithSubtitle.tsx` | Modified — stats type widened to `string \| ReactNode` |
| `src/views/greenhouse/finance/FinanceDashboardView.tsx` | Modified — 3 AnimatedCounter instances |
| `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx` | Modified — 2 animated EmptyState |
| `public/animations/empty-inbox.json` | Created — Lottie asset |
| `public/animations/empty-chart.json` | Created — Lottie asset |

## Follow-ups

- **Adopcion masiva**: reemplazar empty states estaticos en los demas modulos — candidatos prioritarios:
  - Agency Space 360 tabs (6 EmptyState instances across FinanceTab, TeamTab, DeliveryTab, ServicesTab, IcoTab)
  - GreenhouseDashboard (4 EmptyState instances)
  - GreenhouseSprints (4 EmptyState instances)
  - CapabilityCard (9 EmptyState instances)
- **AnimatedCounter expansion**: KPI cards in FinanceExpenseDetailView, IncomeDetailView, SuppliersListView, ClientsListView
- Evaluar animaciones de entrada/salida para modals y drawers con Framer Motion
- Crear o curar un pack de assets Lottie alineados al branding Greenhouse (colores GH_COLORS)
- Considerar animated loading skeletons como reemplazo de MUI Skeleton en areas de alto impacto

## Open Questions

- (Resolved) Lordicon vs Lottie: se decidio usar solo Lottie. Lordicon assets exportables como JSON.
- (Resolved) Dashboard piloto: Finance elegido por KPI cards prominentes + empty states disponibles.
