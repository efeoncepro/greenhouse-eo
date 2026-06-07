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
