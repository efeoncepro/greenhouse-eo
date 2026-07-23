# TASK-1531 — Creative Prompt Studio Motion

## Motion Contract

- Pending feedback: immediate button state plus restrained activity indicator; no percentage or invented stages.
- Workbench enter: opacity + small block-axis reveal using Globe motion tokens.
- Evidence rows: no stagger; content is available together.
- Warning expansion: existing disclosure transition.
- Accept: source value updates first; workbench resolves after causality is clear.
- Target/source invalidation: status changes immediately; stale proposal desaturates without implying deletion.
- No looping decoration, confetti, parallax or layout-heavy animation.

## Reduced Motion

With reduced effects, every state appears instantly, focus order is unchanged and the same labels communicate
pending, ready, stale, accepted and error. Activity remains textual and does not depend on pulsing.

## GVC / Micro Evidence

- Capture pending→ready, warning disclosure, stale invalidation and accept at desktop/mobile.
- Capture equivalent final states with reduced effects.
- Verify no layout shift moves the primary action unexpectedly and no transition blocks input.

## Design Decision Log

- Decision: motion only explains asynchronous causality and state ownership.
- Alternative rejected: cinematic agent animation; it increases latency perception and competes with creative work.
- Implementation: reuse existing Globe CSS/token motion; no new dependency.
