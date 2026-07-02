# TASK-1320 — Growth Forms Success Card Renderer Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1320 — Growth Forms Success Card — Renderer (ui-ux)`
- Related wireframe: `docs/ui/wireframes/TASK-1320-growth-forms-success-card-renderer.md`
- Related flow: `docs/ui/flows/TASK-1320-growth-forms-success-card-renderer-flow.md`
- Motion type: `transition-system`
- Primary primitive / library: `CSS`
- Copy source: `success_behavior_json` + renderer locale fallback

## Motion Brief

- Primary user: anonymous public visitor who has just submitted a form.
- Motion intent: make the form-to-success transition feel intentional and trustworthy without delaying confirmation.
- Uncertainty reduced: the user sees that the same card accepted the submission and changed state, instead of a small message appearing below the form.
- User decision supported: read next steps and choose an optional follow-up action.
- Non-goals: cinematic animation, scroll effects, GSAP/Lottie, confetti, decorative spectacle, or any motion that hides content until animation completes.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Form body | Submit accepted | Fade/translate out or immediate replace before success render | CSS | Optional |
| Success card | Accepted render | Short fade/translate in using opacity + transform only | CSS | Yes, unless reduced motion |
| Status mark | Success card mount | Subtle scale/opacity settle | CSS | Optional |
| Reward block | Success card mount with reward | No separate entrance unless it helps scan order | CSS | Optional |
| CTA row | Success card mount | No delayed animation; visible immediately with success copy | CSS | Required to be immediate |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Success card | Stable readable card | none | focus ring on container only when programmatic/user focus lands | none | N/A | N/A | `role=status`, visible title/body |
| Primary CTA | Tokenized button/link | existing renderer hover | visible focus ring | native pressed | N/A | N/A | no animation dependency |
| Reward download CTA | Tokenized button/link | existing renderer hover | visible focus ring | native pressed | N/A | N/A | if asset unavailable, show partial/degraded copy |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| accepted-to-success | submitted form | success card | 160-220ms, theme/renderer ease-out token if available | Replace content; success card becomes focus target immediately after DOM paint | immediate replace, no transform, focus still moves |
| mark-settle | hidden/initial status mark | visible status mark | 120-180ms ease-out | opacity + scale only | static mark |
| reward-reveal | no reward block | reward block visible | no delay or <=80ms | reward appears with card; no stagger that delays action | static block |

## Primitive & Token Mapping

- Primitive: Growth Forms renderer success card presentation.
- Imports allowed: none for renderer core unless existing renderer build supports a local utility.
- Imports forbidden: GSAP, Framer Motion, Lottie, host WordPress animation libraries.
- Timing tokens: use renderer CSS custom properties if introduced; otherwise scoped constants in `styles.ts`.
- Easing tokens: use existing renderer easing patterns; no hardcoded brand-only curves outside renderer CSS.
- Layout animation: none; avoid measuring heights or animating layout.
- CSS properties: opacity, transform, outline, box-shadow; avoid width/height/top/left animation.
- GSAP/Lottie justification: N/A.

## Reduced Motion Contract

- Detection: CSS `@media (prefers-reduced-motion: reduce)`.
- Replacement behavior: render success card immediately with no transform or delayed entrance.
- Meaning preserved: title/body/next steps/action remain identical.
- Animations removed: form exit, card entrance, status mark settle.
- Animations retained: focus ring and static state styling only.

## Accessibility & Feedback

- Focus visibility: success card container receives programmatic focus with visible focus style only when focus-visible applies.
- Keyboard activation: CTAs are native `<a>` or `<button>` elements, not divs.
- Live region / status behavior: one polite status announcement for accepted state; no repeated announcements for decorative sub-elements.
- Color-independent state: success title/body/icon shape communicate state without relying on green.
- Motion-independent meaning: all next-step/reward meaning is text-first.
- Error/destructive stability: rejected/invalid/captcha states do not animate into success.

## Performance Guardrails

- Compositor-only properties: opacity and transform only.
- Layout reads/writes: no runtime height measurement for transition.
- Animation scope: renderer root only, not full page.
- Chart/counter constraints: N/A.
- Mobile constraints: no card height jump that pushes the visitor past the confirmation title without focus alignment.

## GVC / Micro Evidence

- Scenario: Growth Forms success card render.
- Scenario file: `scripts/frontend/scenarios/growth-forms-success-card.ts` or AEO live verifier extension.
- Route: `/aeo-2/` for first consumer, generic fixture if available.
- Viewports: desktop and mobile 390.
- Required steps: accepted submission path, assert success card visible, assert focus, repeat with reduced-motion context.
- Required captures: success card default, success card with reward if fixture exists, mobile success card.
- Required frame labels: `before-submit`, `after-success`, `after-success-reduced-motion`.
- Required `data-capture` markers: `growth-form-success-card`, `growth-form-success-reward`, `growth-form-success-actions`.
- Assertions: no hidden content after transition, no scroll horizontal, no delayed CTA beyond transition budget.
- Reduced-motion evidence: static card visible immediately and active element still valid.

## Design Decision Log

- Decision: use a small CSS transition inside the renderer, not a new animation dependency.
- Alternatives considered: route-level view transition, confetti/celebration, host-page scroll animation, no transition.
- Why this pattern: it upgrades perceived quality while keeping renderer portable, fast and accessible.
- Reuse / extend / new primitive: extend renderer status primitive; no new global motion primitive.
- Open risks: host CSS may interfere with focus outline or card sizing; must be covered by hostile-host verification.
- Follow-up: if multiple forms need richer reward reveals, promote reward block motion into a documented renderer variant.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion` when required.
- [ ] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved Greenhouse wrappers/primitives.
- [ ] Performance guardrails avoid layout thrash and excessive animation.
- [ ] GVC/micro evidence proves the meaningful interaction, not only a static screenshot.
- [ ] Design decision log explains why this motion is needed and what was rejected.
