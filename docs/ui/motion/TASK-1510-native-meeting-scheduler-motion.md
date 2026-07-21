# TASK-1510 — Native Meeting Scheduler Motion Contract

## Intent

Motion clarifies calendar, timezone, selection and confirmation without delaying comparison or becoming generic spectacle.

## Motion Map

- Scene entry: context, month and daily agenda resolve as one composition; no slot stagger.
- Month change: direct calendar replacement with explicit controls and stable focus.
- Timezone lens: labels shift/crossfade while selection invalidates or recalculates explicitly.
- Slot -> summary: short state transition preserves date/time continuity.
- Step change: task plane crossfade/short translate; selected summary remains anchored.
- Pending: summary changes to processing with restrained progress signal.
- Conflict: summary changes to warning and returns attention to refreshed calendar; no shake.
- Success: summary resolves to confirmed receipt; no confetti/countdown.

## Tokens and Performance

- Canonical duration/easing tokens; no scattered literal timings.
- Prefer transform/opacity and CSS; WAAPI only for a bounded summary transition if it measurably improves continuity.
- No continuous particles, parallax, scroll-jacking or layout-height animation that loses focus.
- Performance budget and `prefers-reduced-motion` are verified on the real WordPress host.

## Reduced Motion

- Calendar, step and summary transitions become direct state swaps.
- Pending text/status, focus and live-region meanings remain identical.
- Telemetry follows reducer actions, not transition callbacks, so event order/count is unchanged.

## GVC / Micro Evidence

- Capture month navigation, timezone context, slot/summary transition, pending, conflict and confirmed states.
- Repeat keyboard path under reduced motion and compare final state/focus/dataLayer sequence.
- Scenario `native-meeting-scheduler`, `qualityProfile: 'premium'`, `reducedMotionCheck: true`.
- Record no layout jump, no lost focus, no repeated slot animation, no page overflow and acceptable host performance.

## Design Decision Log

- Causal state motion selected to support continuity without decorative effects.
- Slot stagger/particles/confetti rejected because they weaken availability trust.
- CSS-first preserves portability; WAAPI is a bounded exception for a causal summary transition.
- Reduced-motion and telemetry equivalence are closure gates.
