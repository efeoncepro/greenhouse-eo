# Greenhouse UI Platform — Primitives

> Parte de **Greenhouse UI Platform**. Índice: [README.md](./README.md). Historial (deltas de cada primitive): [HISTORIAL.md](./HISTORIAL.md).
> Autoridad final = runtime (`src/components/greenhouse/primitives/**`); este doc es el catálogo + dónde vive el contrato de cada uno.

## Metodología canónica — Primitive + Variants + Kinds

UI reusable o platform-level se modela en tres niveles (NO componentes paralelos por surface):

- **Primitive** — componente estable que owns layout / a11y / responsive / motion / shell / state / GVC.
- **Variant** — un modo funcional **oficial** de la primitive (comportamiento, densidad, estados, footer/actions). No es un skin.
- **Kind** — el caso semántico de dominio/workflow; **debe mapear a una variant** vía un resolver idempotente `kind→variant`.

Shape canónico: `<Primitive variant='inspector' kind='contractReview' />`.

**ADR:** [GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md](../GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md).

## Catálogo de primitives canónicas (contrato → fuente)

Cada primitive tiene su contrato canónico en una ADR/spec dedicada o en su delta de HISTORIAL. Antes de crear un componente reusable nuevo, reusar/extender la primitive existente.

| Familia | Primitive(s) | Contrato canónico |
|---|---|---|
| **Adaptive Sidecar** (asistencia/inspección/review/preview/edición contextual que preserva contexto) | `AdaptiveSidecarLayout`, `ContextualSidecar`, `adaptive-sidecar-controller` | [GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md](../GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md) + [GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md](../GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md) |
| **Floating Surface** (popovers, action menus, rich tooltips, evidence peeks, inline editors, validation bubbles, command previews) | `GreenhouseFloatingSurface`, `floating-surface-controller` — chrome depth via el rol semántico `theme.greenhouseElevation.floating` (NO `elevation={n}`) | [GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md](../GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md) + HISTORIAL Deltas 2026-06-06b / 2026-06-07j / 2026-06-07k |
| **Elevation / shadow tokens** (roles semánticos `none`/`raised`/`floating`/`overlay`/`modal`/`overflow` reservado) | `theme.greenhouseElevation.<role>` (SoT `src/components/theme/elevation-tokens.ts`) — las primitives leen un rol, no `Paper elevation={n}` / `theme.shadows[n]` | [GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md](../GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md) + HISTORIAL Delta 2026-06-07k · lab `/admin/design-system/elevation` |
| **Floating Action Dock** (acciones persistentes ancladas al viewport) | `NexaFloatingButton`, `ScrollToTop` + safe-area CSS vars | HISTORIAL Delta 2026-06-06c |
| **Motion** (cinemático/orquestado/scroll) | `<Motion>`, `useGreenhouseGSAP` | [GREENHOUSE_MOTION_PRIMITIVE_V1.md](../GREENHOUSE_MOTION_PRIMITIVE_V1.md) → ver [MOTION.md](./MOTION.md) |
| **Microinteraction** | `GreenhouseAsyncActionButton`, `GreenhouseCommandFeedback`, `GreenhouseStateTransition`, `GreenhouseInlineValidation`, `GreenhouseFieldProvenancePeek`, `GreenhouseStepperProgressMicro`, `GreenhouseEvidenceAttachmentDropzone`, `GreenhouseInlineDecisionPrompt` | HISTORIAL Deltas 2026-06-06 / 06e |
| **Loading Surface** | `GreenhouseLoadingSurface` + variants nombradas (`GreenhouseDocumentPipelineLoader`, `GreenhouseExternalHandoffLoader`, …) | HISTORIAL Delta 2026-06-06d (TASK-1037) |
| **Chart cards** | `GreenhouseChartCard`, `GreenhouseStackedDistributionChartCard`, `GreenhouseMetricBreakdownChartCard`, `MetricTrendCard`; Apex runtime via `AppReactApexCharts` | HISTORIAL Deltas 2026-06-07 / 2026-06-02 / 2026-06-07l → ver también `dataviz-design` |
| **Chips** | `GreenhouseChip` (AXIS; `label` variant tonal AA vía `theme.greenhouseSemantic`) | HISTORIAL Deltas 2026-06-07c / 2026-06-08 (TASK-1053 Fase B) |
| **Feedback atoms** | `GreenhouseKpiDelta` (delta KPI inline: signo + flecha + color AA, variants text/tonal, `invert`), `GreenhouseStatusDot` (dot de estado + label/ariaLabel obligatorio, `pulse`/`halo`) — color nunca solo; consumen `theme.greenhouseSemantic` | HISTORIAL Delta 2026-06-08 (TASK-1053 Fase B Slice B2) |
| **Buttons** | `GreenhouseButton` (AXIS) + `GreenhouseAsyncActionButton` (compone Button) | HISTORIAL Deltas 2026-06-07d / 06-07e |
| **Utilities** | `GreenhouseActivityTimeline` | HISTORIAL Delta 2026-06-07b |
| **Summary / Quote builder** | `EntitySummaryDock`, `CardHeaderWithBadge`, `FormSectionAccordion`, `ContextChipStrip`, `TotalsLadder` | HISTORIAL Deltas 2026-05-05 / 2026-04-19 / 2026-04-20 |

> **Nota de límites:** Adaptive Sidecar ≠ Floating Surface ≠ Dialog. Sidecar = lane in-flow full-height que preserva el contexto; Floating Surface = UI contextual anclada y transitoria; `Dialog` modal sigue obligatorio para decisiones destructivas/irreversibles/legales/financieras. Floating Action Dock cubre acciones persistentes ancladas al viewport, distinto de Floating Surface. Floating Surface usa `motion: anchored` con CSS Tier 1 + tokens; no usa la Motion Primitive GSAP porque no es motion cinemática/orquestada.

## ApexCharts Runtime Wrapper

`AppReactApexCharts` (`src/libs/styles/AppReactApexCharts.tsx`) es el wrapper canónico para charts Apex legacy/productivos. El wrapper owns la única frontera `next/dynamic(..., { ssr:false })` hacia `react-apexcharts`; los consumers lo importan directo.

Reglas:

- NO envolver `AppReactApexCharts` con otro `dynamic(() => import('@/libs/styles/AppReactApexCharts'))`.
- NO importar `@/libs/ApexCharts`; ese indirection legacy fue retirado.
- Si un chart necesita SSR-off, se resuelve en el wrapper común, no en cada consumer.
- Guardrail: `greenhouse/no-dynamic-app-react-apexcharts` (`error`).

Motivo: el doble dynamic produjo manifests/chunks huérfanos en Turbopack dev (`react-apexcharts_min_*.js` 404), dejando Fast Refresh en rebuild permanente y el portal local en `Compiling...` (ISSUE-085).

Diagnóstico rápido para casos similares: si local queda en `Compiling...`, revisar CPU/proceso, comparar `curl -I` vs browser real y usar Playwright console/network filtrando `_next/static/chunks`, HMR y 404. Si aparece un chunk huérfano, comparar `.next/dev/**/react-loadable-manifest.json` con `.next/dev/static/chunks` y buscar fronteras `dynamic()`/imports nested en wrappers compartidos. `pnpm clean` solo confirma; el fix vive en el owner canónico del wrapper.

## Tipografía, tokens y color de las primitives

Las primitives consumen el SoT, nunca valores inline:

- **Tipografía** → variantes/tokens del SoT (`typography-design` skill + [GREENHOUSE_DESIGN_TOKENS_V1.md](../GREENHOUSE_DESIGN_TOKENS_V1.md) §3). Nunca `fontSize`/`fontFamily` inline.
- **Color / tokens** → `theme.palette.*` / `theme.axis.*` + `DESIGN.md`. Ver `design-system-governance`.
- **Motion** → [MOTION.md](./MOTION.md).
