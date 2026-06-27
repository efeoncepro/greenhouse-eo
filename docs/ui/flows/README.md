# Greenhouse UI Flow Contracts

## Purpose

This folder stores implementation-ready flow contracts for Greenhouse UI work.
A flow contract complements a wireframe: the wireframe defines what appears on a
surface; the flow contract defines how the user moves across surfaces, routes,
sidecars, drawers, modals, popovers and commands.

Use this layer when a UI includes more than one surface, opens transient or
contextual UI, changes route/query state, coordinates multiple screens, or has a
business action with recovery/failure paths.

## When To Create One

Create a flow contract before JSX when a UI has any of these traits:

- `UI impact: flow`;
- desktop sidecar plus mobile drawer behavior;
- modal, dialog, popover, floating surface or inspector interaction;
- navigation from one product surface to another;
- deep links, query params, hash state or route segment state;
- dirty-state confirmation, escape/click-away behavior or focus restoration;
- a governed command, mutation, handoff, export or scheduling action;
- a GVC scenario that must prove a sequence, not just a static view.

## Naming

Use one Markdown file per task flow:

```text
docs/ui/flows/TASK-####-short-slug-flow.md
```

Then link it from the owning task:

```md
- Flow: `docs/ui/flows/TASK-####-short-slug-flow.md`
```

For UI tasks with `UI impact: flow`, `pnpm task:lint --changed` and
`pnpm ui:flow-check --task TASK-####` require that path and file. For other UI
tasks, `Flow: none` is valid unless the task text describes multi-surface or
route behavior; then the linter warns so the agent can decide explicitly.

## Required Sections

Every flow contract should include:

1. **Meta** — owner task, status, related wireframe and intended route/surface.
2. **Flow Brief** — user, entry moment, successful outcome and non-goals.
3. **Surfaces Involved** — base page, sidecar, drawer, modal, popover, route.
4. **Flow Map** — ordered steps from entry to completion/recovery.
5. **Interaction Triggers** — click, keyboard, deep link, row action, CTA.
6. **State Machine** — closed/open/loading/saved/error/dirty/denied states.
7. **Routing Contract** — URL, query, hash, route segment or no-route-change.
8. **Focus & Accessibility** — initial focus, escape, restore, modal semantics.
9. **Data & Command Boundaries** — readers, commands, APIs and cache behavior.
10. **Failure Paths** — denied, stale, partial, unsaved, timeout, empty.
11. **GVC Scenario Plan** — desktop/mobile sequence captures and markers.
12. **Acceptance Checklist** — binary checks for implementation.

## Relationship To Wireframes

- A wireframe is required for composition, content and microcopy.
- A flow contract is required for behavior across surfaces and routes.
- A motion contract is required for non-trivial motion and microinteractions.
- A single task can have one wireframe and one flow contract.
- Platform primitives may have multiple flow contracts if variants differ
  materially, such as modal vs non-modal inspector behavior.
