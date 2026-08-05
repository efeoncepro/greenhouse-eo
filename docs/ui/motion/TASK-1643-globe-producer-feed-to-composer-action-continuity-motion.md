# TASK-1643 — Feed-to-Composer Action Continuity Motion

## Motion Contract

- Motion role: make action ownership and handoff legible, never decorate a generation that has not started.
- Primitive: existing Globe CSS/motion primitives and tokenized transitions.
- Action pending: localized status/indicator inside the initiating action; the rest of the feed remains stable.
- Handoff: the existing composer reference/recipe region updates in place; avoid full-page movement or scroll jumps.
- Success/error: persistent status copy and focus restoration; no celebratory burst or ambiguous toast-only result.
- Timing/easing: consume existing payload tokens; do not add literal durations or easing values.
- Reduced motion: transitions become immediate, with identical final state, copy, focus and announcements.
- Mobile: no hover-only reveal and no horizontal movement beyond the card boundary.

## Evidence

- Capture pending, success, disabled and error states at desktop and 390 px.
- Assert the initiating action and resulting composer state remain traceable with motion disabled.
- Reject autoplay, bounce, shake, confetti and any motion that implies approval or generation before confirmation.
