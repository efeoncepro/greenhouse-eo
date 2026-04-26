# TASK-643 — Microinteractions polish + tokens canónicos de motion

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (sensación premium en cada elemento clickable)
- Effort: `Medio` (4-6h)
- Type: `ux` + `infrastructure`
- Status real: `Backlog — primera sub-task del programa TASK-642`
- Rank: `Slice 1 de TASK-642 (foundation)`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-643-microinteractions-polish`

## Summary

Define los tokens canónicos de motion (timing, easing, scale factors) y aplica polish de microinteractions a botones, cards, links y row hovers en el portal. Hover scale + focus glow + press depress sutiles, consistentes en toda la superficie. Esto es la **foundation** del programa TASK-642 — sin estos tokens, las demás sub-tasks inventan su propio timing y queda inconsistente.

Parent: `TASK-642` (Motion Polish Program 2026).

## Why This Task Exists

Audit 2026-04-26: Greenhouse usa solo defaults de MUI para hover/focus/press. Cada componente decide su propio timing inline (cuando lo decide). Resultado: hovers a 100ms en algunas cards, 250ms en otras; focus rings invisibles en algunos botones; press feedback inexistente. Las apps modernas (Linear, Vercel, Stripe) tienen un sistema de motion canónico que se siente coherente — vos hacés hover en cualquier cosa y la respuesta es la misma curva.

## Goal

- Crear tokens canónicos de motion en `src/lib/motion/tokens.ts` (timing, easing, scale).
- Crear utilidades `sx` reutilizables en `src/lib/motion/microinteractions.ts` (`hoverScale`, `focusGlow`, `pressDepress`, `linkUnderline`).
- Aplicar tokens consistentes en MUI theme override (`src/@core/theme/`) para que TODO MUI button/card/link respete los tokens.
- Documentar el sistema en `GREENHOUSE_UI_PLATFORM_V1.md` (sección "Motion System V1 — Tokens").

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `src/@core/theme/` (theme MUI canónico).
- Skill `greenhouse-microinteractions-auditor` (invocar al implementar).

Reglas obligatorias:

- Reduced motion: cada token debe tener variante "reduced" (opacity-only fade, sin transform).
- No hardcoded timings inline en componentes — todos vienen del token.
- No sobrescribir defaults de MUI sin razón documentada.

## Dependencies & Impact

### Depends on

- `none`.

### Blocks / Impacts

- TASK-526, TASK-644, TASK-645, TASK-646 — **todas dependen de los tokens definidos aquí**. Sin tokens canónicos, cada sub-task hardcodea su timing y rompe la coherencia.

### Files owned

- `src/lib/motion/tokens.ts` (nuevo).
- `src/lib/motion/microinteractions.ts` (nuevo).
- `src/@core/theme/overrides/Button.ts` (modificar para usar tokens).
- `src/@core/theme/overrides/Card.ts` (modificar para usar tokens).
- `src/@core/theme/overrides/Link.ts` (modificar para usar tokens — si existe).
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (sección Motion System V1).

## Current Repo State

### Already exists

- View Transitions API canónico (TASK-525).
- Framer Motion `^12.38` instalado (re-exportado vía `src/libs/FramerMotion.tsx`).
- MUI theme overrides en `src/@core/theme/`.

### Gap

- Sin tokens canónicos de motion (timing, easing, scale).
- Sin utilities `sx` reutilizables para microinteractions.
- MUI components usan defaults sin polish premium.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tokens canónicos

Crear `src/lib/motion/tokens.ts`:

```ts
export const motionDuration = {
  instant: 80,    // touch feedback, ripples
  fast: 150,      // hover, focus
  base: 200,      // list mutations, micro state changes
  medium: 300,    // page entrance, modal, drawer
  slow: 500,      // hero entrances, attention-grabbers
  counter: 1000   // KPI counter rolling
} as const

export const motionEasing = {
  // Entrances — start slow, end fast (premium feel)
  enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // Exits — start fast, end slow
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  // Spring physics for press/hover
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  // Linear for counters
  linear: 'linear'
} as const

export const motionScale = {
  hoverSubtle: 1.02,
  hoverEmphasis: 1.04,
  pressDepress: 0.97,
  focusOutline: 'inset 0 0 0 2px var(--mui-palette-primary-main)'
} as const
```

### Slice 2 — Utilities `sx`

Crear `src/lib/motion/microinteractions.ts`:

```ts
import { motionDuration, motionEasing, motionScale } from './tokens'

export const hoverScale = {
  transition: `transform ${motionDuration.fast}ms ${motionEasing.spring}`,
  '&:hover': { transform: `scale(${motionScale.hoverSubtle})` },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': { transform: 'none' }
  }
}

export const pressDepress = {
  transition: `transform ${motionDuration.instant}ms ${motionEasing.exit}`,
  '&:active': { transform: `scale(${motionScale.pressDepress})` }
}

export const focusGlow = {
  transition: `box-shadow ${motionDuration.fast}ms ${motionEasing.enter}`,
  '&:focus-visible': { boxShadow: motionScale.focusOutline }
}

export const linkUnderline = {
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    height: 1,
    background: 'currentColor',
    transform: 'scaleX(0)',
    transformOrigin: 'right',
    transition: `transform ${motionDuration.base}ms ${motionEasing.enter}`
  },
  '&:hover::after': {
    transform: 'scaleX(1)',
    transformOrigin: 'left'
  }
}
```

### Slice 3 — MUI theme overrides

Aplicar tokens en `src/@core/theme/overrides/Button.ts`, `Card.ts`, `Link.ts`:

- Button: `transition: transform/box-shadow ${motionDuration.fast}ms ${motionEasing.spring}`; hover scale 1.02; press 0.97.
- Card (`MuiCard`, `MuiPaper` con elevación): hover lift (translateY -2px) + shadow elevation +2; transition 200ms enter.
- Link: aplicar `linkUnderline` token en variant `body`.
- TableRow (`MuiTableRow`): hover background tint con transición 150ms.

### Slice 4 — Documentación

Agregar sección "Motion System V1 — Tokens" a `GREENHOUSE_UI_PLATFORM_V1.md`:

- Tabla de tokens (duration, easing, scale).
- Patrón de uso de utilities `sx`.
- Ejemplo de import desde código nuevo.
- Cuándo NO usar (theatrical bouncing, gimmicky parallax).

## Out of Scope

- Animaciones tipo Rive (TASK-527).
- Page entrance + skeleton crossfade (TASK-644).
- KPI counter animations (TASK-645).
- Scroll-triggered (TASK-646).
- List mutations (TASK-526).

## Detailed Spec

Ver Slices 1-4 arriba. Foundation pura — no hay dashboards a tocar, solo theme + tokens + utilities.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/lib/motion/tokens.ts` creado con duration/easing/scale.
- [ ] `src/lib/motion/microinteractions.ts` creado con `hoverScale`, `pressDepress`, `focusGlow`, `linkUnderline`.
- [ ] MUI theme overrides actualizados (Button, Card, Link, TableRow) usando tokens.
- [ ] Validación visual manual: hover en botones del portal se siente coherente y premium.
- [ ] Reduced motion validado en DevTools — `transform` se desactiva, `opacity` se mantiene si aplica.
- [ ] `GREENHOUSE_UI_PLATFORM_V1.md` actualizado.
- [ ] Gates verdes: `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Validación manual en `/finance/quotes`, `/people`, `/agency` — hover, focus, press en botones/cards/links.

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] Archivo en carpeta correcta.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado.
- [ ] `changelog.md` con entry.
- [ ] `TASK-642` umbrella actualizada con check de Slice 1.

## Follow-ups

- TASK-526 puede arrancar ya con los tokens disponibles.
- TASK-644 puede arrancar ya.
- TASK-645 puede arrancar ya.
- TASK-646 puede arrancar ya.
