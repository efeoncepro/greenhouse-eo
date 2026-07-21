# TASK-1510 — Native Meeting Calendar visual direction

## Status

- Mode: `repo-native-benchmark`
- Decision: selected for implementation
- Surface: portable public scheduler + internal Design System preview
- Primary signal: a real, immediately recognizable monthly calendar

## Brief

The visitor wants to find one credible date and time with minimum uncertainty. The surface must feel native to
Efeonce, but recognition and booking confidence are more important than novelty. HubSpot remains the source of
truth; the renderer only presents governed availability and sends a single idempotent booking intent.

## Benchmarked directions

### A. Temporal Operations Desk — selected (2026 premium pass)

- Three-part desktop composition: compact meeting context, full month workspace, selected-day availability rail.
- Calendar semantics remain visible: month/year, weekday headers, complete week rows, unavailable dates, selected date.
- Availability density is visible inside each bookable date through a restrained three-level meter; the selected slot becomes a compact booking brief beside the calendar.
- Closest to the stable mental model used by Calendly, Cal.com and Google appointment schedules.

### B. Editorial Concierge — rejected after implemented baseline review

- The large dark narrative rail and atmospheric treatment created a strong campaign impression.
- It consumed too much first-fold space, made the scheduler feel promotional and weakened productive density.
- The implemented baseline showed that more decorative depth did not improve date/time comparison.

### C. Horizontal week strip + density bars — rejected

- Fast when the user already understands the product.
- Read as an availability carousel, not as a calendar.
- Density bars created visual novelty without improving the booking decision.

### D. Agenda-only grouped date cards — rejected for primary desktop

- Strong mobile fallback and useful for extremely sparse availability.
- Weak month context and poor scan of distance between dates.
- May be used as an honest empty/sparse fallback later, not the default.

## Art direction

- Compact Efeonce context rail in deep ink; brand atmosphere is reduced to one quiet edge glow and never competes with controls.
- Paper-like calendar workspace with a strong typographic month label, continuous grid rhythm and one controlled depth hierarchy.
- Availability uses shape + label + contrast, never color alone.
- Selected date is a contained cell state with an explicit mark; today, availability density, focus and selection remain distinguishable.
- Time slots form a real daily agenda grouped as morning/afternoon/evening, not pills floating without a date relationship.
- The selected appointment is a structured booking brief, not a gradient hero card.
- Subtle gradients are allowed only as ambient surface tint; no glass effects, particles, giant pills or decorative spectacle.

## Modern web mapping

- Native `form`, labels, buttons and table semantics.
- Full month uses a semantic table; only bookable days are buttons, so keyboard users do not traverse disabled dates.
- Labels stay above fields; validation appears after submit/blur and clears on correction.
- Minimum 48 px tap targets for dates, times and commands.
- Scroll affordance is explicit on narrow overflow; the calendar itself never requires horizontal scrolling at 390 px.
- Reduced motion and forced-colors remain supported.

## Benchmark sources

- Calendly booking UI: monthly grid + selected-day time list.
- Cal.com booking UI: event context + calendar + times, with timezone visible.
- Google Calendar appointment schedules: booking page exposes available time, conferencing and booking form.
- HubSpot Meetings: provider-side availability, timezone, form, confirmation and cancel/reschedule remain authoritative.

## Primitive decision

`extend` the existing portable `MeetingRenderer`. Do not add FullCalendar: this is a date-selection control, while
the repo contract reserves FullCalendar for calendar visualization. Do not add React/Lit to the public bundle.

## Decision

Implement direction A as the sole active visual thesis: compact command rail, dense monthly workspace and structured
availability rail in one inline scene. Preserve the renderer/state/telemetry foundation and adaptive recipes. The user
selects a date and time before the only mutating action; selection depth and motion preserve the spatial relationship
date → daily agenda → booking brief without replaying an entrance animation for the entire scene.

## Desktop target

At 1440×1000 the scene uses three related regions. The month is the largest region and its calendar identity is
visible above the fold through month/year, previous/next controls, weekday headers and complete week rows. The daily
agenda sits directly beside it; contact details replace the calendar work plane while the selected summary remains.

## Mobile target

At 390×844 the composition transforms to compact context, complete seven-column month, two-column daily agenda,
selected summary and details in document order. Calendar dates remain at least 48 px tall. The contextual CTA may
stick only after the slot list in normal flow, never obscuring unreviewed slots or fields; the component must satisfy
`scrollWidth === clientWidth`.

## Token mapping

- Context: `--gh-meeting-ink` / `--gh-meeting-on-ink-*`.
- Calendar/agenda surfaces: `--gh-meeting-paper`, `--gh-meeting-paper-alt`, `--gh-meeting-line*`.
- Available/selected/action: `--gh-meeting-accent*` plus border, label/dot and `aria-pressed`.
- State: `--gh-meeting-danger|warning|success`; never use semantic color as decorative differentiation.
- Geometry/motion: moderate 10–18 px radii, restrained shadow, 140 ms hover and 200 ms causal selection with decelerated easing.

## Anti-patterns

- Abstract availability charts, density bars or horizontal strips as the primary date control.
- Administrative calendar chrome, event drag/drop, week time-grid or FullCalendar dependency.
- Sticky/floating summary that obscures mobile dates, times or fields.
- Optimistic confirmation, hidden timezone, PII/provider IDs in telemetry or consent preselection.
- Decorative gradients, particles, glass cards, confetti, auto-advancing carousel or motion without state meaning.

## Success bar

- A person must identify the surface as a calendar in under one second.
- The selected date and its time slots must share one visual relationship.
- Desktop and 390 px must have no horizontal page overflow.
- Booking confirmation reaches `dataLayer` once and contains no PII, provider ID or conversion receipt.
