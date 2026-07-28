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

**Cuerpo completo de la skill:** `.codex/skills/tailwind-engineer/` (espejo en repo) o
`~/.claude/skills/tailwind-engineer/` (núcleo user-scope). Este overlay **no lo reemplaza**: pinea el
dialecto local. Cargá `profiles/greenhouse-eo.md` antes de escribir una clase.

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
