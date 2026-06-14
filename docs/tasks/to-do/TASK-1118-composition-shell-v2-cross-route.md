# TASK-1118 — Composition Shell V2: cross-route composition ("move to new interface")

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `TASK-1114 (substrato V1 in-place) estable + adoptado` — V2 es la mitad riesgosa, se hace después de que el in-place esté probado
- Branch: `task/TASK-1118-composition-shell-v2-cross-route`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La segunda mitad del Composition Shell: la transición **cross-route** ("mover a una interfaz nueva", modelo Google **AI Mode**) — distinta del transform **in-place** de V1 (modelo AI Overviews). Usa **cross-document View Transitions + App Router** para que pasar a otra superficie morphee con continuidad (shared elements persisten cross-route) en vez de cortar.

## Why This Task Exists

El operador separó explícitamente dos motions: (1) **transformar la superficie existente** (V1, in-place — shipped en TASK-1114) y (2) **mover a una interfaz nueva** (esto). El ADR las dejó como V1/V2 y el mercado las ship por separado (AI Overviews in-place vs AI Mode dedicado, con un bridge entre ambas). V1 cubre (1); falta (2): la transición de ruta con continuidad, el bridge "Seguir con Nexa" aterrizando en la lente dedicada con el contexto transferido.

## Goal

- Transición cross-route fluida (shared elements persisten entre superficies, no cut).
- El `bridge` (puente a la lente dedicada) aterriza con continuidad espacial + contexto transferido.
- Degradación honesta donde cross-document VT no esté soportado.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` (§Out of Scope V1 → V2) + `_UI_PLATFORM_V1.md` §10 (frontera V1/V2)
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md` §13 (Gap A vs el bridge a la lente)
- Precedentes: `cross-document-transitions` (modern-web guidance, Baseline 2025) · `useViewTransitionRouter` / `ViewTransitionLink` (helpers existentes) · Next.js App Router (route groups, layouts)

Reglas obligatorias:
- Reusar los helpers de View Transitions existentes (no fork).
- No romper el contrato V1 in-place; V2 es aditivo (un modo de transición distinto).
- `prefers-reduced-motion` + fallback honesto (cut instantáneo sin soporte).

## Dependencies & Impact

### Depends on
- TASK-1114 (substrato V1) estable + ≥1 consumer real adoptado.
- Bridge de la lente conversacional (`CONVERSATIONAL_EXPERIENCE.md`).

### Blocks / Impacts
- La experiencia completa "augmentar in-place → profundizar en lente dedicada" (AI Overviews → AI Mode).

### Files owned
- `src/components/greenhouse/primitives/composition-shell/**` (modo cross-route)
- (posible) `src/hooks/useViewTransitionRouter.ts` extensión + App Router layout wiring

## Current Repo State

### Already exists
- Substrato V1 in-place (TASK-1114). `useViewTransitionRouter` / `ViewTransitionLink` (same-document + route). Cross-document VT Baseline 2025.

### Gap
- No hay transición cross-route con continuidad de shared elements ni el bridge aterrizando con contexto.

## Scope

### Slice 1 — Cross-document View Transitions wiring
- Habilitar el morph cross-route (shared `view-transition-name` persistiendo entre superficies) vía App Router + los helpers existentes.

### Slice 2 — Bridge con transferencia de contexto
- "Seguir con Nexa" (u otro bridge) que aterriza en la lente dedicada con continuidad espacial + el contexto transferido (no reinicia).

### Slice 3 — Degradación + a11y + GVC
- Fallback honesto (cut) sin soporte / reduced-motion; focus routing cross-route; GVC de la transición.

## Out of Scope
- Transform in-place (V1, TASK-1114).
- Hardening (TASK-1119) / fluidity in-place (TASK-1117) / Adaptive Card (TASK-1115).

## Rollout Plan & Risk Matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Cross-document VT inconsistente entre browsers | UI | medium | fallback cut honesto (Baseline 2025 pero no universal) | GVC multi-browser |
| Continuidad rota (shared element no matchea cross-route) | UI | medium | nombres VT estables + tests | GVC |
| Acoplar V2 al dominio (Nexa) | UI/arch | low | el modo cross-route es neutral; el bridge es del consumer | review |

Feature flag default OFF; rollout staged post V1 adoptado.

## Verification
- GVC de la transición cross-route desktop+mobile + fallback.
- `pnpm local:check:ui`.
- `greenhouse-documentation-governor` al cierre.
