# Global site footer — operating reference

Use for any change to the global footer of `efeoncepro.com` (columns, contact data, Glitch newsletter, partners, legal
bar, colors/hovers). Architecture
[`PUBLIC_SITE_FOOTER_V1.md`](../../../../docs/architecture/public-site/PUBLIC_SITE_FOOTER_V1.md); operator manual
[`operar-footer-global.md`](../../../../docs/manual-de-uso/public-site/operar-footer-global.md); package
[`scripts/public-website/footer-refinement-v3/README.md`](../../../../scripts/public-website/footer-refinement-v3/README.md).
Facts verified live 2026-10-31.

## State in production

- Footer V3, five columns, live site-wide since 2026-10-31. Approved in the Contacto canvas, page «Footer», board
  «Footer propuesto · cinco columnas» (artifact `JKJAj4cQWd8CkcYprNcWYj`); operator went four columns → five.
- Ground `#000f1f` (AXIS night blue) `!important`, top line and dividers `#1d3a57`. Replaced Ohio charcoal `#161519`.
  It reads almost black next to the navy closing bands of Contacto/Agenda; same hex as the canvas (live `rgb(0,15,31)`).
  `#001a33` was offered and declined: do not «fix» it.
- Verified at 1440/900/375 on Contacto, Home, blog, Agenda: no horizontal overflow, Growth Forms renderer loaded once.

## Hard rules

- The adapter in `block-34` owns all footer chrome. Never style the footer from a landing, Elementor or a plugin.
- Never edit footer blocks by hand in wp-admin. Every write is a guarded WP-CLI script: exact hash or exact single
  match → snapshot option `_gh_footer_*_before_<Ymd_His>` (no autoload) → write → readback → protected-Home hash check →
  `cache flush` + `kinsta cache purge --all`.
- Run `pnpm public-website:ssh-check`, then `pnpm public-website:wpcli -- --eval-file <script> --wp-user 12`. Operator
  approval before any production write.
- Never re-add CF7 242255 or `ohio_widget_subscribe-2` (inactive widgets). The newsletter is the canonical Growth Form.
- Never dress the footer pill in Glitch green (operator rejected it). Paper `#f7f8f6` + navy `#001a33`, teal `#36c8bf`
  hover/focus, 46 px. Host variables only; never style inside `<greenhouse-form>`.
- Never edit `ohio-child/assets/css/global-fixes.css` without a governed deploy lane.
- Every selector uses the prefix `#colophon:has([data-eo-footer-partners="v2"])`; the bootstrap JS finds the marker and
  climbs with `closest('#colophon')` (no `:has()` in `querySelector`, for the quality monitor).

## Block map

| Sidebar | Widgets | Content |
| --- | --- | --- |
| `ohio-sidebar-footer-1` | `ohio_widget_logo-1`, `block-17`, `ohio_widget_socialbar_subscribe-3` | Logo · coverage line + 5 circular flags (cl, co, mx, pe, us from `wp-content/plugins/eo-elementor-widgets/assets/img/contact/flags/`) · social |
| `ohio-sidebar-footer-2` | `block-45` | Explora |
| `ohio-sidebar-footer-3` | `block-46` | Glitch: AXIS negative logo (`ohio-child/assets/vendor/axis/site-nav/0.7.13/brand/glitch-logo-negative.svg`), lede, form `efeonce-blog-subscription` / key `6bc62588-a4a0-4214-9501-13b0c2948c81` / surface `fhsf-efeonce-blog-subscription` |
| `ohio-sidebar-footer-4` | `block-47`, `block-31`, `block-34` | Contacto (new) · careers pill «Ver vacantes» · adapter CSS/JS + 9 partner logos |

Column 4's wrapper is `display:contents`: `block-47`, `block-31`, `block-34` are placed explicitly with
`grid-column`/`grid-row`; Glitch is `.widgets>.widgets-column:nth-child(3)`. Copyright: ACF option
`options_global_footer_copyright_left` = `© [ohio_current_year] Efeonce Group SpA. Todos los derechos reservados.`

Grid: >1100 px `minmax(0,1fr) minmax(0,.52fr) minmax(0,.92fr) minmax(0,1.16fr) minmax(0,.8fr)`, gap 32 (250 · 130 ·
230 · 290 · ~200 at 1440). ≤1100: Marca|Explora, Contacto|Glitch, Empleo, partners. ≤600: Marca|Explora, Contacto
(phones in two columns), Glitch, Empleo, partners. All column contents start at the same height under their titles.

Partners `--eo-logo-h` (px): HubSpot 25, Salesforce 30, Adobe 22, Microsoft 22, AWS 29, Google Cloud 19, Claude 22,
OpenAI 24, BytePlus 20; ×0.88 on phone. Desktop flex `space-between`; tablet 5-col grid; phone 3-col grid.

## Scripts (`scripts/public-website/`)

| Script | Rerun? |
| --- | --- |
| `footer-refinement-v3/apply.php` (ground, partners, careers pill) | No — hash guard fails by design |
| `footer-newsletter-growth-form.php` (`block-46`) | Yes — refreshes the block, new snapshot; refuses if the blog form key/surface changed |
| `footer-refinement-v3/cinco-columnas.php` (grid, `block-17`, `block-47`, copyright) | No — hash guard + `block-47 already exists` |
| `footer-refinement-v3/legal-links.php` | Yes — replaces its earlier passes; identical → `Already applied` |
| `footer-refinement-v3/link-colors.php` (marked block before `</style>`) | Yes — replaces its marked block; identical → `Already applied` |
| `footer-refinement-v3/contact-type.php` | No — source strings are gone |
| `fix-footer-headquarters-address.php`, `fix-legacy-headquarters-address-copies.php`, `fix-agendar-phone.php` | No — one-off |

Key snapshots: `_gh_footer_v3_before_20261031_140528`, `_gh_footer_v3_cinco_before_20261031_140842`,
`_gh_footer_newsletter_before_20261031_140533`. Full list in the architecture doc. Rollback = restore `widget_block`,
`sidebars_widgets` (and the copyright option when stored) from the oldest relevant snapshot, then purge.

## How to change safely

1. Export the live block content and its sha256 with a read-only `--eval-file`.
2. New script: guard on that hash or on exact single matches; snapshot; write; readback; protected-Home check; purge.
3. Tune colors/hovers by editing `link-colors.php` or `legal-links.php` and rerunning them.
4. Form copy/fields change in Greenhouse (new form version), not in WordPress; it affects the blog too.
5. If the site-nav AXIS folder moves off `0.7.13`, update the Glitch logo URL in `footer-newsletter-growth-form.php`.
6. Verify at 1440/900/375 on Contacto, Home, blog, Agenda: no overflow, renderer script once, ground `rgb(0,15,31)` and
   teal hovers off Home, no « | » in the legal bar.

## Traps measured 2026-10-31

- **Legacy `global-fixes.css`:** `body:not(.home):not(.front-page) .site-footer { background-color:#161519 !important }`
  and every footer link/paragraph `rgba(255,255,255,.75) !important` on all pages but Home. That is why the adapter's
  ground and link colors carry `!important`, and why hovers «only worked on Home». Clean fix pending: remove those rules
  from the theme (needs a lane), then drop the `!important`.
- **`:has()`-scoped specificity:** the prefix `#colophon:has([data-eo-footer-partners="v2"])` beats Ohio without
  `!important` but **not** `!important` rules; a block's own `<style>` must use the same prefix to beat the adapter's
  `p { margin:0 }` and line heights.
- **Consent plugin separator:** `eo-measurement-consent` (`efeonce-cookie-preferences-mount`) appends a ` | ` text node.
  The adapter sets `font-size:0` on `.site-footer-copyright .holder>.-right[data-efeonce-cookie-links]`, restores 11 px
  (10 phone) on each child and gives the button `margin-left:28px` (24 phone). Do not use `inline-flex` there: the text
  node becomes an anonymous flex item and doubles the gap. Clean fix pending in the plugin.
- **Ohio leaks into custom blocks:** `li` at 14.8 px (line-height 1.6) and the adapter's `p` line-height 1.75. Declare
  size and line height inside the block (see `contact-type.php`: label/email 1.4, address 1.6, phones 13 px, caption
  11 px 1 px below).
- **Renderer container query:** below 480 px of container width the pill goes full width. Expected in the narrow
  column and on phone.
- **`inline-initial-state="open"`** needs renderer 1.4.0 (on develop, not in production on 2026-10-31). The production
  renderer ignores it and shows the button; it opens after the next Greenhouse release, no WordPress change.
- **Lazy loader:** the footer has no WordPress handle, so `block-46` injects `renderer-latest.js` when the footer is
  800 px from the viewport, and only if no `script[src^=…renderer-latest.js]` exists and `greenhouse-form` is not
  defined (Contacto and the blog already load it). Until then the fallback link «Suscríbete a Glitch» → `/blog/` shows.
- **Placeholder:** «Tu correo» (form version `fver-d0ecefaa-9bf5-429a-8eb3-2abd3826b67e`); «Tu correo electrónico» was
  clipped at 290 px with the component's 16 px field.

## Address history

«Las Bellotas 199» was replaced everywhere (footer, ACF contact option, WooCommerce store address, inactive `block-15`,
`/agendar/` and its draft, Landing Loop Marketing). `/agendar/` phone → `+56 9 3732 3064` (hours kept). WooCommerce is
out of scope (not an ecommerce). The old number remains only in an inactive WhatsApp plugin account.
