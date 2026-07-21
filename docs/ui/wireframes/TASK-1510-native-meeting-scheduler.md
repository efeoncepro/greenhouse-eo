# TASK-1510 — Native Meeting Scheduler Wireframe

## Product Design Source

- Visual direction mode: `repo-native-benchmark`
- Product Design asset: `docs/ui/visual-directions/TASK-1510-native-meeting-scheduler-direction.md`
- Selected direction: Time Horizon.
- Desktop target: 1440x1000.
- Mobile target: 390x844.

## Purpose

Turn real availability into a memorable, measurable scheduling experience that ends only on a server-confirmed HubSpot/Teams booking.

## Desktop Target

At 1440x1000, the conversion region reads as one immersive instrument with three coordinated planes. The horizon owns the widest area; the signal rail grounds purpose and the Meeting Pass carries persistent commitment. The first fold exposes real days/slots and one primary action without iframe scroll or nested-card wallpaper.

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ SIGNAL RAIL       │ TIME HORIZON                             │ MEETING PASS  │
│                   │  Santiago GMT-4   [timezone lens]        │               │
│ Hablemos de       │  ─────────────────────────────────────   │  MIÉ 22       │
│ tu próximo        │  Mar 21   Mié 22   Jue 23   Vie 24      │  09:30        │
│ desafío           │  ▂▅▇       ▇▅▃      ▃▆▅      ▅▇▂         │  30 min        │
│                   │                                          │  Teams         │
│ 30 min            │  09:00  09:30  10:30  11:00  15:00     │               │
│ Microsoft Teams   │             [selected slot]              │ [Continuar]   │
│                   │                                          │               │
│ Horario · Datos · Confirmación                              │ Agenda HubSpot│
└──────────────────────────────────────────────────────────────────────────────┘
```

The density bars are textual/visual summaries of returned availability, not fabricated estimates. On step 2 the slot field becomes required fields while horizon/pass remain. On success, the pass becomes the confirmation receipt.

## Mobile Target

At 390x844, the same hierarchy becomes a single focus flow rather than compressed desktop. Narrative facts collapse into one line, the horizon is a bounded tactile control, and the Meeting Pass becomes component-scoped sticky context above the CTA. The document width never exceeds the viewport.

### Wireframe

```text
┌──────────────────────────────────┐
│ Hablemos de tu próximo desafío   │
│ 30 min · Teams · Santiago GMT-4  │
│ Horario — Datos — Confirmación   │
│                                  │
│ TIME HORIZON                 [>] │
│ [21 ▂▅] [22 ▇▅] [23 ▃▆] [24 ▅▇] │
│                                  │
│ [09:00] [09:30]                  │
│ [10:30] [11:00]                  │
│ [15:00] [16:00]                  │
│                                  │
│ ┌ MEETING PASS ────────────────┐ │
│ │ MIÉ 22 · 09:30 · 30 min     │ │
│ │ Santiago · Teams             │ │
│ └──────────────────────────────┘ │
│ [Continuar]                     │
│ Usar agenda HubSpot             │
└──────────────────────────────────┘
```

## Action Hierarchy

- Primary: choose slot, then continue/reserve.
- Secondary: timezone/window/retry.
- Safety: HubSpot fallback reachable before provider dispatch; suppressed after an ambiguous/invalid-created outcome to prevent duplicates.
- No competing host CTA inside the scene.

## Visual Fidelity Mapping

- The Time Horizon uses returned availability density as data-led emphasis; no invented heatmap or decorative graph.
- Large time numerals use Efeonce public typography tokens and remain readable under zoom/long locale strings.
- Navy/ink establishes scene depth, teal marks selection/primary action, and semantic tokens own warning/error/degraded states.
- Meeting Pass is one elevated plane, not another card stack; field step uses a quiet neutral work plane.
- Calendar/clock/globe/Teams icons come from the governed icon set. Motion follows the dedicated contract and shared public tokens.

## Copy Ledger

| Element | Visible copy intent | Canonical owner |
|---|---|---|
| Scene title | “Hablemos de tu próximo desafío” or approved service-context variant | `src/lib/copy/growth-meetings*` |
| Operational facts | duration, Teams and timezone labels derived from config | renderer formatter + canonical nouns |
| Steps | “Horario”, “Tus datos”, “Confirmación” | growth-meetings copy |
| Primary CTA | continue/reserve according to state | growth-meetings copy |
| Fallback | “Usar agenda HubSpot” with honest context | growth-meetings copy |
| Error/success | generic recovery and confirmed receipt wording | growth-meetings copy; never host JSX |

## State Copy

| State | Visible copy | Recovery behavior |
|---|---|---|
| ready | “Elige el horario que mejor te acomode.” | select day/slot or change timezone |
| loading | “Sincronizando horarios disponibles…” | wait; after bounded timeout expose retry and fallback |
| empty | “No hay horarios en esta ventana.” | move to next bounded window or use fallback |
| partial | “Mostramos la disponibilidad más reciente; confirma para validar el horario.” | booking command revalidates; fallback remains available |
| error | “La agenda no está respondiendo ahora.” | retry by user action or use fallback |
| denied | “No podemos abrir esta agenda desde aquí.” | show safe HubSpot link; expose no policy/provider detail |
| conflict | “Ese horario acaba de ocuparse. Elige otro.” | refresh horizon and focus first available slot |
| pending | “Confirmando tu reunión…” | keep stable intent; never auto-submit a new key |
| success | “Tu reunión quedó agendada.” | show confirmed Meeting Pass and calendar/Teams expectation |

## State and Copy Inventory

- Loading: “Sincronizando horarios disponibles…” with honest horizon skeleton.
- Empty: “No hay horarios en esta ventana.” with next window/fallback.
- Degraded: “La agenda no está respondiendo ahora.” with retry/fallback.
- Conflict: “Ese horario acaba de ocuparse. Elige otro.”; pass shifts to warning.
- Validation: summary + field messages; pass remains.
- Pending: “Confirmando tu reunión…”; pass becomes processing.
- Success: “Tu reunión quedó agendada.”; confirmed pass + calendar/Teams/email expectation.
- Offline/no Teams after dispatch: never success; check-email/reconciliation state with no immediate second booking.

## Accessibility Contract

- Horizon summaries supplement, never replace, semantic day/slot buttons.
- Selected/availability states use text/icon/border/shape, not color alone.
- Headings/focus announce steps; error summary focuses first invalid field.
- Status uses live regions; exact timezone is always spoken/readable.
- Targets >=44px; bounded horizontal horizon does not create page overflow.

## Implementation Mapping

- Bundle: `src/growth-meeting-renderer/**`.
- Host: `<efeonce-meeting-scheduler appearance="horizon">`.
- Contracts: TASK-1509 config/availability/book only.
- Pieces: scene, signal rail, timezone lens, horizon, slots, step rail, fields, Meeting Pass, recovery/fallback.
- Copy: `src/lib/copy/growth-meetings*` or nearest canonical growth dictionary.
- Attributes: `api-base`, `surface`, `placement`, `locale`, `timezone`, `appearance`, `fallback-url`.
- Telemetry: reducer actions emit `gh_meeting_step_reached`; the first receipt transition emits `gh_meeting_booking_confirmed` once. No exact slot/PII/receipt/correlation in payload.
- Server-only: provider slug/credentials, PII policy, idempotency, attribution authority and receipts.

## GVC Scenario Plan

- Scenario: `scripts/frontend/scenarios/native-meeting-scheduler.scenario.ts`.
- Deterministic local route + approved staging host.
- Viewports: 1440x1000 and 390x844.
- Desktop evidence: full first fold and every critical state at 1440 px width.
- Quality profile: `premium`.
- `qualityProfile: 'premium'`, keyboard probes and `reducedMotionCheck: true`.
- Captures: cinematic first fold, horizon selection, Meeting Pass, validation, pending, confirmed, conflict, degraded/fallback and compact transform.
- Review dossier: `docs/ui/reviews/TASK-1510-native-meeting-scheduler-review.md`.
- Baseline decision: official HubSpot embed on the chosen pilot surface is the functional/CRO baseline; Time Horizon direction is the visual fidelity baseline.
- Assert one primary action, focus destinations, 44px targets, `scrollWidth === clientWidth`, expected dataLayer event exactly once, no PII and correct `/g/collect` mapping.

## Design Decision Log

- Time Horizon selected over Calendar Console and Conversational Orbit.
- New portable adapter selected; no CompositionShell/private primitive/page-local form.
- Measurement boundaries align with reducer states; no DOM-derived telemetry.
- Meeting Pass provides shared visual and measurement authority from selection to confirmed receipt.
- Embed/link remains a safety action throughout pilot and degradation.
