---
name: greenhouse-ui-enterprise-review
description: Enterprise UI quality gate for Greenhouse. Invoke before committing significant UI changes or when a surface must meet a modern Lovable/Stitch-level product quality bar. Blocks generic, junior, inaccessible, or screenshot-unverified UI.
type: gate
---

# Greenhouse UI Enterprise Review

This is a product-quality gate, not a token-only lint.

Use after implementation and screenshots, before commit or approval.

## Inputs

- target files
- design intent or Product UI ADR
- screenshots: desktop, laptop, mobile
- relevant tests/commands

## Gate Rubric

Score 1-5:

- product intent clarity
- first-fold hierarchy
- action clarity
- information architecture
- visual maturity
- responsive quality
- state coverage
- accessibility cues
- microinteraction affordance
- repo consistency
- implementation maintainability
- adaptive sidecar fit when the UI is contextual assistance, inspection, review, preview, or low-risk editing
- error-surface recovery and brand voice for 404/401/access-denied/unavailable routes

## Blockers

- No screenshot evidence for a visual-quality request.
- Primary action is unclear or duplicated across competing regions.
- Mobile is a squeezed desktop or has clipped controls/text.
- Partial/degraded data appears complete.
- Important state is color-only.
- UI is generic template composition rather than task-native.
- Copy is vague or reusable copy is hardcoded in JSX.
- High-friction error surfaces use generic template copy only, or creative variants obscure cause/recovery, rotate while reading, or hardcode reusable copy in JSX.
- New component bypasses established Greenhouse primitives without rationale.
- Reusable UI creates parallel components instead of applying Primitive + Variants + Kinds (`GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`).
- A `variant` only changes color/radius/shadow/icon instead of behavior, density, state model, action placement, or microinteraction contract.
- A desktop contextual sidecar is implemented as a custom drawer/card overlay instead of `AdaptiveSidecarLayout` + `ContextualSidecar`.
- A dirty/replacing sidecar has no idempotent close/replacement guard.

## Verdict Rules

- `PASS`: no blockers and average score >= 4.2.
- `CONDITIONAL PASS`: no blockers, average >= 3.8, polish follow-ups acceptable.
- `BLOCK`: any blocker or average < 3.8.

## Output Format

```md
# Enterprise UI Review — [surface]

## Verdict

PASS | CONDITIONAL PASS | BLOCK

## Scores

| Dimension | Score | Notes |
| --------- | ----: | ----- |

## Blockers

1. ...

## Enterprise Bar

1. ...

## Polish

1. ...

## Required Next Iteration

...
```

## Figma Implementation Contract (gate)

Al implementar cualquier diseño (especialmente desde Figma), **Figma es intención, no valores literales**. Antes de escribir JSX, correr 2 gates (contrato canónico completo en CLAUDE.md / AGENTS.md → "Figma Implementation Contract"):

1. **Token mapping (siempre):** color → `theme.palette.*` / `theme.axis.*` / `var(--mui-palette-*)`; tipografía → variant/SoT (skill `typography-design`); spacing/radius → spacing scale `4n` / `theme.shape.customBorderRadius.*`; motion → `motion/core/tokens.ts`. **NUNCA** transcribir HEX/px/fontFamily/ms crudos. Del MCP Figma usar `get_variable_defs` + `get_code_connect_map` → **mapear, no pegar**. Lint: `greenhouse/no-hardcoded-hex-color` + `no-hardcoded-fontfamily` + `no-fontsize-inline-typography`.
2. **Primitive lookup en capas (ANTES de construir):** (a) ¿existe **primitive Greenhouse**? grep `src/components/greenhouse/primitives/index.ts` (~79 exports) + `docs/architecture/ui-platform/PRIMITIVES.md` → **usar o expandir** (variant/kind, no fork paralelo); (b) ¿hay **wrapper Vuexy `Custom*`** o componente MUI base (Select/Autocomplete/List/TextField/Menu…)? → la primitive nueva **envuelve esa base** (hereda a11y/teclado/estados), NUNCA reinventar input/select/list/dropdown desde cero; (c) solo si no hay nada → desde cero.

**Si hay que crear una primitive nueva (dropdown/list/input/etc.):** protocolo Primitive+Variants+Kinds COMPLETO — vive en `primitives/` + export en barrel + resolver `kind→variant`; a11y/responsive/reduced-motion horneados; **cero hardcode** (solo tokens); **Lab interno** `/admin/design-system/<nombre>` (gate `administracion.design_system`, alcanzable por nav + route-reachability); **GVC** desktop+mobile mirada; nodo AXIS Figma referenciado; contrato en `ui-platform/PRIMITIVES.md` (+ ADR si platform-level). Patrón fuente: `GreenhouseButton`/`GreenhouseChip`/`GreenhouseActivityTimeline`/chart cards.

**Reportar la decisión** (reuse / extend / new-primitive + por qué) ANTES de codear. Un one-off no-reusable puede vivir junto al consumer pero **igual tokenizado** (no va al registry).

## GVC data-capture markers (TASK-1056)

When reviewing visible UI, flag missing or unstable GVC markers if the section, state, panel, design-system specimen, or repeatable flow step will need capture evidence:

- prefer stable `[data-capture="..."]` selectors in scenarios over text, positional, or nth-child selectors;
- names must be semantic kebab-case (`home-nexa-insights-bento`, `notion-picker-degraded`), never PII, translated copy, or position labels;
- do not require markers on every small button/div unless GVC must interact with or clip that control.

## GVC V1.5 — contract gates mockup→runtime (TASK-1018)

GVC (`pnpm fe:capture`) ya no es solo evidencia: es **contrato verificable** del paso mockup aprobado → runtime. Todos los gates son **opt-in por scenario + warning-first** (`error` solo si el scenario lo declara). Codes SSOT: `scripts/frontend/lib/failure-taxonomy.ts`.

- **Baseline visual diff**: el scenario declara `baseline.surfaceId` + `maxDiffRatio` (+ `maskSelectors` para datos dinámicos + `requiredFrameLabels`/`requiredRegions`). Promové el mockup aprobado con `pnpm fe:capture:diff --promote <capture-dir>` → home durable committeable `scripts/frontend/baselines/<surfaceId>/`. El runtime con el mismo `surfaceId` corre el diff solo: `match` / `exceeded` (con PNG diff) / `baseline_stale` (degrada honesto si falta). GVC aplica determinismo (animaciones off, caret oculto, reduced-motion, fonts settled) automáticamente cuando hay `baseline.surfaceId`.
- **`quality.layout`** (overflow / target <24px / texto cortado / scroll sin label / cards anidadas), **`quality.runtime`** (console.error / pageerror / hydration / 4xx-5xx), **`quality.keyboard`** (foco + focus ring + estado + reduced-motion), **`quality.performance`** (DOM nodes / requests / transfer / FCP), **`quality.enterpriseRubric`** (placeholders / exceso de —·0 / >1 botón primario / saturación cromática).
- `trace.zip` automático en captura fallida (`pnpm exec playwright show-trace <dir>/trace.zip`). `index.html` + `review-dossier.md` traen **resumen ejecutivo** (`Apto` / `Revisar` / `Requiere iteración`) + verdict del rubric.
- Regresión: `gvc-contract-gates` + `gvc-keyboard-focus`. Detalle: `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` Delta V1.5.
