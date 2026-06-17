---
name: greenhouse-ui-orchestrator
description: Orchestrate Vuexy and MUI pattern selection for Greenhouse UI work, including reusable component choice and full-version adaptation.
---

# Greenhouse UI Orchestrator

Use this skill when the task is to decide which Vuexy or MUI pattern Greenhouse should use.

## Composition Shell — default base for every NEW interface (TASK-1114/1117/1119 · operator directive 2026-06-14)

Every NEW Greenhouse surface/screen/view MUST **start from the Composition Shell** layout substrate: declare a composition (`single` / `leadPlusContext` / `split` / `focused`) and place content into singleton regions (`primary` / `aside` / `lead` / `dock` / `overlay`) — do NOT invent ad-hoc grids / morph / layout restructuring. It is the **architectural starting point, not one option among many**. Use `CompositionShell` + `composition-shell-controller` from `@/components/greenhouse/primitives`; opt into fluidity with `fluidity='rich'` (stagger entrance + interruptible framer-motion `layout` morph + temporary drawer in compact `split`). **Only carve-out** (not the rule): genuinely trivial one-offs with no region composition (an isolated form, a `Dialog`, a static text page) may stay on flat `LayoutContent` — but must consider the substrate FIRST and justify why it does not apply. NEVER build a parallel region/morph/layout-choreography system (that is exactly what the substrate absorbs). NEVER hand-wire the reserved `gh-region-*` view-transition-name namespace (lint `greenhouse/no-ad-hoc-layout-morph`). Coherent with the ADR: the substrate is additive (it does not rewrite `LayoutContent` by fiat) and legitimate siblings (`NexaMomentComposition`) coexist. Lab `/design-system/composition-shell`. ADR `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` + companion `_UI_PLATFORM_V1.md`.

**Sibling capability — Adaptive Card density (TASK-1115):** when the content placed in a (possibly condensing) region is a CARD, make it adapt to ITS OWN width with the shared `card-density` contract (`useContainerDensity` + `resolveCardDensity` → `full`/`condensed`/`peek`) from `@/components/greenhouse/primitives` — honest condensation (a real smaller version, NEVER clip/overflow/`$0`; the key value never disappears). The card does NOT inherit from the shell (the seam is the container query: when a region condenses, the card width changes → its fit mode re-evaluates itself). Adopt additively (`density?: CardDensityRequest`, default `full` byte-identical); already adopted by `MetricSummaryCard` + `MetricTrendCard`. Generalizes the table density contract (TASK-743) + reuses the `resolveAdaptiveSidecarMode` pattern. NEVER fork a parallel `adaptive-card` component nor build on `AdaptiveSidecarLayout`. Lab `/design-system/card-density`.

## First Reads

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/architecture/ui-platform/README.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

## Adaptive Sidecar Decision Rules

- For contextual assistance, inspection, review, preview, and low-risk contextual editing where the main work context must remain visible, recommend the Adaptive Sidecar primitive first.
- Canonical implementation: `AdaptiveSidecarLayout`, `ContextualSidecar`, and `adaptive-sidecar-controller` from `@/components/greenhouse/primitives`.
- Apply the Primitive + Variants + Kinds method: official Adaptive Sidecar variants are `inspector`, `composer`, `assistant`, `reconciler`, `evidence`, and `runbook`; domain kinds must resolve to one of them before behavior/chrome is chosen.
- Desktop sidecar is an in-flow, full-height lane with non-modal semantics; it is not a custom Drawer, floating card, or Dialog.
- Mobile/tablet fallback may use the primitive's temporary Drawer mode.
- If the surface can be dirty or replace its target, require `reduceAdaptiveSidecarState()` or an equivalent adapter around it.
- Require GVC desktop and mobile evidence for any production consumer.

## Hard Rules

- Do not copy full demo pages from `full-version`.
- Do not choose patterns by aesthetics alone.
- Do not render partial data as authoritative without provenance.
- Prefer existing wrappers and primitives before proposing any new motion layer or third-party animation library.

## Output Contract

- request normalization
- recommended pattern
- local target path
- guardrails and anti-patterns
- validation notes

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
