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

## Greenhouse UI Pattern Preferences

- Operational lists with decisions: prefer queue + inspector.
- Low-frequency risky creation: prefer drawer or stepper with clear consequences.
- Runtime dashboards: prefer command center with exceptions before totals.
- AI helpers: prefer contextual drawer; never make AI the only path for core operations.
- Tables: use when comparison and scanning matter; pair with inspector for actions that require context.

## Hard Rules

- Do not introduce a parallel design system.
- Do not bypass `DESIGN.md`.
- Do not reintroduce generic landing-page composition inside operational tools.
- Do not duplicate primary actions across table rows and inspector unless the duplication has a clear accessibility/efficiency reason.
- Do not ship screenshots-free UI changes when the request is about visual quality.

## Output Contract

- Greenhouse implementation mapping
- primitives to reuse
- copy/access decisions
- screenshot plan
- verification plan
