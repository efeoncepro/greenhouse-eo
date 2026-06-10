# Product Design QA — Greenhouse Funnel Chart Primitive

- source visual truth path: `/Users/jreye/.codex/generated_images/019eac37-77c1-7223-af97-7cbc7d7a1b2c/ig_0d2ef03d44041b1e016a27ff539384819186584d3145cc22d4.png`
- implementation screenshot path: `/Users/jreye/Documents/greenhouse-eo/.captures/2026-06-09T18-35-44_design-system-charts/01-desktop/frames/02-funnel-pipeline.png`
- viewport: desktop 1280x900, wide 1600x900, mobile iPhone 13
- state: Charts Lab specimen, `GreenhouseFunnelChartCard variant='operationalPipeline' kind='cscPipeline'`, default selected stage `Cambios`
- full-view evidence: `/Users/jreye/Documents/greenhouse-eo/.captures/2026-06-09T18-35-44_design-system-charts/02-wide/frames/01-charts-lab.png`
- focused region evidence: desktop root clip, wide root clip, desktop/wide full-page Lab, mobile root capture, Creative Pipeline header, primary-blue metric/view toolbar, card-level overflow action, explicit KPI strip divider, funnel rail, hover tooltip frame, compact Nexa contextual prompt with `GreenhouseNexaBrandMark kind='askNexaBadge'` using control-label typography, first-person contextual guide with Nexa-colored thinking dots, stable non-rotating input placeholder, compact help tooltip visible on desktop/tablet with semibold scan anchors and non-obstructive aria-label-only affordance on mobile, diagnostics grid, quiet selected-stage affordance, and footer note were reviewed from `/Users/jreye/Documents/greenhouse-eo/.captures/2026-06-09T18-35-44_design-system-charts`
- side-by-side Product Design comparison: `/Users/jreye/Documents/greenhouse-eo/.captures/2026-06-09T13-23-22_design-system-charts/funnel-product-design-comparison.png`

## Findings

- No P0/P1/P2 findings remain.
- P3 residual: the implemented rail is more rectilinear and token-governed than the source visual's slightly tilted concept rail. This is acceptable for the first primitive because Greenhouse needs stable hit targets, responsive overflow, and deterministic geometry before adding a more editorial skewed rail variant.
- P3 residual: the mobile GVC root capture includes the dashboard bottom navigation fixed over part of the long element screenshot. Runtime summary is clean and the primitive content remains scrollable; this is a capture/shell artifact rather than a primitive blocker.

## Required Fidelity Surfaces

- Fonts and typography: passed. The implementation uses canonical MUI/Greenhouse variants (`h4`, `h5`, `body2`, `subtitle1`, `kpiValue`, `caption`) rather than literal source font values; hierarchy and wrapping hold on desktop and mobile.
- Spacing and layout rhythm: passed. Header, KPI strip, rail, diagnostics grid, and footer keep stable gutters and no text overlap. The latest pass replaces DOM-overlapped stages with one SVG rail layer behind the content grid, so chevron geometry no longer clips text or compounds alpha at the tips. The KPI strip now closes with an explicit tokenized divider before the rail. The dense selected-stage explanation band was replaced by `NexaGreetingsCard variant='compactContextual'`: a white, centered prompt dock with one contextual first-person guide rotating slowly above a compact stable input, no shadow/elevation, title/focus hidden behind an info tooltip, a short Nexa "thinking" beat using teal/core-blue/navy dots before the guide swaps, and the `askNexaBadge` primitive above the chat box. Owner and freshness stay in the diagnostics table below instead of duplicating inside the Nexa prompt. Metric values no longer ellipsize, and the redundant stage-role label was removed from the visual rail while remaining available to aria labels and summaries.
- Colors and visual tokens: passed. Stage color now reflects process role (`Entrada`, `Producción`, `Control`, `Retrabajo`, `Entrega`) via theme tokens; operational health is separated into dots/chips and text so status is not color-only.
- Image quality and asset fidelity: passed. The source is a UI concept, not product imagery; implementation uses icon classes and Greenhouse primitives instead of custom raster approximations.
- Copy and content: passed. Labels are domain-fixture content for the internal Charts Lab and the primitive exposes props for product-owned copy.

## Patches Made Since Previous QA Pass

- Removed GVC sticky-topbar contamination by changing the scenario order and using a direct primitive clip after the full-page mark.
- Changed active segmented controls from heavier outlined treatment to lighter `label` treatment.
- Added hover/tap motion on stage segments via the primitive's motion wrapper with reduced-motion guard.
- Reworked mobile toolbar layout so the metric/view segmented controls stack cleanly and the overflow action stays aligned at the right.
- Re-ran Product Design visual comparison against the selected option 3 source and the latest GVC implementation frame.
- Reworked the stage color contract from manual `tone` to semantic `stageRole` with fallback sequencing.
- Added `health`, selected-stage explanation, invalid-value normalization, honest empty state, and tests for empty/invalid data.
- Removed unintended desktop/Lab horizontal scroll by compacting rail geometry, reducing stage padding, and limiting forced `min-width` to mobile breakpoints.
- Repaired the failed compacting pass by replacing DOM-overlapped stages with a single SVG rail layer and preserving content in a separate grid layer.
- Replaced translucent DOM stage fills with solid `color-mix(...)` SVG polygon fills in light mode so chevron tips do not darken from compounded alpha.
- Simplified the KPI strip to a deterministic metrics-first layout with the insight band below, removing floating dividers and avoiding viewport-dependent overlap.
- Added a small SVG rail corner radius token so the funnel reads more modern while preserving the directional chevron silhouette.
- Removed the visual stage-role label from each chevron because the stage title below already names the step; the role remains in the accessible summary.
- Added a wide 1600px GVC viewport to cover the breakpoint that reproduced the user's screenshot.
- Reworked the insight band into a compact diagnostic ribbon with accent stripe, evidence row and right-aligned CTA so the surface no longer reads as an empty alert card.
- Reworked the selected-stage explanation band into a compact inspector pattern with stage icon, `caption` context label, `h5` stage title, `body2` description, two primary impact facts, lightweight blocker/signal chips, rounded border and no lateral accent stripe.
- Replaced per-stage SVG strokes with fill-only stage paths, single-pass clipped internal separators, and one outer rounded SVG border, so the rail no longer shows duplicate top/bottom strokes or stray lines at the exterior caps.
- Rounded the internal separator apex with a small quadratic curve so the chevron tips keep a modern softened silhouette without reintroducing duplicate strokes.
- Simplified the chart header after Product Design review: technical metadata stays out of the visual header, the stage path reads as quiet breadcrumb text, and metric/view controls share one compact toolbar with option icons and a contained overflow action.
- Renamed the lab specimen to `Creative Pipeline` and replaced the arrow path with compact explanatory text so the header complements the rail instead of competing with it.
- Moved the subtitle into an info tooltip beside the `Creative Pipeline` title, switched the metric/view segmented controls to primary blue, moved the card-level overflow action outside the control rectangle, removed its visible box, center-aligned the header row, added an explicit tokenized KPI-to-rail divider, and removed duplicated owner/freshness from the selected-stage inspector.
- Replaced the selected-stage inspector with a compact Nexa contextual prompt that reuses `NexaGreetingsCard`, avoids the olive/secondary ramp, removes input shadow, centers the prompt field, and keeps prompt ideas only as rotating placeholder examples.
- Removed the selected-stage rectangular overlay/top bar from the rail after GVC/user review; selected state is now expressed through a quiet icon halo, tooltip, `aria-pressed`, and Nexa prompt context so the chevron geometry stays pristine.
- Removed the rectangular hover tint from stage buttons; hover now opens the tooltip and reinforces only the stage icon halo, preventing reversed-looking shadows/overlays on the SVG rail.
- Added a Nexa prompt submit contract that passes selected-stage context, stage metrics, and summary to consuming sidecars/assistant flows without duplicating data inside the prompt dock.
- Added `GreenhouseNexaBrandMark` with `kind='askNexaBadge'` so the prompt dock uses the real Nexa arc+sparkle SVG asset on the Midnight Navy badge instead of a generic sparkle icon.
- Refined the compact Nexa prompt voice and motion: the helper line now speaks in first person with a technical but slightly witty tone (`separo señal de ruido`, `ese % no viene solo`), rotates slowly with a brief brand-colored thinking-dot beat, and keeps the input placeholder stable to avoid competing motion.
- Anchored the retained-rate status dot row to the bottom of every stage segment so the percentages share one visual baseline even when stage helper text wraps differently.

## Implementation Checklist

- Keep `GreenhouseFunnelChartCard` as the single primitive for operational funnel rails.
- Add future semantic `kind`s through `greenhouse-funnel-chart-controller.ts`, not separate chart components.
- Use Recharts only for future vertical funnel variants where axis/tooltip behavior is chart-native.
- Create additional GVC interaction frames when a consuming workflow wires real sidecar actions.

## Final Result

final result: passed
