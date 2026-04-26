# TASK-646 — Scroll-triggered chart entrance + list stagger

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (wow factor en dashboards y listas largas)
- Effort: `Medio` (4-6h)
- Type: `ux`
- Status real: `Backlog — sub-task de cierre del programa TASK-642`
- Rank: `Slice 5 de TASK-642 (closer)`
- Domain: `ui`
- Blocked by: `TASK-643` (necesita tokens canónicos)
- Branch: `task/TASK-646-scroll-triggered-stagger`

## Summary

Charts en dashboards animan su entrada cuando entran al viewport (scroll reveal). Rows de listas largas entran staggered (delay 30-50ms entre items) durante la primera carga. Wrapper `useScrollReveal()` hook + helper `<StaggeredList>`. Sinergia directa con TASK-641 (ECharts adoption) — los charts nuevos heredan el reveal sin trabajo extra.

Parent: `TASK-642` (Motion Polish Program 2026).

## Why This Task Exists

Hoy todos los charts y todas las rows aparecen instantáneos al cargar la vista. Las apps modernas (Linear, Stripe, Vercel):

- Charts entran con fade + slide-up cuando entran al viewport (no al cargar la página, sino al hacerse visibles).
- Rows de listas largas (>10 items) entran staggered — primera row inmediata, siguientes con delay incremental, total ~600ms para 20 items.

Esto cierra el wow factor del programa TASK-642 — es lo que hace que un usuario nuevo diga "wow, esto se siente vivo".

## Goal

- Crear `useScrollReveal()` hook usando `useInView` de Framer Motion.
- Crear `<StaggeredList>` wrapper para listas con delay incremental.
- Aplicar reveal en charts de 5+ dashboards (los más visibles).
- Aplicar stagger en 3+ listas largas (`/people`, `/finance/clients`, `/finance/quotes`).
- Reduced motion: revelar instantáneo, sin stagger.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `src/lib/motion/tokens.ts` (TASK-643).
- `src/libs/FramerMotion.tsx` (re-exporta `useInView`).
- TASK-641 (ECharts wrapper) — el reveal se aplica en el wrapper de la vista, no en el chart mismo, para que sirva igual a Apex y a ECharts.

Reglas obligatorias:

- Reveal solo dispara una vez (`once: true` en `useInView`) — no se anima cada vez que el chart vuelve al viewport.
- Stagger máximo 600ms total — listas más grandes (>20 items) capean el delay.
- Reduced motion: skip stagger, render todos inmediato.

## Dependencies & Impact

### Depends on

- `TASK-643` (tokens canónicos).
- Framer Motion ya instalado.

### Blocks / Impacts

- Sinergia con TASK-641 (ECharts) — vistas nuevas con ECharts heredan reveal sin código extra.
- Sinergia con TASK-525.1 (View Transitions tier 1) — coordinar para no doble-animar list rows si hay morph cross-page.

### Files owned

- `src/hooks/useScrollReveal.ts` (nuevo).
- `src/components/greenhouse/motion/ScrollReveal.tsx` (nuevo wrapper).
- `src/components/greenhouse/motion/StaggeredList.tsx` (nuevo).
- 5+ dashboards con charts wrapped.
- 3+ listas con stagger aplicado.

## Current Repo State

### Already exists

- Framer Motion `useInView` ya re-exportado.
- Charts en dashboards (Apex hoy; ECharts cuando TASK-641 cierre).
- Listas largas en `/people`, `/finance/clients`, `/finance/quotes`.

### Gap

- Sin scroll reveal — todo aparece a la vez al cargar.
- Sin stagger — todas las rows aparecen juntas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — `useScrollReveal()` + `<ScrollReveal>`

Crear `src/hooks/useScrollReveal.ts`:

```ts
import { useRef } from 'react'
import { useInView } from '@/libs/FramerMotion'

export const useScrollReveal = (threshold = 0.2) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: threshold })

  return { ref, inView }
}
```

Crear `src/components/greenhouse/motion/ScrollReveal.tsx`:

```tsx
'use client'

import { motion, useReducedMotion } from '@/libs/FramerMotion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { motionDuration } from '@/lib/motion/tokens'

interface Props {
  children: React.ReactNode
  delay?: number
}

export const ScrollReveal = ({ children, delay = 0 }: Props) => {
  const { ref, inView } = useScrollReveal()
  const reduced = useReducedMotion()

  if (reduced) return <>{children}</>

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: motionDuration.medium / 1000,
        delay: delay / 1000,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      {children}
    </motion.div>
  )
}
```

### Slice 2 — `<StaggeredList>`

Crear `src/components/greenhouse/motion/StaggeredList.tsx`:

```tsx
'use client'

import { motion, useReducedMotion } from '@/libs/FramerMotion'
import { motionDuration } from '@/lib/motion/tokens'

interface Props {
  children: React.ReactNode[]
  /** Delay between items in ms (default 30) */
  staggerDelay?: number
  /** Max total stagger duration in ms (default 600) — caps for long lists */
  maxStagger?: number
}

export const StaggeredList = ({
  children,
  staggerDelay = 30,
  maxStagger = 600
}: Props) => {
  const reduced = useReducedMotion()
  const itemCount = children.length
  const effectiveDelay = Math.min(staggerDelay, maxStagger / itemCount)

  if (reduced) return <>{children}</>

  return (
    <>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: motionDuration.base / 1000,
            delay: (i * effectiveDelay) / 1000,
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          {child}
        </motion.div>
      ))}
    </>
  )
}
```

### Slice 3 — Aplicar reveal en dashboards

A definir en Plan Mode (priorizar visibilidad):

- `MrrArrDashboardView` — chart de evolución MRR/ARR.
- `FinanceDashboardView` — charts de revenue/cost/margin.
- `PortfolioHealthCard` — gauge.
- `IcoCharts` — bar chart ICO.
- `PulseGlobalCharts` — line charts pulse.

### Slice 4 — Aplicar stagger en listas largas

A definir en Plan Mode:

- `/people` PeopleList (rows de team members).
- `/finance/clients` ClientList.
- `/finance/quotes` QuotesListView.

### Slice 5 — Reduced motion + perf

- Validar reduced motion en DevTools.
- Validar perf: `useInView` con `IntersectionObserver` (free, browser-native, sin scroll listener).
- Validar que `once: true` realmente no re-dispara al re-scroll.

## Out of Scope

- Parallax scrolling (gimmicky, no enterprise).
- Animaciones complejas tipo "elementos aparecen desde direcciones distintas" (theatrical).
- Stagger en tablas con virtualización pesada (TanStack Virtual) — complejidad alta, follow-up.

## Detailed Spec

Ver Slices 1-4 arriba.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `useScrollReveal()` hook creado.
- [ ] `<ScrollReveal>` wrapper creado.
- [ ] `<StaggeredList>` wrapper creado.
- [ ] 5+ charts con scroll reveal aplicado.
- [ ] 3+ listas con stagger aplicado.
- [ ] Reduced motion validado.
- [ ] Perf validado (IntersectionObserver, no scroll listener).
- [ ] Gates verdes.

## Verification

- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build`.
- Validación manual: cargar dashboard, scrollear, ver charts entrar al viewport. Cargar lista larga, ver rows entrar staggered.
- Smoke en preview Vercel + mobile (validar perf).

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] `Handoff.md`, `changelog.md` actualizados.
- [ ] TASK-642 umbrella cerrada cuando esta sea la última sub-task.
- [ ] `GREENHOUSE_UI_PLATFORM_V1.md` con sección Motion System V1 completa.

## Follow-ups

- Stagger en tablas con virtualización pesada (TanStack Virtual).
- Variation indicators (flechas que apuntan up/down al cambiar KPI).
- Considerar "skeleton stagger" — skeleton rows aparecen staggered también, no a la vez.
