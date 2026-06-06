---
name: greenhouse-product-ui-architect
description: Greenhouse-specific product UI architecture overlay. Use when applying modern UI/product design decisions to the Greenhouse repo, Vuexy/MUI, DESIGN.md, canonical copy, primitives, views, access surfaces, and Playwright verification.
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

## Greenhouse Mapping

For every visible UI change, decide:

- **Surface**: route, view, drawer, modal, mockup, primitive.
- **Primitive reuse**: `OperationalPanel`, `DataTableShell`, `EmptyState`, `FieldsProgressChip`, `CustomChip`, Vuexy/MUI wrappers.
- **Copy**: `src/lib/copy/*` for reusable microcopy; inline only for one-off local text.
- **Access**: whether the change touches `routeGroups`, `views`, `entitlements`, or none.
- **Responsive**: desktop/laptop/mobile screenshots required for meaningful UI.
- **Verification**: `pnpm design:lint`, relevant tests, Playwright screenshot loop.

## Primitive + Variants + Kinds Method

Use `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md` for reusable UI.

- **Primitive** owns layout, a11y, responsive behavior, motion, shell integration, state plumbing, and GVC hooks.
- **Variant** is an official functional mode. It changes behavior, density, state model, action placement, and microinteraction contract. It is not a skin.
- **Kind** is the semantic consumer use case. It may be domain-specific or a legacy alias, but it must resolve to an official variant before layout/chrome behavior is chosen.

When a pattern recurs, recommend extending a primitive with variants instead of creating parallel drawers/cards/inspectors/assistants.

Canonical shape:

```tsx
<Primitive variant='inspector' kind='contractReview' />
```

## Greenhouse UI Pattern Preferences

- Operational lists with decisions: prefer queue + inspector.
- Low-frequency risky creation: prefer drawer or stepper with clear consequences.
- Runtime dashboards: prefer command center with exceptions before totals.
- AI helpers: prefer Adaptive Sidecar on desktop and temporary Drawer only on mobile/tablet; never make AI the only path for core operations.
- Error and misc surfaces (404, 401, access denied, coming soon, maintenance, unavailable route) should be treated as product surfaces with brand voice and recovery architecture. Use concise creative microcopy variants selected once on entry when appropriate, but keep cause, action, and accessibility stable.
- Contextual assistance, inspection, review, preview, and low-risk contextual editing: use `AdaptiveSidecarLayout`, `ContextualSidecar`, and `adaptive-sidecar-controller` from `@/components/greenhouse/primitives` before creating any custom drawer/modal.
- Adaptive Sidecar official variants are `inspector`, `composer`, `assistant`, `reconciler`, `evidence`, and `runbook`; domain kinds such as `form`, `review`, `preview`, reconciliation, provenance/evidence, or guided operations must map to one of those variants.
- Tables: use when comparison and scanning matter; pair with inspector for actions that require context.

## Hard Rules

- Do not introduce a parallel design system.
- Do not bypass `DESIGN.md`.
- Do not reintroduce generic landing-page composition inside operational tools.
- Do not duplicate primary actions across table rows and inspector unless the duplication has a clear accessibility/efficiency reason.
- Do not ship screenshots-free UI changes when the request is about visual quality.
- Do not leave high-friction error surfaces with only generic template copy when the product voice can safely improve recovery and brand perception.
- Do not implement a desktop Adaptive Sidecar as a boxed drawer/card overlay. It must be an in-flow, full-height work-canvas lane with non-modal semantics.
- Do not create `FooDrawer`, `FooInspector`, and `FooAssistant` as separate components when one primitive plus functional variants covers the family.
- Do not add a variant that only changes color, radius, shadow, or icon.

## Output Contract

- Greenhouse implementation mapping
- primitives to reuse
- copy/access decisions
- screenshot plan
- verification plan
