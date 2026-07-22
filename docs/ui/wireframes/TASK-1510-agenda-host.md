# TASK-1510 — Agenda host

## Product contract

- Visual direction: `docs/ui/visual-directions/TASK-1510-agenda-host-focused-booking-canvas.md`.
- Dominant decision: choose an available date and time.
- Primary action: continue with the selected time, then reserve the meeting.
- Navigation: native Efeonce header before booking; native corporate footer and confirmation actions after booking.

## Reading order

1. Skip link and native header navigation.
2. Eyebrow: `Efeonce · conversación inicial`.
3. H1: `Agenda una conversación`.
4. Support: `Elige un horario en tu zona local. Recibirás la invitación de Microsoft Teams cuando confirmes.`
5. Native scheduler: date → time → details → confirmation.
6. Native Efeonce corporate footer.

## Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Native Efeonce header + responsive navigation               │
├──────────────────────────────────────────────────────────────┤
│ EFEONCE · CONVERSACIÓN INICIAL                              │
│ Agenda una conversación                                     │
│ Elige un horario…                                           │
│                                                              │
│ ┌──────────────── Native scheduler ────────────────────────┐ │
│ │ meeting context · progress                              │ │
│ │ date → daily agenda → details → confirmation            │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ Shared global Efeonce/Ohio footer                           │
└──────────────────────────────────────────────────────────────┘
```

## Host states

| State | Host behavior |
| --- | --- |
| Loading | Preserve scheduler geometry; renderer owns its structured loading state. |
| Ready | Scheduler is the only dominant contained surface. |
| Empty availability | Keep month navigation and native `Reintentar`; no external provider link. |
| Error | Native scheduler explains cause/recovery inside the same rail. |
| Confirmed | Receipt remains in the page flow; header and footer provide safe onward navigation. |

## Verification

- Exact viewports: `1440×1000`, `820×1000`, `390×844`.
- Exactly one H1; no sidebar or breadcrumbs.
- Native header and footer remain present.
- Footer is the shared global footer without agenda-specific overrides; no prefooter.
- Header logo/navigation do not overlap at 820 px.
- Scheduler `scrollWidth === clientWidth`; page stable `scrollWidth === clientWidth`.
- Keyboard path reaches scheduler without blog/widget detours.
- Reduced motion removes non-essential host transitions.
- Zero visible links to `meetings.hubspot.com`.
