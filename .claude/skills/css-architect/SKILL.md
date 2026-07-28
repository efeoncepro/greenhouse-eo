---
name: css-architect-greenhouse-overlay
type: overlay
overrides: css-architect
description: >-
  Overlay Greenhouse de `css-architect`. Pinea qué features CSS están habilitadas dentro del portal
  (el color sale del theme AXIS/MUI: OKLCH, color-mix y P3 NO aplican acá), cómo conviven Emotion,
  CSS modules de Vuexy y utilidades, y la precedencia frente a DESIGN.md y al orquestador de UI.
  Triggers: los de la skill base, dentro de greenhouse-eo.
---

# css-architect — overlay Greenhouse EO

> ⚠️ **Este archivo es SOLO el overlay.** No contiene las referencias: pinea lo local y nada más.

## Router (rutas reales en este repo)

| Necesito | Archivo |
|---|---|
| **Algo no aplica / se pisa / gana la regla equivocada** | `.codex/skills/css-architect/references/cascade-scope-layers.md` |
| Grid, subgrid, container queries, anchor, sticky, overflow, stacking, contención | `.codex/skills/css-architect/references/layout-and-containment.md` |
| Color, dark mode, theming, custom properties, `@property` | `.codex/skills/css-architect/references/color-and-theming.md` |
| Features 2025-2026 con estado por navegador | `.codex/skills/css-architect/references/platform-2026.md` |
| Frescura de las afirmaciones | `.codex/skills/css-architect/SOURCES.md` |
| Principios, triage de 5 pasos y hard rules | `.codex/skills/css-architect/SKILL.md` |

(Mismo contenido en `~/.claude/skills/css-architect/`, núcleo no versionado.)

## Precedencia

1. `CLAUDE.md` (AXIS, tokens, UI Platform invariants) — **siempre gana**.
2. `DESIGN.md` + `pnpm design:lint`.
3. `greenhouse-ai-design-studio` — orquestador; esta skill es un **lane de materialización**.
4. `greenhouse-product-ui-architect` — primitives, Composition Shell, Adaptive Card.
5. Esta skill — cascada, capas, layout, mecanismos de plataforma.

## Qué NO aplica dentro del portal

El overlay de `modern-ui` **desactiva** OKLCH, `color-mix()` y P3 para el portal, y es correcto: acá
**el color sale de `theme.palette.*` / `theme.axis.*`**, nunca inline y nunca calculado en CSS. La
página `color-and-theming.md` del núcleo aplica a **Globe, sitios Astro y superficies fuera del
portal**, no a `src/views/**`.

Lo mismo con la estrategia de theming de tres capas: acá esas capas ya existen y viven en
`axis-tokens.ts` → `mergedTheme` → CSS vars de MUI. **No construyas un sistema paralelo de custom
properties.** Un token nuevo entra por `design-system-governance`.

## El terreno real de cascada en este repo

Cuatro fuentes de estilo conviven, y el orden importa:

| Fuente | Dónde | Notas |
|---|---|---|
| Utilidades Tailwind | `className` | importadas con modificador de importancia → **ganan a Emotion** |
| Emotion / `sx` | componentes MUI | el idiom para estilos de componente |
| CSS modules | `@core`, `@menu`, `@layouts` (Vuexy) | starter-kit heredado |
| CSS global | `src/app/globals.css`, `src/styles/greenhouse-sidebar.css` | tocar con cuidado: blast radius total |

Consecuencias prácticas:

- **Si una utilidad pisa un estado de MUI que querías** (hover, disabled, selected), no es un bug de
  MUI: es el `important` de los imports. Sacá la utilidad, no pelees con especificidad.
- **Antes de tocar `globals.css`**, verificá si el problema es de una superficie. Un cambio ahí afecta
  a todo el portal y no lo atrapa ningún lint.
- **CSS modules de Vuexy**: son del starter-kit. Modificarlos es fork; preferí envolver.

## Features de plataforma: criterio local

El portal es interno y con SSO, pero **no** hay un target de navegador declarado. Antes de usar algo
del Nivel 2/3 de `platform-2026.md`, verificá y dejá la decisión escrita. Ya en uso en el repo:
keyframes de view transition en `globals.css` y `@media (prefers-reduced-motion)`.

⚠️ **Cualquier uso de `reading-flow`, o cualquier cambio de orden de foco, pasa por
`a11y-architect`.** No es una decisión de layout.

## Sinergia con las skills UI del repo

- `greenhouse-microinteractions-auditor` audita motion/feedback: esta skill provee el mecanismo
  (`@starting-style`, `allow-discrete`, scroll-driven), ella juzga el resultado.
- `greenhouse-ui-review` y `greenhouse-ui-enterprise-review` son los **gates de cierre**; esta skill
  no los reemplaza.
- Contención de scroll horizontal, Floating Surface, Elevation/Shadow tokens y Adaptive Card density
  son **contratos de UI Platform** (`docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`).
  Cargalos al tocar esas superficies: mandan sobre cualquier recomendación genérica de esta skill.

## Version

- **v1.0** — 2026-07-27
