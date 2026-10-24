# Landing: Partners

## Rediseño 2026-10-23 (vigente)

- URL `https://efeoncepro.com/partnership/`, `page_id` `248003` (internal title «Landing Aliados»). Body replaced in place
  2026-10-23; slug, Yoast SEO title and canonical unchanged; no featured image (before or after).
- Need: a company that already pays for platforms (HubSpot, Salesforce, Google, Microsoft, AWS, OpenAI, Claude, BytePlus,
  Adobe) and needs them implemented and connected; second audience, a platform that wants to partner. Message: the value
  is beyond the license — we advise, implement, build solutions on top, operate and train; licensing is one service.
  Conversion = `/agenda/`.
- Design: canvas «Partners — Efeonce» v14 (`https://claude.ai/artifact/JTxu8GHSsrTU2LqXSvwCrp`, La órbita), approved by
  the operator 2026-10-23, with high-impact scroll-driven motion (CSS `animation-timeline: view()`, only inside
  `@supports`, off with reduced motion). Images: `ai-generations/2026-10-23_partners-landing/` (hero table with nine
  devices, fibre band).
- Claims follow `docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md`: direct partner labels, **never** the distributor
  as the partner (Ingram Micro, Licencias OnLine are distributors only); «Licencias» chip only on Google, Microsoft and
  AWS; no tiers for OpenAI/Claude; old figures without backing (50+ implementations, NPS 9,2) removed. Microsoft and AWS
  are on the page: the operator asked to deploy the approved page complete (their social announcements are 03-12 and
  10-12).
- Source and rail (shared source-led core): `scripts/public-website/partners-source/` (Main.dc.html without the drawn
  header/footer and without the popup, assets.json, host.css, page-custom.css, og/) → `compile-partners-elementor-source.cjs`
  → `build-partners-elementor-package.cjs <live baseline>` → `deploy-partners-elementor-package.php` (contract
  `partners-elementor-release.v1`) → `publish-partners-elementor-page.php` (`preview` | `replace` with
  `expectedDataSha`) → `rollback-partners-elementor-page.php` `{ "snapshot": "…" }`. Gates:
  `verify-source-led-compilers.cjs` and `verify-source-led-render.php` include `partners`.
- Page tree: 6 containers, one `greenhouse_partners_*` widget each: hero · verdad · ecosistema · banda · como · cierre.
  Repeaters: marquesina (9 logos), servicios (5), partners (10 tiles), pasos (3). `assets/js/partners-landing.js` only
  clones the logo set for the marquee loop.
- «Quiero ser partner»: the approved popup is a governed Growth Form in a Growth CTA dialog (TASK-2044/2045), live
  since 2026-10-24 (see «Popup live» below); without its key the launcher falls back to `/agenda/`.
  Published 2026-10-23: Growth Form `efeonce-partner-application` (form key `eb5c108d-05fc-427b-82b0-4bb161fdbac7`,
  v2 with HubSpot `direct` to «Lead Gean - Partnership» `4c0066df-…`, smoke 200/200, surface `fhsf-efeonce-partners`;
  `scripts/growth/publish-partner-application-form.ts`) and Growth CTA `partners-become-partner` (`open_growth_form` +
  `presentation: 'dialog'`, WordPress surface `csur-5638aab5-d53c-402a-836b-a0a72ce2c7a4`, key in
  `.auth/partners-cta-surface.json` 0600; `scripts/growth/publish-partners-become-partner-cta.ts` — re-running ROTATES
  the key). Skin: `scripts/public-website/partners-source/partner-dialog-skin.css` (tokens/hooks only; evidence
  `docs/ui/reviews/TASK-2045/`).
- Popup live 2026-10-24 (after the release that shipped forms 1.2.0 / CTA 1.4.0): «Quiero ser partner» in «cierre» is
  the shared source-led launcher (`<gh-meeting-cta location="partners_close">`, rewritten by
  `compile-partners-elementor-source.cjs`; meeting option `cta: partners-become-partner`, fallback `/agenda/` labelled
  «Quiero ser partner»). The publisher takes an optional third input, `.auth/partners-cta-surface.json`, and writes
  `meeting_surface`/`meeting_embed_key` into the «cierre» widget settings only (snapshot
  `_gh_partners_v2_before_20261024_122057`). The dialog lives in `<body>`, outside the scope: the compiler turns
  `partner-dialog-skin.css` into the unscoped page layer `page.css` (`body:has(.gh-partners) …`). The launcher needs
  an explicit width (209px = canvas button) because `fit-content` collapses to 0 under the renderer's inline-size
  containment. Verified live 1440/390: dialog «Sumémonos», 5 fields + consent, Escape closes, dataLayer
  `greenhouse_cta_viewed/clicked/form_opened` with `activation_mode: dialog`. Pending: a real submission smoke
  (Turnstile + HubSpot attempt, needs operator OK because it creates a CRM record) and the GTM DLV + GA4 dimension
  `activation_mode` (preview + confirmation). Observed: closing the dialog with the first field focused fires
  `gh_form_field_validation_failed` (blur validation) — inflates that metric; renderer follow-up.
- Fidelity: section and card heights equal to the canvas at 1440 and 390 (animations frozen, computed-style diff;
  `../source-led-elementor-patterns.md` §Ohio host fidelity). Ohio collisions fixed in `host.css`: body
  `line-height:1.6`, `16.4px` and tracking (root reset to the browser defaults), Ohio's post `.tag` pill, and a 16px top
  margin on `.bento`/`.steps`.
- Pending: the same Ohio rail collision as Nosotros between 1181 and 1320px (hero/`.wrap` text at 56px under the
  Dark/Light switch); the operator chose not to fix it yet (2026-10-24). Recipe: §Ohio host fidelity → Theme rails.
- Live 2026-10-23: deploy backups on Kinsta `/tmp/eo-partners-widgets-before-20261023-2200*.tar`; replace snapshot
  `_gh_partners_v2_before_20261023_220804`; Elementor data hash `8a0a3ebb…`; overflow 0, no broken images. QA preview
  `252038` (`/partners-preview-20261023/`) left `private`.
- SEO 2026-10-23 (`configure-partners-seo.php`, snapshot option `_gh_partners_seo_before_<UTC>`): meta, OG and Twitter
  description «Te asesoramos, implementamos y creamos soluciones sobre HubSpot, Salesforce, Google Cloud, Microsoft, AWS,
  OpenAI y más. La licencia es solo el comienzo.»; OG/Twitter title «Partners: hagamos que tus plataformas trabajen
  juntas | Efeonce» (was the internal «Landing Aliados»); OG image attachment `252045` from `partners-source/og/og.html`.
  Bottom dock: none.
