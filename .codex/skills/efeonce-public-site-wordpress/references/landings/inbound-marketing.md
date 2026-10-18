# Landing: Inbound Marketing

## Identity

- URL: `https://efeoncepro.com/agencia-inbound-marketing/` · WordPress `page_id` `242601` (body replaced in place
  2026-10-18; slug, parent, menu item `243616` under «HubSpot y servicios relacionados» and URL unchanged).
- Canvas: Design artifact `https://claude.ai/artifact/R3pppHeU6tVLmXJ9BtaDN4` («La órbita», approved by the operator
  2026-10-18). Repo source: `scripts/public-website/inbound-source/Main.dc.html` (HubSpot loop inlined from the
  canvas' `Loop.dc.html`; the flywheel board is not used on the page).
- Message: agnostic to tools; the loop stages are written as verbs (Definir, Adaptar, Amplificar, Optimizar); HubSpot
  appears only as Gold Partner, in Adaptar and in the FAQ; each stage links to the Efeonce service that solves it.

## Body — Inbound modules

- Compiler: `node scripts/public-website/compile-inbound-elementor-source.cjs` (shared core `lib/source-led-compiler.cjs`)
  → `includes/inbound/{schemas,templates}` + `assets/css/inbound-landing.css`. Do not hand-edit generated files.
- 11 widgets `greenhouse_inbound_{hero,confianza,partida,vivo,cambio,rompe,metodo,ciclo,planes,reglas,diagnostico}`;
  `vivo` is the only light section (`clb__light_section`).
- `ciclo`: «Arma tu primer ciclo» — `inbound-landing.js` keeps `[data-gh-cycle-product]`, `[data-gh-cycle-market]` and
  `[data-gh-cycle-question]` in sync with the input and the market buttons (`data-gh-market`, `data-gh-market-where`).
- Service links use the shared site-wide primitive `EfeonceMention` (`a.eo-mention`, see
  `docs/architecture/public-site/PRIMITIVES.md`). Never copy its CSS into the landing.
- Form: Growth Form `efeonce-inbound-diagnostic`, key `70dc185f-9903-4458-8aa5-323f6f827152`, surface
  `fhsf-efeonce-inbound-diagnostic`, `hubspot_pillar` + `multi_step_light` (step 1: `loopStage`, `crm`, `country`;
  step 2: contact). HubSpot `direct` «Lead Gen - Inbound Marketing» (`gh_form_inbound_etapa|crm|rol`). Publisher
  `scripts/growth/publish-inbound-diagnostic-form.ts`; registry row in `hubspot-destinations.registry.ts`.
- Meeting CTA: the closing block's «Agenda una reunión» is the governed Growth CTA `inbound-discovery-meeting`
  (`open_meeting_scheduler`, `fhsf-efeonce-lead-gen-web` + `discovery`, surface «Efeonce Inbound landing (WordPress)»,
  key 0600 in `.auth/inbound-meeting-cta-surface.json`; rerunning `scripts/growth/publish-inbound-meeting-cta.ts` rotates
  it → republish with the 4th input of `publish-inbound-elementor-page.php`). It opens the native scheduler in a dialog
  skinned from `inbound-source/page.css` (operator, 2026-10-18: only the scheduler floating over the blurred page plus a
  round close button; no container, no repeated title). The dialog needs `height: fit-content` (a modal dialog has
  `top:0;bottom:0`). Hero secondary button and mobile dock still link to `/agenda/`.
- SEO (`configure-inbound-seo.php`, snapshot option `_gh_inbound_seo_before_20261018_111909`): title «Agencia de
  inbound marketing y Loop Marketing | Efeonce», focus «agencia de inbound marketing», OG/featured `252016`
  (`inbound-source/og/og.html`). `includes/inbound/seo.php` adds `about → #service` to Yoast's WebPage.
- Ohio: page_* metas copied from Performance `251997` by the publisher.

## Release rail

`prepare-inbound-assets.cjs` → `compile-inbound-elementor-source.cjs` → `verify-source-led-compilers.cjs` +
`php verify-source-led-render.php` → `export-live-code` → `build-inbound-elementor-package.cjs <baseline>` →
`deploy-inbound-elementor-package.php` (contract `inbound-elementor-release.v1`; also ships `EfeonceMention`) →
`publish-inbound-elementor-page.php <page-custom.css> <form.json> <spec.json>` (`preview` creates a noindex page;
`replace` needs `expectedDataSha` of the live `_elementor_data`) → `configure-inbound-seo.php`.

## Rollback

`rollback-inbound-elementor-page.php` with `{ "snapshot": "_gh_inbound_v2_before_20261018_111856",
"seoSnapshot": "_gh_inbound_seo_before_20261018_111909" }` restores the previous Ohio/Elementor body (Ohio native
widgets + legacy `hubspot-form`), metas and Yoast fields. Plugin backups on Kinsta `/tmp/eo-inbound-widgets-before-*.tar`
(temporary). The QA preview page `252009` is in the trash.

## Verification 2026-10-18

1440 and 390 with `scrollWidth == clientWidth`, 11 modules, one `h1`, canonical, `index, follow`, OG, Service +
FAQPage, Growth Form rendered, cycle interaction (product + market → question) verified, 10 mentions painted.
Pending: first real submission → GA4 `generate_lead` + HubSpot `succeeded`; Rich Results; in-editor save/reload;
hide the mobile dock while the form is on screen (Performance pattern).
