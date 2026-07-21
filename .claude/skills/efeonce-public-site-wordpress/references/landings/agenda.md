# Landing: Agenda `/agenda/`

## Identity

- URL: `https://efeoncepro.com/agenda/`
- WordPress `postId`: `251583`
- Status: `publish`, `noindex, follow`
- Owner: `TASK-1510` native meeting scheduler pilot.
- Runtime rail: WordPress/Kinsta; Elementor document saved through `Document::save()`.

## Published contract

- This is an isolated pilot, not a replacement for Contacto or any service landing.
- Use the normal Ohio page template. `elementor_canvas` makes Ohio's global runtime throw errors on this surface.
- The Elementor HTML widget is only a host adapter: it loads `growth-meetings/renderer-latest.js` and renders
  `<efeonce-meeting-scheduler surface="fhsf-efeonce-lead-gen-web" scheduler-key="discovery">`.
- Keep the direct `meetings.hubspot.com/efeoncepro/agenda-discovery` link visible as fallback.
- Keep page-specific root correction `body.page-id-251583 .elementor.elementor-251583` to prevent Canvas-era
  negative margins from creating horizontal overflow.
- Do not add the page to navigation or remove `noindex` without explicit product/SEO approval.

## Rollback and verification

- Elementor backups: `_gh_backup_before_agenda_pilot_overflow_v1` and `_gh_backup_before_agenda_pilot_template_v1`.
- Fast runtime rollback: scheduler flags OFF and binding `fhsf-efeonce-lead-gen-web`/`discovery` to `paused`; direct HubSpot
  fallback stays usable. Page rollback: restore the Elementor backup or unpublish page `251583`.
- Live evidence 2026-07-21: scheduler and real availability loaded; desktop and 390 px resolved `split|guided` with
  `overflow=0`, fallback present and no console errors. No booking, GTM publish or Contacto/RRSS promotion occurred.
