# TASK-1510 — Native Meeting Scheduler Flow

## Flow Goal

Move from a measurable monthly-calendar selection to a server-confirmed meeting summary while preserving timezone, accessibility, idempotency and native recovery.

## Happy Path

```text
mount -> authorized config -> availability -> month/date -> daily slot
  -> selected meeting summary -> details/consent -> local validation
  -> booking with stable key -> server receipt
  -> confirmed meeting summary + gh_meeting_booking_confirmed
```

## Measurement State Machine

- Mount visible at >=50% for 300 ms -> `gh_meeting_step_reached {meeting_step:viewed}` once.
- Availability rendered -> `availability_loaded` with safe availability state.
- Date/slot actions -> `date_selected` / `slot_selected` with buckets only.
- Details enter/validation -> `details_started` / `validation_failed`.
- Submit -> `booking_started`; recoverable/terminal failure -> `booking_failed` with sanitized category.
- Only the first server-confirmed receipt branch -> `gh_meeting_booking_confirmed`; GTM maps it to `generate_lead` with `lead_source=meeting_booking` and does not forward the custom confirmation event.
- Visual state and telemetry originate from the same reducer action; no DOM scraping.

## Recovery Branches

- Flag/config unavailable -> unavailable state with an in-product retry; rollout control remains operator-side.
- Availability timeout -> user retry; empty month -> bounded month navigation.
- Conflict -> preserve non-sensitive fields, refresh the calendar, focus alert then first slot.
- Validation/captcha -> keep valid selection, focus error, retry same intent after correction.
- Definitive pre-dispatch failure -> no success/confirmation event; offer a safe retry when the failure is retryable.
- Offline/no Teams after provider dispatch or ambiguous write outcome -> processing/check-email recovery; never auto-create a fresh key, offer another booking path or emit confirmation.

## Focus and Navigation

- Step transition focuses heading; back returns to selected slot.
- Conflict focuses alert; success focuses the confirmed-summary heading.
- Browser Back/remount never replays POST.
- Reduced motion does not change timing of semantic state/focus/telemetry.

## Native Recovery Contract

- Loading/config errors expose a `Reintentar` action inside the same scheduler.
- Empty months retain their semantic grid and bounded month navigation; they do not become errors.
- After dispatch, ambiguous or provider-created-invalid outcomes instruct the user to check email and never expose another booking path.
- Recovery emits availability/booking failure events only; it never emits conversion or sends attendee data elsewhere.

## GVC Scenario Plan

- Capture happy path and all recovery branches at 1440/390.
- Deterministic fixtures for conflict/offline/timeout; one approved staging booking.
- Verify focus/live regions, no double submit, no overflow and exact event order/count.
- `qualityProfile: 'premium'`; `reducedMotionCheck: true`.

## Design Decision Log

- Three semantic stages live in one inline scene; no modal/drawer.
- The selected meeting summary persists intent and is the single visual bridge to confirmed conversion.
- Generic funnel event minimizes GTM tag sprawl; one confirmed event maps to key event.
- Native invitation owns reschedule/cancel.
