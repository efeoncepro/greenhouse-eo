# TASK-1834 — Greenhouse Login Convergence on Efeonce ID (motion)

## Meta

- Status: `draft`
- Owner task: `TASK-1834`
- Related wireframe: `docs/ui/wireframes/TASK-1834-greenhouse-login-convergence-native-issuer.md`
- Related flow: `docs/ui/flows/TASK-1834-greenhouse-login-convergence-native-issuer-flow.md`
- Motion posture: preserve the existing login behavior; no new decorative or route-transition motion.

## Motion Brief

Motion only communicates immediate provider selection and callback recovery. It must not delay redirect,
suggest that authentication succeeded before the server confirms it, or hide the classic fallback methods.

## State Transitions

| Transition | Feedback | Reduced-motion equivalent |
|---|---|---|
| ready -> redirecting | selected provider uses the existing pending/disabled treatment | immediate pending text/state |
| callback -> denied | existing inline alert appears and receives focus | same alert without entrance animation |
| healthy -> degraded | provider action becomes unavailable through the existing readiness treatment | immediate state change with text |

## Constraints

- Reuse existing duration/easing/motion tokens and provider-button behavior; no local keyframes or literals.
- Never animate away Microsoft, Google, credentials or magic link.
- Pending is conveyed by text/state and `aria-busy`, never by motion alone.
- Redirect and protocol timing are not extended to complete an animation.
- Focus restoration happens after the error summary is mounted and does not depend on animation completion.

## GVC Evidence

- Capture ready, pending, degraded and denied states at 1440 and 390.
- Repeat focus/denied with `prefers-reduced-motion: reduce`.
- Verify the same terminal meaning, accessible name and fallback actions in both modes.

## Acceptance Checklist

- [ ] No new decorative motion or bespoke timing is introduced.
- [ ] Pending, degraded and denied states remain understandable with motion disabled.
- [ ] Focus and redirect behavior do not wait for animation events.
- [ ] GVC evidence includes reduced-motion and keyboard recovery.
