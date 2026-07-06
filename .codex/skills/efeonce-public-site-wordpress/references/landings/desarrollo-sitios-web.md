# Desarrollo de sitios web landing

## Runtime

- URL: `https://efeoncepro.com/desarrollo-sitios-web/`
- WordPress page ID: `250816`
- Status: `publish`
- Owning task: `TASK-1345`
- Runtime rail: WordPress/Kinsta.
- Implementation rail: Elementor `Document::save()` document (`_elementor_edit_mode=builder`) with a native full-width Elementor/Ohio hero (`wdhero`) plus governed HTML content below (`wdrest`).
- Correction note: the first live v1 was mistakenly published as a Gutenberg custom HTML block; current live state was converted to Elementor on 2026-07-05 to match the AEO landing rail.

## Published Contract

- Visible offer: desarrollo de sitios web by Efeonce.
- Hero style: AEO-style dark full-bleed first fold. Uses `ohio_badge` (`wdtag`), `ohio_heading` (`wdtitle`, `heading_tag=h1`, `subtitle_type_layout=without_subtitle`), `ohio_button` (`wdbut`) and proof row. The old static HTML answer card (`wdans`) was removed on 2026-07-05. Parent `wdvis` hosts the premium Hero Factory animation widget (`whfd06a1`, `.ghf-slot ghf-slot-premium-v2 ghf-slot-right-v14`) based on `ai-generations/2026-07-05_task-1345-hero-interface/hero-factory-demo-v2.html`; keep it scoped to `.gh-web-hero-visual` and do not use it to control Ohio header/wrappers. The passing sweep light and scan pass were removed from DOM/JS; do not reintroduce `[data-sweep]`, `ghf-sweep`, or `data-scan-*`. Current hero polish uses `task-1345-hero-right-block-v14` over `task-1345-hero-premium-system-v8`: the animation has no local background/degradado/grain (`ghf-field`, `ghf-floor`, `ghf-glow`, `ghf-grain`) and sits directly on the global hero gradient. The right block is an enterprise production system: motor humano+agente, rail `Spec / Build / QA`, process nodes, assembly station and delivery card. Desktop visual is balanced at `541x634`; mobile visual at `310x347`. No native Ohio breadcrumb/page headline visible.
- Header/hero governance: header must remain native Ohio (`with-header-3`, `header-3`, `light-typo`) via Ohio metas. Do not add CSS/JS for `#masthead`, `#content`, `.page-container`, `#site-navigation`, or wrapper reset rules. Elementor will still generate native scoping selectors such as `.elementor-250816 .elementor-element-*`; those are not hand-authored wrapper overrides.
- Post-hero signature section: the `sig` section is currently a premium compact `sig-premium` dual-reader module with `data-capture="two-visitors"`. It must preserve the "dos visitantes" idea: human visual experience + AI agent structured interpretation. Keep CSS scoped to `.gh-v11 .sig...`; do not use it to control Ohio header or wrappers. Typography contract: only the display H2 uses compact heading tracking (`letter-spacing:-.045em`) and the teal `em` inherits it; body copy, chips, cards, labels, and proof text stay `normal/0`.
- Method section: the `how` section is currently `how-premium` with `data-capture="method"` and CSS marker `task-1345-method-premium-v1`. It must preserve the IDD method story while reading premium/enterprise: high contrast white title, teal accent only on `método`, phase cards with restrained depth, and engine callout. Keep CSS scoped to `.gh-v11 .how.how-premium...`; do not use it to control Ohio header/wrappers. Typography contract: method H2/card titles use `letter-spacing: normal/0`, not the compact tracking used in the `sig` display title.
- CTA + AI-ready levels: the intermediate CTA is `strip strip-premium` with `data-capture="architecture-cta"`, and the maturity section is `levels levels-premium` with `data-capture="ai-ready"` and CSS marker `task-1345-levels-premium-v1`. Keep the five-level Efeonce framework (`Be Found`, `Be Readable`, `Be Correct`, `Be Actionable`, `Be Intrinsic`) as a premium maturity model, not a generic list. `Be Intrinsic` is a trajectory/preference outcome, not a guaranteed switch. Mobile includes right internal gutter in note/cards/footer so the fixed Ohio switcher does not cover microcopy; do not solve that by editing global widgets or wrappers.
- Launch readiness section: `ready ready-premium` with `data-capture="launch-ready"` and CSS marker `task-1345-ready-premium-v1`; presents "Incluido siempre" as a launch manifest, not a generic checklist. Keep SEO/AEO/measurement framed as foundational included layers, not ranking guarantees.
- Starting point selector: `seg seg-premium` with `data-capture="starting-point"` and CSS marker `task-1345-seg-premium-v1`; presents the section as a premium architecture selector with a recommended continuous-production route plus four comparable paths. CTA remains `#cotizar`. Mobile has compacted diagnostic cards and no header/wrapper overrides.
- Performance measurement section: `perf perf-premium` with `data-capture="performance-value"` and CSS marker `task-1345-perf-premium-v1`; presents measurement as a premium operating system (`control técnico -> señal comercial -> impacto de negocio`) with a 90-day reporting card, measurement ledger and CTA to `#cotizar`. Do not turn measurement into fake KPI claims; keep it framed as baseline, signals and decision-making with real data.
- Results/proof section: `proof proof-premium` with `data-capture="results-proof"` and CSS marker `task-1345-proof-premium-v1`; presents published proof as an evidence system, not a generic case gallery. It preserves the existing Ghamadent `+52%`, Sky Airlines `+127%`, and AI "en validación" claims, but adds guardrails: data, context, authorization, baseline, signal, likely cause and next cycle. Do not add fake metrics or publish AI results without authorization/evidence.
- Enterprise control section: `close close-premium` with `data-capture="enterprise-control"` and CSS marker `task-1345-close-premium-v1`; presents scale/control as a delivery control plane plus three comparable engagement models. CTA links stay pointed to `#cotizar`. Keep it framed as governance, security, traceability and operating model clarity, not as vague "enterprise-grade" decoration.
- FAQ section: `faq faq-premium` with `data-capture="faq-premium"` and CSS marker `task-1345-faq-premium-v1`; uses native `<details name="task1345-faq">` / `<summary>` disclosure for keyboard-accessible exclusive accordion behavior, plus a diagnostic brief panel. The accordion shell is intentionally transparent so the rows do not read as "card on card". FAQPage JSON-LD must match the five visible questions exactly; do not add ranking guarantees or unverified SEO/AEO claims.
- Final conversion section: `final final-premium final-growth-form` with `id="cotizar"`, `data-capture="final-growth-form"` and CSS marker `task-1345-final-growth-form-v1`; embeds the real Growth Form renderer, not a fake/static form. Keep the premium split: architecture/trust copy on the left, `diagnostic_premium` Growth Form on the right. Desktop uses a widened shell plus balanced, slightly smaller H2 so `Construyamos` does not break mid-word; do not narrow the wrap back to 1240px without checking desktop composition. Mobile intentionally gives the form panel extra right gutter so the fixed Ohio switcher does not cover critical fields; do not solve that by editing global widgets, header or wrappers.
- Do not reintroduce Wave branding, Wave copy, or raw Velo artifact naming.
- Source inspiration: TASK-1345 wireframe/flow/motion and Velo/v11 HTML as blueprint only.
- Primary conversion CTAs point to `#cotizar`. `/contacto/` remains available only as general navigation/fallback from no-script or success actions.

## Growth Form

- Slug: `efeonce-desarrollo-web-cotizacion`
- Name: `Efeonce · Cotización desarrollo de sitios web`
- Form ID: `fdef-35169368-ae4b-4403-9735-9a79a8d93822`
- Form key: `00231d6c-e1a0-4857-ae5b-a27262ae8b69`
- Current published version: v2, `fver-6fc638de-5948-407d-be0b-31954fe29877`
- Previous version: v1, `fver-b799aecc-095b-4c04-800d-b670945f444d`
- Host surface: `fhsf-2d4b97ad-7076-4958-8e0f-daf1c995e430`
- Public API base: `https://greenhouse.efeoncepro.com/api/public/growth/forms/`
- Renderer: `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js`
- Style variant: `diagnostic_premium`
- Fields: `fullName`, `email`, `companyName`, `website`, `companySize`, `projectStage`, `objective`
- Consent: required checkbox `contact_permission`, privacy URL `https://efeoncepro.com/politica-de-privacidad/`
- Security: Turnstile invisible required, public site key `0x4AAAAAADqwX2R7v-k9pItv`; POST must fail closed without `captchaToken`.
- Email gate: corporate email policy on `email`, mode `block_field`.
- Name policy: splits `fullName` into `firstName` / `lastName`.
- Success behavior: inline `success_card`, visitor-facing support copy only; do not expose internal WordPress/Growth Forms implementation details in the success state.
- Destination policy: one HubSpot-shaped destination is copied for parity, but delivery mode remains `disabled`; direct HubSpot delivery is gated by TASK-1264/operator cutover. Accepted submissions are still governed by Greenhouse Growth Forms.

## SEO

- Yoast title: `Desarrollo de sitios web | Efeonce`
- Yoast metadescription: `Diseñamos y desarrollamos sitios web rápidos, claros y preparados para vender, medir, rankear en buscadores y ser entendidos por IA.`
- Canonical: `https://efeoncepro.com/desarrollo-sitios-web/`
- Robots: index/follow after TASK-1345 live v1.
- Custom structured data: `Service` and `FAQPage`.
- Yoast structured data owns `WebPage`, `BreadcrumbList`, `WebSite`, and `Organization`.

## Rollback

Backups before TASK-1345 live mutations:

- `_gh_backup_before_task1345_landing_20260705T203255Z`
- `_gh_backup_before_task1345_landing_20260705T203338Z`
- `_gh_backup_before_task1345_reference_align_20260705T204920Z`
- `_gh_backup_before_task1345_elementor_convert_20260705T205610Z`
- `_gh_backup_before_task1345_native_aeo_hero_20260705T210712Z`
- `_gh_backup_before_task1345_native_header_css_cleanup_20260705T214905Z`
- `_gh_backup_before_task1345_restore_sanitized_content_css_20260705T215102Z`
- `_gh_backup_before_task1345_remove_hero_answer_visual_20260705T220147Z`
- `_gh_backup_before_task1345_premium_two_visitors_section_20260705T220756Z`
- `_gh_backup_before_task1345_premium_two_visitors_section_20260705T220906Z`
- `_gh_backup_before_task1345_premium_two_visitors_section_20260705T221320Z`
- `_gh_backup_before_task1345_premium_two_visitors_section_20260705T221607Z`
- `_gh_backup_before_task1345_premium_two_visitors_section_20260705T221818Z`
- `_gh_backup_before_task1345_hero_factory_animation_slot_20260705T222835Z`
- `_gh_backup_before_task1345_hero_factory_premium_v2_20260705T224535Z`
- `_gh_backup_before_task1345_hero_premium_mobile_polish_20260705T224931Z`
- `_gh_backup_before_task1345_hero_premium_mobile_polish_20260705T225242Z`
- `_gh_backup_before_task1345_hero_premium_system_v5_20260705T230250Z`
- `_gh_backup_before_task1345_hero_premium_system_v6_20260705T230626Z`
- `_gh_backup_before_task1345_hero_premium_system_v7_20260705T230933Z`
- `_gh_backup_before_task1345_method_premium_v1_20260706T023637Z`
- `_gh_backup_before_task1345_hero_premium_system_v8_20260706T023818Z`
- `_gh_backup_before_task1345_hero_motion_integration_v9_20260706T025745Z`
- `_gh_backup_before_task1345_hero_motion_integration_v9_20260706T025839Z`
- `_gh_backup_before_task1345_hero_motion_integration_v9_20260706T030148Z`
- `_gh_backup_before_task1345_hero_native_gradient_v10_20260706T030449Z`
- `_gh_backup_before_task1345_hero_visual_balance_v11_20260706T031357Z`
- `_gh_backup_before_task1345_hero_column_balance_v12_20260706T031657Z`
- `_gh_backup_before_task1345_hero_right_block_v13_20260706T033232Z`
- `_gh_backup_before_task1345_hero_right_block_v14_20260706T033636Z` (partial v14 attempt; CSS saved before HTML mutator reference bug fix)
- `_gh_backup_before_task1345_hero_right_block_v14_20260706T033901Z`
- `_gh_backup_before_task1345_levels_premium_v1_20260706T040046Z`
- `_gh_backup_before_task1345_levels_premium_v1_20260706T040351Z`
- `_gh_backup_before_task1345_levels_premium_v1_20260706T041019Z`
- `_gh_backup_before_task1345_ready_premium_v1_20260706T043735Z`
- `_gh_backup_before_task1345_ready_premium_v1_20260706T044123Z`
- `_gh_backup_before_task1345_seg_premium_v1_20260706T045453Z`
- `_gh_backup_before_task1345_seg_premium_v1_20260706T045754Z`
- `_gh_backup_before_task1345_seg_premium_v1_20260706T050020Z`
- `_gh_backup_before_task1345_perf_premium_v1_20260706T051615Z`
- `_gh_backup_before_task1345_proof_premium_v1_20260706T053022Z`
- `_gh_backup_before_task1345_proof_premium_v1_20260706T053258Z`
- `_gh_backup_before_task1345_close_premium_v1_20260706T090142Z`
- `_gh_backup_before_task1345_faq_premium_v1_20260706T092231Z`
- `_gh_backup_before_task1345_faq_premium_v1_20260706T092810Z`
- `_gh_backup_before_task1345_faq_premium_v1_20260706T092952Z`
- `_gh_backup_before_task1345_faq_premium_v1_20260706T093121Z`
- `_gh_backup_before_task1345_final_growth_form_v1_20260706T100740Z`
- `_gh_backup_before_task1345_final_growth_form_v1_20260706T101437Z`
- `_gh_backup_before_task1345_final_growth_form_v1_20260706T103022Z`

After rollback, purge Kinsta cache and re-check robots/canonical.

## Verification

- HTTP 200 live.
- Title, metadescription, canonical, OG/Twitter, robots index/follow verified in HTML.
- No visible `Wave` string and no `TASK-1345` placeholder visible.
- Elementor live: `_elementor_data` present, native hero widgets + HTML content section; `post_content` empty; no Gutenberg block/comment rendered.
- Elementor custom CSS source no longer contains `#masthead`, `#content`, `.page-container`, `#site-navigation`, `.elementor-250816`, `task-1345-native-hero-fullbleed-fix`, or `task-1345-native-hero-fullbleed-override`. The remaining generated `.elementor-250816 .elementor-element-*` selectors are Elementor's own native scoping.
- Playwright desktop 1440 and mobile 390: native Ohio header, `with-spacer=false`, `with-breadcrumbs=false`, hero starts at viewport top, no horizontal overflow.
- Captures: `.captures/task-1345-desarrollo-sitios-web-native-aeo-hero/desktop-final.png` and `.captures/task-1345-desarrollo-sitios-web-native-aeo-hero/mobile-final-390.png`.
- Latest header/hero cleanup captures: `.captures/task-1345-header-hero-probe/desktop-web.png`, `.captures/task-1345-header-hero-probe/mobile390-web.png`, and `.captures/task-1345-header-hero-probe/probe.json`.
- Latest hero visual update: `wdans` removed, `wdvis` retained as animation slot; desktop/mobile captures refreshed in `.captures/task-1345-header-hero-probe/`.
- Latest hero/method premium update: `wdvis` contains `.ghf-slot ghf-slot-premium-v2 ghf-slot-right-v14`; final active hero CSS marker `task-1345-hero-right-block-v14` sits on top of the hero premium base and keeps the animation on the native/global hero gradient using only page-scoped hero/visual/proof selectors. The sweep light, scan pass, local animation background and grain are removed (`sweepEl=false`, `scanEl=false`, `localBg=false`, `scriptSweepHits=0` live); desktop visual is balanced to `541x634`, mobile visual `310x347`; reduced-motion renders all signals/nodes live. The method section uses `task-1345-method-premium-v1` with `data-capture="method"`; method H2 color computes white (`rgb(244,249,253)`) with `letter-spacing: normal`. Playwright verifies no horizontal overflow, native Ohio header, no `with-spacer`, no `with-breadcrumbs`, and reduced-motion static state. Captures: `.captures/task-1345-hero-right-block-v14/`.
- Latest two-visitors update: compact `sig-premium` live with captures in `.captures/task-1345-two-visitors-premium/`; `tmp/task1345_two_visitors_probe.mjs` verifies desktop/mobile 390, no overflow, no console errors, `hasPremium=true`, `hasLegacyPane=false`, section `1400x1041` desktop / `350x1958` mobile. Typography probe verifies H2 display tracking `-2.31984px` desktop / `-1.63215px` mobile and inherited teal accent spacing.
- Latest CTA/AI-ready levels update: `strip-premium` + `levels-premium` live with CSS marker `task-1345-levels-premium-v1`; source check `tmp/task1345_find_elementor_css_sources.php` returns `elementHits=[]` and `pageSettingsHits=[]`. Playwright verifies desktop/mobile 390/reduced `overflow=0`, native Ohio header, no `with-spacer`, no `with-breadcrumbs`, 5 maturity cards, strip desktop `1400x189`, levels desktop `1400x1401`, strip mobile `350x299`, levels mobile `350x2231`, reduced-motion `transition:none`, and mobile card gutter `44px`. Captures: `.captures/task-1345-levels-premium-v1-final/`.
- Latest launch readiness update: `ready-premium` live with CSS marker `task-1345-ready-premium-v1`; Playwright verifies desktop/mobile 390 `overflow=0`, native Ohio header, no `with-spacer`, no `with-breadcrumbs`, 4 readiness cards, release manifest, proof band, and no custom header/wrapper selector hits. Captures: `.captures/task-1345-ready-premium-v1/`.
- Latest starting point selector update: `seg-premium` live with CSS marker `task-1345-seg-premium-v1`; Playwright verifies desktop/mobile 390 `overflow=0`, native Ohio header, no `with-spacer`, no `with-breadcrumbs`, 4 path cards, 3 decision signals, CTA `#cotizar`, and reduced-motion transitions disabled. Captures: `.captures/task-1345-seg-premium-v1/`.
- Latest performance measurement update: `perf-premium` live with CSS marker `task-1345-perf-premium-v1`; Playwright verifies desktop/mobile 390 `overflow=0`, native Ohio header, no `with-spacer`, no `with-breadcrumbs`, 3 value cards, 4 report steps, 4 ledger rows, CTA `#cotizar`, and reduced-motion transitions disabled. Captures: `.captures/task-1345-perf-premium-v1/`.
- Latest results/proof update: `proof-premium` live with CSS marker `task-1345-proof-premium-v1`; Playwright verifies desktop/mobile 390 `overflow=0`, native Ohio header, no `with-spacer`, no `with-breadcrumbs`, 3 proof cards, 4 evidence ledger rows, 3 platform partner pills, no custom header/wrapper selector hits, and reduced-motion transitions disabled. Elementor source check returns `elementHits=[]` and `pageSettingsHits=[]`. Captures: `.captures/task-1345-proof-premium-v1/`.
- Latest enterprise control update: `close-premium` live with CSS marker `task-1345-close-premium-v1`; Playwright verifies desktop/mobile 390 `overflow=0`, native Ohio header, no `with-spacer`, no `with-breadcrumbs`, 4 control signals, 4 delivery plane rows, 3 engagement model cards, 3 CTAs to `#cotizar`, no custom header/wrapper selector hits, and reduced-motion transitions/ambient pulse disabled. Elementor source check returns `elementHits=[]` and `pageSettingsHits=[]`. Captures: `.captures/task-1345-close-premium-v1/`.
- Latest FAQ update: `faq-premium` live with CSS marker `task-1345-faq-premium-v1`; Playwright verifies clean desktop/mobile 390 `overflow=0`, native Ohio header, no `with-spacer`, no `with-breadcrumbs`, 5 native disclosure items, one open item by `name` accordion behavior, 4 diagnostic brief items, visible FAQ questions equal FAQPage JSON-LD questions, no custom header/wrapper selector hits, and reduced-motion transitions/reveal animation disabled. Screenshot capture after Playwright's element screenshot can expose Ohio's hidden wide submenu as a known false positive; the pre-screenshot `cleanViewport` is the section/page overflow truth. Elementor source check returns `elementHits=[]` and `pageSettingsHits=[]`. Captures: `.captures/task-1345-faq-premium-v1/`.
- Latest final Growth Form update: `final-growth-form` live with CSS marker `task-1345-final-growth-form-v1`; Elementor source check returns `elementHits=[]` and `pageSettingsHits=[]`, and the final widget contains `<greenhouse-form form-key="00231d6c-e1a0-4857-ae5b-a27262ae8b69" surface="fhsf-2d4b97ad-7076-4958-8e0f-daf1c995e430" locale="es-CL" color-scheme="light" appearance="bare">`. Public API with `Origin: https://efeoncepro.com` returns v2 (`fver-6fc638de-5948-407d-be0b-31954fe29877`) and CORS `access-control-allow-origin: https://efeoncepro.com`; OPTIONS submit returns 204 with `POST, OPTIONS`. POST without Turnstile token returns 403 `captcha_failed/missing_token` and submission counts remain `{"total":"0","accepted":"0","rejected":"0"}`. Playwright verifies desktop/mobile 390/reduced `overflow=0`, native Ohio header, no `with-spacer`, no `with-breadcrumbs`, renderer mounted, no fake `.formcard` fields, no public internal copy (`Growth Forms`/`WordPress`), premium trust copy present, select listbox opens within viewport, client validation renders before captcha, and reduced-motion transitions are disabled. Desktop screenshot verifies the final H2 no longer splits `Construyamos` mid-word after the widened shell/type scale adjustment. Captures: `.captures/task-1345-final-growth-form-v3/`.

## Known Follow-ups

- Decide whether final IA should keep `/desarrollo-sitios-web/` or migrate to `/servicios/diseno-desarrollo-web/` with redirect/canonical.
- Resolve `/diseno-web/` legacy ownership.
- Add durable GVC scenario if the landing enters recurring visual governance.
- Run Rich Results Test and Search Console after indexing.
- HubSpot direct delivery cutover remains gated by TASK-1264/operator approval; do not flip the destination from `disabled` without a separate rollout.
- Run a real accepted submission only with operator approval because it creates a live Greenhouse submission/lead record.
