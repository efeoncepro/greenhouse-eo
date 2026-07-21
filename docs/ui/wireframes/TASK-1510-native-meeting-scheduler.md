# TASK-1510 — Adaptive Meeting Scheduler Wireframes

## Product Design Source

- Visual direction mode: `repo-native-benchmark`
- Product Design asset: `docs/ui/visual-directions/TASK-1510-native-meeting-calendar-direction.md`
- Selected direction: Calendar Command Center with adaptive recipes.
- Desktop target: 1440x1000.
- Mobile target: 390x844.

## Product decision

The selected direction is **Calendar Command Center**, delivered through adaptive recipes rather than one responsive composition. The scheduler keeps one controller and booking intent while the host and container determine how much of the calendar is visible at once.

- Visual direction: `docs/ui/visual-directions/TASK-1510-native-meeting-calendar-direction.md`
- Architecture: `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md#architecture-decision-2026-07-21--adaptive-presentation-recipes`
- Target hosts: narrow Growth CTA, dialog/full-screen task surface, embedded section and full page.

## Launcher — collapsed Growth CTA

The launcher is not a miniature scheduler. It preserves the CTA footprint and delays availability/bundle work until activation or strong intent.

```text
┌──────────────────────────┐
│ Hablemos de tu desafío   │
│ 30 min · Microsoft Teams │
│ [Ver horarios →]         │
└──────────────────────────┘
             │ activate
             ▼
   dialog desktop / full-screen mobile
```

## Desktop Target

At 1440x1000 a full section resolves to `command`: context, semantic month and selected-day agenda remain simultaneously visible. In a desktop dialog the same controller normally resolves to `split`, avoiding a three-plane composition when the dialog cannot sustain it. The host owns the dialog, backdrop, scroll boundary and focus return.

## Guided — narrow task surface

One decision plane appears at a time. The date strip is an efficient default, while “Ver mes” preserves calendar recognition and access to every bookable date.

```text
┌──────────────────────────────┐
│ [←] Agenda una reunión  [×]  │
│ 30 min · Teams · GMT-4       │
│ Horario — Datos — Confirmar  │
│                              │
│ JULIO 2026          [Ver mes]│
│ [Mar 21] [Mié 22] [Jue 23]  │
│                              │
│ Mañana · 3 horas             │
│ [09:00] [09:30]              │
│ [10:30] [11:00]              │
│                              │
│ Mié 22 · 09:30 · 30 min      │
│ [Continuar]                  │
│ Usar agenda HubSpot          │
└──────────────────────────────┘
```

At the details phase, date and time collapse into the persistent appointment summary. Back restores the selected slot and focus. A dispatched booking survives closing/reopening the task surface.

## Mobile Target

At 390x844 the Growth CTA remains a compact launcher and opens a `full_screen` task surface. The scheduler resolves to `guided`, has a single vertical scroll owner and exposes one decision plane at a time. The selected appointment remains visible without covering fields, errors, consent or fallback.

## Split — medium surface

```text
┌──────────────────────────────────────────────────────────┐
│ Agenda una reunión · 30 min · Teams · Tu horario local   │
│ Horario — Datos — Confirmación                            │
├──────────────────────────────┬───────────────────────────┤
│ JULIO 2026          [‹] [›]  │ MIÉRCOLES 22 · 3 horas   │
│ Lu Ma Mi Ju Vi Sá Do         │ Mañana                   │
│        1  2  3  4  5         │ [09:00] [09:30]          │
│  6  7  8  9 10 11 12         │ [10:30] [11:00]          │
│ 13 14 15 16 17 18 19         │ Tarde                    │
│ 20 21[22]23 24 25 26         │ [15:00] [16:00]          │
│ 27 28 29 30 31               │                           │
│                              │ Mié 22 · 09:30 · 30 min  │
│                              │ [Continuar]               │
└──────────────────────────────┴───────────────────────────┘
```

## Command — full section/page

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ CONTEXTO            │ JULIO 2026                         │ AGENDA        │
│                     │ [‹]                         [›]     │ MIÉRCOLES 22  │
│ Hablemos de tu      │ Lu Ma Mi Ju Vi Sá Do               │ 3 horas       │
│ próximo desafío     │        1  2  3  4  5               │               │
│                     │  6  7  8  9 10 11 12               │ Mañana       │
│ 30 min              │ 13 14 15 16 17 18 19               │ 09:00  09:30 │
│ Microsoft Teams     │ 20 21[22]23 24 25 26               │ 10:30  11:00 │
│ Tu horario · Lima   │ 27 28 29 30 31                     │               │
│                     │                                     │ [Continuar]  │
└─────────────────────┴─────────────────────────────────────┴───────────────┘
```

## Resolution rules

| Container fit | Recipe | Host behavior |
|---:|---|---|
| `<320 px` or collapsed | `launcher` | No inline calendar; activate a task surface |
| `320–559 px` | `guided` | One task plane; date strip plus full-month disclosure |
| `560–959 px` | `split` | Month and agenda together |
| `>=960 px` and sufficient height | `command` | Context, month and agenda together |

The host supplies `activation-mode` and an optional maximum recipe. The component resolves the actual recipe from its container with hysteresis. Width changes preserve date, slot, details, focus and command status and never emit funnel events by themselves.

## Action Hierarchy

- Primary: select a real slot, then continue/reserve.
- Secondary: navigate month, reveal full month or go back. La zona se detecta del dispositivo y se muestra de forma explícita.
- Safety: HubSpot fallback remains available before provider dispatch and is suppressed after ambiguous/provider-created-invalid outcomes.
- Closing a dialog before dispatch may retain the in-memory draft for the same activation session. After dispatch it must retain the controller and block duplicate booking.
- The CTA host never introduces a competing primary action inside the scheduler.

## Visual Fidelity Mapping

- The semantic month remains the defining calendar primitive; the guided strip is a navigation shortcut, never an abstract replacement.
- Calendar Command Center depth, selected-state signal, availability counts and time-of-day groupings carry across recipes without multiplying cards.
- Context compresses before the task controls do: operational facts become one line in `guided`, a header in `split` and a dedicated rail in `command`.
- Typography, ink/navy depth, teal selection and semantic warning/error colors use the public Efeonce tokens.
- Motion communicates activation, forward/back navigation, selection and server-confirmed resolution; resize is visually quiet.

## Copy Ledger

| Element | Visible copy intent | Canonical owner |
|---|---|---|
| Launcher | “Agenda una reunión” plus duration/platform expectation | `src/lib/copy/growth-meetings*` |
| Scene title | “Hablemos de tu próximo desafío” or approved contextual variant | growth-meetings copy |
| Operational facts | duration, Teams and timezone derived from safe config | renderer formatter + canonical nouns |
| Steps | “Horario”, “Tus datos”, “Confirmación” | growth-meetings copy |
| Month disclosure | “Ver mes” | growth-meetings copy |
| Primary CTA | continue/reserve according to state | growth-meetings copy |
| Fallback | “Usar agenda HubSpot” with honest context | growth-meetings copy |
| Error/success | generic recovery and confirmed receipt wording | growth-meetings copy; never host markup |

## State Copy

| State | Visible copy | Recovery behavior |
|---|---|---|
| ready | “Elige el horario que mejor te acomode.” | select a date/slot or reveal the full month |
| loading | “Sincronizando horarios disponibles…” | wait; after a bounded timeout expose retry and fallback |
| empty | “No hay horarios en esta ventana.” | navigate to the next bounded window or use fallback |
| partial | “Mostramos la disponibilidad más reciente; confirma para validar el horario.” | booking revalidates; fallback remains pre-dispatch |
| error | “La agenda no está respondiendo ahora.” | user-driven retry or safe fallback |
| denied | “No podemos abrir esta agenda desde aquí.” | safe HubSpot link without policy/provider detail |
| conflict | “Ese horario acaba de ocuparse. Elige otro.” | refresh and return focus to valid availability |
| pending | “Confirmando tu reunión…” | retain the intent; never submit a new key |
| success | “Tu reunión quedó agendada.” | show the server-confirmed summary and email/calendar expectation |

## Accessibility contract

- The launcher is a real button with a stable accessible name and visible focus.
- Dialog/full-screen activation moves focus to the scheduler heading, contains Tab, supports safe Escape and restores focus to the launcher.
- Calendar grid, date strip and slots expose equivalent names and selected states; color is never the only signal.
- Recipe changes preserve logical reading order and move focus only when the focused control no longer exists, to its semantic counterpart.
- Sticky mobile actions do not cover the focused field, error summary, consent or fallback.
- Targets are at least 44 px; no recipe introduces page-level horizontal scrolling.

## Motion contract

- Launcher activation establishes the new task surface; the CTA does not morph into a large inline block.
- Guided forward/back transitions may be directional because they communicate progress. Resize transitions are restrained and never imply a funnel step.
- Selection feedback is short and causal. Pending and confirmed states replace content only after reducer transitions.
- Reduced motion reaches the same state immediately or with a short opacity change.

## Implementation mapping

- Host/envelope: Growth CTA adapter or public page integration.
- Controller: one reducer/effects owner in `src/growth-meeting-renderer/**`.
- Views: `LauncherView`, `GuidedSchedulerView`, `SplitSchedulerView`, `CommandCenterView`.
- Shared pieces: `CalendarGrid`, `DateStrip`, `SlotAgenda`, `AppointmentSummary`, `BookingDetailsForm`, `RecoverySurface`.
- Browser attributes: `api-base`, `surface`, `placement`, `locale`, `timezone`, `activation-mode`, `max-recipe`, `fallback-url`.
- Telemetry dimensions proposed before GTM publish: `presentation_variant` and `activation_mode`. A fit change is not a step.
- Server-only: provider configuration, secrets, PII policy, idempotency, receipt and conversion authority.

## GVC Scenario Plan

- Quality profile: `premium`.
- Desktop evidence: 1440x1000 full-section `command` and desktop-dialog `split`.
- Mobile evidence: 390x844 CTA launcher → `full_screen` → `guided`.
- Recipe bounds: 319, 320, 559, 560, 959, 960 px container widths, plus representative production hosts.
- Viewports: 390x844 and 1440x1000, including dialog/full-screen activation and 200% zoom where practical.
- Assertions: no horizontal overflow; stable selection and form values across resize; focus enter/contain/return; reduced motion parity; exactly-once user-driven funnel events; no PII; no availability request from a passive launcher.
- Scroll-width evidence: every frame must satisfy `scrollWidth === clientWidth` for both page and task-surface scroll owners.
- Review dossier: `docs/ui/reviews/TASK-1510-native-meeting-scheduler-review.md`.
- Baseline decision: `.captures/2026-07-21T09-02-04_native-meeting-scheduler` remains current review evidence for `command` and compact styling, but is not promoted until human approval and does not yet validate the adaptive host contract.

## Design Decision Log

- Selected: one controller plus adaptive recipes and host-owned task surface.
- Rejected: Time Horizon; it did not read as a calendar.
- Rejected: a shrunken three-column calendar inside a narrow CTA.
- Rejected: inline CTA expansion after click because it causes layout shift and an unexpectedly large interaction.
- Rejected: independent compact/full components because booking, consent, recovery and measurement would drift.
