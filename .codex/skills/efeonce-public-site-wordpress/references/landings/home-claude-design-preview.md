# Home — Claude Design / Elementor

## Recorded runtime identity — checkpoint 2026-08-31

These are recorded deployment facts, not a substitute for current CMS readback. Verify identity,
ownership and hash before any mutation. Durable implementation lessons live in
`references/source-led-elementor-patterns.md` and `references/home-editorial-maintenance.md`; editorial closure
and recovery index: `docs/audits/public-site/2026-08-31-home-editorial-closure.md`. Earlier chronology and artifacts live in
`docs/audits/public-site/2026-08-30-home-visual-review.md`.

- URL: `https://efeoncepro.com/`; former preview slug redirects to the root.
- WordPress page ID: `251731`
- Status: `publish`, assigned as `page_on_front`, Yoast `index, follow`, root canonical.
- Elementor template: normal `default` page with the global Ohio header and footer
- Ownership marker: `_gh_task1358_preview_contract=task-1358-home-claude-preview-v1`
- Latest Elementor hash: `9aa8c770c0907edc5ad70f4489cccedb56cc03d0a7802e01eef0e2beee832562`
- Current production Home: `251731` since the operator-authorized 2026-08-30 cutover. Former Home `2791` retains its content at `/home-2/`, now noindex.

## Source and fidelity contract

- Source ZIP: `/Users/jreye/Documents/agencia/Landing - Agencia.zip`
- Extracted source: `/Users/jreye/Documents/agencia/Landing - Agencia/Landing Agencia.dc.html`
- Source SHA-256: `6062b32ec68f4511498ab91d8e3582b18247ff52d1354dfe2b5042a32abd7617`
- Port: 16 body regions from `hero` through `agenda`; the export's header and footer are deliberately excluded.
- Preserved/evolved interactions: scroll progress, reveal/counter/draw/grow effects, parallax, motor hover flow, services filter, continuous rails with hover pause, FAQ, native video dialog/focus return, mobile sticky CTA, native agenda navigation, smooth anchors and reduced motion. Full keyboard traversal remains unverified; native modality alone does not certify cross-frame keyboard behavior.
- The operator authorized reuse of old Home carousel images: ten landscape Media attachments now fill two five-item rails. No theme demo assets. The later operator-supplied video is the Efeonce showreel, not the original placeholder tour. See the visual audit for IDs/provenance.
- Source composition is the baseline; the operator-approved editorial rounds replace its copy, including the final ally/coordination reframe, qualitative comparison and structured FAQ. The showreel removes fictitious demo/duration text. These targeted overrides do not approve the remaining claims or close the broader copywriting phase.

## Mutation and rollback

- Current implementation: 17 native containers + 17 semantic Elementor widgets, zero HTML widgets; 407 root content controls plus six repeaters.
- Runtime owner: existing `eo-elementor-widgets` plugin, `greenhouse_agency_*` classes; plugin schemas/templates, conditional CSS/JS, editor-safe mount/unmount.
- Technical/functional/manual contract: `docs/architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md`. The monolithic HTML checkpoint is superseded; never regenerate it as the current page.

- Mutate through Elementor `Document::save()` using the guarded page ID and ownership marker; edits now affect the live Home.
- Pre-modular snapshot: `_gh_backup_before_agency_elementor_20260830T160012Z`; pre-media-normalization modular snapshot: `_gh_backup_before_agency_media_20260830T160527Z`. Runtime backups are listed in the technical contract.
- Rollback: restore the desired snapshot's Elementor data, settings, status and template through the governed WP-CLI lane, clear Elementor files/cache and purge Kinsta.
- Keep the approved root canonical and index policy. Do not reset it to preview metadata/noindex during visual edits.
- Home cutover snapshot: WordPress option `_gh_home_cutover_20260830_162109`; restore only changed options/menu/title/SEO metas if authorized. Both Elementor documents retained their hashes.

## Latest review

- Problem copy 2026-08-31: coordination cost for the client team; qualitative diagram labelled as an example.
  Removed universal disconnection claim, growth-compounding jargon and fictitious 0/4 counter.
  Native copy edits plus scoped card CSS: hide empty hover tags and compact mobile icons/gap.
  Snapshot `_gh_home_problem_copy_20260831_205851`.
  Audit `docs/audits/public-site/2026-08-31-home-problem-copy.md`.

- Comparison heading 2026-08-31: native label `Con` + official logo in one row; alt remains `Efeonce`.
  Decorative header icon retired. Snapshot `_gh_home_comparison_label_20260831_205227`.
  Audit `docs/audits/public-site/2026-08-31-home-comparison-label.md`.

- FAQ typography 2026-08-31: native `answer_lead`/`answer_note` text fields per question; escaped
  semantic strong/p templates, body-lg 16px, leading 1.6, 66ch measure, 700/400/600 hierarchy.
  Empty optional notes are hidden. Six answers updated; shared renderer and links unchanged.
  Snapshot `_gh_home_faq_typography_20260831_204935`; audit `docs/audits/public-site/2026-08-31-home-faq-typography.md`.

- FAQ/Agenda copy 2026-08-31: keep six questions addressing fit, internal team, scoped projects, follow-up,
  existing tools and first steps. No generic agency superiority or live-data/complete-diagnosis promise.
  Native text edits only, row IDs/order/layouts/links preserved. Snapshot `_gh_home_faq_agenda_copy_20260831_204441`.
  Audit `docs/audits/public-site/2026-08-31-home-faq-agenda-copy.md`. No FAQ schema added.

- Reframe/comparison 2026-08-31: firm ally/coordination headline; comparison now uses 24 native qualitative text cells.
  Removed unsupported scores, absolute yes/no icons and software-ownership superiority.
  Comparison schema originally had 56 fields; now 55 after removing the header icon; table retains four alternatives and horizontal scrolling below 760 px.
  Snapshot `_gh_home_reframe_comparison_20260831_203947`; runtime backup `/tmp/eo-agency-before-20260831-203940.tar`.
  Audit `docs/audits/public-site/2026-08-31-home-reframe-comparison-copy.md`; no other section data changed.

- Second copy pass 2026-08-31: Greenhouse proof panel, Products and Method/team rewritten via native text controls.
  Panel labelled as illustrative at top and bottom; numeric examples retained, no live-data/attribution claim.
  Removed provider-lock-in and zero-staff-turnover language. Existing product availability labels remain unchanged.
  Snapshot `_gh_home_second_three_copy_20260831_203207`; audit `docs/audits/public-site/2026-08-31-home-proof-products-method-copy.md`.
  Browser 1280/390 and product layout 878 verified; no schema, code, media or link changes.

- Copy 2026-08-31: approved hero headline/badge plus Reframe, Motor, Services and Integrations revised.
  All four-section changes use native text controls; twelve service rows preserve IDs, media, categories and URLs.
  Software ownership and one-data absolutes removed from the selected sections; Greenhouse is described as metrics/follow-up.
  Snapshot `_gh_home_four_sections_copy_20260831_202607`; audit `docs/audits/public-site/2026-08-31-home-four-sections-copy.md`.
  Hero audit `docs/audits/public-site/2026-08-31-home-hero-copy.md` covers its two extra native controls and underline correction.
  Other Home claims and authenticated editor save/reload remain outside this copy revision.

- Home SEO/HTTPS: six native Yoast title/description/social fields, two Media URLs normalized through
  Document::save. Existing Yoast WebPage/WebSite/Organization graph retained, no duplicate JSON-LD.
  Snapshot `_gh_home_seo_20260830_204702`; anonymous verifier `node scripts/public-website/verify-agency-home-seo.cjs`.
  Audit: `docs/audits/public-site/2026-08-30-home-seo-aeo.md`. Global theme/entity claims and GSC/CWV remain separate.
  Reusable method: `seo-aeo/references/home-landing-metadata-schema.md`; page-specific metadata is not a global identity rewrite.

- Hero video: Experience native `video_url` (`https://www.youtube.com/watch?v=yHUystNmtcQ`) opens the supplied Efeonce showreel in a navy native dialog.
  No iframe before click or in editor; close/unmount destroys playback. Snapshot `_gh_home_video_20260830_195821`, four-file
  backup `/tmp/eo-agency-before-20260830-195756.tar`. Recorded live playback/close/return-focus/1280/890/390/reduced verified; full keyboard traversal
  and Escape from the YouTube frame not certified. Evidence `.captures/agency-home-video/` and visual audit.

- Cases is now a compact navy CTA, approved copy “Del desafío al trabajo hecho.”, teal button to published portfolio page 247116 (`/portafolio/`). Five native text/URL fields replace four case cards/metrics and their repeater. Snapshot `_gh_home_compact_cases_20260830_194253`; four-file backup `194241`. Browser click/hover/reduced-motion and 1280/890/390 layout verified; other widgets and protected metadata unchanged.

- Services: four native optional URL fields populated (SEO/AEO → 251078; Creative → 251279; CRM → 244079; Web → 250816), eight cards remain unlinked. Snapshot `_gh_home_service_links_20260830_192809`; file backups `192624` and URL-default repair `192741`. Four browser navigations and responsive geometry verified; full keyboard traversal not verified. See visual audit for incident, tests and rollback.

- Narrative labels: “El costo de trabajar por separado” and “Un equipo. Una misma dirección.” replace wireframe labels in two native text controls. Snapshot `_gh_home_narrative_labels_20260830_192130`; no runtime files or other content/styles changed. Full copy review remains pending.

- Fifth review: official Kortex/Wave marks; Verk removed; launch notice hidden with native select. Hero brands Media repeater reuses Berel/SKY/Bresler through the governed Logo Marquee proof-only option. Original hover restored on semantic logo selectors. Carousel measures exact period and viewport coverage; resize rebuilds copies. Snapshot `_gh_home_fifth_review_20260830_190751`; backups `190735` (14 files) and `191359` (hover CSS). Evidence in `.captures/agency-home-fifth-review/`; protected Home/SEO/Ohio/AEO/Web/RRSS data unchanged.

- Fourth review: CRM HubSpot inherits teal/white hover through an alpha mask; official negative Greenhouse/Globe marks from the repo use native Media. Snapshot `_gh_home_brand_marks_20260830_184944`; five-file backup `184932`; QA 390/890/1280 in `.captures/agency-home-brand-marks/`. Copy and global theme unchanged.

- Third review: six annotations fixed (sustained hover, FAQ mail removed, moderated comparison close, CRM sprocket, smooth glows, proportional hero mark). Snapshot `_gh_home_followup_20260830_184109`; runtime backups `184000` and `184358`. QA in `.captures/agency-home-third-review/browser/`. Native Ohio `-undash` prevents link underline from covering CTA background.

- Four follow-up annotations also applied: Ecosystem H2 contrast, teal Agenda CTA, contained FAQ CTA with stacked tablet layout (up to 1024 px), and the Social Proof HubSpot sprocket. Verified at 1280/890/390; `.captures/agency-home-polish/browser/`. Five-file runtime backup `/tmp/eo-agency-before-20260830-182819.tar`; Elementor document hash unchanged.
- Six annotations applied and verified at 1280/890/390: `docs/audits/public-site/2026-08-30-home-visual-review.md`; frames in `.captures/agency-home-review/browser/`.
- Snapshot `_gh_home_review_20260830_181803`; HTTPS follow-up `_gh_home_review_https_20260830`. Runtime backup `/tmp/eo-agency-before-20260830-181731.tar`.
- Dark H2s have scoped editable heading color; original accents remain. Shared logos and ten artworks load; no overflow, no application errors, reduced-motion reveals remain visible.

## Verification evidence and its limits

- Latest checkpoint: 17 widgets, zero HTML, 407 root content controls/six repeaters; PHP renderer,
  lifecycle JS have earlier per-feature evidence; fresh real Elementor contract and twelve file hashes
  verified in the editorial closure audit. Previous per-review
  control counts below or in the audit are historical and must not be reused as current schema assertions.
- Showreel browser checks recorded real playback, X/backdrop cleanup, return focus and Escape with focus
  on X. Escape inside YouTube did not close in that tool session; Tab did not advance. No full keyboard
  certification. Emulated mobile captures require their recorded DOM geometry due to host scaling.

- Post-cutover evidence: `.captures/agency-home-cutover/`, desktop 1280/mobile 390, root canonical/index, 17 widgets, zero HTML, filters/FAQ/modal/focus, no overflow or console errors. Home menu `247118` points to `251731`. Previous preview URL reaches root; previous Home renders noindex.

- Initial modular checkpoint evidence: `.captures/agency-elementor-rollout/browser/`; its PHP renderer, JS lifecycle and live WP-CLI contract results predate the later annotated reviews.
- Initial modular desktop 1440/mobile 390 frames were inspected; no page overflow, motor cards did not overlap; filters/FAQ/then-placeholder-modal focus return and reduced motion were verified. Mobile comparison intentionally scrolls inside its wrapper. Use latest per-feature evidence above for changed behavior.
- In-editor editing/save/reload remains **unverified**. Login is not a verified blocker. Server probes and frontend checks do not prove the editor workflow.
- The demo form/submit handler was removed. The horizontal agenda card opens the existing `/agenda/` scheduler (availability checked, no booking created). Trust delegates to the same Logo Marquee used by Redes Sociales; HubSpot uses local Simple Icons 16.21.0 SVG.
- The following source/first-port captures are historical; they do not certify the modular editor or the current video dialog. Demo form states below describe a removed prototype, not a live form or real submission.

- Source audit: `.captures/task-1358-claude-source-audit/`
- Live audit: `.captures/task-1358-home-preview-live/`
- Final audit: `.captures/task-1358-home-preview-live/final-audit/audit.json`
- Historical first-port checks at desktop 1440 px and mobile 390 px: canonical Ohio chrome, one H1, 16 regions, no horizontal overflow on clean loads, dark/light Ohio bands, filter, FAQ, placeholder-tour keyboard behavior and focus return, prototype-only form error/success states, sticky mobile CTA, reduced motion and no application console errors. Prototype form/handler were subsequently removed; Agenda uses the existing scheduler.

## Promotion boundary

The operator explicitly authorized promotion on 2026-08-30; it is recorded as applied. This does not reinstate a separate `/agencia/` or close the broader rework. Residual claims, in-editor save/reload and full video keyboard traversal remain pending. The documented annotation rounds, service links, compact Cases CTA and supplied showreel are applied at this checkpoint. Agenda navigates to the existing booking engine, not a demo form.
