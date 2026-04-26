# TASK-644 — Page entrance + skeleton crossfade

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (cada navegación se siente premium en lugar de cut)
- Effort: `Medio` (4-6h)
- Type: `ux`
- Status real: `Backlog — sub-task del programa TASK-642`
- Rank: `Slice 3 de TASK-642`
- Domain: `ui`
- Blocked by: `TASK-643` (necesita tokens canónicos)
- Branch: `task/TASK-644-page-entrance-skeleton-crossfade`

## Summary

Cada vista del portal entra con fade-in suave 200-300ms en lugar de aparecer instantánea. Cuando una vista carga datos, el skeleton hace **cross-fade** al contenido real en lugar del swap brusco actual. Wrapper canónico `<GhPageEntrance>` envolviendo cada page; helper `<SkeletonCrossfade>` para el swap loading→loaded.

Parent: `TASK-642` (Motion Polish Program 2026).

## Why This Task Exists

Hoy navegar a `/finance/quotes` es un cut: la vista aparece de golpe. Cuando los datos están cargando, ves skeleton; cuando llegan, **swap instantáneo**. Las apps modernas:

- Page entry: fade-in + sutil slide-up de 8px en 250-300ms.
- Skeleton swap: cross-fade 200ms (skeleton hace fade-out mientras contenido hace fade-in superpuestos).

View Transitions API (TASK-525) cubre la transición ENTRE páginas; esta task cubre la entrada DE cada página y el swap loading→loaded DENTRO de la página.

## Goal

- Crear wrapper `<GhPageEntrance>` para envolver cada vista del portal.
- Crear helper `<SkeletonCrossfade loading={isLoading} skeleton={<Skeleton/>}>{children}</SkeletonCrossfade>`.
- Aplicar wrapper en 5+ vistas críticas (Finance, Payroll, Agency Pulse, People, Dashboard Home).
- Validar que respeta `prefers-reduced-motion`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `src/lib/motion/tokens.ts` (creado en TASK-643).
- `src/lib/motion/microinteractions.ts` (creado en TASK-643).
- `src/libs/FramerMotion.tsx` (wrapper canónico).
- View Transitions: NO doble-animar — si el navigation viene con view transition (TASK-525), el page entrance debe respetar y no acumular fade.

Reglas obligatorias:

- Reduced motion: fade puro (sin slide-up), duration reducida a 100ms.
- No bloquear interacción durante el entrance — `pointer-events` siempre activo.
- Skeleton crossfade: ambas capas absolutamente posicionadas durante swap, ninguna desplaza al otro.

## Dependencies & Impact

### Depends on

- `TASK-643` (tokens canónicos motion).
- Framer Motion `^12.38` ya instalado.

### Blocks / Impacts

- Sinergia con TASK-525 (view transitions) — coordinar para no animar doble.
- Sinergia con TASK-525.1 (tier 1 expansion) — el page entrance debe activarse después de la view transition, no en paralelo.

### Files owned

- `src/components/greenhouse/motion/GhPageEntrance.tsx` (nuevo).
- `src/components/greenhouse/motion/SkeletonCrossfade.tsx` (nuevo).
- 5+ archivos de vistas con wrapper aplicado (a definir en Plan Mode).

## Current Repo State

### Already exists

- View Transitions API (TASK-525).
- Framer Motion instalado.
- Skeleton components MUI usados en varias vistas.

### Gap

- Sin page entrance canónico — cada vista aparece instantánea.
- Sin skeleton crossfade — swap loading→loaded es brusco.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — `<GhPageEntrance>`

Crear `src/components/greenhouse/motion/GhPageEntrance.tsx`:

```tsx
'use client'

import { motion } from '@/libs/FramerMotion'
import { motionDuration, motionEasing } from '@/lib/motion/tokens'

interface Props {
  children: React.ReactNode
  /** Disable entrance if parent already animated (e.g. inside a view transition) */
  disabled?: boolean
}

export const GhPageEntrance = ({ children, disabled }: Props) => {
  if (disabled) return <>{children}</>

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionDuration.medium / 1000,
        ease: [0.16, 1, 0.3, 1]
      }}
      style={{ contain: 'layout' }}
    >
      {children}
    </motion.div>
  )
}
```

### Slice 2 — `<SkeletonCrossfade>`

Crear `src/components/greenhouse/motion/SkeletonCrossfade.tsx`:

```tsx
'use client'

import { AnimatePresence, motion } from '@/libs/FramerMotion'
import { motionDuration } from '@/lib/motion/tokens'

interface Props {
  loading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
}

export const SkeletonCrossfade = ({ loading, skeleton, children }: Props) => (
  <div style={{ position: 'relative' }}>
    <AnimatePresence mode='wait'>
      {loading ? (
        <motion.div
          key='skeleton'
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionDuration.base / 1000 }}
        >
          {skeleton}
        </motion.div>
      ) : (
        <motion.div
          key='content'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: motionDuration.base / 1000 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)
```

### Slice 3 — Aplicar en 5+ vistas críticas

A definir en Plan Mode entre estas candidatas (priorizar las más visibles):

- `/finance/quotes` (lista + detalle).
- `/finance/clients` (lista + detalle).
- `/finance/intelligence` (dashboard).
- `/agency/pulse` (dashboard).
- `/payroll` (lista de períodos).
- `/people` (lista).
- `/dashboard` (home).

### Slice 4 — Reduced motion

Validar en DevTools (Rendering panel → Emulate CSS media `prefers-reduced-motion: reduce`) que:

- Page entrance: solo opacity 0→1 en 100ms, sin `y` translate.
- Skeleton crossfade: opacity simple, sin spring.

## Out of Scope

- Page exit animations (cuando salís de una vista) — out of scope, es complejidad extra que no agrega valor proporcional.
- Transiciones entre tabs dentro de una misma vista — out of scope (queda como follow-up si emerge necesidad).

## Detailed Spec

Ver Slices 1-3 arriba.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `<GhPageEntrance>` creado y exportado.
- [ ] `<SkeletonCrossfade>` creado y exportado.
- [ ] 5+ vistas críticas con wrapper aplicado.
- [ ] Reduced motion validado.
- [ ] No conflicto con TASK-525 view transitions (coordinación documentada).
- [ ] Gates verdes.

## Verification

- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build`.
- Validación manual: navegar a cada vista wrapped, verificar fade-in suave.
- Validación de skeleton crossfade: forzar loading state (DevTools throttle network) y observar el cross-fade.

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] Archivo en carpeta correcta.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado.
- [ ] `changelog.md` con entry.
- [ ] TASK-642 umbrella actualizada con check de Slice 3.

## Follow-ups

- Considerar page exit animations si emerge feedback de "salida brusca".
- Considerar tab transitions dentro de una vista.
