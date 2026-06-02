# TASK-989 — Nexa Living Avatar (cursor-aware / mascota viva)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño (decisión tomada, implementación parkeada)`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-989-nexa-living-avatar`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Darle "vida" al avatar de Nexa (hoy un PNG estático en el home hero `NexaGreetingsCard`): que reaccione al cursor / al usuario. La **decisión técnica ya está tomada** (ver Detailed Spec); esta task la deja registrada y lista para ejecutar cuando se priorice. Dos capas: (1) tilt sutil hacia el cursor en el hero — barato, ship inmediato; (2) mascota viva real (ojos siguen, parpadeo, saludo) vía **Rive** en una superficie dedicada de Nexa.

## Why This Task Exists

El componente `NexaGreetingsCard` (TASK del 2026-06-01, ya en `develop`) muestra a Nexa como un **PNG plano** (`public/images/greenhouse/nexa/nexa-avatar.png`) con microinteracciones CSS (float, dots pulse). El operador pidió explorar "darle vida a Nexa para que siga el mouse". Se deliberó con `arch-architect` + `motion-design` + `modern-ui` y se llegó a una decisión clara que **conviene registrar para no re-litigarla** (p.ej. "¿usamos sprites generados por IA para animar a Nexa?"). El avatar actual no tiene rig → no se pueden mover ojos/parpadear sin re-autorar el personaje.

## Goal

- Capturar la decisión arquitectónica (tilt / Rive / rol de las AI image tools) como referencia ejecutable.
- Slice 1: tilt cursor-aware + perk-up al enfocar el input en el home hero, sin dependencia nueva, reduced-motion safe.
- Slice 2 (futuro, gated): mascota viva vía Rive en superficie dedicada, alimentada por hoja de expresiones generada con las AI image tools.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (stack motion, wrappers `@/libs/*`)
- `DESIGN.md` (contrato visual; restraint enterprise)

Reglas obligatorias:

- Motion imports SIEMPRE vía wrappers del repo (`@/libs/FramerMotion`, `@/libs/GSAP`, `@/libs/Lottie`) — nunca el paquete directo.
- Toda motion custom usa `useReducedMotion` (`@/hooks/useReducedMotion`).
- Restraint (modern-ui): en product UI la motion es acento, no protagonista. El hero operativo NO debe convertirse en un juguete.

## Normative Docs

- Decisión registrada en memoria del agente: `project_nexa_living_mascot_decision.md`.

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/nexa/NexaGreetingsCard.tsx` (componente existente, en `develop`)
- Stack motion: `framer-motion` (Motion), `gsap`, `lottie-react` ya instalados; wrappers en `src/libs/`.
- Slice 2 requiere: agregar `@rive-app/react-canvas` + wrapper `@/libs/Rive` + autorar el `.riv` (trabajo de diseño) + acceso a AI image engine (`src/lib/ai/image-generator.ts`, skill `greenhouse-ai-image-generator`).

### Blocks / Impacts

- Ninguna task. Es polish aditivo del home hero.

### Files owned

- `src/components/greenhouse/nexa/NexaGreetingsCard.tsx` (Slice 1)
- `src/libs/Rive.tsx` `[verificar — a crear en Slice 2]`
- `public/images/greenhouse/nexa/` (assets de referencia / `.riv` en Slice 2)

## Current Repo State

### Already exists

- `NexaGreetingsCard` con avatar PNG + microinteracciones CSS (float, dots pulse, hover-lift, rotating placeholder, send-state) — todas reduced-motion gated.
- Motion stack + wrappers (`@/libs/FramerMotion`, `@/libs/GSAP`, `@/libs/Lottie`), `useReducedMotion`.
- `src/lib/ai/image-generator.ts` (`generateImage` google-imagen/openai-image, `editOpenAIImage`) + skill `greenhouse-ai-image-generator`.

### Gap

- No hay `@/libs/Rive` ni dependencia Rive.
- El avatar es un PNG sin rig → sin tilt/eyes-follow runtime.

## Scope

### Slice 1 — Tilt cursor-aware + perk-up (home hero)

- En `NexaGreetingsCard`: el avatar se inclina sutil hacia el cursor (`perspective` + `rotateX/rotateY` mapeado del puntero con spring de Motion `useSpring`/`useTransform`).
- Perk-up: al enfocar el input, el avatar se inclina/escala levemente hacia el campo.
- Gating: solo `pointer: fine` (desktop), `useReducedMotion` off, throttle con `requestAnimationFrame`.
- Compone con el float ambiental existente (float en hijo, tilt en wrapper).

### Slice 2 — Mascota viva (Rive, superficie dedicada) [futuro, gated]

- Autorar a Nexa como rig vectorial en Rive (state machine: look-at pointer, blink, wave, react). Usar las AI image tools (Gemini "Nano Banana" image-edit desde el master PNG) para generar la **hoja de expresiones de referencia** que guíe el rig.
- Agregar `@rive-app/react-canvas` + wrapper `@/libs/Rive`.
- Montar en una **superficie dedicada de Nexa** (onboarding / chat), NO en el home hero operativo.

## Out of Scope

- Sprite-set generado por IA + frame-swap como **motor de animación** — RECHAZADO (drift de consistencia, peso de N PNGs, swap steppy, sin state machine). Las AI tools solo generan arte de referencia para el rig.
- 3D (Spline/Three.js) — overkill/peso para el hero.
- Mover ojos/parpadeo sobre el PNG plano (imposible sin rig).

## Detailed Spec

**Decisión canónica (3 capas):**

1. **Home hero (B2B operativo) → tilt CSS/Motion.** Dosis enterprise correcta (modern-ui: motion = acento). Puerta de dos vías, reversible, sin dep, sin assets.
2. **Mascota viva (ojos siguen, parpadeo, saludo, reacciones) → Rive.** Primitiva correcta: state machine + input look-at, runtime ~90KB, `.riv` editable por diseñador. En superficie dedicada, no en el hero.
3. **AI image tools (OpenAI GPT Image / Gemini Nano Banana) → generan la hoja de expresiones/turnaround de referencia que alimenta el rig de Rive** + assets estáticos de marca. NO son el runtime de animación.

**Why Rive y no sprite-set IA:** robustez (determinístico vs flicker por drift), escala/peso (1 `.riv` ~90KB vs ~12 PNG 1.5–2.5MB y steppy), mantenibilidad (editás un rig vs regenerar+curar N frames), regla "primitiva correcta vs exótica".

## Rollout Plan & Risk Matrix

N/A pesado — cambio aditivo de UI sin runtime crítico. Slice 1 es additive (motion en un componente cliente, gated por `pointer:fine` + reduced-motion); rollback = revert PR + redeploy. Slice 2 introduce dependencia (Rive) y se montará detrás de su propia superficie/flag cuando se priorice.

### Slice ordering hard rule

- Slice 1 (tilt) es independiente y puede shippear solo.
- Slice 2 (Rive) requiere el `.riv` autorado ANTES de cualquier wiring de runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Tilt se siente "juguete" / distrae en hero operativo | UI | low | amplitud sutil + spring suave + review modern-ui; reduced-motion off | review visual GVC |
| Rive runtime suma bundle | UI | low | lazy-load solo en superficie dedicada de Nexa | bundle budget |

### Feature flags / cutover

- Slice 1: sin flag — additive, immediate cutover (reversible por revert).
- Slice 2: montar detrás de la superficie dedicada (no global); flag opcional al definir esa superficie.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <5 min | sí |
| Slice 2 | quitar dep Rive + revert superficie | <15 min | sí |

### Production verification sequence

1. Slice 1: GVC local (mouse en esquina → ver inclinación) + reduced-motion = sin tilt.
2. Slice 2: smoke en superficie dedicada; verificar lazy-load + reduced-motion degrada a frame estático.

### Out-of-band coordination required

- Slice 2: trabajo de diseño para autorar el `.riv` (rig de Nexa). N/A para Slice 1.

## Acceptance Criteria

- [ ] Slice 1: el avatar se inclina hacia el cursor en desktop; sin movimiento bajo `prefers-reduced-motion` ni en touch.
- [ ] Slice 1: perk-up al enfocar el input; compone con el float existente sin glitch.
- [ ] Slice 1: sin dependencia nueva; imports de motion vía `@/libs/*`.
- [ ] Slice 2 (si se ejecuta): Rive montado solo en superficie dedicada, lazy-loaded, reduced-motion → frame estático.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- GVC: captura del hero con cursor en esquina (Slice 1) + reduced-motion.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si hubo aprendizajes
- [ ] `changelog.md` actualizado si cambió comportamiento visible
- [ ] chequeo de impacto cruzado

## Follow-ups

- Si Slice 2 procede: abrir ADR para el rig Rive + definir la superficie dedicada de Nexa (onboarding/chat).

## Open Questions

- ¿Nexa será mascota persistente del portal (justifica la inversión Rive) o se queda con el tilt del hero? Decisión del operador antes de Slice 2.
