---
name: greenhouse-ui-orchestrator
description: Orchestrate Vuexy and MUI pattern selection for Greenhouse UI work, including reusable component choice and full-version adaptation.
---

# Greenhouse UI Orchestrator

Use this skill when the task is to decide which Vuexy or MUI pattern Greenhouse should use.

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

1. **Token mapping (siempre):** color → `theme.palette.*` / `theme.axis.*` / `var(--mui-palette-*)`; tipografía → variant/SoT (skill `typography-design`); spacing/radius → spacing scale `4n` / `theme.shape.customBorderRadius.*`; motion → `motion/core/tokens.ts`. **NUNCA** transcribir HEX/px/fontFamily/ms crudos. Del MCP Figma usar `get_variable_defs` + `get_code_connect_map` → **mapear, no pegar**. Lint: `greenhouse/no-hardcoded-hex-color` + `no-hardcoded-fontfamily` + `no-fontsize-inline-typography`.
2. **Primitive lookup en capas (ANTES de construir):** (a) ¿existe **primitive Greenhouse**? grep `src/components/greenhouse/primitives/index.ts` (~79 exports) + `docs/architecture/ui-platform/PRIMITIVES.md` → **usar o expandir** (variant/kind, no fork paralelo); (b) ¿hay **wrapper Vuexy `Custom*`** o componente MUI base (Select/Autocomplete/List/TextField/Menu…)? → la primitive nueva **envuelve esa base** (hereda a11y/teclado/estados), NUNCA reinventar input/select/list/dropdown desde cero; (c) solo si no hay nada → desde cero.

**Si hay que crear una primitive nueva (dropdown/list/input/etc.):** protocolo Primitive+Variants+Kinds COMPLETO — vive en `primitives/` + export en barrel + resolver `kind→variant`; a11y/responsive/reduced-motion horneados; **cero hardcode** (solo tokens); **Lab interno** `/admin/design-system/<nombre>` (gate `administracion.design_system`, alcanzable por nav + route-reachability); **GVC** desktop+mobile mirada; nodo AXIS Figma referenciado; contrato en `ui-platform/PRIMITIVES.md` (+ ADR si platform-level). Patrón fuente: `GreenhouseButton`/`GreenhouseChip`/`GreenhouseActivityTimeline`/chart cards.

**Reportar la decisión** (reuse / extend / new-primitive + por qué) ANTES de codear. Un one-off no-reusable puede vivir junto al consumer pero **igual tokenizado** (no va al registry).
