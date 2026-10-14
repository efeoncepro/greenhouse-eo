# TASK-2037 — Measurement configuration

## Experience brief

Internal Growth operator configures a source and sees why it can or cannot publish measurement.
Existing Forms cockpit inspector remains the primary context. No separate screen or navigation.

## Visual Direction Contract

- Visual direction mode: `repo-native-benchmark`

- Product Design asset: `docs/ui/visual-directions/TASK-2037-measurement-policy.md`

 Source: existing GrowthFormsAdminCockpitView inspector and
AdaptiveSidecarLayout; versioned direction docs/ui/visual-directions/TASK-2037-measurement-policy.md.
Desktop1440: existing source list and contextual inspector, a single section with scope, field
mapping, destination controls, current revision and one primary next action. Mobile390: inspector
is a single column; controls stretch, labels wrap, lifecycle actions wrap without horizontal scroll.
Action hierarchy: save draft→review→publish; disable is separate outlined action for published.
Visual fidelity mapping: theme typography, text/background/divider/semantic tokens; MUI spacing,
GreenhouseButton and Chip; no literal HEX/font/px or new motion system.

## State inventory

Loading, no policy, draft, review, published, disabled, invalid mapping/version, stale/conflict,
permission denied and network failure. No success claim before server receipt/readback.

## Implementation Mapping

MeasurementPolicyPanel consumes the canonical administrative API and source catalog; cockpit
only mounts it. Labels/errors live in growth-measurement copy. MUI selects show typed source
field options; no arbitrary JSON. Policy content/publication logic remains server-only.

## GVC Scenario Plan

Quality profile: premium

Capture desktop 1440 and mobile 390, inspect images, axe/focus/keyboard, reduced-motion and
scrollWidth<=clientWidth. Scenarios: empty, draft, blocked, review, published, disabled, denied,
error, conflict. Produce a review dossier under .captures/task-2037; review/scorecard versioned after capture.
Baseline: repo-native composition, no external screenshot to clone.

## Design Decision Log

Selected contextual inspector over a new screen (extra navigation) or JSON editor (unsafe,
technical burden). Reuse existing inspector primitives; no new platform primitive or card grid.
First fold must be captured and reviewed before wiring exhaustive lifecycle states.

## Desktop Target

At desktop 1440, the existing list and inspector stay in the CompositionShell. The measurement
section is a flat Stack in the selected source inspector, below hosting context. It contains
one source selector, current revision status, mapping fields and destination switches. Long
source names wrap. Revision metadata uses secondary body text; publication is the primary action.

## Mobile Target

At mobile 390 the existing compact inspector owns navigation. All controls fill its available
width; actions wrap with theme spacing. No fixed-width table, horizontal scroll or extra drawer.
Labels persist above values, status/recovery appear before mutation controls in reading order.

## Action Hierarchy

Only the next lifecycle action is primary: Guardar borrador, Revisar configuración, then Publicar.
The published revision remains active while a replacement is prepared. Desactivar is a separate
outlined action, with an inline confirmation explaining pending deliveries before the final action.
Reload and cancel are tertiary; changing an edited source asks inline to discard or keep editing.

## Visual Fidelity Mapping

Reuse CompositionShell and the existing AdaptiveSidecarLayout without creating a parallel shell.
Reuse MUI TextField/MenuItem/Switch/Alert, GreenhouseButton and GreenhouseChip. Typography variants,
spacing scale and palette text/divider/background tokens come from the native theme. This is a
contextual form, not a dashboard: no KPI tiles, nested cards, gradients or invented animations.

## Copy Ledger

All user copy is owned by src/lib/copy/growth-measurement.ts. Title: Medición de conversiones.
Source: Formulario o agenda. Mapping labels: Correo, Teléfono, Nombre, Apellido. Destination labels:
Meta y Google Ads. Helper explains that matching uses consented data and cannot create a conversion
before acceptance. Revisions are labeled Revisión N; statuses use Spanish lifecycle terms.

## State Copy

| State | Visible copy | Recovery |
| --- | --- | --- |
| ready | Configuración publicada | Edit a new revision or deactivate current. |
| loading | Cargando configuración… | Retain source and retry if loading fails. |
| empty | Esta fuente aún no tiene medición | Map fields and save first draft. |
| partial | Hay campos o permisos pendientes | Explain blockers and retain input. |
| error | No pudimos guardar la configuración | Retry the same idempotent request. |
| denied | No tienes permiso para administrar esta medición | Request internal permissions. |
| conflict | La configuración cambió | Reload current revision, retaining unsaved values. |
| disabled | Medición desactivada | Prepare and publish a new revision. |

## Accessibility Contract

Use native labeled MUI controls and semantic section heading; no icon-only lifecycle actions.
Status is aria-live polite, error feedback uses Alert and retains focus/input. Keyboard reaches
source, destinations, typed field mapping and the next action in DOM order. Disabled controls
have adjacent reasons. Reduced-motion retains identical meaning; desktop/mobile checks include
visible focus and overflow measurements. Section marker: measurement-policy-panel.
