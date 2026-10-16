# Landing: Agencia de Medios

## Identity

- URL: `https://efeoncepro.com/servicios/agencia-de-medios/` (child of `/servicios/`, `251077`)
- WordPress `page_id`: `251981`, created and published 2026-10-16 (operator: «pública directo + menú»).
- Menu: primary `61`, item `251987`, label `Agencia de Medios`, parent `248606` (Soluciones → Crecimiento Multicanal),
  `menu_order` 28 (after the existing items; nothing else reordered).
- Canvas: Design artifact `https://claude.ai/artifact/Ns3R6Q1eSYrg3KGQwwWyzE`; working copy
  `ai-generations/2026-10-13_brochure-agencia-medios/landing/Main.dc.html`.

## Body — Agencia de Medios modules (2026-10-16)

- Source: `scripts/public-website/medios-source/Main.dc.html` (canvas + SEO deltas: short H1 with the channel list in a
  paragraph below, five extra FAQs with Semrush demand). `blob-map.tsv` maps canvas blobs to files; `assets.json` /
  `used-assets.json` are written by `prepare-medios-assets.cjs` / the compiler; `host.css`, `page-custom.css` (`__ID__`
  template), `form.json` (form key + surface), `og/og.html` (social image source).
- Compiler: `node scripts/public-website/compile-medios-elementor-source.cjs` → `includes/medios/{schemas,templates}`
  + `assets/css/medios-landing.css`. It removes the canvas footer and mobile bar (Ohio chrome is canonical), turns the
  Commerce/B2B and platform selectors into tabs (pressed look generated from the canvas' own on/off styles, keyed on
  `aria-pressed`), maps SVG `<image>` isotypes through `%%asset_base%%`, keeps aria-hidden glyphs out of the editor,
  and makes the FAQ a repeater (first row opens). Do not hand-edit generated files.
- Runtime: 16 widgets `greenhouse_medios_{hero,canales,numeros,diferencia,ciclo,modo,senal,performance,pantallas,
  medicion,equipo,cobro,metodo,partners,preguntas,agenda}`, base `class-eo-medios-landing-base.php` (clone of the
  Creativa base, schema `mediosModule.v1`), JS `medios-landing.js` (tabs + reduced-motion video pause). Runtime commit
  `25135f7`.
- Form: `agenda` embeds Growth Form `efeonce-media-diagnostic`, key `d784b9e2-f6e4-4e24-b059-f164fc82f734`, surface
  `fhsf-efeonce-media-diagnostic`, style `hubspot_pillar` (the production renderer only draws multi-select chips in that
  variant), HubSpot `direct` to «Lead Gen - Agencia de Medios». The canvas card was dark; the renderer paints for light
  (`color-scheme="light"`), so the card is paper `#f7f8f6` with its own title and the trust line under the form.
  Pending: first real browser submission (Turnstile blocks automation), GA4 `generate_lead` check, and the newsletter
  checkbox does not create a HubSpot subscription yet (adapter gap; decide subscription type or drop the box).
- SEO (`configure-medios-seo.php`, snapshot `_gh_medios_seo_before_20261016_183347`): title «Agencia de medios:
  planificación y compra | Efeonce», focus keyphrase «agencia de medios», OG/Twitter with image attachment `251986`
  (also `_thumbnail_id`). The `preguntas` module emits Service `#service` (provider `https://efeoncepro.com/#organization`,
  areaServed CL/CO/MX/PE) + FAQPage `#faq` (11). Research: Semrush 2026-10-16 (no conflict with «agencia de performance
  marketing» in Chile; keep that term out of title/H1/slug).
- Ohio: `wp_insert_post` pages get the blog sidebar. All 164 `page_*`/`_page_*` metas were copied from `249582`
  (`fix-medios-ohio-layout.php`, snapshot `_gh_medios_ohio_layout_before_20261016_183214`).
- Release rail: `build-medios-elementor-package.cjs <live baseline>` → `deploy-medios-elementor-package.php`
  (contract `medios-elementor-release.v1`, allowlist, previous-SHA guard, backup tar) → `publish-medios-elementor-page.php`
  (creates the page; refuses if the slug exists) → `fix-medios-ohio-layout.php` → `configure-medios-seo.php` →
  `add-medios-menu-item.php`. To change the body later, write a republisher with a content-hash guard (the publisher
  only creates).
- Rollback: page to draft + menu item `251987` deleted; SEO/Ohio snapshots above; plugin backup
  `/tmp/eo-medios-widgets-before-20261016-183011.tar` on Kinsta (temporary).
- Verification 2026-10-16: live 1440 and 390 with `scrollWidth==clientWidth`, 16 modules, form contract renders 12
  fields, sticky horizontal «pantallas» pins inside Elementor, one `h1`, canonical, OG/Twitter, Service + FAQPage,
  menu link clicked from Home. Not yet: Rich Results/GSC, real submission.
- Claims: Basis, DV360, TTD, IAS and DV are technology, not alliances; HubSpot Gold and Salesforce are partners; no
  rebate promise; no Sky media case; Eusari not published (operator, 2026-10-16).
