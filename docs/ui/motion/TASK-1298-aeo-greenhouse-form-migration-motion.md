# TASK-1298 — AEO Greenhouse Form Migration Motion Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1298 — AEO WordPress greenhouse-form migration`
- Related wireframe: `docs/ui/wireframes/TASK-1298-aeo-greenhouse-form-migration.md`
- Related flow: `none`
- Motion type: `none`
- Primary primitive / library: `existing primitive`
- Copy source: Growth Forms render contract + AEO landing wrapper copy

## Motion Brief

- Primary user: public AEO diagnostic visitor.
- Motion intent: no new decorative or layout motion; preserve clarity during validation, pending submit and error states.
- Uncertainty reduced: field/status feedback must remain understandable even when motion is reduced or disabled.
- User decision supported: submit with confidence that the form accepted validation/captcha steps.
- Non-goals: add entrance animations, stagger, layout morph, GSAP, Framer or decorative effects.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Renderer submit button | submit | existing pending/disabled feedback from renderer | `<greenhouse-form>` | yes |
| Field error/status | input/blur/submit | existing inline status; text is authoritative | `<greenhouse-form>` | yes |
| Turnstile boundary | submit | invisible challenge; no visible decorative motion | Turnstile + renderer | yes |
| AEO host card | mount/load | no new motion | WordPress host | yes |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Submit | enabled | existing renderer style | visible focus | pressed state | N/A | disabled/pending text/state | success/error status |
| Fields | editable | existing renderer style | visible focus | N/A | N/A | verifying state for email | inline error/success text |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | no new transition | same static state |

## Primitive & Token Mapping

- Primitive: `<greenhouse-form>` existing renderer.
- Imports allowed: none in WordPress; renderer script only.
- Imports forbidden: GSAP, Framer, Lottie, ad-hoc animation libraries.
- Timing tokens: existing renderer only.
- Easing tokens: existing renderer only.
- Layout animation: none.
- CSS properties: scoped host CSS may adjust layout/color/spacing only.
- GSAP/Lottie justification: N/A.

## Reduced Motion Contract

- Detection: Playwright/GVC with `prefers-reduced-motion: reduce`.
- Replacement behavior: same states remain visible without relying on animation.
- Meaning preserved: pending, errors and success are expressed by text/ARIA/state, not motion.
- Animations removed: no new host animation is introduced.
- Animations retained: only browser/renderer default feedback if non-disruptive.

## Accessibility & Feedback

- Focus visibility: renderer focus ring or scoped equivalent remains visible.
- Keyboard activation: submit and fields work via keyboard.
- Live region / status behavior: renderer status/errors remain announced.
- Color-independent state: errors include text.
- Motion-independent meaning: all states understandable in static screenshots.
- Error/destructive stability: no layout jump hides the first error.

## Performance Guardrails

- Compositor-only properties: N/A; no new animation.
- Layout reads/writes: no custom animation script in WordPress.
- Animation scope: N/A.
- Chart/counter constraints: N/A.
- Mobile constraints: no animation-induced horizontal overflow on 390px.

## GVC / Micro Evidence

- Scenario: AEO conversion renderer migration.
- Scenario file: direct route capture or new scenario if needed.
- Route: `https://efeoncepro.com/aeo-2/`.
- Viewports: desktop, mobile 390, reduced-motion.
- Required steps: load conversion section, trigger invalid submit, trigger email gate, observe pending submit boundary.
- Required captures: default, error state, pending/email verification state, reduced-motion.
- Required frame labels: `default`, `field-error`, `email-gate`, `reduced-motion`.
- Required `data-capture` markers: `.gh-aeo-conversion`, renderer root, submit button.
- Assertions: no new host animation, no layout jump/overflow, reduced-motion preserves state meaning.
- Reduced-motion evidence: computed transition/animation checks or visual capture showing stable static states.

## Design Decision Log

- Decision: no new motion; reuse renderer feedback.
- Alternatives considered: animated card entrance, custom pending spinner, accordion-like reveal around errors.
- Why this pattern: this is a trust/conversion form, so clarity and stability matter more than decorative motion.
- Reuse / extend / new primitive: reuse existing renderer; do not create a motion primitive.
- Open risks: renderer built-in transitions may need observation if they cause layout shift in Elementor.
- Follow-up: only introduce host-level motion if a future landing pattern requires a reusable contract.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion` when required.
- [ ] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved Greenhouse wrappers/primitives.
- [ ] Performance guardrails avoid layout thrash and excessive animation.
- [ ] GVC/micro evidence proves the meaningful interaction, not only a static screenshot.
- [ ] Design decision log explains why this motion is needed and what was rejected.
