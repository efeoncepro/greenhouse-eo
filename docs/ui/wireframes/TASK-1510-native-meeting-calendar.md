# TASK-1510 / Public scheduler — Native Meeting Calendar

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1510`
- Product Design asset: `docs/ui/visual-directions/TASK-1510-native-meeting-calendar-direction.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: Efeonce WordPress, Astro and Greenhouse preview
- Copy source: `src/lib/copy/growth-meetings.ts`
- Primitive decision: `extend MeetingRenderer`
- UI ready target: `yes`

## Brief

- Primary user: prospective Efeonce client
- User moment: choosing a credible time to start a commercial conversation
- Job to be done: book one available 30-minute Teams meeting without leaving the Efeonce experience
- Primary decision signal: month calendar + available times for the selected date
- Non-goals: calendar management, rescheduling UI, CRM editing, provider configuration

## Desktop Target — 1440×1000

Three regions inside one composed surface. The context rail is narrow. The monthly calendar is the dominant region.
The daily agenda is the action region and contains the selected appointment summary. The month, weekday headers and
full grid appear above the fold. No independent floating summary competes with the calendar.

## Mobile Target — 390×844

Context compresses into a short header; progress remains visible. The full 7-column month fits without horizontal
page scroll. The daily agenda follows the month in document order. The appointment summary remains in flow and never
overlays slots or form fields. Form fields use one column and 48 px controls.

## Action Hierarchy

- Primary: `Continuar con {hora}` / `Reservar horario`
- Secondary: `Volver al calendario`
- Destructive: none
- Selection vs action: selecting a date or time never books; submit is the only mutation
- Pending / disabled: submit disables only after valid submission begins; date CTA explains the missing selection

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Context rail | Explain meeting, duration, channel and progress | `MeetingRenderer.renderSignalRail` | config + copy |
| 1 | Month calendar | Choose a real available date in month context | semantic table in `renderCalendar` | availability days |
| 2 | Daily agenda | Choose time and review selected appointment | `renderAgenda` | selected date/slot |
| 3 | Details | Collect required contact and consent data | native form | config fields/consent |
| 4 | Confirmation | Confirm calendar invite and safe next step | status surface | booking receipt DTO |

## Visual Fidelity Mapping

| Reference pattern | Greenhouse implementation | Preserved value | Explicitly not copied |
|---|---|---|---|
| Calendly / Cal.com month grid | Semantic table + `--gh-meeting-paper` / `--gh-meeting-line` | Immediate calendar recognition | Vendor blue/black styling |
| Selected date + daily times | `aria-pressed` buttons + ink/accent tokens | Direct date-to-slot relationship | Provider component markup |
| Event context rail | Scoped context region + public ink tokens | Trust, duration, Teams and progress | Profile-card clone |
| Google / HubSpot booking form | Native labeled form + reducer validation | Familiar autofill and recovery | Provider SDK/form embed |
| Compact booking summary | Inline `meeting-summary` region | Preserves chosen intent across steps | Sticky overlay or decorative ticket |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.meeting.calendar.title` | calendar | Elige una fecha | month/year | task-led |
| `growth.meeting.calendar.available` | day | Disponible | date | non-color state cue |
| `growth.meeting.agenda.title` | agenda | Horarios del {date} | formatted date | binds slots to date |
| `growth.meeting.agenda.select` | agenda | Elige una hora | none | empty selection instruction |
| `growth.meeting.action.choose` | agenda | Continuar con {time} | time | selection, not mutation |
| `growth.meeting.action.book` | details | Reservar horario | none | sole mutation |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Elige una fecha | Los días disponibles se pueden seleccionar. | date button | no realtime guarantee |
| loading | Consultando disponibilidad | Estamos sincronizando la agenda. | none | structured skeleton |
| empty | No hay horarios disponibles en {mes}. | La grilla y el mes solicitado permanecen visibles; prueba otro mes o abre la agenda alternativa. | Mes anterior/siguiente disponible + fallback | honest; never collapses calendar context |
| partial | Disponibilidad limitada | Solo mostramos los horarios confirmados por el proveedor. | choose / fallback | explicit |
| error | No pudimos actualizar la agenda | Conservamos una vía segura para reservar. | Reintentar / HubSpot | recovery |
| denied | Esta agenda no está disponible aquí | Puedes continuar desde nuestra agenda alternativa. | Abrir agenda alternativa | no permission detail leak |
| success | Tu reunión está confirmada | Enviaremos la invitación con el enlace de Microsoft Teams al correo de trabajo. | none | no provider IDs |

## Accessibility Contract

- Heading order: renderer h2; calendar/form/confirmation h3.
- Calendar: semantic table, caption, `th scope=col`, buttons only on available days.
- Aria labels: full date on each available day; month navigation names month destination.
- Empty months: retain the semantic month grid, expose `meeting-calendar-empty` and announce the month-specific status.
- Focus notes: state changes focus the new h3; selected date remains `aria-pressed`; submit errors focus summary.
- Color-independent states: available label/dot and selected shape plus `aria-pressed`.

## Implementation Mapping

- Route / surface: `/design-system/native-meeting-scheduler`; public custom element
- Primitives: portable `MeetingRenderer`, native form controls, ElementInternals host
- Copy source: `src/lib/copy/growth-meetings.ts`
- Data reader / command: public growth meetings config/availability/book routes
- API parity: provider-neutral adapter; HubSpot remains SoT
- Runtime consumers: WordPress, Astro, internal preview
- GVC markers: `native-meeting-scheduler-*`, `data-ghm-state`

## GVC Scenario Plan

- Quality profile: premium
- Baseline decision: official HubSpot embed on the pilot surface is the functional/CRO baseline; accepted monthly-calendar captures become the local visual baseline after human approval. The rejected Time Horizon capture remains a negative comparison only.
- Route: internal preview and deterministic public harness
- Viewports: 1440×1000 and 390×844
- Required captures: calendar ready, time selected, details, confirmed, ambiguous, conflict
- Assertions: no PII/receipt in dataLayer; one confirmation event; no direct fallback in ambiguous
- Scroll-width checks: page and scheduler `scrollWidth === clientWidth`
- Accessibility/focus checks: keyboard selection, visible focus, reduced motion
- Review dossier: required

## Design Decision Log

- Decision: full monthly calendar + selected-day agenda.
- Alternatives considered: week strip/density bars; grouped agenda cards.
- Why this pattern: immediate calendar recognition and proven booking mental model.
- Reuse / extend / new primitive: extend current renderer.
- Sparse availability and month pagination use an explicit month-anchored empty state; they never remove the grid.

## Acceptance Checklist

- [x] All visible strings are assigned to the copy source/ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies realtime beyond provider response.
- [x] State and aria copy is ready for implementation.
- [x] GVC scenario plan names viewports, captures, markers and assertions.
