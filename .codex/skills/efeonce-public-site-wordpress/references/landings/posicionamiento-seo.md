# Landing: Posicionamiento SEO `/servicios/posicionamiento-seo/`

## Identity

- URL: `https://efeoncepro.com/servicios/posicionamiento-seo/`
- WordPress `postId`: `251078`
- Parent page: `/servicios/`, `postId=251077`
- Title: `Posicionamiento SEO`
- Status: `publish`
- Owning task: `TASK-1343`
- Runtime rail: WordPress/Kinsta, Elementor document saved with `Document::save()`.
- Source design: approved Claude Design artifact at `/Users/jreye/Documents/seo/SEO - Landing/Landing SEO.dc.html`.

## Published Contract

- The landing uses the approved Claude Design implementation, not the older task blueprint.
- Preserve the keyword marquee immediately after the hero as `[data-capture="keyword-marquee"].gh-seo-keyword-marquee`; it is a non-section block in the source design and must be carried explicitly when rebuilding from sections.
- Preserve scroll reveal motion: `.rv` elements below the initial viewport must remain hidden until their section intersects; do not add a global reveal-all timeout that kills scroll motion. Reduced-motion should reveal static content and disable marquee animation.
- Do not publish a custom footer inside `.gh-seo-landing`; the page uses the native Ohio footer `#colophon` after the final CTA.
- Display title tracking follows the approved AEO/desarrollo pattern and must be preserved: H1/H2 display titles and the large module H3 titles in `Qué incluye` (`h3[style*="font-size:1.95rem"]`) compute `letter-spacing:-0.045em`, and nested accent spans inside H1/H2 inherit the parent tracking. Do not add span-level `letter-spacing:normal` to title accents such as `IA no te ignore` or `exige`; do not apply this compact display tracking to body, chips, labels, small cards, or proof text.
- The hero `Indexado` floating badge uses the local Greenhouse Google SVG asset (`public/images/greenhouse/SVG/icon-google.svg`) inlined as `.gh-google-logo-mark`; do not replace it with monochrome `ti-brand-google`.
- The E-E-A-T weight panel uses real local brand assets, not generic Tabler glyphs: `.gh-google-dark-mark` wraps the local multicolor Google SVG (`public/images/greenhouse/SVG/icon-google.svg`) on a dark-compatible support, and `.gh-chatgpt-mark` wraps the local GPT isotype (`public/images/logos/axis/gpt-isotype.svg`). Do not replace these with `simple-icons`, `ti-brand-google`, or `ti-sparkles`.
- Named answer-engine/brand markers use real local SVG assets: `.gh-ai-engine-chip-*`, `.gh-ai-citation-*`, `.gh-bridge-google-white-mark`, and `.gh-bridge-chatgpt-mark`. Google uses the local Google SVG (multicolor, or all-white only in the dark bridge), ChatGPT uses the local GPT isotype, and Perplexity uses the local Perplexity isotype (`public/images/logos/axis/perplexity-icon.svg`). Do not use `ti-brand-openai`, `ti-brand-google`, or `ti-sparkles` where a named engine/brand is visible.
- In the comparison card (`[data-capture="comparativa"]`), the right-card header uses the local full Efeonce logo SVG (`public/branding/logo-full.svg`) inline as `.gh-comparison-efeonce-logo`, followed by visible text `· método medible`. Do not reintroduce the plant icon or the visible text `Efeonce · método medible`.
- In the Greenhouse dashboard section, the platform pill uses the local blue Greenhouse logotype (`public/images/greenhouse/SVG/greenhouse-blue.svg`) as `.gh-greenhouse-logotype-pill`, and the dashboard browser chrome uses the local white Greenhouse isotype (`public/images/greenhouse/SVG/negative-isotipo.svg`) as `.gh-greenhouse-isotype-badge`. Do not reintroduce `ti-plant-2` or plain-text-only Greenhouse branding in those marked positions.
- Primary CTA points to `https://think.efeoncepro.com/brand-visibility?utm_source=efeoncepro&utm_medium=landing&utm_campaign=posicionamiento-seo`.
- AEO bridge points to `/aeo-2/` until the sibling `/servicios/aeo` and redirect are governed separately.
- The page does not embed a live Growth Form yet; it links to the existing Think grader node.
- Yoast title/canonical/meta description and JSON-LD `Organization`, `Service`, `BreadcrumbList`, and `FAQPage` are published.

## Header Contract

- Header must remain the native Ohio masthead, not a custom HTML header inside the landing.
- Required live shape:
  - `_wp_page_template=default`
  - Elementor `page_layout=default`
  - body has `page-template-default`, `with-header-3`, no `elementor-template-canvas`
  - `#masthead.header-3` exists and is `position:absolute`
  - no `.gh-seo-landing > header`, `#mmenu`, or `#readbar`
  - `page_header_logo_style=inherit`
  - `page_header_menu_style=inherit`
  - `page_header_menu_style_settings=inherit`
  - no `page_header_menu_text_typo` override
  - `page_header_add_cap=0`
  - `page_header_title_visibility=0`
  - `page_breadcrumbs_visibility=0`
  - `page_add_top_padding=0`
  - `page_add_wrapper=0`
  - `page_header_search_visibility=1`
  - `page_header_search_position=standard`
- Because the SEO hero is light, do not force `light_variant`, `light-typo`, `clb__dark_section`, or a dark hero just to match AEO/desarrollo visually. Ohio's light-background variant should render the blue logo and dark navigation.
- Use page-scoped spacing on `.gh-seo-hero-native-header` only to keep the native absolute masthead from overlapping hero content.
- Full-bleed wrapper guard: keep `page_full_width_margins_size=0px` and the page-scoped `.gh-task-1343-seo-landing-shell` selector that neutralizes Ohio/Elementor's default `.e-con-full.e-parent` stretch rule. Verified contract: `.page-container`, `.elementor-251078`, `.gh-task-1343-seo-landing-shell`, `.gh-seo-landing`, hero, and `#eeat` all compute `left=0` on desktop and mobile.

## Ohio Widgets And Icons

- Do not hide Ohio side widgets (`.elements-bar`, `.color-switcher`, `.social-bar`).
- Keep Tabler icon font scoped so `.gh-seo-landing .ti` and `.gh-seo-landing .ti::before` use `font-family:"tabler-icons"`.
- Mobile fixed CTA must leave visual room for the Ohio color switcher instead of hiding or lowering the widget.

## Rollback

- Latest backup before extending the title tracking correction to the large `Qué incluye` H3 module titles: `_gh_backup_before_task1343_seo_landing_20260706T224418Z`.
- Earlier backup before the H1/H2-only title tracking correction: `_gh_backup_before_task1343_seo_landing_20260706T223104Z`.
- Latest backup before the global brand-logo audit (engine chips, dashboard citations, bridge Google/ChatGPT, Greenhouse logotype/isotype): `_gh_backup_before_task1343_seo_landing_20260706T221930Z`.
- Earlier brand-logo backups include `_gh_backup_before_task1343_seo_landing_20260706T221051Z` (Greenhouse platform/dashboard), `_gh_backup_before_task1343_seo_landing_20260706T221352Z` (dashboard AI citations), and `_gh_backup_before_task1343_seo_landing_20260706T221602Z` (SEO/AEO bridge).
- Latest backup before replacing the comparison card plant icon + typed `Efeonce` with the local Efeonce logo: `_gh_backup_before_task1343_seo_landing_20260706T220359Z`.
- Earlier backup before SVG sanitization for the same comparison logo pass: `_gh_backup_before_task1343_seo_landing_20260706T220229Z`.
- Latest backup before replacing E-E-A-T panel glyphs with local Google/GPT assets: `_gh_backup_before_task1343_seo_landing_20260706T215458Z`.
- Earlier backup before the temporary generic-icon E-E-A-T attempt: `_gh_backup_before_task1343_seo_landing_20260706T215019Z`.
- Latest backup before replacing the `Indexado` badge icon with inline Google SVG: `_gh_backup_before_task1343_seo_landing_20260706T214633Z`.
- Latest backup before removing the custom in-landing footer: `_gh_backup_before_task1343_seo_landing_20260706T214316Z`.
- Latest backup before marquee + scroll-motion parity patch: `_gh_backup_before_task1343_seo_landing_20260706T213858Z`.
- Latest backup before gutter/full-bleed polish: `_gh_backup_before_task1343_seo_landing_20260706T212903Z`.
- Earlier native-header polish backup: `_gh_backup_before_task1343_seo_landing_20260706T212034Z`.
- Earlier publish backups include `_gh_backup_before_task1343_seo_landing_20260706T210238Z`, `_gh_backup_before_task1343_seo_landing_20260706T211508Z`, `_gh_backup_before_task1343_seo_landing_20260706T211805Z`, and `_gh_backup_before_task1343_seo_landing_20260706T211926Z`.
- After rollback or mutation, purge Kinsta cache and verify desktop/mobile.

## Verification

- Latest heading letter-spacing audit: `.captures/task1343-seo-letter-spacing-audit-2026-07-06T22-45-55-689Z/`.
- Latest global brand-logo audit: `.captures/task1343-seo-brand-logo-audit-2026-07-06T22-22-03-192Z/`.
- Latest bridge Google/ChatGPT verification: `.captures/task1343-seo-bridge-ai-icons-2026-07-06T22-16-47-922Z/`.
- Latest comparison card Efeonce logo verification: `.captures/task1343-seo-comparison-efeonce-logo-final-2026-07-06T22-04-31-801Z/`.
- Latest E-E-A-T Google/GPT asset verification: `.captures/task1343-seo-eeat-google-chatgpt-assets-2026-07-06T21-56-52-259Z/`.
- Latest Google badge SVG verification: `.captures/task1343-seo-google-logo-badge-2026-07-06T21-47-03-175Z/`.
- Latest custom-footer removal verification: `.captures/task1343-seo-remove-custom-footer-2026-07-06T21-43-47-560Z/`.
- Latest marquee + scroll-motion verification: `.captures/task1343-seo-marquee-motion-2026-07-06T21-39-37-247Z/`.
- Latest gutter/full-bleed verification: `.captures/task1343-seo-gutter-fix-final-2026-07-06T21-29-30-989Z/`.
- Latest native header verification: `.captures/task1343-seo-native-header-2026-07-06T21-20-50-110Z/`.
- Playwright checks:
  - HTTP `200`
  - `templateDefault=true`
  - `templateCanvas=false`
  - `hasMasthead=true`
  - `mastheadLogoSrc` ends in `main-blue-logo.svg`
  - `hasCustomSeoHeader=false`
  - `heroHasDarkClass=false`
  - desktop `scrollWidth=clientWidth=1440`
  - mobile `scrollWidth=clientWidth=390`
  - `themeWidgetsVisible=true`
  - `invalidIcons=[]`
- Marquee/motion checks:
  - `[data-capture="keyword-marquee"]` exists and contains the duplicated keyword set.
  - `.marquee-track` has animation `marquee 34s linear infinite` and computed transform changes over time.
  - before scrolling, the next-section `.rv` is hidden (`opacity=0`, translated); after scroll it gets `.in` and resolves to opacity ~1.
  - a later section remains hidden until its own intersection.
  - reduced-motion disables the marquee animation and reveals static content.
- Heading tracking checks:
  - Desktop and mobile audit all `17` display-title nodes under `.gh-seo-landing`: all H1/H2 plus the three large `Qué incluye` module H3s.
  - H1/H2 and the large H3 module titles compute `letter-spacing:-0.045em`, matching the AEO/desarrollo display-title precedent.
  - The `Qué incluye` H3s `Contenido que rankea por temas, no por suerte`, `Landings que rankean y convierten`, and `Autoridad real, con enlaces que sí cuentan` compute `-1.404px` at `31.2px` (`-0.045em`).
  - Nested accent spans inherit parent tracking: `.grad-text` in the hero and the green `exige` span in E-E-A-T both report `inheritsHeadingTracking=true`.
  - The focal `El SEO no termina en tráfico. Termina en negocio.` H2 computes `-1.944px` at `43.2px` (`-0.045em`).
  - Desktop and mobile compute `scrollWidth==clientWidth`; measure overflow before Playwright `fullPage` screenshots because animated marquees can produce a screenshot-only false positive.
  - `failures=[]` for `heading_tracking_drift` and `span_tracking_drift`.
- Footer checks:
  - `.gh-seo-landing footer` does not exist.
  - duplicate text `© 2026 Efeonce · posicionamiento SEO` is absent.
  - native footer `#colophon` exists as the only `footer`.
- Google badge checks:
  - `.gh-google-logo-mark svg` exists inside the `Indexado` floating badge.
  - SVG paths include Google colors `#4285F4`, `#34A853`, `#FBBC05`, and `#EB4335`.
  - `.floaty .ti-brand-google` count is `0`.
- E-E-A-T brand asset checks:
  - `.gh-google-dark-mark svg` exists in `En SEO clásico`, uses viewBox `0 0 256 262`, and includes Google fills `#4285F4`, `#34A853`, `#FBBC05`, and `#EB4335`.
  - `.gh-chatgpt-mark svg` exists in `En AEO / IA` and uses the local GPT isotype viewBox `0 0 45.9894 47.0006`.
  - The old E-E-A-T row glyphs are absent: `seoOldGoogleIcon=false`, `aeoOldSparkleIcon=false`, and the temporary simple-icons Google path is not present.
- Global brand-logo audit checks:
  - `i.ti-brand-google=0` and `i.ti-brand-openai=0` inside `.gh-seo-landing`.
  - Named brand wrappers have the expected real SVGs: hero Google, E-E-A-T Google/GPT, AI engine chips ChatGPT/Perplexity/Google, dashboard citation rows ChatGPT/Perplexity/Google, SEO/AEO bridge Google-white/GPT, Greenhouse logotype/isotype, and Efeonce comparison logo.
  - Brand-specific wrappers have no stale sparkles: `.gh-ai-engine-chip-perplexity`, `.gh-ai-citation-perplexity`, `.gh-chatgpt-mark`, and `.gh-bridge-chatgpt-mark` all report `0`.
  - Generic `ti-sparkles` remains allowed only for non-brand conceptual IA markers such as `visibilidad en IA` or `Citabilidad en IA`.
- Comparison card logo checks:
  - `.gh-comparison-efeonce-logo svg` exists with viewBox `0 0 837.07 196.68`.
  - The SVG has no internal `<style>` node; paths use direct fill `#023c70`.
  - The right-card header text is exactly `· método medible`.
  - The right-card header has no `.ti-plant-2`, and the old phrase `Efeonce · método medible` is absent.
- Gutter fix checks:
  - desktop `.page-container`, `.elementor-251078`, `.gh-task-1343-seo-landing-shell`, `.gh-seo-landing`, hero, and `#eeat` all `left=0`
  - mobile `.page-container`, `.elementor-251078`, `.gh-task-1343-seo-landing-shell`, `.gh-seo-landing`, hero, and `#eeat` all `left=0`

## Follow-Ups

- Build `/servicios/` into a real hub instead of the current minimal parent page.
- Create sibling `/servicios/aeo` and govern a `301` from `/aeo-2/` in a separate task.
- If embedding the real `<greenhouse-form>` later, coordinate Growth Forms CORS/surface allowlist and submit testing as a separate rollout.
