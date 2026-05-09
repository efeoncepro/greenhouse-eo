---
name: greenhouse-mockup-builder
description: Build Greenhouse UI mockups as real Next.js portal routes with typed mock data, Vuexy/MUI wrappers, and Greenhouse primitives. Use whenever a user asks for a mockup, prototype, visual concept, clickable UI draft, or design iteration inside greenhouse-eo.
---

# Greenhouse Mockup Builder

Use this skill whenever the user asks for a mockup, prototype, clickable concept, visual draft, or design iteration for Greenhouse UI.

The default is **real portal mockup**, not standalone HTML.

## First Reads

Read only what the task needs:

- `AGENTS.md`
- `CLAUDE.md` when coordinating with Claude-facing conventions
- `project_context.md`
- `Handoff.md`
- `DESIGN.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

If pattern choice, copy, or motion is material, also use the relevant local skills:

- `greenhouse-ui-orchestrator`
- `greenhouse-portal-ui-implementer`
- `greenhouse-ux-content-accessibility`
- `greenhouse-microinteractions-auditor`
- `greenhouse-ui-review` before presenting final UI code

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

Avoid:

- parallel themes
- raw HTML/CSS pages outside App Router
- copied `full-version` demo pages
- direct `Intl.*` / `toLocale*` formatting in UI
- raw MUI components where a Vuexy wrapper exists
- hardcoded status labels or aria labels that trigger Greenhouse copy gates

## Workflow

1. Normalize the mockup request:
   - surface
   - audience
   - user task
   - data shape
   - action density
   - states needed
2. Present a short plan for approval before coding when the user asks for approval or the surface is broad.
3. Implement a route-local mockup with typed mock data and real Greenhouse components.
4. Include the expected states: loading shape, empty, partial, warning, error, and success where applicable.
5. Keep backend integration seams clear: no fake API routes unless explicitly needed for the prototype.
6. Validate before presenting:
   - `pnpm exec tsc --noEmit --pretty false`
   - `pnpm lint`
   - `pnpm design:lint` for UI work
   - run or relaunch `pnpm dev` and provide the local URL

## Output

When finished, report:

- local URL
- files created/changed
- validations run
- whether the route requires an authenticated dashboard session
- any known limits of the mock data

## Acceptance Bar

A Greenhouse mockup is approved-quality when future backend work can replace mock data/readers without reinterpreting the visual direction.
