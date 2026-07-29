---
name: greenhouse-growth-meetings
description: "Operate the Greenhouse native meeting scheduler end to end: provider-neutral public contracts backed by HubSpot Scheduler, visitor-timezone availability, corporate-email validation, idempotent booking, portable adaptive renderer, Growth CTA activation, receipt-gated GTM/GA4 measurement, WordPress/Think embedding, rollout and reliability. Use when touching `src/lib/growth/meetings/**`, `src/growth-meeting-renderer/**`, `/api/public/growth/meetings/**`, `greenhouse_growth.meeting_*`, the `efeonce-meeting-scheduler` custom element, the `open_meeting_scheduler` CTA action, `gh_meeting_*` telemetry, scheduler flags/bindings, or `growth.meeting.*` signals."
---

# Greenhouse Growth Meetings

Operate the native Efeonce booking experience without creating a second calendar. Keep HubSpot,
Office 365 and Teams behind a provider-neutral, server-governed Greenhouse contract.

## Load first

Read only the sources required by the change:

1. `project_context.md`, `Handoff.md` and the active task.
2. `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md` for every contract,
   provider, security, renderer or measurement change.
3. `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md` for product direction.
4. `docs/documentation/growth/scheduler-reuniones-nativo.md` and the matching runbook/manual for
   operator-facing behavior.
5. `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` when telemetry or conversion changes.
6. The host skill and landing reference when embedding on WordPress or Think.

## Ownership map

| Concern | Canonical owner |
|---|---|
| Public schemas, provider policy, idempotency, booking receipt | `src/lib/growth/meetings/**` |
| Public transport | `/api/public/growth/meetings/**` |
| Portable UI and client state | `src/growth-meeting-renderer/**` |
| CTA launcher/task surface | `greenhouse-growth-ctas`; action `open_meeting_scheduler` |
| HubSpot availability and booking | Server-only HubSpot Scheduler adapter |
| Calendar event and video conference | Office 365 + Microsoft Teams through HubSpot |
| Browser measurement | `MEETING_GTM_EVENTS` and `MEETING_TELEMETRY_PAYLOAD_KEYS` |
| Conversion truth | Meeting execution ledger and one-time server-confirmed receipt |

Do not route this capability through `hubspot-greenhouse-integration`; that Cloud Run bridge owns a
different CRM write/webhook contract.

## Operating loop

1. **Resolve the boundary.** Identify whether the change belongs to provider policy, public transport,
   renderer, CTA host, measurement or rollout. Keep route handlers thin.
2. **Preserve the contract.** Update server schemas, renderer mirrors and parity tests together. Keep
   browser DTOs allowlisted and provider-neutral.
3. **Implement native recovery.** Handle empty months, transport errors and unavailable configuration
   inside the scheduler through bounded month navigation, explicit status and `Reintentar`.
4. **Verify behavior.** Run focal tests, type/lint/build gates proportional to the change, then validate
   desktop, 390 px, keyboard, reduced motion, overflow and console state in a real host.
5. **Verify integrations only with approval.** A controlled booking must prove the same meeting in
   HubSpot, Outlook and Teams plus idempotent replay. Never create a booking during a visual smoke.
6. **Roll out through the control planes.** Coordinate flags, active surface binding, production release,
   host deployment and GTM publication as separate governed mutations.

## Hard rules

- Keep HubSpot Scheduler as server-side provider and source of truth for configuration, availability
  and booking. Never expose its token, scheduling URL, provider IDs, raw response or raw error.
- Keep the native experience native-only. `open_meeting_scheduler` must never render or follow a
  HubSpot iframe/link. Recover through retry, month navigation or an honest terminal state.
- Treat `fallbackHref`, `fallback_only` and `fallback_opened` as V1 compatibility vocabulary only.
  Current renderers do not consume/render the href and do not emit `fallback_opened`; do not revive it.
- Keep `book_meeting` navigation-only for legacy surfaces. Never silently change it into native booking
  or delete a legacy host contract before that surface is explicitly migrated.
- Preserve the semantic month grid when a month has zero slots. Show unavailable days, month-specific
  empty copy and bounded previous/next navigation; never collapse the calendar into a blank panel.
- Display and book in the visitor's canonical IANA timezone. Treat the surface timezone only as fallback
  when detection fails, and require config, availability, request and provider response to agree.
- Reuse the Growth Forms corporate-email policy and datasets for debounced client feedback, then
  revalidate server-side before Turnstile, slot read, claim or provider write. Never trust browser approval.
- Require a durable idempotency claim before the provider call. Only a pre-write failure is reclaimable.
  `provider_dispatched`, `ambiguous` and `provider_created_invalid` never auto-retry or open another path.
- Emit `gh_meeting_booking_confirmed` only from a fresh, eligible server-confirmed receipt. Replays do not
  emit another conversion. GTM maps it to `generate_lead`; it is not also sent as a custom GA4 event.
- Never place PII, exact slot/timezone, receipt, idempotency/correlation keys, provider IDs, Teams URL,
  raw attribution or provider errors in browser telemetry.
- Keep presentation recipes on one controller and one booking command. Resizing or reopening must not
  remount provider effects, clear the draft, emit duplicate steps or create another intent.
- Reload or freshly navigate the real host after a deploy/cache purge before smoke testing. An already
  open tab can retain the previous custom-element bundle and is not evidence of the new runtime.
- Do not publish GTM, flip production flags, activate a binding, promote another landing or create a real
  booking without the corresponding explicit approval.

## Measurement contract

- Use `gh_meeting_step_reached` for non-conversion funnel progress; never mark it as a key event.
- Use `gh_meeting_booking_confirmed` only as the dataLayer input that GTM transforms to
  `generate_lead` with `lead_source=meeting_booking`.
- Extend `MEETING_GTM_EVENTS`, `MEETING_STEPS`, `MEETING_TELEMETRY_PAYLOAD_KEYS`, the renderer mirror,
  parity tests and Tracking Plan together.
- Preserve server-confirmed ledger truth; GA4 remains a browser-reported mirror to reconcile.

## Verification minimum

```bash
pnpm vitest run src/lib/growth/meetings src/growth-meeting-renderer src/growth-cta-renderer
pnpm lint
pnpm tsc --noEmit
pnpm build
```

For host verification, assert the current bundle loaded, the calendar remains present for an empty month,
`a[href*="meetings.hubspot.com"]` is absent from the native surface, `scrollWidth === clientWidth`, and
there are no console errors. Exercise booking and `/g/collect` only in their separately approved gates.

## Compose with

- `greenhouse-growth-ctas` for launcher, dialog/full-screen task surface and action registry.
- `greenhouse-growth-forms` for the shared corporate-email policy only; meetings owns its form state and booking.
- `greenhouse-gtm-ga4-operator` for workspace, preview, publish and GA4 verification.
- `efeonce-public-site-wordpress` or `astro` for the host adapter.
- `hubspot-as-a-service` only when configuring a client portal; it does not own this runtime.
- `greenhouse-production-release` for Greenhouse production rollout.

## Maintenance contract

Update both `.codex` and `.claude` copies in the same change set when changing the public schema, provider
boundary, state machine, native-only recovery, renderer recipes, CTA action, telemetry, flags, bindings or
rollout gates. Update the architecture or PDR first when the durable decision changes; keep release IDs,
page backups, current availability and one-off smoke evidence in tasks, ledgers, handoff or landing references.
