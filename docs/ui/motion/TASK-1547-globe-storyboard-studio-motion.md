# TASK-1547 — Globe Storyboard Studio Motion Contract

## Intent

Motion explains selection, revision change, sequence reordering and cross-domain handoff. It never suggests that
the agent is thinking, that an estimate is guaranteed or that media changed before Producer returned a candidate.

## Trigger matrix

| Trigger | Default | Interruptibility | Reduced motion |
| --- | --- | --- | --- |
| select scene/shot/panel | localized selection + inspector update | latest selection wins | immediate |
| open/close inspector or sheet | causal focus-managed transition | Escape/action | immediate + focus |
| reorder shot | bounded layout morph with final position announced | cancel before commit | instant reorder |
| enter markup/mask mode | stable tool-state change | finish/cancel | immediate |
| apply proposal | pending → confirmed new revision identity | command not visually replayed | same states |
| Producer handoff/return | pending → draft/candidate identity + focus restore | reconcile after submit | no spatial move |
| revision compare | aligned before/after transition | close/change revision | immediate |
| durable save/conflict | status change, no fake percentage | reader update | identical |

## Rules

- Use Globe-owned motion wrappers/tokens confirmed during runtime discovery.
- Animate compositor-safe properties; never move the primary panel while someone is drawing.
- No ambient loops, pulsing pins, breathing AI presence, confetti, shake or bounce errors.
- Shot reordering does not commit until the governed command succeeds; failure restores authoritative order.
- Vector strokes appear as direct manipulation, not decorative playback.
- Mask overlay remains stable and visually distinct from comment markup.
- New revision confirmation names its revision; it does not imply approval.
- Long-running proposals/handoffs use durable stages and reconciliation, not time-derived progress.

## Focus and stale response rules

- Selection uses an epoch so a late inspector/asset response cannot replace the current shot.
- Closing a sheet/overlay restores its exact trigger or the nearest surviving semantic target.
- Route change cancels local animation but not durable proposal/handoff commands.
- Reduced motion preserves selected target, scroll position, status announcement and focus destination.

## GVC / Micro Evidence

Capture selection, reorder, markup/mask mode, proposal apply, conflict, handoff/return and revision compare at
`1440×1000` and `390×844`, with reduced-motion equivalents. Assert no layout shift under the drawing pointer, no
ambient infinite animation, readable status throughout and identical terminal meaning.

## Design Decision Log

- Motion is causal and local because the authored panels already carry visual complexity.
- Reordering previews intent but commits only after the governed command returns.
- Markup and mask mode use stable state transitions so direct manipulation is not displaced.
- Proposal/handoff confirmation names the durable identity; it never celebrates as if approval or generation
  already occurred.
