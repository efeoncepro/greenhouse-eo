---
name: greenhouse-ui-orchestrator
description: Orchestrate Vuexy and MUI pattern selection for Greenhouse UI work. Use when a human, Claude, Codex, or any other agent asks for a new interface, a layout adaptation, a reusable component choice, or a `full-version` port and you need a deterministic recommendation or implementation path.
---

# Greenhouse UI Orchestrator

Use this skill when the task is to decide which Vuexy or MUI pattern Greenhouse should use.

## Composition Shell — default base for every NEW interface (TASK-1114/1117/1119 · operator directive 2026-06-14)

Every NEW Greenhouse surface/screen/view MUST **start from the Composition Shell** layout substrate: declare a composition (`single` / `leadPlusContext` / `split` / `focused`) and place content into singleton regions (`primary` / `aside` / `lead` / `dock` / `overlay`) — do NOT invent ad-hoc grids / morph / layout restructuring. It is the **architectural starting point, not one option among many**. Use `CompositionShell` + `composition-shell-controller` from `@/components/greenhouse/primitives`; opt into fluidity with `fluidity='rich'` (stagger entrance + interruptible framer-motion `layout` morph + temporary drawer in compact `split`). **Only carve-out** (not the rule): genuinely trivial one-offs with no region composition (an isolated form, a `Dialog`, a static text page) may stay on flat `LayoutContent` — but must consider the substrate FIRST and justify why it does not apply. NEVER build a parallel region/morph/layout-choreography system (that is exactly what the substrate absorbs). NEVER hand-wire the reserved `gh-region-*` view-transition-name namespace (lint `greenhouse/no-ad-hoc-layout-morph`). Coherent with the ADR: the substrate is additive (it does not rewrite `LayoutContent` by fiat) and legitimate siblings (`NexaMomentComposition`) coexist. Lab `/design-system/composition-shell`. ADR `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` + companion `_UI_PLATFORM_V1.md`.

## Workspace detection

- If the current workspace contains `starter-kit`, use `starter-kit` as the working repo.
- Otherwise, if the current workspace already contains `project_context.md` and `src/app`, treat the current workspace as the working repo.

## First reads

Read only what the task needs, in this order:

- `<repo>/AGENTS.md`
- `<repo>/project_context.md`
- `<repo>/Handoff.md`
- `<repo>/docs/architecture/ui-platform/README.md`
- `<repo>/docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `<repo>/docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `<repo>/docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
- `<repo>/docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

If the task is visual or needs extra heuristics:

- use `greenhouse-vuexy-ui-expert`
- use `greenhouse-ux-content-accessibility` when the weakness is copy, states, or accessibility rather than pattern choice

## Input contract

The upstream request may come from:

- a human
- Claude
- Codex
- another agent

Treat that upstream request as raw input, not as the final brief.

Normalize it into:

- source actor
- surface
- page intent
- data shape
- data quality
- action density
- repeatability
- constraints and non-goals

## Workflow

1. Confirm the active phase and route surface.
2. Normalize the request with `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`.
3. Inspect local shared components before opening `full-version`.
4. Choose one primary pattern family from `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`.
5. Inspect at most 1 to 3 `full-version` references for that family.
6. Apply the modern baseline before finalizing the recommendation:
   - first-fold hierarchy
   - state coverage
   - microcopy quality
   - accessibility basics
7. Decide whether the implementation belongs in:
   - `src/components/greenhouse/*`
   - `src/views/greenhouse/<module>/*`
   - `src/views/greenhouse/admin/**`
8. Return an implementation-ready recommendation.

## Hard rules

- Do not copy full demo pages from `full-version`.
- Do not preserve demo semantics, demo copy, or fake business logic.
- Do not choose patterns by aesthetics alone.
- Do not render `seeded`, `override`, or partial data as authoritative without provenance.
- If the request depends on a missing source of truth for team, capacity, or campaigns, stop and model first.

## Animation decision rules

- Recommend `AnimatedCounter` when the number change itself adds comprehension, especially in KPI cards and summary bands.
- Keep KPIs static when the value is null, provisional, suppressed, or expressed mainly as narrative copy.
- Recommend `EmptyState` with `animatedIcon` for first-use and no-results states when a calm loop helps orientation; keep error states static.
- Any motion recommendation must include reduced-motion behavior: `useReducedMotion` for custom motion and static `icon` fallback for animated empty states.
- Prefer the existing wrappers and primitives before proposing any new motion layer or third-party animation library.

## Adaptive Sidecar decision rules

- For contextual assistance, inspection, review, preview, and low-risk contextual editing where the main work context must remain visible, recommend the Adaptive Sidecar primitive first.
- Canonical implementation: `AdaptiveSidecarLayout`, `ContextualSidecar`, and `adaptive-sidecar-controller` from `@/components/greenhouse/primitives`.
- Apply the Primitive + Variants + Kinds method: official Adaptive Sidecar variants are `inspector`, `composer`, `assistant`, `reconciler`, `evidence`, and `runbook`; domain kinds must resolve to one of them before behavior/chrome is chosen.
- Desktop sidecar is an in-flow, full-height lane with non-modal semantics; it is not a custom Drawer, floating card, or Dialog.
- Mobile/tablet fallback may use the primitive's temporary Drawer mode.
- If the surface can be dirty or replace its target, require `reduceAdaptiveSidecarState()` or an equivalent adapter around it.
- Require GVC desktop and mobile evidence for any production consumer.

## Output contract

When responding, include:

- request normalization
- recommended pattern
- optional alternate pattern if it is materially useful
- local target path
- `full-version` references
- guardrails and anti-patterns
- validation notes

## Implementation rule

If asked to implement after the recommendation:

- build the smallest reusable slice first
- promote repeating primitives into `src/components/greenhouse/*`
- keep route-only composition local

## Figma Implementation Contract (gate)

Al implementar cualquier diseño (especialmente desde Figma), **Figma es intención, no valores literales**. Antes de escribir JSX, correr 2 gates (contrato canónico completo en CLAUDE.md / AGENTS.md → "Figma Implementation Contract"):

1. **Token mapping (siempre):** color → `theme.palette.*` / `theme.axis.*` / `var(--mui-palette-*)`; tipografía → variant/SoT (skill `typography-design`); spacing → scale `4n`; radius → `theme.shape.customBorderRadius.*` **como CSS length en `sx`**, no como número directo; motion → `motion/core/tokens.ts`. **NUNCA** transcribir HEX/px/fontFamily/ms crudos. Del MCP Figma usar `get_variable_defs` + `get_code_connect_map` → **mapear, no pegar**. Lint: `greenhouse/no-hardcoded-hex-color` + `no-hardcoded-fontfamily` + `no-fontsize-inline-typography`.

   **Gotcha radius MUI:** `sx={{ borderRadius: 2 }}` y `sx={theme => ({ borderRadius: theme.shape.customBorderRadius.sm })}` son multiplicadores MUI, no px directos; pueden inflar radios. En `sx`, usar string px desde el token.
2. **Primitive lookup en capas (ANTES de construir):** (a) ¿existe **primitive Greenhouse**? grep `src/components/greenhouse/primitives/index.ts` (~79 exports) + `docs/architecture/ui-platform/PRIMITIVES.md` → **usar o expandir** (variant/kind, no fork paralelo); (b) ¿hay **wrapper Vuexy `Custom*`** o componente MUI base (Select/Autocomplete/List/TextField/Menu…)? → la primitive nueva **envuelve esa base** (hereda a11y/teclado/estados), NUNCA reinventar input/select/list/dropdown desde cero; (c) solo si no hay nada → desde cero.

**Si hay que crear una primitive nueva (dropdown/list/input/etc.):** protocolo Primitive+Variants+Kinds COMPLETO — vive en `primitives/` + export en barrel + resolver `kind→variant`; a11y/responsive/reduced-motion horneados; **cero hardcode** (solo tokens); **Lab interno** `/admin/design-system/<nombre>` (gate `administracion.design_system`, alcanzable por nav + route-reachability); **GVC** desktop+mobile mirada; nodo AXIS Figma referenciado; contrato en `ui-platform/PRIMITIVES.md` (+ ADR si platform-level). Patrón fuente: `GreenhouseButton`/`GreenhouseChip`/`GreenhouseActivityTimeline`/chart cards.

**Reportar la decisión** (reuse / extend / new-primitive + por qué) ANTES de codear. Un one-off no-reusable puede vivir junto al consumer pero **igual tokenizado** (no va al registry).

## GVC data-capture markers (TASK-1056)

When building or materially changing visible UI, add stable `data-capture` markers to wrappers that GVC may need to scroll to, clip, assert, or interact with later:

- mark section/page blocks, panels, repeated review cards, design-system specimens, important states (`loading`, `empty`, `degraded`, `error`, `success`) and repeatable flow steps;
- use kebab-case semantic names (`home-nexa-insights-bento`, `notion-picker-degraded`), never copy-dependent text, positions like `card-2`, or PII;
- do not marker-spam every small button/div; controls only need markers when a scenario interacts with or clips them;
- scenarios should prefer `[data-capture="..."]` for `readiness.selector`, `scroll.selector`, `clipSelector`, `requiredRegions`, and interaction targets before text/nth-child selectors.

## GVC V1.5 — contract gates mockup→runtime (TASK-1018)

GVC (`pnpm fe:capture`) ya no es solo evidencia: es **contrato verificable** del paso mockup aprobado → runtime. Todos los gates son **opt-in por scenario + warning-first** (`error` solo si el scenario lo declara). Codes SSOT: `scripts/frontend/lib/failure-taxonomy.ts`.

- **Baseline visual diff**: el scenario declara `baseline.surfaceId` + `maxDiffRatio` (+ `maskSelectors` para datos dinámicos + `requiredFrameLabels`/`requiredRegions`). Promové el mockup aprobado con `pnpm fe:capture:diff --promote <capture-dir>` → home durable committeable `scripts/frontend/baselines/<surfaceId>/`. El runtime con el mismo `surfaceId` corre el diff solo: `match` / `exceeded` (con PNG diff) / `baseline_stale` (degrada honesto si falta). GVC aplica determinismo (animaciones off, caret oculto, reduced-motion, fonts settled) automáticamente cuando hay `baseline.surfaceId`.
- **`quality.layout`** (overflow / target <24px / texto cortado / scroll sin label / cards anidadas), **`quality.runtime`** (console.error / pageerror / hydration / 4xx-5xx), **`quality.keyboard`** (foco + focus ring + estado + reduced-motion), **`quality.performance`** (DOM nodes / requests / transfer / FCP), **`quality.enterpriseRubric`** (placeholders / exceso de —·0 / >1 botón primario / saturación cromática).
- `trace.zip` automático en captura fallida (`pnpm exec playwright show-trace <dir>/trace.zip`). `index.html` + `review-dossier.md` traen **resumen ejecutivo** (`Apto` / `Revisar` / `Requiere iteración`) + verdict del rubric.
- Regresión: `gvc-contract-gates` + `gvc-keyboard-focus`. Detalle: `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` Delta V1.5.
