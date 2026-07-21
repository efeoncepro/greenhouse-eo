# TASK-1510 — Native Meeting Scheduler Motion Contract

## Intent

Motion clarifies calendar, timezone, selection and confirmation without delaying comparison or becoming generic spectacle.

## Motion Map

- Scene/step entry: the work plane uses a 400 ms opacity + 10 px causal settle; natural/no-JS state remains visible.
- Month change: direct calendar replacement with explicit controls and stable focus.
- Timezone lens: labels shift/crossfade while selection invalidates or recalculates explicitly.
- Slot -> summary: 400 ms opacity/translate/scale settle preserves date/time continuity; `aria-live` carries the same meaning without motion.
- Step change: task plane crossfade/short translate; selected summary remains anchored.
- Recipe change: direct geometry recomposition on resize; no funnel-signaling choreography and no controller remount.
- Guided date -> slots: the calendar gives way to the agenda and focus lands on the first visible slot; Back restores the selected date.
- Form focus: the control rises by 1 px, the icon gains semantic accent and the focus halo settles around the complete field; error state remains independent of motion.
- Loading: layout-sized calendar skeleton uses a linear shimmer and stops under reduced motion.
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
- CSS-first preserves portability; all active transitions use transform/opacity and the renderer's governed token lane.
- Reduced-motion and telemetry equivalence are closure gates.

## Evidence 2026-07-21

- Premium GVC `2026-07-21T09-35-05_native-meeting-scheduler`: desktop + 390 px, 22 frames, exit 0.
- Calendar selection captured at immediate, settled and keyboard states; the keyboard probe repeats under reduced motion.
- Runtime errors `0/0/0/0`; enterprise rubric, accessibility, focus, layout and performance gates pass.
