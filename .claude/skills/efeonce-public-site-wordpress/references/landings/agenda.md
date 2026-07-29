# Landing: Agenda `/agenda/`

## Identity

- URL: `https://efeoncepro.com/agenda/`
- WordPress `postId`: `251583`
- Status: `publish`, `noindex, follow`
- Owner: `TASK-1510` native meeting scheduler pilot.
- Runtime rail: WordPress/Kinsta; Elementor document saved through `Document::save()`.
- Renderer rail: `https://efeonce-public-renderers.vercel.app/loader.js` resolves the immutable stable release independently of Greenhouse application deploys. The scheduler `base-url` remains `https://greenhouse.efeoncepro.com` for API calls.

## Published contract

- This is an isolated pilot, not a replacement for Contacto or any service landing.
- Use the normal Ohio page template. `elementor_canvas` makes Ohio's global runtime throw errors on this surface.
- The Elementor HTML widget is only a host adapter: it loads `growth-meetings/renderer-latest.js` and renders
  `<efeonce-meeting-scheduler surface="fhsf-efeonce-lead-gen-web" scheduler-key="discovery">`.
- Do not expose `meetings.hubspot.com` links. HubSpot is the server-side scheduling provider; recovery stays native through month navigation and `Reintentar`.
- Keep page-specific root correction `body.page-id-251583 .elementor.elementor-251583` to prevent Canvas-era
  negative margins from creating horizontal overflow.
- The host is a focused booking canvas: one H1, no inherited page headline/breadcrumb/sidebar and native header navigation. Its footer is the unmodified global Efeonce/Ohio footer used across the site; do not add agenda-specific footer CSS or restore the rejected prefooter.
- Do not add the page to navigation or remove `noindex` without explicit product/SEO approval.

## Rollback and verification

- Elementor backups: `_gh_backup_before_agenda_pilot_overflow_v1`, `_gh_backup_before_agenda_pilot_template_v1`, `_gh_backup_before_agenda_focused_canvas_20260721T230411Z` and `_gh_backup_before_agenda_global_footer_restore_20260721T234352Z`.
- Artifact-lane migration backup: `_gh_backup_before_agenda_public_renderer_20260722T075004Z`.
- Hero kicker copy update 2026-07-23: the HTML host now says `Reunión de 30 minutos` instead of the redundant
  `Efeonce · conversación inicial`. Elementor backup:
  `_gh_backup_before_agenda_kicker_copy_20260723T103650Z`; post-save Elementor data SHA-256
  `40d07267a232dcb370ca4f805fdfbe8826e256e1fdd56dd85114c679c7ce0b99`.
- Fast runtime rollback: scheduler flags OFF and binding `fhsf-efeonce-lead-gen-web`/`discovery` to `paused`; page rollback restores the Elementor backup or unpublishes page `251583`.
- Live evidence 2026-07-21: scheduler and real availability loaded; desktop and 390 px resolved `split|guided` with
  `overflow=0` and no console errors. Native-only host mutation removed both direct HubSpot links with backup
  `_gh_backup_before_agenda_native_only_20260721T170615Z`; no booking, GTM publish or Contacto/RRSS promotion occurred.
- Focused-host evidence 2026-07-21: `1440×1000`, `820×1000` and `390×844` passed with exact page overflow `0`, recipes `command|split|guided`, keyboard menu open/Escape close, reduced-motion parity and zero console/page errors. Final capture after restoring the shared global footer: `.captures/2026-07-21T23-44-01-104Z_agenda-focused-booking-canvas`. The guarded mutation removed exactly 35 agenda-specific footer rules. Final Elementor/host hashes: `8aefa810aa214c5cc623a250596d89b91bcf265b988cf87021c91cb0ef99aa2a` / `c76ee1fe71777c8cb22a9ab9d64edcfaf948a2cb1cefce9384bd2a4c75e76077`.
