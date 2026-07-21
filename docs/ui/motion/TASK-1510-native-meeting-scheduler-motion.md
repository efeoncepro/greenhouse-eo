# TASK-1510 — Native Meeting Scheduler Motion Contract

## Intent

Motion makes time and state tangible. It must clarify horizon, timezone, selection and confirmation without delaying comparison or becoming generic spectacle.

## Motion Map

- Scene entry: signal rail and horizon resolve as one composition; no slot stagger.
- Horizon scrub: bounded translate/snap with explicit controls and stable focus.
- Timezone lens: labels shift/crossfade while selection invalidates or recalculates explicitly.
- Slot -> Meeting Pass: shared-element-style morph preserves date/time continuity.
- Step change: task plane crossfade/short translate; horizon/pass remain anchored.
- Pending: pass changes to processing with restrained progress signal.
- Conflict: pass changes to warning and returns attention to refreshed horizon; no shake.
- Success: pass resolves to confirmed receipt; no confetti/countdown.

## Tokens and Performance

- Canonical duration/easing tokens; no scattered literal timings.
- Prefer transform/opacity and CSS; WAAPI only for the pass morph if it measurably improves continuity.
- No continuous particles, parallax, scroll-jacking or layout-height animation that loses focus.
- Performance budget and `prefers-reduced-motion` are verified on the real WordPress host.

## Reduced Motion

- Horizon, step and pass transitions become direct state swaps.
- Pending text/status, focus and live-region meanings remain identical.
- Telemetry follows reducer actions, not transition callbacks, so event order/count is unchanged.

## GVC / Micro Evidence

- Capture horizon navigation, timezone change, slot/pass morph, pending, conflict and confirmed states.
- Repeat keyboard path under reduced motion and compare final state/focus/dataLayer sequence.
- Scenario `native-meeting-scheduler`, `qualityProfile: 'premium'`, `reducedMotionCheck: true`.
- Record no layout jump, no lost focus, no repeated slot animation, no page overflow and acceptable host performance.

## Design Decision Log

- Causal spatial motion selected to satisfy frontier aesthetic without decorative effects.
- Slot stagger/particles/confetti rejected because they weaken availability trust.
- CSS-first preserves portability; WAAPI is a bounded exception for the signature pass morph.
- Reduced-motion and telemetry equivalence are closure gates.

