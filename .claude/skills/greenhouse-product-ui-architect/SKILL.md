---
name: greenhouse-product-ui-architect
description: Greenhouse-specific product UI architecture overlay for Vuexy/MUI, DESIGN.md, canonical copy, primitives, views, access surfaces, and GVC verification.
---

# Greenhouse Product UI Architect

Use this after a global design skill selects the product pattern. This overlay translates the decision into Greenhouse-compatible implementation constraints.

## Required Reads

- `DESIGN.md`
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`

## Pattern Preferences

- Operational lists with decisions: prefer queue + inspector.
- Low-frequency risky creation: prefer drawer or stepper with clear consequences.
- Runtime dashboards: prefer command center with exceptions before totals.
- AI helpers: prefer Adaptive Sidecar on desktop and temporary Drawer only on mobile/tablet.
- Contextual assistance, inspection, review, preview, and low-risk contextual editing: use `AdaptiveSidecarLayout`, `ContextualSidecar`, and `adaptive-sidecar-controller` from `@/components/greenhouse/primitives` before creating any custom drawer/modal.
- Tables: use when comparison and scanning matter; pair with inspector for actions that require context.

## Hard Rules

- Do not introduce a parallel design system.
- Do not bypass `DESIGN.md`.
- Do not reintroduce generic landing-page composition inside operational tools.
- Do not implement a desktop Adaptive Sidecar as a boxed drawer/card overlay. It must be an in-flow, full-height work-canvas lane with non-modal semantics.
- Do not ship screenshots-free UI changes when the request is about visual quality.

## Output Contract

- Greenhouse implementation mapping
- primitives to reuse
- copy/access decisions
- screenshot plan
- verification plan
