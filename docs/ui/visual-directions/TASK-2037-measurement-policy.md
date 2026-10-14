# TASK-2037 — Contextual measurement inspector, v1

Mode: repo-native-benchmark. Durable source: existing GrowthFormsAdminCockpitView.tsx inspector,
AdaptiveSidecarLayout and GreenhouseButton/Chip theme recipes. No external design dependency.

## Alternatives

1. Contextual inspector section (selected): source/surface and published revision first, typed
   mapping then destinations, one next action. The selected form supplies context; Meetings
   is an explicit source option in the same section. Keeps the surrounding operation visible.
2. Standalone measurement dashboard (rejected): extra navigation, empty KPI/card scaffolding,
   duplicates source catalog and operator context for a small configuration workflow.
3. JSON configuration modal (rejected): hides field types, discourages review and increases
   privacy/configuration errors. No arbitrary editor or provider-specific technical fields.

## Visual thesis and targets

Desktop1440: one coherent inspector surface, compact eyebrow Medición, heading Configura la
medición, neutral revision/status and selected source/surface. Inputs have persistent labels;
field mapping is a two-column grid only when the inspector has room. Destinations are compact
labelled switches. A divider separates configuration from lifecycle actions. No nested cards,
color rails, gradients, KPI grids or heavy header. Existing page shell/header are retained.
Mobile390: all fields/actions stack naturally at full readable width; no fixed footer covers
inputs, horizontal chips overflow or truncated source values. Source selector wraps labels.

Hierarchy: source/scope → publication state → contact mapping → destinations → primary next
step. Saving is not publishing. Published state displays an explicit Disable action; no fake
success before server readback. Invalid/stale source has a clear explanation and no publish.

## Primitive and token mapping

Reuse existing inspector host and MUI Stack/Box, TextField select/MenuItem, FormControlLabel/
Switch, Alert and Typography. GreenhouseButton/Chip handle actions/status. Theme palette text,
divider/background and semantic states; typography variants, spacing/radii use MUI theme.
No literal colors, custom fonts, bespoke motion, reusable platform primitive or navigation entry.
Copy belongs to GH_GROWTH_MEASUREMENT. data-capture markers identify panel/source/actions.

## GVC and acceptance

qualityProfile premium; desktop1440/mobile390. Capture first fold and inspect source/status/
mapping/actions before exhaustive lifecycle wiring. Then empty/draft/blocked/review/published/
disabled/conflict/denied/error, keyboard, contrast, reduced-motion and no horizontal overflow.
Scorecard must use rendered evidence, never inflated scores to close. Test fixtures validate
layout; API/runtime readback independently verifies actual publication and authorization.

## Decision

Use a contextual configuration section in the existing Forms inspector. The selected source,
publication status and next action share one reading order; no new dashboard or route is needed.
The product decision is whether this source can measure accepted commercial conversions.

## Desktop target

At 1440 the existing CompositionShell retains list and inspector. The measurement section fits
the inspector width with a source selector, status line, typed mapping and destination switches.
Use vertical rhythm instead of nested cards; one primary action communicates the next lifecycle step.

## Mobile target

At 390 controls form a single column in the existing compact inspector. Labels wrap, inputs and
alerts fit available width, and action groups wrap. No fixed-width table or extra navigation layer.

## Token mapping

Typography uses native heading/body/caption variants. Text, background, divider and feedback colors
come from theme.palette; spacing uses the theme scale. GreenhouseButton/Chip and labeled MUI inputs
provide interaction, keyboard and semantic feedback. No literal colors, typefaces or motion values.

## Anti-patterns

Avoid KPI tiles, raw JSON editing, another dashboard, nested cards and status-colored decoration.
Never claim publication from local state: the action requires a server receipt and current revision
readback. Never put contact values in this administrative configuration or its diagnostics.
