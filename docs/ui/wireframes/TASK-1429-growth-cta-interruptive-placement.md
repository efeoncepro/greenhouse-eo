# TASK-1429 — Growth CTA interruptive placement

## Meta

- Status: `ready`
- Owner task: `TASK-1429`
- Surface: portable public renderer
- Primitive decision: `extend` — add one official interruptive variant to the existing renderer
- UI ready target: `yes`

## Brief

Add one governed interruptive placement after suppression and kill switches exist. Default discovery candidate is `slide_in`; `popup_modal` is selected only if host constraints or evidence require it. It must interrupt lightly, remain dismissible and never trap or steal attention repeatedly.

## Layout Skeleton

| Region | Desktop | Mobile |
|---|---|---|
| Host content | Remains visible and usable | Remains visible behind a compact surface |
| Interruptive shell | Edge-aligned slide-in, bounded width | Bottom sheet/compact panel within safe areas |
| Content | Kicker, title, body, primary action | Same hierarchy, condensed honestly |
| Controls | Primary action + visible dismiss | Touch targets and dismiss remain visible |

## States

- `eligible/waiting`: trigger has not fired.
- `open`: CTA is visible and focus behavior matches the chosen semantic pattern.
- `action`: governed CTA action executes once.
- `dismissed/suppressed`: closes and records suppression state.
- `killed`: placement cannot open.
- `degraded`: host remains usable if payload/render fails.

## Accessibility Contract

- Semantics follow the selected pattern: complementary/non-modal for slide-in; dialog semantics only if discovery chooses a true modal.
- Dismiss is always keyboard and screen-reader reachable.
- Escape closes when open; focus returns to the pre-open element or a stable host target.
- Reduced motion preserves timing, eligibility and final state without animated travel.

## Implementation Mapping

- Extend TASK-1340 renderer placement registry; do not introduce a second CTA renderer.
- Consume TASK-1428 eligibility, suppression, frequency cap and kill-switch contracts before opening.
- Reuse canonical CTA content/action components and public motion tokens.
- Keep the host adapter dumb: it passes surface/context and mounts the renderer.
- Prefer CSS/container-aware layout and the existing renderer isolation strategy for WordPress compatibility.

## GVC Scenario Plan

- Scenario: `scripts/frontend/scenarios/task-1429-growth-cta-interruptive.scenario.ts`.
- Viewports: `1440` and `390`, plus reduced-motion mode.
- Capture: waiting, open, focus-visible, dismissed, capped/suppressed, killed and Growth Form handoff.
- Assert: Escape/focus return, no horizontal page scroll, no reopen after dismissal/cap, host usable, kill switch prevents render.
- Runtime: stage on Think and WordPress before gradual enablement.

## Design Decision Log

- Decision: ship exactly one interruptive placement, with `slide_in` as the discovery default.
- Why: one reusable variant proves the governed interruptive path without multiplying UX and QA surface.
- Alternative: modal popup remains deferred unless evidence shows the slide-in cannot satisfy the campaign need.
- Dependency: TASK-1428 is a hard rollout gate, not an optional enhancement.

## Acceptance Checklist

- [ ] One official interruptive variant is selected and implemented.
- [ ] Suppression, caps and kill switches gate every opening.
- [ ] Keyboard, reduced-motion and mobile behavior are evidenced.
- [ ] Think and WordPress staging captures are reviewed.
