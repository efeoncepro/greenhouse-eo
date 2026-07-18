# TASK-1429 — Interruptive placement flow

## Meta

- Owner task: `TASK-1429`
- Dependency: `TASK-1428`

## Flow Map

```text
surface mounts
  -> engine/placement kill switch?
     -> off: do not render
     -> on: evaluate eligibility + suppression + frequency cap
        -> blocked: do not render
        -> eligible: wait for governed trigger
           -> open interruptive CTA
              -> primary action -> governed destination/form -> close/complete
              -> dismiss/Escape -> persist suppression -> restore focus
              -> runtime failure -> close safely -> host remains usable
```

## Trigger Contract

- Trigger is explicit and testable (for example time-on-page or scroll threshold), never a host-specific inline heuristic.
- The eligibility decision runs before the visual trigger and is not duplicated in the UI.
- Re-evaluation cannot reopen during the same capped/suppressed visit.

## Focus and Accessibility

- Store a stable focus-return target before opening.
- `Escape` closes; tab behavior follows slide-in versus dialog semantics selected in discovery.
- Dismiss and primary action remain reachable at `390px` without page-level horizontal scroll.

## Failure and Recovery

- Kill switch wins over all local state.
- Delivery/action failure closes or degrades safely and emits an operational signal without exposing raw errors.
- Rollback uses TASK-1428 placement/global controls; no redeploy required.

## Evidence

- GVC states: open, action, dismiss, capped, killed and reduced motion.
- Browser checks: focus return, Escape, scroll width and no duplicate opening.

## GVC Scenario Plan

- Run the task scenario at `1440`, `390` and reduced motion on both public hosts.
- Capture waiting, open, action, dismissed, capped and killed states; assert focus, Escape, no duplicate open and zero page overflow.

## Design Decision Log

- The flow supports one selected interruptive variant. It does not branch into separate slide-in and modal products.
- Eligibility/suppression are upstream TASK-1428 decisions; the renderer only presents the resolved result.
