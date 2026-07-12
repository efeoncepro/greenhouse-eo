# TASK-1398 — Careers Talent Alerts Motion

## Intent

Give clear feedback to a voluntary form submission without creating urgency or hiding an error/success state behind animation.

## Contract

- Default: host enters with the existing public-page reveal treatment only if the page already uses it; it must not delay first interaction.
- Submit: the renderer’s canonical pending feedback changes CTA affordance and status text; no custom spinner stack.
- Accepted/error: brief tokenized opacity transition is permitted when supported by the renderer; content remains present for assistive technology.
- Reduced motion: immediate state swap, no reveal/transition dependency.
- Non-goals: no looping animation, confetti, progress illusion or movement that changes layout.

## Verification

- GVC captures normal and reduced-motion submit/accepted/error states at desktop and 390px.
- Keyboard focus and live-region announcements are checked independently of visual transition.
