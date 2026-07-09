# Public Site Footer Read-Only Audit - Careers Entry Readiness

Date: 2026-07-09  
Agent: Codex  
Mode: read-only audit; no WordPress mutation, no Kinsta purge, no runtime deploy  
Surface: `https://efeoncepro.com` global footer  
Future intent: add a public entry point to Careers/vacantes without re-discovering the footer contract

## Executive Summary

The visible public-site footer is rendered by the Ohio child theme plus WordPress widget sidebars, not by the headless `eoh_site_settings_footer_*` option layer.

The natural place to add Careers is the existing footer copy block headed `Unete a nuestro equipo`, currently inside `ohio-sidebar-footer-3` below the newsletter widget. Today that block only exposes `people@efeoncepro.com`; there is no link to Greenhouse Careers or to the public vacancies listing.

Recommended future v1: add a clear link/CTA in that block, for example `Ver vacantes abiertas`, pointing to `https://greenhouse.efeoncepro.com/public/careers`. Keep this as a surgical widget/content change first. Do not mix it with broader footer cleanup unless explicitly scoped.

## Live Change Applied - 2026-07-09

Status: applied after operator approval.

Mutation:

- Updated only `widget_block[31]`, rendered under `ohio-sidebar-footer-3`.
- Kept `block-32 | Unete a nuestro equipo` as the existing heading.
- Added a core WordPress button link:
  - Label: `Ver vacantes y postular`
  - URL: `https://greenhouse.efeoncepro.com/public/careers`
  - Target: `_blank`
  - Rel: `noopener noreferrer`
- Kept `people@efeoncepro.com` as the secondary contact channel.

Rollback snapshot:

- WordPress option: `gh_backup_before_footer_careers_link_20260709T122602Z`
- Snapshot includes `ohio-sidebar-footer-3`, `widget_block[31]`, and `widget_block[32]` before mutation.

Cache:

- `wp cache flush`: success.
- `wp kinsta cache purge --all`: success.

Verification after mutation:

- Destination `https://greenhouse.efeoncepro.com/public/careers` returned `HTTP/2 200`.
- Browser audit artifact: `.captures/public-footer-careers-link-20260709T1226/footer-careers-link-audit.json`.
- Screenshots:
  - `.captures/public-footer-careers-link-20260709T1226/home-desktop1440-footer.png`
  - `.captures/public-footer-careers-link-20260709T1226/home-mobile390-footer.png`
  - `.captures/public-footer-careers-link-20260709T1226/seo-desktop1440-footer.png`
  - `.captures/public-footer-careers-link-20260709T1226/seo-mobile390-footer.png`
- Home + SEO landing passed desktop `1440` and mobile `390` checks:
  - one Careers link only;
  - link visible;
  - expected label;
  - expected target/rel;
  - `scrollWidth === clientWidth`;
  - footer still renders as `footer#colophon.site-footer`.

Rollback procedure:

1. Read `gh_backup_before_footer_careers_link_20260709T122602Z`.
2. Restore the saved `widget_block_target_before` payload into `widget_block[31]`.
3. Flush WordPress cache and purge Kinsta cache.
4. Re-run the footer browser audit on Home and at least one service landing, desktop `1440` + mobile `390`.

## Scope

Reviewed:

- Home: `https://efeoncepro.com/`
- AEO: `https://efeoncepro.com/aeo-2/`
- SEO service landing: `https://efeoncepro.com/servicios/posicionamiento-seo/`
- Social service landing: `https://efeoncepro.com/servicios/redes-sociales/`
- Desktop viewport `1440`
- Mobile viewport `390`
- Remote WordPress footer sidebars/widgets via read-only WP-CLI
- Runtime repository footer implementation under `efeonce-public-site-runtime`

Not done:

- No WordPress content edit.
- No Elementor save.
- No theme/plugin deploy.
- No Kinsta cache purge.
- No menu, header, or Careers runtime change.

## Evidence

Local capture artifact:

- `.captures/public-footer-readonly-20260709/footer-audit.json`
- `.captures/public-footer-readonly-20260709/home-desktop1440-footer.png`
- `.captures/public-footer-readonly-20260709/home-mobile390-footer.png`

Observed footer selector:

- `footer#colophon.site-footer.clb__dark_section`

Observed footer dimensions on Home:

- Desktop `1440`: approx. `1440 x 654`
- Mobile `390`: approx. `390 x 1186`

Observed across audited routes:

- 15 footer links.
- No horizontal overflow in the Playwright audit.
- Footer content and link set were consistent across the audited routes.
- No current footer link contains `greenhouse` or `careers`.

## Runtime Source Of Truth

### Visible Footer

The visible footer is controlled by WordPress sidebars/widgets and the Ohio child theme footer template.

Runtime child-theme file:

- `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/themes/ohio-child/parts/elements/footer.php`

Relevant render behavior:

- Counts active sidebars `ohio-sidebar-footer-1` to `ohio-sidebar-footer-4`.
- Renders each active sidebar through `dynamic_sidebar(...)`.
- Uses `.site-footer` plus `clb__dark_section` or `clb__light_section` based on Ohio footer color scheme.
- Renders widgets inside `.page-container > .widgets.vc_row`.
- Renders scroll-to-top / color switcher holder if enabled.
- Renders `.site-footer-copyright`.

Remote WP read-only inventory on 2026-07-09:

```text
ohio-sidebar-footer-1
  - ohio_widget_logo-1
  - block-17 | Oficina Chile Las Bellotas 199, OF 102 Providencia, Santiago de Chile
  - ohio_widget_socialbar_subscribe-3
ohio-sidebar-footer-2
  - block-45 | Recursos Help Center Submit a New Request Customer's Reviews Get Figma Source File
ohio-sidebar-footer-3
  - ohio_widget_subscribe-2
  - block-32 | Unete a nuestro equipo
  - block-31 | ¿Te interesa trabajar con nosotros?people@efeoncepro.com
ohio-sidebar-footer-4
  - block-14 |
  - block-34 |
```

### Headless Footer Settings

The runtime repo also defines ACF/headless site settings for footer content:

- `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-headless-content/includes/acf/site-settings-fields.php`
- Fields include `footer_tagline`, `footer_columns`, and `footer_social`.
- Options exist as `eoh_site_settings_footer_*`.

Important: those settings are not the current visible footer renderer. Do not edit the headless footer settings expecting the live Ohio footer to change.

## Current Visible Content

Footer column/content observed in browser:

- Brand/logo link to Home.
- Address: `Oficina Chile Las Bellotas 199, OF 102 Providencia, Santiago de Chile`.
- Social icon links.
- `Recursos` column with Ohio/demo/template links.
- Newsletter block headed `Subscribete a nuestro newsletter`.
- Careers-adjacent block headed `Unete a nuestro equipo`.
- Text: `¿Te interesa trabajar con nosotros?people@efeoncepro.com`.
- Scroll-to-top control.
- Copyright: `© 2018-2026 Efeonce Group SpA. | Todos los derechos reservados | Hablemos`.
- Legal links: `Privacy & Cookie Policy` and `Terms of Service`.

## Careers Readiness

The existing `Unete a nuestro equipo` block is semantically correct for a Careers entry point. It is already in the global footer and currently acts as the only recruiting affordance.

Recommended content direction for the next mutation:

- Heading can remain `Unete a nuestro equipo` or be adjusted to `Trabaja con nosotros` if the copy pass is in scope.
- Add a primary text link or compact CTA: `Ver vacantes abiertas`.
- Target: `https://greenhouse.efeoncepro.com/public/careers`.
- Keep `people@efeoncepro.com` as secondary support/recruiting contact unless the operator decides Careers should be the only entry point.
- If external behavior is retained, use `target="_blank"` plus `rel="noopener noreferrer"`.
- If same-tab behavior is desired for conversion continuity, document that decision and avoid inconsistent mixed target behavior.

Alternative product route:

- Create or reserve a public-site URL such as `/trabaja-con-nosotros/` that redirects or explains Careers, then links to Greenhouse.
- This is better if SEO/employer-brand content is desired on `efeoncepro.com`, but it is larger than the footer link task.

## Adjacent Issues Found

These are real footer issues, but should not be silently bundled into the Careers-link change unless explicitly approved.

1. Demo/template resource links are still public:
   - `Help Center` -> `https://colabrio.ticksy.com/`
   - `Submit a New Request` -> `https://colabrio.ticksy.com/submit/`
   - `Customer's Reviews` -> ThemeForest Ohio reviews
   - `Get Figma Source File` -> `https://demo.clbthemes.com/get_figma`

2. Social links need cleanup:
   - Instagram is malformed: `https://www.instagram.com.com/efeoncepro/`.
   - One social icon points to `#` on the current page, likely Spotify placeholder.
   - Social icon anchors have no visible text and no observed `aria-label`/`title`.
   - External social links should use `rel="noopener noreferrer"` when opening in a new tab.

3. Newsletter copy and form behavior need a separate UX/content pass:
   - `Subscribete`/`Subscribirme` are inconsistent with Spanish spelling and current brand polish.
   - Contact Form 7 hidden locale observed as `en_US`.
   - Email input and consent checkbox were not observed as required fields in the browser audit.

4. Legal/footer utility copy is mixed-language:
   - `Privacy & Cookie Policy`
   - `Terms of Service`

5. Link target behavior is inconsistent:
   - `Hablemos` opens `/contacto` with `target="_blank"`.
   - Mail link also uses `target="_blank"`.

## Implementation Notes For Future Agent

Before any live footer mutation:

1. Snapshot the relevant WordPress state:
   - `sidebars_widgets`
   - `widget_block`
   - Ohio footer-related widgets/options touched by the change
2. Confirm whether the intended edit is widget content only or also theme/runtime.
3. Edit through governed WordPress APIs/WP-CLI, not SQL.
4. If changing Elementor content elsewhere, use Elementor `Document::save()`. For this footer block, the likely path is widget/block update rather than Elementor page save.
5. Preserve the child-theme footer renderer unless the task explicitly scopes a footer redesign.
6. Do not patch global footer CSS to compensate for a local Careers link unless a browser audit shows a real layout regression.

Verification after mutation should include:

- Desktop `1440` and mobile `390`.
- Home plus at least one service landing.
- `scrollWidth === clientWidth`.
- Link presence and target URL.
- Keyboard focus visible on the new link/CTA.
- No duplicated Careers link.
- Footer still renders `footer#colophon.site-footer`.
- Screenshot/capture evidence under `.captures/`.

## Decision For Next Scope

Recommended next task shape:

- Small public-site mutation: add Careers link to `ohio-sidebar-footer-3` recruiting block.
- Optional copy polish in same block only.
- Leave demo Resources/social/newsletter/legal cleanup as a separate footer hardening task unless the operator explicitly wants a broader footer cleanup release.
