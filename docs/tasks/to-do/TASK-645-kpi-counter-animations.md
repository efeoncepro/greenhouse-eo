# TASK-645 — KPI counter animations (rolling numbers)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (alta visibilidad en dashboards — primera mirada del usuario)
- Effort: `Bajo` (3-4h)
- Type: `ux`
- Status real: `Backlog — sub-task del programa TASK-642`
- Rank: `Slice 4 de TASK-642`
- Domain: `ui`
- Blocked by: `TASK-643` (necesita tokens canónicos)
- Branch: `task/TASK-645-kpi-counter-animations`

## Summary

KPI cards en dashboards (MRR/ARR, Finance Intelligence, ICO, Pulse, Portfolio Health) muestran números que aparecen instantáneos. Esta task agrega rolling counter animation: las cifras "ruedan" desde 0 (o desde el valor anterior) hasta el valor final en 800-1200ms con spring physics. Wrapper canónico `<AnimatedCounter>` usando `useSpring` + `useTransform` de Framer Motion (ya instalado).

Parent: `TASK-642` (Motion Polish Program 2026).

## Why This Task Exists

Audit 2026-04-26: KPI cards muestran cifras como `$45.230.000` que aparecen estáticas al cargar. Los dashboards de Linear, Stripe, Notion, Vercel **siempre** animan los números clave porque eso transmite que el dato es vivo y el sistema "está pensando". Cero animación = sensación de printout estático.

Framer Motion `useSpring` + `useTransform` resuelve esto en ~30 líneas de wrapper canónico.

## Goal

- Crear `<AnimatedCounter value={number} format={fn}>` wrapper.
- Aplicar en KPI cards de 5+ dashboards.
- Soportar formats `es-CL` (CLP currency, percent, compact) reutilizando helpers existentes.
- Reduced motion: contador aparece estático (sin rolling).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `src/lib/motion/tokens.ts` (TASK-643).
- `src/libs/FramerMotion.tsx` (re-exporta `motion`, `useSpring`, `useTransform`).
- Formatters `es-CL` existentes: `src/lib/locale-formatters.ts` (si existe) o helpers que crea TASK-641 en `src/lib/charts/echarts-formatters.ts` — reutilizar.

Reglas obligatorias:

- Reduced motion: render directo del valor final, sin spring.
- No sobrepasar el valor final (overshoot bouncing → theatrical, no enterprise). Usar damping alto.
- Cuando el value cambia mid-animation (ej. data refresh), interpolar suavemente del valor visible actual al nuevo, no resetear a 0.

## Dependencies & Impact

### Depends on

- `TASK-643` (tokens canónicos).
- Framer Motion ya instalado.

### Blocks / Impacts

- Sinergia con TASK-641 (ECharts) — los formatters `es-CL` que crea TASK-641 se reutilizan aquí.
- Mejora la percepción de los dashboards de TASK-640 (Nubox V2 enrichment) cuando se cierre.

### Files owned

- `src/components/greenhouse/motion/AnimatedCounter.tsx` (nuevo).
- 5+ KPI cards modificadas en dashboards (a definir).

## Current Repo State

### Already exists

- Framer Motion instalado.
- KPI cards en `src/views/greenhouse/finance/MrrArrDashboardView.tsx`, `FinanceDashboardView.tsx`, `dashboard/PortfolioHealthCard.tsx`, etc.
- `src/components/greenhouse/ExecutiveMiniStatCard.tsx` (componente reutilizable de stat card).

### Gap

- Sin counter animation — cifras estáticas al cargar.
- Sin wrapper canónico que centralice spring config.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — `<AnimatedCounter>`

Crear `src/components/greenhouse/motion/AnimatedCounter.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { motion, useSpring, useTransform } from '@/libs/FramerMotion'

interface Props {
  /** Target numeric value */
  value: number
  /** Format function (e.g. CLP currency, percent) */
  format?: (value: number) => string
  /** Spring stiffness (default 120 — premium feel) */
  stiffness?: number
  /** Spring damping (default 40 — no overshoot) */
  damping?: number
}

export const AnimatedCounter = ({
  value,
  format = (v) => v.toLocaleString('es-CL'),
  stiffness = 120,
  damping = 40
}: Props) => {
  const spring = useSpring(0, { stiffness, damping })
  const display = useTransform(spring, (current) => format(Math.round(current)))

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  return <motion.span>{display}</motion.span>
}
```

### Slice 2 — Reduced motion

Wrapper que respeta `prefers-reduced-motion`:

```tsx
import { useReducedMotion } from '@/libs/FramerMotion'

export const AnimatedCounter = ({ value, format = ... }: Props) => {
  const reduced = useReducedMotion()

  if (reduced) {
    return <span>{format(value)}</span>
  }

  // ... spring animation
}
```

### Slice 3 — Aplicar en KPI cards

A definir en Plan Mode entre candidatas (priorizar las más visibles):

- `MrrArrDashboardView` — KPIs MRR, ARR, churn, growth.
- `FinanceDashboardView` — KPIs revenue, cost, margin, cash.
- `PortfolioHealthCard` — onTimePct, qualityScore.
- `IcoCharts` — KPIs ICO score.
- `PulseGlobalCharts` — KPIs throughput, capacity.
- `ExecutiveMiniStatCard` — wrapper genérico que ya se usa en varias vistas.

### Slice 4 — Validación

- Cargar dashboard, verificar que números ruedan suavemente.
- Cambiar filtro (ej. mes), verificar que el contador interpola del valor anterior al nuevo (no resetea a 0).
- Reduced motion: cifras estáticas.

## Out of Scope

- Animaciones de bar/line de los charts (TASK-646 cubre scroll-triggered + stagger).
- Animaciones de variación percent (`+12%` con flecha animada) — out of scope, follow-up posible.

## Detailed Spec

Ver Slices 1-3 arriba.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `<AnimatedCounter>` creado, exportado, con prop `format`.
- [ ] Reduced motion → render directo.
- [ ] 5+ KPI cards usando `<AnimatedCounter>`.
- [ ] Cambio de value mid-animation interpola suavemente.
- [ ] Sin overshoot bouncing.
- [ ] Gates verdes.

## Verification

- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build`.
- Validación manual en `/finance/intelligence`, `/dashboard`, `/agency/pulse`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] `Handoff.md`, `changelog.md` actualizados.
- [ ] TASK-642 umbrella actualizada.

## Follow-ups

- Variation indicator animation (`+12%` con flecha animada).
- Sparkline animation in KPI cards (small line entering).
