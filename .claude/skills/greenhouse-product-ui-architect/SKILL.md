---
name: greenhouse-product-ui-architect
description: Greenhouse-specific product UI architecture overlay for Vuexy/MUI, DESIGN.md, canonical copy, primitives, views, access surfaces, and GVC verification.
---

# Greenhouse Product UI Architect

Use this after a global design skill selects the product pattern. This overlay translates the decision into Greenhouse-compatible implementation constraints.

## Composition Shell — default base for every NEW interface (TASK-1114/1117/1119 · operator directive 2026-06-14)

Every NEW Greenhouse surface/screen/view MUST **start from the Composition Shell** layout substrate: declare a composition (`single` / `leadPlusContext` / `split` / `focused`) and place content into singleton regions (`primary` / `aside` / `lead` / `dock` / `overlay`) — do NOT invent ad-hoc grids / morph / layout restructuring. It is the **architectural starting point, not one option among many**. Use `CompositionShell` + `composition-shell-controller` from `@/components/greenhouse/primitives`; opt into fluidity with `fluidity='rich'` (stagger entrance + interruptible framer-motion `layout` morph + temporary drawer in compact `split`). **Only carve-out** (not the rule): genuinely trivial one-offs with no region composition (an isolated form, a `Dialog`, a static text page) may stay on flat `LayoutContent` — but must consider the substrate FIRST and justify why it does not apply. NEVER build a parallel region/morph/layout-choreography system (that is exactly what the substrate absorbs). NEVER hand-wire the reserved `gh-region-*` view-transition-name namespace (lint `greenhouse/no-ad-hoc-layout-morph`). Coherent with the ADR: the substrate is additive (it does not rewrite `LayoutContent` by fiat) and legitimate siblings (`NexaMomentComposition`) coexist. Lab `/design-system/composition-shell`. ADR `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` + companion `_UI_PLATFORM_V1.md`.

**Sibling capability — Adaptive Card density (TASK-1115):** when the content placed in a (possibly condensing) region is a CARD, make it adapt to ITS OWN width with the shared `card-density` contract (`useContainerDensity` + `resolveCardDensity` → `full`/`condensed`/`peek`) from `@/components/greenhouse/primitives` — honest condensation (a real smaller version, NEVER clip/overflow/`$0`; the key value never disappears). The card does NOT inherit from the shell (the seam is the container query: when a region condenses, the card width changes → its fit mode re-evaluates itself). Adopt additively (`density?: CardDensityRequest`, default `full` byte-identical); already adopted by `MetricSummaryCard` + `MetricTrendCard`. Generalizes the table density contract (TASK-743) + reuses the `resolveAdaptiveSidecarMode` pattern. NEVER fork a parallel `adaptive-card` component nor build on `AdaptiveSidecarLayout`. Lab `/design-system/card-density`.

## Required Reads

- `DESIGN.md`
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`

## Primitive + Variants + Kinds Method

Use `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md` for reusable UI.

- **Primitive** owns layout, a11y, responsive behavior, motion, shell integration, state plumbing, and GVC hooks.
- **Variant** is an official functional mode. It changes behavior, density, state model, action placement, and microinteraction contract. It is not a skin.
- **Kind** is the semantic consumer use case. It may be domain-specific or a legacy alias, but it must resolve to an official variant before layout/chrome behavior is chosen.

When a pattern recurs, recommend extending a primitive with variants instead of creating parallel drawers/cards/inspectors/assistants.

Canonical shape:

```tsx
<Primitive variant='inspector' kind='contractReview' />
```

## Pattern Preferences

- Operational lists with decisions: prefer queue + inspector.
- Low-frequency risky creation: prefer drawer or stepper with clear consequences.
- Runtime dashboards: prefer command center with exceptions before totals.
- AI helpers: prefer Adaptive Sidecar on desktop and temporary Drawer only on mobile/tablet.
- Error and misc surfaces (404, 401, access denied, coming soon, maintenance, unavailable route) should be treated as product surfaces with brand voice and recovery architecture. Use concise creative microcopy variants selected once on entry when appropriate, but keep cause, action, and accessibility stable.
- Contextual assistance, inspection, review, preview, and low-risk contextual editing: use `AdaptiveSidecarLayout`, `ContextualSidecar`, and `adaptive-sidecar-controller` from `@/components/greenhouse/primitives` before creating any custom drawer/modal.
- Adaptive Sidecar official variants are `inspector`, `composer`, `assistant`, `reconciler`, `evidence`, and `runbook`; domain kinds such as `form`, `review`, `preview`, reconciliation, provenance/evidence, or guided operations must map to one of those variants.
- Tables: use when comparison and scanning matter; pair with inspector for actions that require context.

## Hard Rules

- Do not introduce a parallel design system.
- Do not bypass `DESIGN.md`.
- Do not reintroduce generic landing-page composition inside operational tools.
- Do not implement a desktop Adaptive Sidecar as a boxed drawer/card overlay. It must be an in-flow, full-height work-canvas lane with non-modal semantics.
- Do not leave high-friction error surfaces with only generic template copy when the product voice can safely improve recovery and brand perception.
- Do not ship screenshots-free UI changes when the request is about visual quality.
- Do not create `FooDrawer`, `FooInspector`, and `FooAssistant` as separate components when one primitive plus functional variants covers the family.
- Do not add a variant that only changes color, radius, shadow, or icon.

## Output Contract

- Greenhouse implementation mapping
- primitives to reuse
- copy/access decisions
- screenshot plan
- verification plan

## Figma Implementation Contract (gate)

Al implementar cualquier diseño (especialmente desde Figma), **Figma es intención, no valores literales**. Antes de escribir JSX, correr 2 gates (contrato canónico completo en CLAUDE.md / AGENTS.md → "Figma Implementation Contract"):

1. **Token mapping (siempre):** color → `theme.palette.*` / `theme.axis.*` / `var(--mui-palette-*)`; tipografía → variant/SoT (skill `typography-design`); spacing → scale `4n`; radius → `theme.shape.customBorderRadius.*` **como CSS length en `sx`**, no como número directo; motion → `motion/core/tokens.ts`. **NUNCA** transcribir HEX/px/fontFamily/ms crudos. Del MCP Figma usar `get_variable_defs` + `get_code_connect_map` → **mapear, no pegar**. Lint: `greenhouse/no-hardcoded-hex-color` + `no-hardcoded-fontfamily` + `no-fontsize-inline-typography`.

   **Gotcha radius MUI:** `sx={{ borderRadius: 2 }}` y `sx={theme => ({ borderRadius: theme.shape.customBorderRadius.sm })}` son multiplicadores MUI, no px directos; pueden inflar radios. En `sx`, usar string px desde el token.
2. **Primitive lookup en capas (ANTES de construir):** (a) ¿existe **primitive Greenhouse**? grep `src/components/greenhouse/primitives/index.ts` (~79 exports) + `docs/architecture/ui-platform/PRIMITIVES.md` → **usar o expandir** (variant/kind, no fork paralelo); (b) ¿hay **wrapper Vuexy `Custom*`** o componente MUI base (Select/Autocomplete/List/TextField/Menu…)? → la primitive nueva **envuelve esa base** (hereda a11y/teclado/estados), NUNCA reinventar input/select/list/dropdown desde cero; (c) solo si no hay nada → desde cero.

**Si hay que crear una primitive nueva (dropdown/list/input/etc.):** protocolo Primitive+Variants+Kinds COMPLETO — vive en `primitives/` + export en barrel + resolver `kind→variant`; a11y/responsive/reduced-motion horneados; **cero hardcode** (solo tokens); **Lab interno** `/admin/design-system/<nombre>` (gate `administracion.design_system`, alcanzable por nav + route-reachability); **GVC** desktop+mobile mirada; nodo AXIS Figma referenciado; contrato en `ui-platform/PRIMITIVES.md` (+ ADR si platform-level). Patrón fuente: `GreenhouseButton`/`GreenhouseChip`/`GreenhouseActivityTimeline`/chart cards.

**Reportar la decisión** (reuse / extend / new-primitive + por qué) ANTES de codear. Un one-off no-reusable puede vivir junto al consumer pero **igual tokenizado** (no va al registry).
## GVC V1.5 — contract gates mockup→runtime (TASK-1018)

GVC (`pnpm fe:capture`) ya no es solo evidencia: es **contrato verificable** del paso mockup aprobado → runtime. Todos los gates son **opt-in por scenario + warning-first** (`error` solo si el scenario lo declara). Codes SSOT: `scripts/frontend/lib/failure-taxonomy.ts`.

- **Baseline visual diff**: el scenario declara `baseline.surfaceId` + `maxDiffRatio` (+ `maskSelectors` para datos dinámicos + `requiredFrameLabels`/`requiredRegions`). Promové el mockup aprobado con `pnpm fe:capture:diff --promote <capture-dir>` → home durable committeable `scripts/frontend/baselines/<surfaceId>/`. El runtime con el mismo `surfaceId` corre el diff solo: `match` / `exceeded` (con PNG diff) / `baseline_stale` (degrada honesto si falta el baseline). GVC aplica determinismo (animaciones off, caret oculto, reduced-motion, fonts settled) automáticamente cuando hay `baseline.surfaceId`.
- **`quality.layout`** (overflow / target <24px / texto cortado / scroll sin label / cards anidadas), **`quality.runtime`** (console.error / pageerror / hydration / 4xx-5xx), **`quality.keyboard`** (foco esperado + focus ring + estado + reduced-motion), **`quality.performance`** (DOM nodes / requests / transfer / FCP), **`quality.enterpriseRubric`** (placeholders / exceso de —·0 / >1 botón primario por header / saturación cromática).
- `trace.zip` se guarda automático en cada captura fallida (`pnpm exec playwright show-trace <dir>/trace.zip`). El `index.html` y el `review-dossier.md` traen un **resumen ejecutivo**: `Apto para implementar` / `Revisar` / `Requiere iteración` + verdict del rubric.
- Regresión: scenarios `gvc-contract-gates` + `gvc-keyboard-focus`. Detalle: `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` Delta V1.5; workflow de adopción en `scripts/frontend/scenarios/_README.md`.
