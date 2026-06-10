---
name: greenhouse-mockup-builder
description: Build Greenhouse UI mockups as real Next.js portal routes with typed mock data, Vuexy/MUI wrappers, and Greenhouse primitives. Use whenever a user asks for a mockup, prototype, visual concept, clickable UI draft, or design iteration inside greenhouse-eo.
---

# Greenhouse Mockup Builder

Use this skill whenever the user asks for a mockup, prototype, clickable concept, visual draft, or design iteration for Greenhouse UI.

Manual invocation in Claude Code: `/greenhouse-mockup-builder [surface, goal, screens, constraints]`.

The default is **real portal mockup**, not standalone HTML.

## First Reads

Read only what the task needs:

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- `DESIGN.md`
- `docs/architecture/ui-platform/README.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

If pattern choice, copy, or motion is material, combine with:

- `greenhouse-ui-review`
- `modern-ui`
- `greenhouse-microinteractions-auditor` when available
- existing Greenhouse UI/UX guidance in `docs/ui/*`

## Hard Rule

Do **not** create standalone `.html` / isolated CSS mockups for Greenhouse portal UI unless the user explicitly asks for a static artifact outside the app.

Build mockups as real Next.js routes with mock data:

- Route: `src/app/(dashboard)/<domain>/<surface>/mockup/page.tsx`
- View: `src/views/greenhouse/<domain>/<surface>/mockup/*`
- Mock data: typed local module or constants near the view
- Shared primitives only when reuse is real: `src/components/greenhouse/*`
- If the mockup explores reusable UI, apply Primitive + Variants + Kinds: one primitive, official functional variants, and domain kinds mapped into those variants.

## Implementation Contract

Use the real product stack:

- Vuexy/MUI theme from the repo
- `@core/components/mui/*` wrappers such as `CustomTextField`, `CustomChip`, `CustomAvatar`, `CustomTabList`, `CustomIconButton`
- Existing Greenhouse primitives such as `EmptyState`, `CardHeaderWithBadge`, `EntitySummaryDock`, `ContextChipStrip`, and other `src/components/greenhouse/*` primitives
- For contextual sidecars, use `AdaptiveSidecarLayout` + `ContextualSidecar` and its official variants (`inspector`, `composer`, `assistant`) instead of custom drawers/cards.
- `src/lib/format/*` for visible numbers, dates, currency, percentages, and relative time
- `src/lib/copy/*` / domain copy modules for shared copy, states, aria labels, empty states, and labels when lint requires tokenization

Avoid standalone pages, parallel themes, copied demo pages, direct `Intl.*` formatting, raw MUI where a wrapper exists, and hardcoded copy that violates Greenhouse lint gates.

## Workflow

1. Normalize the request: surface, audience, user task, data shape, action density, and states.
2. Present a short plan for approval before coding when the user asks for approval or the surface is broad.
3. Implement a route-local mockup with typed mock data and real Greenhouse components.
4. Include loading shape, empty, partial, warning, error, and success states where applicable.
5. Keep backend integration seams clear: no fake API routes unless explicitly needed.
6. Validate before presenting:
   - `pnpm exec tsc --noEmit --pretty false`
   - `pnpm lint`
   - `pnpm design:lint`
   - run or relaunch `pnpm dev` and provide the local URL

## Output

Report the local URL, files changed, validations run, auth/session requirement, and known mock-data limits.

## Acceptance Bar

A Greenhouse mockup is approved-quality when future backend work can replace mock data/readers without reinterpreting the visual direction.

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
