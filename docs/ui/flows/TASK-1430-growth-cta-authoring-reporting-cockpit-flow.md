# TASK-1430 — CTA cockpit flow

## Meta

- Owner task: `TASK-1430`
- Route: `/growth/ctas`

## Flow Map

```text
open cockpit
  -> load inventory
     -> empty -> author CTA
     -> select CTA -> load detail/report/surfaces
        -> author new version
           -> intent/kind -> placement -> appearance -> content/evidence
           -> action from registry -> targeting/suppression posture
           -> canonical preview matrix -> review blockers
           -> validate server-side -> save draft
        -> review -> parity/expectation/suppression checklist -> approve/reject
        -> publish/pause/resume/deprecate/archive -> confirm -> refresh
        -> bind/unbind surface -> confirm -> refresh
        -> toggle governed kill switch -> confirm -> refresh
        -> reporting partial -> show freshness/retry without blocking lifecycle
```

## Routing and State

- Selection is URL-addressable when the existing route contract supports it; otherwise it remains deterministic local cockpit state without inventing a second route family.
- Opening/closing compact detail preserves inventory search, filters and scroll position.
- Mutations refresh canonical readers; optimistic UI cannot claim a lifecycle state the server rejected.
- Preview controls are draft-local diagnostics and never mutate published state or persist renderer-derived density.

## Focus and Accessibility

- Selecting an item moves focus to the detail heading only when navigation/context changes materially.
- Sidecar/dialog open and close use canonical focus management.
- Dirty forms require explicit discard confirmation.
- Destructive lifecycle actions name the CTA and resulting state.

## Failure and Recovery

- Reader failures are bounded to inventory, detail or reporting regions.
- Command errors preserve form/context and provide safe retry.
- Preview parity failure, unsupported placement/action/surface, copy-action mismatch or missing interruptive defenses block review with a concrete correction path.
- Capability denial removes or disables the action with an explicit reason; it is not treated as a generic error.

## Evidence

- GVC inventory/detail, compact sidecar, author/review, lifecycle, kill-switch, partial reporting and denied states.
- Assertions for focus, preserved filters, server-confirmed state and page scroll width.

## GVC Scenario Plan

- Run the cockpit scenario at `1440`, `390` and reduced motion.
- Capture inventory/detail, compact sidecar, author/review, lifecycle, killed, partial-reporting and denied states.

## Design Decision Log

- Authoring, lifecycle, surface controls and reporting stay in one contextual workbench because they share the selected CTA aggregate.
- Mutations remain thin clients of governed commands; reporting failure degrades only its region.
