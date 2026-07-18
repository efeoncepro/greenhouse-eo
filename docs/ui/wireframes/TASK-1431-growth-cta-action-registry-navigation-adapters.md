# TASK-1431 — Growth CTA action interaction contract

## Meta

- Status: `ready`
- Owner task: `TASK-1431`
- Surfaces: existing portable CTA renderer on Think, WordPress and preview
- Primitive decision: `extend` existing action callback/executor; no new visual primitive
- UI ready target: `yes`

## Brief

The CTA keeps the same card, hierarchy and primary button. Only the governed result of activating that button changes: open a Growth Form or navigate to a validated link, Think tool or Meetings destination.

## Layout Skeleton

| Region | Behavior |
|---|---|
| CTA content | Existing versioned headline/body/label |
| Primary button | One real button dispatching the resolved action family |
| Dismiss | Existing renderer control; not part of the destination registry |
| Form slot | Existing slot, rendered only for `open_growth_form` |

Navigation actions create no new card region, modal or intermediary screen.

## States

- `ready`: primary is enabled.
- `pending`: primary disables during dispatch to prevent duplicate activation.
- `form_open`: existing governed Growth Form is mounted.
- `navigated`: browser transfers to the validated destination.
- `error`: primary is restored; sanitized error telemetry is emitted.
- `invalid/unavailable`: blocked before render and never visible to the visitor.

## Accessibility Contract

- Primary remains a native button activated by click, Enter or Space.
- Error recovery returns the same control to an enabled/focusable state.
- External navigation uses safe browser semantics and does not open an unexpected popup.
- Existing form focus and dismissal behavior remain unchanged.

## Implementation Mapping

- Reuse `CtaRenderer`, `GreenhouseCtaElement` and the action seam in `src/growth-cta-renderer/action.ts`.
- Server registry resolves policy to a browser-safe union; the renderer dispatches only `growth_form|navigate` families.
- Content/copy remains owned by the published CTA version.
- No new layout primitive, token or visible string.

## GVC Scenario Plan

- Scenario: `task-1431-growth-cta-actions`, viewports `1440` and `390`.
- Capture ready, pending/error recovery and Growth Form open states.
- Assert relative/HTTPS navigation targets, new-tab safety when configured, keyboard activation and no duplicate dispatch.
- Assert invalid destination does not render and page-level horizontal scroll remains zero.

## Design Decision Log

- Decision: preserve one CTA visual and vary only the resolved executor family.
- Why: action kinds are domain semantics, not visual variants.
- Alternative rejected: separate button/components per destination; it would duplicate accessibility, telemetry and host behavior.
- Deferred: asset delivery, embedded form UX and CRM handoff need their own real consumers and contracts.

## Acceptance Checklist

- [ ] Same renderer/card handles every V1 action family.
- [ ] Pending, error recovery, navigation and form-open states are explicit.
- [ ] No destination-specific layout or copy fork exists.
- [ ] GVC/assertion plan covers desktop, mobile and keyboard.
