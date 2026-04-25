# TASK-527 — Rive para illustrations interactivas (next-gen Lottie)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (foundation para onboarding / empty states interactivos)
- Effort: `Bajo-Medio` (install + 1 proof-of-concept)
- Type: `dependency` + `ux` + `platform`
- Status real: `Backlog — Ola 4 motion modernization`
- Rank: `Post-TASK-511`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-527-rive-interactive-illustrations`

## Summary

Agregar [Rive](https://rive.app/) (`@rive-app/react-canvas`) al stack de animaciones ilustrativas. Complemento de Lottie, **no reemplazo**. Rive destaca por **state machines** (animación reacciona a props del usuario, scroll, hover, input) y archivos 10× más chicos que Lottie. Usado por Notion (figuras interactivas), Figma (loaders), Duolingo (characters).

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 4 motion additions.

## Why This Task Exists

Lottie es perfecto para animaciones unidireccionales (loop loader, confetti, fade-in illustration). Pero tiene techo:
- Los JSON de Lottie son verbosos (300 KB típico para illustration rica).
- No soporta branching / state machines nativamente.
- No reacciona a user input sin plumbing custom (controllers + frame jumping).

Rive resuelve ambas:
- Archivos `.riv` son binarios, ~30 KB por illustration compleja.
- **State machines**: la illustration tiene inputs (`onHover`, `progress`, `error`, `success`, etc.) y transiciona entre estados conforme esos inputs cambian.
- Integración React first-class vía `@rive-app/react-canvas`.

**Casos concretos que se desbloquean**:
- Empty states que reaccionan al estado del módulo (no hay quotes → illustration waving → hover → wink).
- Loaders progresivos que reflejan `progress` real (0-100%).
- Success / error moments con transición animada (no switcheo de SVG).
- Character mascot reactivo en el onboarding de Greenhouse.

## Goal

1. Instalar `@rive-app/react-canvas`.
2. Setup asset pipeline: `public/rive/` para archivos `.riv` (análogo a `public/animations/` de Lottie).
3. Crear primitive `<GreenhouseRive>` wrapper en `src/components/greenhouse/primitives/` con:
   - Lazy load (dynamic import, fallback a static SVG).
   - `prefers-reduced-motion` respeta (renderiza first frame estático).
   - Props typed para state machine inputs.
4. **Proof-of-concept**: reemplazar 1 Lottie existente por Rive equivalente (ej. empty state del Quote Builder) para validar el pipeline.
5. Docs:
   - `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — sección "Interactive illustrations con Rive" con cuándo usar Rive vs Lottie.
   - Brand asset pipeline: quien edita illustrations usa Rive Editor (SaaS) o Rive community files.

## Acceptance Criteria

- [ ] `@rive-app/react-canvas` instalado.
- [ ] Primitive `<GreenhouseRive>` en `src/components/greenhouse/primitives/` + export en `index.ts`.
- [ ] Respeta `prefers-reduced-motion: reduce` (renderiza frame estático).
- [ ] 1 proof-of-concept `.riv` en `public/rive/` (puede ser free community file o simple hand-made).
- [ ] Docs con guide de cuándo Rive vs Lottie.
- [ ] Gates tsc/lint/test/build verdes.
- [ ] Smoke staging: la illustration reactiva responde al hover/prop.

## Scope

### Setup
- Install `@rive-app/react-canvas`.
- Asset folder: `public/rive/` con convención de naming `domain-usecase.riv`.

### Primitive
```tsx
// src/components/greenhouse/primitives/GreenhouseRive.tsx
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'

export interface GreenhouseRiveProps {
  src: string                    // ruta al .riv
  stateMachine?: string          // nombre del SM (si aplica)
  inputs?: Record<string, unknown> // inputs reactivos
  ariaLabel: string
  fallbackIcon?: string          // tabler-icon para reduced-motion / no-support
  width?: number
  height?: number
}
```

### Cuándo usar qué (guía canonical)

| Caso | Stack recomendado |
|---|---|
| Loop loader simple (spinner animado) | CSS `@keyframes` |
| Empty state estático ilustrativo | Lottie (si ya existe JSON) o PNG |
| Illustration unidireccional (aparece, se queda) | Lottie con `autoplay loop=false` |
| Illustration que reacciona a estado | **Rive** (state machine input) |
| Character mascot con múltiples moods | **Rive** |
| Progress loader con % real del usuario | **Rive** (input `progress` 0-100) |
| Confetti / celebration | Lottie (one-shot) |

## Out of Scope

- Reemplazar todos los Lottie existentes (sólo el PoC; Lottie sigue siendo válido para animaciones unidireccionales).
- Contratar / producir el set completo de illustrations Rive (fuera del alcance técnico — es work de diseño).

## Follow-ups

- Producción: pipeline con diseñadores para que exporten `.riv` desde Rive Editor.
- Second wave: convertir empty states clave (no quotes, no people, no payroll periods) a Rive.
- Evaluar si algún brand illustration (ej. header de "/home") puede beneficiarse de Rive interactive.
