# TASK-1430 — Growth CTA authoring and reporting cockpit

## Meta

- Status: `ready`
- Owner task: `TASK-1430`
- Route: `/growth/ctas`
- Primitive decision: `reuse` — Composition Shell plus existing Greenhouse primitives
- UI ready target: `yes`

## Brief

Turn the existing CTA list/detail APIs and lifecycle commands into one operator cockpit. The operator must understand what is live, where, how it performs and whether it is suppressed or killed without jumping across ad-hoc admin screens.

## Layout Skeleton

Use `CompositionShell` with `split`, `fluidity='rich'`:

| Region | Content |
|---|---|
| Lead/header | `GreenhouseBreadcrumbs`, title, status summary and primary create action |
| Primary | Search/filterable CTA inventory with status, placement, surfaces and signal summary |
| Aside | Selected CTA detail, version/lifecycle controls, bindings, suppression and reporting |
| Overlay | Author/review confirmation or bounded contextual form using canonical sidecar/dialog pattern |

At compact widths the detail becomes the canonical temporary sidecar/drawer behavior; inventory state is preserved.

## States

- `loading`: inventory/detail skeletons.
- `empty`: explain first CTA and offer the governed author action.
- `ready`: inventory plus selected detail.
- `partial`: reporting unavailable while lifecycle controls remain usable, labeled with freshness.
- `error`: bounded retry per region; no raw error.
- `denied`: capability-aware route/action state.

## Accessibility Contract

- Real breadcrumbs and headings establish route hierarchy.
- Inventory selection is keyboard operable and does not rely on color.
- Sidecar/dialog focus follows its canonical primitive; dirty close asks for confirmation.
- Status, freshness and kill-switch state have textual labels.

## Implementation Mapping

- Route uses `CompositionShell` and canonical Greenhouse breadcrumbs, buttons, chips, states and sidecar/dialog primitives.
- Reuse existing CTA list/detail readers and author/review/publish/pause/resume/deprecate/archive/surface commands.
- Consume TASK-1428 suppression/kill-switch read and command contracts; do not reproduce rules client-side.
- Cards/summary elements use the shared card-density contract because the aside width changes.
- Visible reusable copy belongs in `src/lib/copy/growth/*` (or the established Growth namespace), not inline JSX.

## GVC Scenario Plan

- Scenario: `scripts/frontend/scenarios/task-1430-growth-cta-cockpit.scenario.ts`.
- Viewports: `1440` and `390`.
- Capture: inventory, selected detail, empty, partial reporting, author/review, paused/killed and denied states.
- Assert: keyboard selection, focus return, dirty-close recovery, no page-level horizontal scroll and lifecycle state refresh after commands.
- Baseline only after design review; runtime assertions are additive.

## Design Decision Log

- Decision: one master-detail cockpit over existing contracts, not separate authoring, reporting and kill-switch tasks/screens.
- Why: these are one operator job and share the same CTA context; splitting them would create navigation and state duplication.
- Reuse: backend CRUD/lifecycle/report summaries already exist. TASK-1428 only supplies the missing governed controls/state.
- Non-goal: advanced experimentation analytics or a second reporting warehouse.

## Acceptance Checklist

- [ ] Inventory, detail, lifecycle, surfaces and reporting share one cockpit.
- [ ] Existing readers/commands are reused without client-side business rules.
- [ ] Responsive sidecar, states and capability handling are evidenced.
- [ ] GVC desktop/mobile captures are reviewed.
