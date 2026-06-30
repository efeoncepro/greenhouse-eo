# TASK-### — [Flow Name] Flow Contract

## Meta

- Status: `draft|ready-for-implementation|implemented`
- Owner task: `TASK-### — [title]`
- Related wireframe: `[docs/ui/wireframes/TASK-###-short-slug.md](../wireframes/TASK-###-short-slug.md)`
- Intended route / surface:
- Flow type: `single-surface|multi-surface|cross-route|command-backed|platform-primitive`
- Primary primitives:
- Copy source:

## Flow Brief

- Primary user:
- Entry moment:
- Successful outcome:
- Primary decision/action:
- Non-goals:

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Base page | Entry and context |  |  |  |
| Sidecar / drawer / modal / popover |  |  |  |  |
| Destination route |  |  |  |  |

## Flow Map

1. Entry:
2. Primary action:
3. Transition:
4. User decision:
5. Completion:
6. Recovery / exit:

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
|  |  |  |  |  |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed |  |  |  |  |
| opening |  |  |  |  |
| open |  |  |  |  |
| loading |  |  |  |  |
| error |  |  |  |  |
| dirty |  |  |  |  |
| complete |  |  |  |  |

## Routing Contract

- Route changes: `none|path|query|hash|segment`
- Canonical URL:
- Deep-link behavior:
- Back button behavior:
- Reload behavior:
- Shareability:

## Focus & Accessibility

- Initial focus:
- Escape behavior:
- Click-away behavior:
- Focus restore:
- Modal vs non-modal semantics:
- Screen reader announcement:
- Keyboard traversal:
- Reduced motion:

## Data & Command Boundaries

- Readers:
- Commands:
- API routes:
- Optimistic updates:
- Cache / invalidation:
- Audit / signals:
- Tenant / access boundary:

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied |  |  |  |
| not found / empty |  |  |  |
| partial / degraded |  |  |  |
| stale data |  |  |  |
| timeout / API error |  |  |  |
| dirty exit |  |  |  |

## GVC Scenario Plan

- Scenario:
- Scenario file:
- Route:
- Viewports:
- Required steps:
- Required captures:
- Required `data-capture` markers:
- Assertions:
- Scroll-width checks:
- Accessibility/focus checks:
- Reduced-motion evidence:

## Design Decision Log

- Decision:
- Alternatives considered:
- Why this pattern:
- Reuse / extend / new primitive:
- Open risks:
- Follow-up:

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided.
- [ ] Failure paths are user-safe and do not expose internals.
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow uses these surfaces/routes.
