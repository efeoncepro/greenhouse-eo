# Landing: About us

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
