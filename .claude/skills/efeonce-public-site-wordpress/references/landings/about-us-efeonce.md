# Landing: About us / Nosotros

## Rediseño 2026-10-23 (vigente)

- URL `https://efeoncepro.com/about-us-efeonce/`, `page_id` `249770` (destino de «Nosotros» en el menú global). Body
  replaced in place 2026-10-23; slug, title SEO, canonical and featured image `249769` unchanged.
- Need: a visitor who wants to know who Efeonce is before talking. The page carries the declared Why
  (`docs/context/01_quienes-somos.md` §El Why: «No te entregamos crecimiento. Lo construimos contigo»), the four lines,
  the team (+89), five markets, Sky proof and testimonials, partners and the founder; conversion = `/agenda/`.
- Design: canvas «Nosotros — Efeonce» (`https://claude.ai/artifact/SPj7zAai7Q1ojyKpXogA5N`, La órbita), approved by the
  operator 2026-10-23. Images: `ai-generations/2026-10-22_nosotros-landing/` (hero long exposure, team in formation,
  markets, «un cerebro», founder). Sky figures only in «La prueba» (operator decision); testimonials are verbatim
  excerpts already public on `experiencia.efeoncepro.com`.
- Source and rail (shared source-led core): `scripts/public-website/nosotros-source/` (Main.dc.html without the drawn
  header/footer, assets.json, host.css, page-custom.css) → `compile-nosotros-elementor-source.cjs` →
  `build-nosotros-elementor-package.cjs <live baseline>` → `deploy-nosotros-elementor-package.php` (contract
  `nosotros-elementor-release.v1`) → `publish-nosotros-elementor-page.php` (`preview` | `replace` with
  `expectedDataSha`; restores `_thumbnail_id` after save) → `rollback-nosotros-elementor-page.php` `{ "snapshot": "…" }`.
  Gates: `verify-source-led-compilers.cjs` and `verify-source-led-render.php` include `nosotros`.
- Page tree: 11 containers, one `greenhouse_nosotros_*` widget each: hero · quees · marcas · porque · como (light) ·
  equipo · mercados · prueba (light, paper) · partners · founder · cierre. Repeaters: clientes (7), partners (8),
  equipo (5), cifras (4), testimonios (2). Logo rows compile one layout per logo (each keeps its approved height).
- `assets/js/nosotros-landing.js` only clones the client-logo set for the marquee loop (not in the editor nor with
  reduced motion). Links: meetings → `/agenda/` (no Growth CTA surface yet), careers →
  `https://greenhouse.efeoncepro.com/public/careers`, founder → `https://www.linkedin.com/in/cesargrowth/` (from
  Julio's own email signature).
- The site's floating global navigation overlays the hero: the hero copy top padding is `clamp(152px,12vw,184px)`.
- Live 2026-10-23: deploy backups on Kinsta `/tmp/eo-nosotros-widgets-before-20261023-135655.tar` and `-135848.tar`;
  replace snapshot `_gh_nosotros_v2_before_20261023_140005`; Elementor data hash `a7ca0770…`; 1440 and 390 px overflow 0,
  no broken images, no console errors. QA preview `252030` (`/nosotros-preview-20261023/`) left `private`.
- SEO 2026-10-23: meta description = «No te entregamos crecimiento: lo construimos contigo y te dejamos más capaz de
  sostenerlo. Estrategia, creatividad, medios, datos y tecnología.» (`configure-nosotros-seo.php`, snapshot option
  `_gh_nosotros_seo_before_20261023_141826`). OG and Twitter descriptions set to the same text
  (`configure-nosotros-social-seo.php`, snapshot option `_gh_nosotros_social_before_20261023_142121`).
- OG 2026-10-23: `nosotros-source/og/og.html` → `og-nosotros.png` (1200×630, hero photo + «Lo construimos contigo», no
  signature because the logo is in the photo) → `configure-nosotros-og.php`: new attachment `252037`, OG/Twitter image
  and title «Nosotros: lo construimos contigo | Efeonce»; featured image `249769` untouched; snapshot option
  `_gh_nosotros_og_before_20261023_144636` (previous OG image `250188`). Bottom dock: none.

- Fidelity pass 2026-10-23 (same computed-style diff as Partners, live vs canvas, animations frozen): Ohio leaked body
  `line-height:1.6`/`16.4px`/tracking, `ul:not(.-unlist) > li` margins, a 16px top margin on `.pgrid` and theme heading
  sizes, and the old host layer forced `border-box` (canvas = content-box, 2 px off on bordered buttons). Fixed in
  `nosotros-source/host.css`; after the deploy the diff has zero height differences at 1440 and only the inline-image
  baseline gap (7 px, same black on both sides) under the hero photo at 390.

- Theme rails 2026-10-23 (reported on «En cinco países» and the founder quote): from 1181px Ohio pins its Dark/Light
  switch (left) and «Follow Us» (right) at `1.5vw + 56px` from each edge; the canvas had no rails, so full-bleed copy and
  the `.wrap` below 1320px ran under them. `host.css` sets `--gh-rail: calc(1.5vw + 88px)` for `.wrap` (only while it is
  narrower than the rail), `.mk-copy` (widened by the same amount so the title keeps one line), founder and brain copy.
  The map image no longer has parallax: the city labels are fixed coordinates and the canvas animation (scale 1.16,
  ±7%) moved the image under them. The hero copy is anchored to the left rail instead of centered in 1320px: centered, it
  drifted onto the lit doorway and the passers-by on wide screens (the approved composition is the ~1280px one, text on
  the dark wall). Partners has the same rail collision between 1181 and 1320px (pending).

## Before 2026-10-23 (history; replaced)


## Identity

- URL: `https://efeoncepro.com/about-us-efeonce/`
- WordPress `page_id`: `249770`
- Status: publish
- Title: `About us (Boceto)`

## Hero

Root/container:

- Root: `6e46dcc`
- Video widget: `e18428a`
- Eyebrow/icon box: `6a1acc3`
- H1 heading: `3ab9072`
- Subhead text editor: `70afd83`
- Former primary CTA: `a452380` (removed 2026-07-03; video is the only hero action)
- Hero proof strip: `abproof`
- Previous hero counters: `831f50d`; first counter `10e73af` (replaced 2026-07-03)

Current approved hero copy, applied live 2026-07-03:

- Video label: `Ver cómo operamos`
- Eyebrow: `AGENCIA DE CRECIMIENTO INTEGRADA`
- H1:
  `El crecimiento real / no se compra por partes. / Se orquesta.`
- Subhead:
  `Creatividad, medios, CRM, data y tecnología trabajando como un solo sistema. Menos proveedores sueltos. Más visibilidad, continuidad y aprendizaje acumulado.`
- CTA: no Agenda CTA in hero. Keep `e18428a` (`Ver cómo operamos`) as the only hero action.
- Proof strip: AEO `LogoMarquee` + `BrandProofAvatarGroup` clone without the
  AEO title. Root `abproof`; marquee widget `abplogo`; meta pill `abpmeta`.
  Visible proof text: `+90` inside the avatar group plus
  `Chile · Colombia · México · Perú`.

Mutation guardrails:

- Use Elementor `Document::save()` for copy changes.
- Protect `_thumbnail_id=249769`, `page_header_title_background_type=featured`,
  and the hero background image settings.
- Latest rollback snapshot for this copy pass:
  `_gh_backup_before_about_hero_copy_20260703T042409Z`.
- Latest rollback snapshot for the proof-strip replacement:
  `_gh_backup_before_about_hero_proof_strip_20260703T043325Z`.
- Latest rollback snapshot for the Agenda CTA removal:
  `_gh_backup_before_about_hero_remove_agenda_cta_20260703T052019Z`.
- The proof strip uses the AEO public `greenhouse_logo_marquee` widget and
  `BrandProofAvatarGroup` markup. About adds the dark-context skin from
  `ohio-child/assets/css/global-fixes.css` under
  `body.page-id-249770 .elementor-element.elementor-element-abproof`; do not
  reuse the light AEO treatment blindly on the dark hero.

## Loop Marketing "Cómo trabajamos" Module

Section/container:

- Root: `59385ab`
- Left sticky/content column: `71bbc33` with sticky block `2fcd7e0`
- Right Loop Marketing visual column: `8f7bb85` with graphic wrapper `1349f4b`

Sticky behavior follows the shared Home/Ohio `-sticky-block` pattern documented
in `../landing-workflow.md`: keep sticky on the lane/column, avoid Elementor Pro
sticky effects for this module, and verify ancestor overflow before changing
layout.

This module reuses the same home/front-page `lp-container-offset-left` and
`lp-container-offset-right` pattern. The source offset rules in
`Landing Custom CSS.css` are scoped to `body.home` / `body.front-page`, so they
are inert on this page and the module can hug the viewport edge or create
horizontal overflow when reused inside the Ohio boxed page context.

Accepted fix:

- Keep the section full-bleed; do not box it to the full `.page-container`.
- Apply a restrained page-scoped gutter in `global-fixes.css` to
  `body.page-id-249770 .elementor-element.elementor-element-59385ab`.
  The left gutter is intentionally larger than the right gutter so the fixed
  Ohio color switcher remains visible without covering the headline.
- Contain the module's wide visual overflow at the module boundary, not with a
  global body/header/footer patch.

Verification:

- Desktop/laptop: the left content should no longer start at x~=20 or sit under
  the fixed color switcher; expected left gutter is
  `clamp(60px, 4.5vw, 80px)`.
- Mobile 390px: the module stacks and should preserve its existing mobile
  padding; the desktop gutter rule should not apply.
- Check `scrollWidth` vs `clientWidth`; if non-zero, identify whether the
  offender is this module or another off-screen Ohio/Elementor element.

## Technology Ecosystem "Ecosistema tecnológico" Module

Section/container:

- Root: `af43bed`
- Left tool-card lane: `eb5c55f`
- Right sticky content column: `88b901c` with sticky block `d93f52c`
- Example affected card: `9696990` (`HubSpot`)

The right explanation column is another consumer of the shared Home/Ohio
`-sticky-block` pattern; preserve the sticky column and solve overlap/gutters
around it rather than replacing the sticky mechanism.

This section has the same off-home full-bleed reuse issue, but the accepted fix
is narrower than the Loop Marketing module. The right sticky explanation is
already positioned correctly; the overlap is in the left tool-card lane, where
the fixed Ohio color switcher/search can cover card content on desktop.

Accepted fix:

- Keep the root section and right sticky explanation in place.
- Apply the desktop gutter only to
  `body.page-id-249770 .elementor-element.elementor-element-af43bed .elementor-element.elementor-element-eb5c55f`.
- Use `padding-left: clamp(60px, 4.5vw, 80px)` and `box-sizing: border-box`
  so the lane clears the fixed Ohio controls without changing the mobile stack.

Verification:

- Desktop/laptop: cards such as `HubSpot` should start to the right of the
  fixed Ohio switcher/search controls; right sticky copy should keep its
  original alignment.
- Mobile 390px: the desktop gutter rule should not apply.
