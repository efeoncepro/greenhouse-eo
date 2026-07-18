# TASK-1427 — First-slice production closure flow

## Meta

- Owner task: `TASK-1427`
- Surfaces: Think, WordPress, Growth Form and GA4

## Flow Map

```text
host loads
  -> resolve published CTA for surface
     -> no eligible CTA: host continues unchanged
     -> delivery failure: degraded/no raw error
     -> eligible: reserve slot -> render CTA
        -> primary action
           -> navigate safely, or
           -> open Growth Form -> success/error -> close -> restore focus
        -> dismiss -> remove CTA -> restore host flow
        -> analytics event -> consent check -> collect or suppress
```

## Interaction and Routing Contract

- The host only supplies context and mount point; it does not reimplement eligibility or actions.
- External navigation uses the renderer's governed action contract.
- Growth Form owns validation, submit, success and recovery states.
- A blocked/failed CTA request never blocks the host page.

## Focus and Accessibility

- Keyboard order follows host content, then CTA actions.
- Form open moves focus into the form; close returns it to the trigger.
- Dismiss never moves focus to the document root.

## Failure and Recovery

- Renderer/delivery failure: record operational signal and leave host content intact.
- Analytics denied/unavailable: do not retry around consent; CTA interaction still completes.
- Rollback: disable the affected surface binding or engine flag without changing host content.

## Evidence

- GVC desktop/mobile for both hosts.
- Network proof for consent granted and denied.
- GA4 DebugView/Realtime correlation and seven-day signal record.

## GVC Scenario Plan

- Extend the TASK-1340 runtime scenario to exercise Think and WordPress at `1440` and `390`.
- Capture ready, form handoff, dismiss, degraded and consent-denied states; assert focus return, zero page overflow and no analytics request without consent.

## Design Decision Log

- One cross-host flow owns closure evidence because host parity, attribution and signal monitoring are inseparable release gates for the same first slice.
- The renderer, action router and Growth Form remain canonical; host-specific interaction forks are rejected.
