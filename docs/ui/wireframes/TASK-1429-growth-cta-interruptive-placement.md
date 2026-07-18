# TASK-1429 — Growth CTA interruptive placement

## Meta

- Status: `ready`
- Owner task: `TASK-1429`
- Surface: portable public renderer
- Primitive decision: `extend` — add one official interruptive variant to the existing renderer
- UI ready target: `yes`

## Brief

Add one governed interruptive placement, `slide_in`, after suppression and kill switches exist. Use it to formalize the portable CTA Experience System: placement determines geometry, experience kind describes intent, appearance controls tokenized visual tone, density responds to the component container and `variantId` remains experiment metadata. It must feel like a contextual next step, interrupt lightly, remain dismissible and never trap or steal attention repeatedly.

## Experience Axes

| Axis | V1 values in this task | What it controls | What it never controls |
|---|---|---|---|
| Placement | `slide_in` | edge/bottom geometry, interruption and focus model | copy, destination, experiment |
| Experience kind | `report_followup`, `lead_magnet`, `tool_continuation`, `meeting` as authoring semantics | required expectation/evidence and preview label | host-side branching or targeting |
| Appearance | `default`, `spotlight`, `minimal` | tokenized surface and emphasis | action semantics, focus or suppression |
| Density | `full`, `condensed`, `peek` derived by container | honest composition at available width | clipping or host breakpoint |
| Experiment | `variantId` metadata only | future attribution | presentation switch or client randomization |

## Layout Skeleton

| Region | Desktop | Mobile |
|---|---|---|
| Host content | Remains visible and usable | Remains visible behind a compact surface |
| Interruptive shell | Edge-aligned non-modal slide-in, bounded width, layered tonal surface | Bottom-anchored compact panel within safe areas; never a disguised full-screen modal |
| Content | Optional contextual eyebrow, headline, concise evidence/body, primary action, optional honest footnote | Headline + essential support + action; non-essential visual/body condense honestly |
| Controls | Primary action + visible dismiss | Touch targets and dismiss remain visible |

## Density Skeletons

```text
FULL (wide container)
┌─────────────────────────────────────────────────────────┐
│ [evidence/visual]  EYEBROW                    [dismiss]  │
│                    Outcome-led headline                 │
│                    Concise evidence / expectation       │
│                    [Primary action]   honest footnote   │
└─────────────────────────────────────────────────────────┘

CONDENSED (narrow container)
┌───────────────────────────────────┐
│ EYEBROW                  [dismiss]│
│ Outcome-led headline             │
│ Essential supporting sentence    │
│ [Primary action — full width]     │
└───────────────────────────────────┘

PEEK (compact interruptive)
┌───────────────────────────────────┐
│ Context                  [dismiss]│
│ Outcome-led headline             │
│ [Primary action — full width]     │
└───────────────────────────────────┘
```

Headline, primary action and dismiss are invariant. `peek` is authored/rendered as a real compact composition,
never implemented by clipping `full`.

## Appearance Contract

- `default`: editorial layered surface, subtle border/elevation, restrained accent.
- `spotlight`: highest permitted emphasis using approved token gradient/elevation; no pulse, glow loop or urgency.
- `minimal`: reduced chrome and editorial action treatment while retaining target size, focus, pending and error states.
- Appearance cannot add/remove the form, change navigation, hide dismiss or change density thresholds.

## Content and Asset Contract

- Eyebrow explains context; no stacked badges.
- Headline promises the actual next-step outcome and works without the visual.
- Body/evidence is concise and omitted before it is truncated misleadingly.
- A visual must be a real preview, artifact or tool cue. Generic stock decoration and image-only copy are invalid.
- Failed/missing visual removes the media region and leaves a balanced, complete text CTA.
- Footnote is limited to truthful duration, delivery or privacy expectation.

## States

- `eligible/waiting`: trigger has not fired.
- `open`: CTA is visible and focus behavior matches the chosen semantic pattern.
- `focused`: keyboard focus is visible without changing geometry.
- `pending`: governed CTA action executes once; duplicate activation is blocked.
- `form_open`: CTA context is preserved while the governed Growth Form becomes the active continuation.
- `success`: result is explicit and does not replay the original pitch.
- `error_recovered`: sanitized recovery restores a usable primary action/context.
- `dismissed/suppressed`: closes and records suppression state.
- `capped`: does not mount or replay entrance.
- `killed`: placement cannot open.
- `asset_failed`: text anatomy recomposes without broken media chrome.
- `degraded`: host remains usable if payload/render fails.

## Accessibility Contract

- The slide-in is complementary/non-modal; it never declares `aria-modal` or imposes a modal focus trap.
- Dismiss is always keyboard and screen-reader reachable.
- Passive opening does not steal focus. Escape closes when focus is within the CTA; focus returns to the pre-open element or a stable host target after explicit interaction.
- Action and dismiss provide at least a 44px target at compact widths.
- Density changes preserve DOM/focus order and never remove the focused control.
- Reduced motion preserves timing, eligibility and final state without animated travel.

## Implementation Mapping

- Extend TASK-1340 renderer placement registry; do not introduce a second CTA renderer.
- Consume TASK-1428 eligibility, suppression, frequency cap and kill-switch contracts before opening.
- Reuse canonical CTA content/action components, public tokens and the existing `default|spotlight|minimal` appearance layer.
- Derive density through container queries inside the renderer; host wrappers cannot pass viewport-specific layout flags.
- Keep the host adapter dumb: it passes surface/context and mounts the renderer.
- Prefer CSS/container-aware layout and the existing renderer isolation strategy for WordPress compatibility.

## GVC Scenario Plan

- Scenario: `scripts/frontend/scenarios/task-1429-growth-cta-interruptive.scenario.ts`.
- Viewports: `1440` and `390`, plus reduced-motion mode.
- Capture: waiting, full/condensed/peek, each appearance, focus-visible, pending, Growth Form handoff, error recovery, dismissed, capped/suppressed, killed, asset failure, long content and reduced motion.
- Assert: no focus steal, Escape/focus return, ≥44px controls, invariant headline/action/dismiss, no horizontal page scroll, no reopen after dismissal/cap, host usable, kill switch prevents render and unknown appearance falls back safely.
- Runtime: stage on Think and WordPress before gradual enablement.

## Design Decision Log

- Decision: ship exactly one interruptive placement, `slide_in`, and treat `default|spotlight|minimal` as appearances rather than behavior variants.
- Why: one reusable variant proves the governed interruptive path without multiplying UX and QA surface.
- Alternative: modal popup remains deferred unless evidence shows the slide-in cannot satisfy the campaign need.
- Dependency: TASK-1428 is a hard rollout gate, not an optional enhancement.

## Acceptance Checklist

- [ ] One official interruptive variant is selected and implemented.
- [ ] Experience axes are separated and pairwise preview fixtures cover their valid combinations.
- [ ] Full/condensed/peek are honest container-driven compositions.
- [ ] State, asset-failure and long-content matrices are captured.
- [ ] Suppression, caps and kill switches gate every opening.
- [ ] Keyboard, reduced-motion and mobile behavior are evidenced.
- [ ] Think and WordPress staging captures are reviewed.
