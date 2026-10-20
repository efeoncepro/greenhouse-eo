# Landing: Agenda `/agenda/`

## Identity

- URL: `https://efeoncepro.com/agenda/`
- WordPress `postId`: `251583`
- Status: `publish`, `noindex, follow` (rediseño 2026-10-20: see the last section; the pilot sections below are history)
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

## Rediseño 2026-10-20 (vigente)

- Need: the visitor already decided to talk; the page presents the meeting (30 min, Microsoft Teams, visitor's timezone),
  puts the real scheduler on the first screens and offers the written channel (`/contacto/`) as alternative.
- Design: canvas «Landing Agendar — Efeonce» (La órbita): voz «¿Por dónde empiezo? / Por aquí.» (punto tipeado: la órbita
  de retrato de Nexa ya lleva la esfera), Nexa en la pieza `portrait`, H2 cierran con esfera Growth, sin eslogan suelto,
  CTA en acento Growth (nunca `cta-growth` lima). The new voice pair is pending operator approval.
- Source and rail: `scripts/public-website/agenda-source/` (Main.dc.html without site chrome and without the drawn
  scheduler, assets.json, host.css, page.css, page-custom.css, scheduler-host.html) → `compile-agenda-elementor-source.cjs`
  → `build-agenda-elementor-package.cjs <live baseline>` → `deploy-agenda-elementor-package.php` (contract
  `agenda-elementor-release.v1`) → `publish-agenda-elementor-page.php` (guarded by `expectedDataSha`) →
  `rollback-agenda-elementor-page.php` `{ "snapshot": "_gh_agenda_v2_before_<UTC>" }`. Gates: `verify-source-led-compilers.cjs`
  and `verify-source-led-render.php` include `agenda`.
- Page tree: 5 containers — `greenhouse_agenda_hero` (dark) · HTML `#agenda` scheduler host (light) ·
  `greenhouse_agenda_como` · `greenhouse_agenda_preguntas` · `greenhouse_agenda_cierre` (dark). The scheduler frame
  overlaps the hero with a negative margin; its section needs `display:flow-root` or the margin collapses and the paper
  background rises with it (fixed live 2026-10-20).
- The scheduler host is the pilot's adapter, unchanged in behaviour (`placement="agenda_pilot"`, public renderer loader,
  no provider link); only its frame and `--gh-meeting-*` theme live in `agenda-source/page.css` guarded by `body:has(.gh-agenda)`.
- Nexa portrait: `ai-generations/2026-10-20_agenda-nexa-retrato/` (derived from the `/contacto/` canonical hero, lime
  light line removed with `ai:inpaint erase`); plugin asset `assets/img/agenda/nexa-retrato.webp`.
- Live 2026-10-20: deploy backups on Kinsta `/tmp/eo-agenda-widgets-before-20261020-163436.tar` and `-163607.tar`; page
  snapshot `_gh_agenda_v2_before_20261020_163500`; Elementor data hash `9084291e…`; 1440 and 375 px overflow 0, scheduler
  loaded with real availability, no console errors, no HubSpot links; no booking was created.
