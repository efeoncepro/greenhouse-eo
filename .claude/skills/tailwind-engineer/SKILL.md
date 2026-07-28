---
name: tailwind-engineer-greenhouse-overlay
type: overlay
overrides: tailwind-engineer
description: >-
  Overlay Greenhouse de `tailwind-engineer`. Pinea el dialecto de ESTE repo (Tailwind 4 sobre MUI:
  el theme MUI es el SSOT, propiedades lógicas obligatorias, imports con modificador de importancia,
  sin preflight) y la precedencia frente a las reglas canónicas de CLAUDE.md, DESIGN.md y AXIS.
  Triggers: los de la skill base, dentro de greenhouse-eo.
---

# tailwind-engineer — overlay Greenhouse EO

> ⚠️ **Este archivo es SOLO el overlay.** No contiene los perfiles ni las referencias: pinea el
> dialecto local y nada más. **El cuerpo de la skill vive en el espejo versionado del repo**, y los
> paths de abajo son los reales — copia y lee.

## Router (rutas reales en este repo)

| Necesito | Archivo |
|---|---|
| **Escribir clases acá** (leer SIEMPRE primero) | `.codex/skills/tailwind-engineer/profiles/greenhouse-eo.md` |
| Trabajar en efeonce-globe (ADR-016, tokens.ts, 4 gates) | `.codex/skills/tailwind-engineer/profiles/efeonce-globe.md` |
| Trabajar en efeonce-think / efeonce-web (Astro) | `.codex/skills/tailwind-engineer/profiles/astro-think.md` |
| Montar Tailwind en un repo nuevo | `.codex/skills/tailwind-engineer/profiles/greenfield.md` |
| `@theme`, `@utility`, `@variant`, `@source`, funciones | `.codex/skills/tailwind-engineer/references/v4-directives.md` |
| **Algo no aplica / no se genera / se ve mal con build verde** | `.codex/skills/tailwind-engineer/references/debugging.md` |
| Migrar una superficie de CSS a Tailwind | `.codex/skills/tailwind-engineer/references/migration.md` |
| Frescura de las afirmaciones + versiones por repo | `.codex/skills/tailwind-engineer/SOURCES.md` |
| Router y hard rules cross-dialecto | `.codex/skills/tailwind-engineer/SKILL.md` |

## Estado vigente de Efeonce Globe

En `../efeonce-globe`, el payload React activo usa Tailwind v4 como pipeline único: composer, shell, diálogos,
feed, viewer, share board, primitives y capas base/motion están centralizados en el payload Tailwind, sin hojas
CSS de superficie importadas. El theme se genera desde `tokens.ts`; no agregues literales de diseño a
`className`.

`producerStyles` en `apps/studio-web/src/producer-ui.ts` permanece sólo para el renderer vanilla de fallback
cuando la ruta React no está habilitada. No lo retires como parte de una migración de superficie: `TASK-1560`
gobierna ese cutover y sus gates de paridad.

(El mismo contenido existe en `~/.claude/skills/tailwind-engineer/`, núcleo user-scope no versionado.
Dentro del repo prefiere el espejo: es el que está bajo control de versiones.)

## AXIS foundation pointer

AXIS is Efeonce's portable foundation and Lab. Globe's native adapter is
Tailwind v4, with semantic tokens flowing through `tokens.ts`; do not add
literal design values to `className`. Consult the shared UI ADR and
`docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`, and do not
claim consumer runtime readiness while `TASK-1591` is pending.

## Precedencia dentro de este repo

1. `CLAUDE.md` (AXIS, tokens, Full API Parity, closure gates) — **siempre gana**.
2. `DESIGN.md` + `design:lint` — contrato visual agent-facing.
3. `greenhouse-ai-design-studio` — orquestador de UI nueva. Esta skill es un **lane de
   materialización** suyo; no re-declara su gate de score, el Figma Implementation Contract ni GVC.
4. Esta skill — cómo el token se vuelve utilidad.

## Los cinco pines del dialecto local

1. **El SSOT del color, tipografía, radios y sombras es el theme MUI/AXIS**, no el `@theme`.
   `src/app/globals.css` es un **puente que consume** `--mui-palette-*` / `--mui-shape-*`. Un token
   nuevo entra por `axis-tokens.ts` vía `design-system-governance`, **nunca** agregándolo al `@theme`.
2. **Propiedades lógicas obligatorias** (plugin `tailwindcss-logical`): el idiom del repo es
   `is-`/`bs-`/`mbe-`/`mli-`/`plb-`, no sus equivalentes físicos. Las físicas compilan y por eso son
   peligrosas: rompen la consistencia RTL sin romper el build.
3. **El modificador de importancia ya está en los dos `@import`.** Las utilidades ya ganan a Emotion;
   no agregues `!` por clase. Y cuidado con el efecto inverso: una utilidad puede pisar un estado de
   MUI (hover/disabled/selected) que sí querías.
4. **Preflight NO está importado.** El reset lo pone `CssBaseline` de MUI. No asumas los defaults de
   Tailwind sobre `h1`, `ul`, `button`.
5. **El util de clases es `classnames`.** No hay `clsx`, `cva` ni `tailwind-merge`; el idiom shadcn/ui
   no existe acá. Introducir uno es decisión de plataforma (`arch-architect`), no de feature.

## Reparto con MUI (descriptivo del código real, y es el que se respeta)

| Capa | Dueño |
|---|---|
| Layout, spacing, alineación, gaps | Tailwind |
| Componente, variantes, estados, theming | MUI + Emotion (`sx`) |
| Color, tipografía, radios, sombras | theme MUI / AXIS |

Convivir `sx` y `className` en el mismo componente es normal acá. Lo que no es normal es pintar color
o tipografía con Tailwind saltándose el theme.

## Drift conocido en otras skills (no las cites como autoridad)

- `modern-ui` (overlay repo) dice *"MUI first, Tailwind 4 only if not available"*.
- `web-design-guidelines` dice *"this repo is MUI 7 + Vuexy, **not** Tailwind"*.

Ambas se escribieron antes de que el uso creciera. **Medición 2026-07-27: 685 de 1.491 `.tsx` usan
`className`**, con `flex` (493), `items-center` (149), `gap-4` (71). Tailwind es parte del stack
productivo de este repo.

## Gates

```bash
pnpm design:lint
pnpm local:check:ui
```

Más scenario GVC si la superficie es visual y repetible. El gate de score enterprise es del
orquestador, no de esta skill.

## Follow-up abierto

`globals.css` no acota la detección de contenido. Medido en `4.1.17`: las clases **simples** escritas
en `docs/**` y `.claude/skills/**` **sí** se materializan en el CSS del portal (los valores arbitrarios
con corchetes, no). Acotar con `@source not "docs/**"` + `@source not ".claude/**"` es barato; requiere
confirmar antes que ninguna clase productiva viva únicamente en un `.md`.

## Version

- **v1.0** — 2026-07-27
