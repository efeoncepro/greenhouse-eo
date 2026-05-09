---
name: greenhouse-mockup-builder
description: Build Greenhouse UI mockups as real Next.js portal routes with typed mock data, Vuexy/MUI wrappers, and Greenhouse primitives. Use whenever a user asks for a mockup, prototype, visual concept, clickable UI draft, or design iteration inside greenhouse-eo.
---

# Greenhouse Mockup Builder

Use this skill whenever the user asks for a mockup, prototype, clickable concept, visual draft, or design iteration for Greenhouse UI.

Manual invocation in Claude Code: `/greenhouse-mockup-builder [surface, goal, screens, constraints]`.

The default is **real portal mockup**, not standalone HTML.

## First Reads

Read only what the task needs:

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- `DESIGN.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

If pattern choice, copy, or motion is material, combine with:

- `greenhouse-ui-review`
- `modern-ui`
- `greenhouse-microinteractions-auditor` when available
- existing Greenhouse UI/UX guidance in `docs/ui/*`

## Hard Rule

Do **not** create standalone `.html` / isolated CSS mockups for Greenhouse portal UI unless the user explicitly asks for a static artifact outside the app.

Build mockups as real Next.js routes with mock data:

- Route: `src/app/(dashboard)/<domain>/<surface>/mockup/page.tsx`
- View: `src/views/greenhouse/<domain>/<surface>/mockup/*`
- Mock data: typed local module or constants near the view
- Shared primitives only when reuse is real: `src/components/greenhouse/*`

## Implementation Contract

Use the real product stack:

- Vuexy/MUI theme from the repo
- `@core/components/mui/*` wrappers such as `CustomTextField`, `CustomChip`, `CustomAvatar`, `CustomTabList`, `CustomIconButton`
- Existing Greenhouse primitives such as `EmptyState`, `CardHeaderWithBadge`, `EntitySummaryDock`, `ContextChipStrip`, and other `src/components/greenhouse/*` primitives
- `src/lib/format/*` for visible numbers, dates, currency, percentages, and relative time
- `src/lib/copy/*` / domain copy modules for shared copy, states, aria labels, empty states, and labels when lint requires tokenization

Avoid standalone pages, parallel themes, copied demo pages, direct `Intl.*` formatting, raw MUI where a wrapper exists, and hardcoded copy that violates Greenhouse lint gates.

## Workflow

1. Normalize the request: surface, audience, user task, data shape, action density, and states.
2. Present a short plan for approval before coding when the user asks for approval or the surface is broad.
3. Implement a route-local mockup with typed mock data and real Greenhouse components.
4. Include loading shape, empty, partial, warning, error, and success states where applicable.
5. Keep backend integration seams clear: no fake API routes unless explicitly needed.
6. Validate before presenting:
   - `pnpm exec tsc --noEmit --pretty false`
   - `pnpm lint`
   - `pnpm design:lint`
   - run or relaunch `pnpm dev` and provide the local URL

## Output

Report the local URL, files changed, validations run, auth/session requirement, and known mock-data limits.

## Acceptance Bar

A Greenhouse mockup is approved-quality when future backend work can replace mock data/readers without reinterpreting the visual direction.
