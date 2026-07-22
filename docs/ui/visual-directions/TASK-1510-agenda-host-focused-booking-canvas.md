# TASK-1510 — Agenda host / Focused Booking Canvas

## Direction mode

- Mode: `repo-native-benchmark`.
- Surface: `https://efeoncepro.com/agenda/`, WordPress page `251583`.
- Scope: the Ohio/Elementor host around the existing native scheduler; the scheduler visual system remains authoritative.
- Job: let a high-intent visitor book a 30-minute Teams conversation without losing normal site navigation or a trustworthy corporate footer.

## Alternatives

1. **Focused Booking Canvas — selected.** A compact native Ohio header, one task-led introduction, the scheduler as the dominant canvas and the native corporate footer.
2. **Editorial Concierge — rejected.** Adds commercial narrative and proof before the scheduler, increasing time-to-action on a high-intent route.
3. **Fullscreen Scheduler — rejected.** Maximizes booking focus but removes useful Efeonce navigation and post-booking continuity.

## First-fold contract

- Keep the native Efeonce/Ohio header and its navigation.
- Collapse navigation before it can overlap the logo; mobile retains the accessible menu trigger.
- Render exactly one page H1: `Agenda una conversación`.
- Supporting copy: `Elige un horario en tu zona local. Recibirás la invitación de Microsoft Teams cuando confirmes.`
- The scheduler starts immediately after the introduction and owns the dominant visual moment.
- Remove the inherited blog sidebar, page headline and breadcrumbs from this page only.
- Keep the global Efeonce/Ohio footer exactly as shared by the rest of the site; the agenda host must not hide columns, alter its grid or restyle its responsive behavior.
- Do not add a prefooter or duplicate the header navigation below the scheduler.
- Hide page-local floating social/search/theme controls because they overlap the booking surface and do not provide required navigation.

## Responsive targets

- `1440×1000+`: content shell max-width `1200px`; scheduler may resolve to `command`; first scheduler controls begin within the first fold.
- `820×1000`: header uses its compact/mobile navigation state; scheduler receives the full content rail and resolves to `split` where its runtime threshold allows.
- `390×844`: `16px` page gutter, full-width `guided` scheduler, no clipped progress copy or floating-control overlap.

## Visual system mapping

- Reuse the native Ohio header and footer rather than creating parallel navigation primitives.
- Reuse the existing `<efeonce-meeting-scheduler>` and its `command|split|guided` recipes.
- The page host is a one-off composition constrained to `body.page-id-251583`.
- Blue/ink remains the dominant brand field; scheduler teal remains an action/state accent.
- No hero media, decorative card wall or new motion layer.

## Accessibility and motion

- One H1 followed by the scheduler's sequential H2/H3 structure.
- Preserve Ohio's skip link and make the page main target meaningful.
- Keep header navigation reachable before the scheduler without inserting blog/widget focusables.
- Available/selected states remain communicated by border, background, type and check, not color alone.
- Page-level transitions are suppressed under `prefers-reduced-motion: reduce`; booking meaning and focus order remain unchanged.

## Anti-patterns

- No `elementor_canvas`; it breaks Ohio runtime on this surface.
- No global header/footer/sidebar patches.
- No promotional prefooter or page-local footer variant.
- No duplicated page title or breadcrumb band.
- No blog categories, archives, Meta, comments or tag cloud.
- No visible HubSpot fallback.
