# TASK-1298 — AEO Greenhouse Form Migration Motion Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1298 — AEO WordPress greenhouse-form migration`
- Related wireframe: `docs/ui/wireframes/TASK-1298-aeo-greenhouse-form-migration.md`
- Related flow: `none`
- Motion type: `microinteraction`
- Primary primitive / library: `existing renderer CSS transitions; no new external library in WordPress`
- Copy source: Growth Forms render contract + AEO landing wrapper copy

## Motion Brief

- Primary user: public AEO diagnostic visitor.
- Motion intent: modernize the form feel through useful feedback only: focus clarity, validation recovery, pending submit, email verification and success/error confirmation.
- Uncertainty reduced: visitors should understand whether the form is editable, validating, blocked, submitting or accepted without relying on a global status blob.
- User decision supported: submit with confidence that the form accepted validation/captcha steps.
- Non-goals: decorative entrance choreography, staggered hero-like reveals, GSAP/Framer/Lottie in WordPress, confetti, glow-heavy CTAs or motion that distracts from conversion.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Renderer submit button | hover/focus/press/submit | subtle elevation/press state + pending affordance; text remains authoritative | `<greenhouse-form>` | yes |
| Field focus | focus/blur | border/focus ring transition, no layout shift | `<greenhouse-form>` | yes |
| Field error/status | input/blur/submit | inline error/success feedback; text is authoritative; small reveal only if reduced-motion safe | `<greenhouse-form>` | yes |
| Email verification | debounce/response | status line appears near field, no card jump; pending indicator with text | `<greenhouse-form>` | yes |
| Turnstile boundary | submit | invisible challenge; no visible decorative motion | Turnstile + renderer | yes |
| AEO host card | mount/load | no decorative mount motion in WordPress live; renderer lab may prototype subtle field readiness only | WordPress host / renderer | no |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Submit | enabled | small transform/shadow or tonal shift | visible focus ring | brief press compression | N/A | disabled/pending text/state | success/error status |
| Fields | editable | border/tint only if pointer | visible focus ring | N/A | N/A | verifying state for email | inline error/success text + border/icon |
| Selects | editable | border/tint only if pointer | visible focus ring | pressed/open native behavior | selected value | N/A | error text if required in future |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Field focus | neutral | focused | 120-160ms / emphasized ease | border/focus ring changes only | instant focus ring |
| Field validation | neutral | error/success | 120-180ms / emphasized ease | reveal inline message without large vertical jump | message appears instantly |
| CTA hover/press | idle | hover/pressed | 75-140ms / emphasized ease | small elevation/translate on hover and shadow compression on press | no transform, color/focus remains |
| Submit pending | idle | pending | 120-200ms | disabled affordance + text change; no spinner-only meaning | text/state change only |

## Primitive & Token Mapping

- Primitive: `<greenhouse-form>` existing renderer.
- Imports allowed: none in WordPress; renderer script only.
- Imports forbidden: GSAP, Framer, Lottie, ad-hoc animation libraries.
- Timing tokens: 75ms press, 120-160ms focus, 180ms validation reveal, 200ms pending transition.
- Easing tokens: `cubic-bezier(0.2, 0, 0, 1)` or existing renderer equivalent.
- Layout animation: none.
- CSS properties: opacity, transform, border-color, box-shadow and background-color only; no height animation that causes layout jumps. Current renderer uses tokenized field/action shadows and focus halo; host overrides stay through `--ghf-*`.
- GSAP/Lottie justification: N/A.

## Reduced Motion Contract

- Detection: Playwright/GVC with `prefers-reduced-motion: reduce`.
- Replacement behavior: same states remain visible without transform/transition; text, border, focus ring and aria state remain.
- Meaning preserved: pending, errors and success are expressed by text/ARIA/state, not motion.
- Animations removed: decorative transforms, field reveal animations and CTA press transform.
- Animations retained: immediate state/color changes when they do not convey meaning alone.

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

- Scenario: AEO conversion renderer migration / modernized form parity.
- Scenario file: `pnpm public-website:verify-aeo-renderer-interaction-preview` for pre-live interaction states; direct route capture or new GVC scenario still required after live save.
- Route: `https://efeoncepro.com/aeo-2/`.
- Viewports: desktop, mobile 390, reduced-motion.
- Required steps: load conversion section, focus first field, trigger invalid submit, verify summary/ARIA, verify reduced-motion; after live save, also trigger email gate and pending submit boundary.
- Required captures: default, focus state, required error state, reduced-motion pre-live; email gate/verifying state, pending submit boundary and success/error recovery after governed live cutover or a safe staging harness.
- Required frame labels: `default`, `focus`, `field-error`, `reduced-motion`; later `email-gate`, `pending`.
- Required `data-capture` markers: `.gh-aeo-conversion`, renderer root, submit button.
- Assertions: no layout jump/overflow, reduced-motion preserves state meaning, focus ring visible, CTA not dark/default, selects clean, errors announced by text.
- Reduced-motion evidence: `verify-aeo-renderer-interaction-preview` checks computed transition/animation duration `<=1ms` and saves `.captures/aeo-renderer-interaction-reduced-motion-desktop.png`.

## Design Decision Log

- Decision: allow purposeful microinteractions in the renderer, but no decorative WordPress host animation.
- Decision delta 2026-06-30: prevent primary `pointerdown` default so blur validation cannot shift layout under the first submit click; submit handler remains the authority for full-step validation.
- Alternatives considered: animated card entrance, custom spinner-only pending state, accordion-like reveal around errors, glow-heavy CTA.
- Why this pattern: this is a trust/conversion form; modern feel should come from responsive feedback, not theatrical motion.
- Reuse / extend / new primitive: extend existing renderer interaction styling; do not create a one-off WordPress motion layer.
- Open risks: renderer built-in transitions may need observation if they cause layout shift in Elementor or conflict with Ohio.
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
