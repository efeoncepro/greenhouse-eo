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
- «Quiero ser partner»: the approved popup is the target (a governed Growth Form in a Growth CTA dialog, TASK-2044 →
  TASK-2045). Until then the button links to `/agenda/` — the same destination the previous page's button had. The
  previous page embedded the HubSpot form «Lead Gean - Partnership» (`4c0066df-9a0f-4199-b0f7-d09e376a9f22`); it is no
  longer on the page.
- Fidelity: section and card heights equal to the canvas at 1440 and 390 (animations frozen, computed-style diff). Ohio
  collisions fixed in `host.css`: body `line-height:1.6`, `16.4px` and tracking (root reset to the browser defaults),
  Ohio's post `.tag` pill, and a 16px top margin on `.bento`/`.steps`.
- Live 2026-10-23: deploy backups on Kinsta `/tmp/eo-partners-widgets-before-20261023-2200*.tar`; replace snapshot
  `_gh_partners_v2_before_20261023_220804`; Elementor data hash `8a0a3ebb…`; overflow 0, no broken images. QA preview
  `252038` (`/partners-preview-20261023/`) left `private`.
- SEO 2026-10-23 (`configure-partners-seo.php`, snapshot option `_gh_partners_seo_before_<UTC>`): meta, OG and Twitter
  description «Te asesoramos, implementamos y creamos soluciones sobre HubSpot, Salesforce, Google Cloud, Microsoft, AWS,
  OpenAI y más. La licencia es solo el comienzo.»; OG/Twitter title «Partners: hagamos que tus plataformas trabajen
  juntas | Efeonce» (was the internal «Landing Aliados»); OG image attachment `252045` from `partners-source/og/og.html`.
  Bottom dock: none.
