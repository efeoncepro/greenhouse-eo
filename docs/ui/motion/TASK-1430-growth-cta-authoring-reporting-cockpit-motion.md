# TASK-1430 — CTA cockpit motion

## Meta

- Task: `TASK-1430`
- Scope: existing Composition Shell, sidecar/dialog and control feedback only

## Motion Brief

The cockpit adds no bespoke choreography. It inherits canonical region, sidecar/dialog and control transitions so navigation and mutation feedback remain consistent with the portal.

## Motion Inventory

- Composition Shell rich entrance and responsive region change.
- Canonical sidecar/dialog open and close.
- Existing button pending/press and bounded state transitions.
- No count-up, chart animation or custom stagger.

## Primitive and Token Mapping

- Reuse Composition Shell, sidecar/dialog and Greenhouse control motion tokens unchanged.
- No raw timing, easing or component-local keyframes.

## Reduced Motion Contract

- Each reused primitive applies its baked-in reduced-motion behavior.
- Focus transfer, state confirmation and dirty-close recovery remain identical without motion.

## GVC / Micro Evidence

- Capture desktop and compact sidecar open/close plus pending-to-confirmed lifecycle state.
- Repeat in reduced-motion mode and assert focus return and final server-confirmed state.

## Design Decision Log

- Decision: reuse portal motion primitives only.
- Why: this task composes established interaction patterns and has no unique motion semantics.
