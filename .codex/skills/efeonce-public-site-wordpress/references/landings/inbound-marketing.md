# Landing: Inbound Marketing

> This landing's composition («La órbita», the «El loop.» hero, its 11 sections and their order, the light `vivo`
> section, the loop graphic, «Arma tu primer ciclo», the meeting-dialog look, button skins, colors and type) answers
> this landing's need. It is not a template or the site's style; only its mechanisms are reusable
> (`references/landing-workflow.md` §Start from the landing's need).

## Identity

- URL: `https://efeoncepro.com/agencia-inbound-marketing/` · WordPress `page_id` `242601` (body replaced in place
  2026-10-18; slug, parent, menu item `243616` under «HubSpot y servicios relacionados» and URL unchanged). Live,
  publish + index.
- Canvas: Design artifact `https://claude.ai/artifact/R3pppHeU6tVLmXJ9BtaDN4` («La órbita», approved by the operator
  2026-10-18). Repo source: `scripts/public-website/inbound-source/Main.dc.html` (HubSpot loop inlined from the
  canvas' `Loop.dc.html`; the flywheel board is not used on the page).
- Message: agnostic to tools; the loop stages are written as verbs (Definir, Adaptar, Amplificar, Optimizar); HubSpot
  appears only as Gold Partner, in Adaptar and in the FAQ; each stage links to the Efeonce service that solves it.

## Body — Inbound modules

- Compiler: `node scripts/public-website/compile-inbound-elementor-source.cjs` (shared core `lib/source-led-compiler.cjs`)
  → `includes/inbound/{schemas,templates}` + `assets/css/inbound-landing.css`. Do not hand-edit generated files.
  Runtime repo `efeonce-public-site-runtime`, plugin `eo-elementor-widgets`.
- 11 widgets `greenhouse_inbound_{hero,confianza,partida,vivo,cambio,rompe,metodo,ciclo,planes,reglas,diagnostico}`;
  `vivo` is the only light section (`clb__light_section`).
- `ciclo`: «Arma tu primer ciclo» — `inbound-landing.js` keeps `[data-gh-cycle-product]`, `[data-gh-cycle-market]` and
  `[data-gh-cycle-question]` in sync with the input and the market buttons (`data-gh-market`, `data-gh-market-where`).
- `metodo` stage titles: «Amplificar/Optimizar» broke mid-word; fixed with `.stage h3{word-break:normal;
  overflow-wrap:normal;hyphens:none;white-space:nowrap}` and a title clamp of `clamp(40px,3.5vw,56px)`.
- Service links use the shared site-wide primitive `EfeonceMention` (`a.axis-mention data-line="revenue-hubspot" data-surface="dark"`, AXIS `efeonce.mention` since 2026-10-18; see
  `docs/architecture/public-site/PRIMITIVES.md`). Never copy its CSS into the landing.
- Form: Growth Form `efeonce-inbound-diagnostic`, key `70dc185f-9903-4458-8aa5-323f6f827152`, surface
  `fhsf-efeonce-inbound-diagnostic`, `hubspot_pillar` + `multi_step_light` (step 1: `loopStage`, `crm`, `country`;
  step 2: contact). HubSpot `direct` «Lead Gen - Inbound Marketing» (`gh_form_inbound_etapa|crm|rol`). Publisher
  `scripts/growth/publish-inbound-diagnostic-form.ts`; registry row in `hubspot-destinations.registry.ts`.
  TASK-2039 (to-do) records feeding the form from on-page interactions (host-driven initial values); not implemented.
- SEO (`configure-inbound-seo.php`, snapshot option `_gh_inbound_seo_before_20261018_111909`): title «Agencia de
  inbound marketing y Loop Marketing | Efeonce», focus «agencia de inbound marketing», OG/featured `252016`
  (`inbound-source/og/og.html`). `includes/inbound/seo.php` adds `about → #service` to Yoast's WebPage.
- Ohio: page_* metas copied from Performance `251997` by the publisher.

## Meeting launcher

- One governed Growth CTA `inbound-discovery-meeting` (`open_meeting_scheduler`, scheduler `fhsf-efeonce-lead-gen-web`
  + `discovery`, surface «Efeonce Inbound landing (WordPress)» `csur-7931112e-…`). The embed key lives only in
  `.auth/inbound-meeting-cta-surface.json` (0600, gitignored); never copy it. Rerunning
  `scripts/growth/publish-inbound-meeting-cta.ts` rotates it → republish with the 4th input of
  `publish-inbound-elementor-page.php`, which writes `meeting_surface`/`meeting_embed_key` into `hero` and `diagnostico`.
- Three placements, one CTA, told apart by `cta-location`: `inbound_closing` (the closing «Agenda una reunión» in
  `diagnostico`, compiler default location), `inbound_hero` (hero secondary button) and `inbound_mobile_dock` (mobile
  dock half, in the `hero` template). The compiler replaces the canvas `/agenda/` links with
  `<gh-meeting-cta [location]>` (`meeting: { modules: ['hero','diagnostico'], … }`); without settings the base renders
  the fallback link `a.gh-inbound-meeting-fallback` to `/agenda/`.
- Launcher skins (`inbound-source/host.css`): `.meet-cta` magenta primary with calendar icon + arrow;
  `.meet-cta--ghost` hero secondary with its own navy backdrop `rgba(0,26,51,.72)` + `blur(12px)` + 1px
  `rgba(255,255,255,.5)` border (the transparent version sat on the seam between the dark text panel and the hero
  photo, so the seam showed through as «dirty edges»); `.meet-cta--dock` the dock half.
- Mobile dock split: the canvas magenta button had inline `flex:1`; with `flex-basis:0` its 16 px padding stayed out of
  the split, so it took 34 px more and cut «Agenda una reunión». Fix `nav.mbar>*{flex:1 1 50%!important;min-width:0}`
  → two equal 179 px halves at 390 px.
- Dialog skin (this landing's choice, `inbound-source/page.css`, scoped `body:has(.gh-inbound)`): the operator asked
  for «MUY ELEGANTE» and then rejected a header container that repeated the scheduler's title. Final: only the
  scheduler floating over a blurred navy backdrop with a soft magenta glow, a round 44 px glass close button (X mask
  rotating 90° on hover, magenta focus ring), titles visually hidden but accessible. On phones the renderer sets
  `[data-full-screen]` → navy full screen with safe-area insets.

## Release rail

`prepare-inbound-assets.cjs` → `compile-inbound-elementor-source.cjs` → `verify-source-led-compilers.cjs` +
`php verify-source-led-render.php` → `export-live-code` → `build-inbound-elementor-package.cjs <baseline>` →
`deploy-inbound-elementor-package.php` (contract `inbound-elementor-release.v1`; also ships `EfeonceMention`) →
`publish-inbound-elementor-page.php <page-custom.css> <form.json> <spec.json> [<meeting.json>]` (`preview` creates a
noindex page; `replace` needs `expectedDataSha` of the live `_elementor_data`) → `configure-inbound-seo.php`.

## Rollback

`rollback-inbound-elementor-page.php` with `{ "snapshot": "_gh_inbound_v2_before_20261018_111856",
"seoSnapshot": "_gh_inbound_seo_before_20261018_111909" }` restores the previous Ohio/Elementor body (Ohio native
widgets + legacy `hubspot-form`), metas and Yoast fields. Plugin backups on Kinsta `/tmp/eo-inbound-widgets-before-*.tar`
(temporary). The QA preview page `252009` is in the trash.

## Verification 2026-10-18

1440 and 390 with `scrollWidth == clientWidth`, 11 modules, one `h1`, canonical, `index, follow`, OG, Service +
FAQPage, Growth Form rendered, cycle interaction (product + market → question) verified, 10 mentions painted.
Meeting launcher: 3 launchers in the HTML (`inbound_closing`, `inbound_hero`, `inbound_mobile_dock`); hero popup opens
and closes, Escape closes and focus returns to the launcher; dock popup opens full screen; dock halves 179/179; hero
ghost 280×56. Medios and Performance render fingerprints unchanged after every shared-base change; thumbnail/OG
`252016` intact.

Pending: first real submission → GA4 `generate_lead` + HubSpot `succeeded`; first real booking; Rich Results;
in-editor save/reload; hide the mobile dock while the form is on screen (Performance does it).
