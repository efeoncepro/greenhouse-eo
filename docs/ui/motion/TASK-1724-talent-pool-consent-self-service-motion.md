# TASK-1724 — Talent Pool Consent and Self-Service Motion Contract

## Scope

Only causal form/status feedback: optional-help disclosure, command pending, dialog enter/exit and receipt replacement.
No decorative entrance, scroll choreography, confetti, countdown or persuasive animation.

## State transitions

- Opt-in help uses existing CSS/token motion.
- Pending preserves layout and changes the action label; no optimistic legal-state transition.
- Withdrawal reuses the MUI dialog transition, focus trap and restore.
- Receipt/status replacement uses a short semantic fade after authoritative readback.

## Reduced motion

`prefers-reduced-motion` performs an immediate swap. Pending text, receipt, focus and live-region announcement remain
identical; no information exists only during animation.

## Verification

- Capture default and reduced-motion at 1440 and 390.
- Assert no layout jump, duplicate live announcement, hidden final state or focus loss.

## GVC / Micro Evidence

- Capture opt-in help closed/open, command pending, withdrawal dialog and authoritative receipt.
- Repeat at 1440 and 390 with default and `prefers-reduced-motion`.
- Review focus restoration, live announcement count, layout stability and identical final meaning.

## Design Decision Log

- Reuse existing CSS/MUI transitions; no new motion primitive.
- Legal state changes only after server readback, so animation never implies success early.
- Reduced motion swaps immediately and preserves receipts/focus.
