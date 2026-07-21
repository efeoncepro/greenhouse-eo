# TASK-1455 — Globe internal launch motion

## Motion contract

- Purpose: orient the user at product arrival and confirm auth navigation, never decorate an idle page.
- Entry: brand stage fades/translates once; content regions reveal in a short ordered sequence.
- CTA: hover/focus uses color/translate only; pending keeps geometry and replaces label.
- Authenticated transition: server navigation, no cross-document morph dependency.
- Error/revoked: immediate stable render; no shake.

## Tokens

- Central CSS variables own short/medium duration and one enterprise easing curve.
- Maximum initial sequence 360 ms; first paint/content is never blocked.
- Only opacity and transform animate.

## Reduced motion

`prefers-reduced-motion: reduce` sets duration to 1 ms, removes translate and preserves all final states/content.

## GVC / Micro Evidence

- Capture initial and settled frames at desktop/mobile.
- Emulate reduced motion and verify same reading order/final geometry.
- Keyboard focus is visible at every interactive state.
- Record pre-activation, pending and destination states without retaining OAuth query material.

## Design Decision Log

- Rejected ambient orbit/particle loops because they add GPU/cognitive cost without causal meaning.
- No JS animation framework in the first shell; CSS is sufficient and keeps the runtime lean.
