# TASK-1540 — Globe Video Effectiveness Motion Contract

## Meta

- Status: `ready for task registration`
- Owner task: `TASK-1540`
- Related flow: `docs/ui/flows/TASK-1540-globe-video-effectiveness-surface-flow.md`
- Runtime: Globe-owned motion tokens/patterns only; Greenhouse motion code is not imported.

## Motion intent

Motion communicates ownership between video, timeline, finding inspector and Producer handoff. It never implies
analysis progress, quality, confidence or forecast certainty.

## Trigger matrix

| Trigger | Default response | Interruptibility | Reduced motion |
| --- | --- | --- | --- |
| Select finding | immediate seek; bounded selection/inspector transition | new selection supersedes old | immediate replacement |
| Open exact frame | evidence still enters over stable stage | close/new frame | immediate |
| Change report tab | local content transition without moving stage | new tab | immediate |
| Open inspector/sheet | focus-managed causal enter | Escape/action | immediate + focus |
| Create Producer proposal | pending state then confirmed handoff identity | cancel before command only | same states, no spatial move |
| Return from Producer | restore candidate/finding ownership | navigation | immediate focus restore |
| New durable status | label/region update; no time-derived animation | reader update | identical |

## Rules

- Playback and playhead movement are media state, not decorative animation.
- Findings do not pulse, breathe or loop. The active range uses stable selection treatment.
- Analyzing/validating use honest state labels and restrained indeterminate feedback only when no finer durable
  stage exists.
- Timeline scrolling may keep the selected finding visible, but must not trap manual scroll or cause motion
  sickness.
- Inspector transitions animate compositor-safe properties only and never reduce live text below required
  contrast.
- A successful Producer draft handoff confirms proposal identity; it does not celebrate as if generation
  completed.
- Errors never shake or bounce.

## Focus and cancellation

- A superseded finding selection cancels stale inspector/frame projection.
- Closing evidence overlay restores the pin/finding trigger.
- Route changes cancel pending local transition but do not cancel durable analysis or Producer commands.
- A reduced-motion preference reaches the same selected finding, exact media time and focus destination
  synchronously.

## GVC scenario plan

- Capture finding selection, exact-frame overlay, report tab, proposal sheet, return from Producer and each
  reduced-motion equivalent at `1440×1000` and `390×844`.
- Assert no ambient infinite animation, no status text opacity below readable contrast and no layout shift that
  moves playback controls or primary actions.
- Verify focus destination and live-region output before and after every transition.
- Review dossier:
  `docs/ui/captures/TASK-1540-globe-video-effectiveness-surface/<run>/review/`.

## Design decision log

- Decision: causal, localized motion tied to evidence ownership.
- Alternatives: cinematic report reveal, pulsing AI presence, animated score dashboard.
- Why: the video already supplies motion; UI motion must reduce uncertainty rather than compete.
- Reuse/extend/new: extend Globe's existing viewer/dialog motion contract; no new animation runtime.
- Open risk: exact Globe motion token names require runtime Discovery before implementation.
