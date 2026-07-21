# TASK-1510 — Native Meeting Scheduler Motion Contract

## Intent

Motion clarifies calendar, timezone, selection and confirmation without delaying comparison or becoming generic spectacle.

## Motion Map

- Scene entry: one 280 ms opacity + 6 px settle occurs only on initial mount; ordinary reducer renders never replay it.
- Month change: direct calendar replacement with explicit controls and stable focus.
- Timezone lens: labels shift/crossfade while selection invalidates or recalculates explicitly.
- Date selection: the calendar remains visually stable; only the availability rail uses a 180 ms opacity + 4 px causal settle.
- Slot -> summary: a 200 ms opacity + 4 px settle preserves date/time continuity; `aria-live` carries the same meaning without motion.
- Step change: task plane crossfade/short translate; selected summary remains anchored.
- Recipe change: direct geometry recomposition on resize; no funnel-signaling choreography and no controller remount.
- Guided date -> slots: the calendar gives way to the agenda and focus lands on the first visible slot; Back restores the selected date.
- Form focus: the control rises by 1 px, the icon gains semantic accent and the focus halo settles around the complete field; error state remains independent of motion.
- Loading: layout-sized calendar skeleton uses a linear shimmer and stops under reduced motion.
- Pending: summary changes to processing with restrained progress signal.
- Conflict: summary changes to warning and returns attention to refreshed calendar; no shake.
- Success: the entire scheduler shell resolves to the confirmation composition only after the server-confirmed
  reducer transition. A 360 ms opacity/scale settle establishes the new state and one 560 ms low-contrast sweep
  crosses the complete shell; no calendar chrome remains, and there is no confetti/countdown.
- CTA activation: backdrop fades in over 180 ms and the bounded paper settles with opacity/translate/scale over 260 ms. Mobile uses the same envelope at `100dvh`; resize between modes is direct. Only the envelope enters on reopen—the connected scheduler does not replay its scene entrance.

## Tokens and Performance

- Canonical tokens: 80 ms press, 140 ms hover, 200 ms selection and 280 ms one-time scene entry; no scattered literal timings.
- Prefer transform/opacity and CSS; WAAPI only for a bounded summary transition if it measurably improves continuity.
- No continuous particles, parallax, scroll-jacking or layout-height animation that loses focus.
- Never animate a phase-wide calendar selector after `select_date` or `select_slot`; full scene replacement must remain visually continuous.
- Performance budget and `prefers-reduced-motion` are verified on the real WordPress host.

## Reduced Motion

- Calendar, step and summary transitions become direct state swaps.
- Pending text/status, focus and live-region meanings remain identical.
- Telemetry follows reducer actions, not transition callbacks, so event order/count is unchanged.

## GVC / Micro Evidence

- Capture month navigation, timezone context, slot/summary transition, pending, conflict and confirmed states.
- Repeat keyboard path under reduced motion and compare final state/focus/dataLayer sequence.
- Scenario `native-meeting-scheduler`, `qualityProfile: 'premium'`, `reducedMotionCheck: true`.
- Seam scenario `growth-cta-native-meeting`: compact launcher → adaptive task surface → close/reopen with the selected slot retained.
- Record no layout jump, no lost focus, no repeated slot animation, no page overflow and acceptable host performance.

## Design Decision Log

- Causal state motion selected to support continuity without decorative effects.
- Slot stagger/particles/confetti rejected because they weaken availability trust.
- CSS-first preserves portability; all active transitions use transform/opacity and the renderer's governed token lane.
- Reduced-motion and telemetry equivalence are closure gates.
- Confirmation motion never gates focus, the live-region announcement or the exactly-once conversion event. Under
  reduced motion both shell animations complete effectively immediately while the final DOM and focus target stay
  identical.

## Evidence 2026-07-21

- Premium GVC `2026-07-21T09-35-05_native-meeting-scheduler`: desktop + 390 px, 22 frames, exit 0.
- Calendar selection captured at immediate, settled and keyboard states; the keyboard probe repeats under reduced motion.
- Runtime errors `0/0/0/0`; enterprise rubric, accessibility, focus, layout and performance gates pass.
- Premium-pass audit found an immediate selection frame with a nearly invisible calendar because `ghm-panel-enter`
  replayed after every schedule render. The 2026 pass removes this phase-wide animation and scopes motion to the
  causal agenda/booking-brief regions.
- Reactive validation uses a restrained 160–180 ms color/opacity/scale transition for field status, a rotating Tabler
  loader only while corporate email verification is pending, and an instant equivalent under reduced motion. GVC
  `.captures/2026-07-21T11-37-07_native-meeting-scheduler` passed all three container sizes with 39 frames.
