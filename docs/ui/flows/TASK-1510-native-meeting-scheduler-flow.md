# TASK-1510 — Native Meeting Scheduler Flow

## Flow Goal

Move from measurable horizon exploration to a server-confirmed Meeting Pass while preserving timezone, accessibility, idempotency and fallback.

## Happy Path

```text
mount -> authorized config -> availability -> horizon/day -> slot
  -> Meeting Pass selected -> details/consent -> local validation
  -> booking with stable key -> server receipt
  -> confirmed Meeting Pass + gh_meeting_booking_confirmed
```

## Measurement State Machine

- Mount visible -> `gh_meeting_interaction {interaction:viewed,stage:availability}` once.
- Availability rendered -> `availability_loaded` with safe availability state.
- Date/slot actions -> `date_selected` / `slot_selected` with buckets only.
- Details enter/validation -> `details_started` / `validation_failed`.
- Submit -> `booking_started`; recoverable/terminal failure -> `booking_failed` with sanitized category.
- Fallback -> `fallback_opened`.
- Only server receipt -> `gh_meeting_booking_confirmed`; GTM maps to `generate_lead`.
- Visual state and telemetry originate from the same reducer action; no DOM scraping.

## Recovery Branches

- Flag/config unavailable -> existing embed/link directly.
- Availability timeout/empty -> user retry/bounded window/fallback.
- Conflict -> preserve non-sensitive fields, refresh horizon, focus alert then first slot.
- Validation/captcha -> keep valid selection, focus error, retry same intent after correction.
- Offline/no Teams/provider degraded -> no success/confirmation event; fallback.
- Ambiguous timeout -> processing/recovery; never auto-create a fresh key or confirmation event.

## Focus and Navigation

- Step transition focuses heading; back returns to selected slot.
- Conflict focuses alert; success focuses confirmed-pass heading.
- Browser Back/remount never replays POST.
- Reduced motion does not change timing of semantic state/focus/telemetry.

## Fallback Contract

- Present as lower-emphasis action during pilot/loading/error/empty.
- No attendee values in fallback query params.
- Emits only generic `fallback_opened`; never conversion.

## GVC Scenario Plan

- Capture happy path and all recovery branches at 1440/390.
- Deterministic fixtures for conflict/offline/timeout; one approved staging booking.
- Verify focus/live regions, no double submit, no overflow and exact event order/count.
- `qualityProfile: 'premium'`; `reducedMotionCheck: true`.

## Design Decision Log

- Three semantic stages live in one inline scene; no modal/drawer.
- Meeting Pass persists selected intent and is the single visual bridge to confirmed conversion.
- Generic funnel event minimizes GTM tag sprawl; one confirmed event maps to key event.
- Native invitation owns reschedule/cancel.

