---
name: efeonce-public-site-wordpress
description: Operate and update the Efeonce public WordPress site knowledge base for efeoncepro.com. Use when working with the public site, Kinsta, WordPress REST/WP-CLI, WP Abilities, Ohio theme, Elementor, Greenhouse-to-WordPress landing pages, HubSpot attribution, public-site layout incidents, authenticated discovery, repository/GitOps binding, AI Content Factory, or docs/tasks for EPIC-019/TASK-1111/TASK-1116/TASK-1122/TASK-1123.
---

# Efeonce Public Site WordPress

## Purpose

Use this skill as the living operational memory for `efeoncepro.com`: WordPress on Kinsta, Ohio + Elementor layout behavior, REST/WP-CLI discovery, WP Abilities, and the planned Greenhouse public-site bridge. Keep it current whenever a new public-site discovery, incident, integration decision, or WordPress developer update changes the operating model.

## Load First

Before changing the site or Greenhouse bridge code, read the relevant sources:

- `docs/operations/discovery-public-website-wordpress-20260614.md` for the latest inventory and authenticated discovery results.
- `docs/operations/discovery-public-website-elementor-20260614.md` when the task touches Elementor widgets, `_elementor_data`, page structure, templates, or Greenhouse-controlled landing-page generation.
- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md` and `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md` for Ohio/Elementor layout operations.
- `docs/documentation/public-site/wordpress-ohio-elementor-widget-inventory.md` and `docs/manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md` before creating, cloning, or changing landing modules/widgets. These docs inventory Ohio Extra widgets, Elementor templates, plugin dependencies, page metas, and gaps for future Greenhouse-owned landings.
- `docs/documentation/public-site/wordpress-custom-widgets-react-strategy.md` before proposing custom Elementor widgets, Gutenberg blocks, WordPress admin React, or Interactivity API work.
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md` and `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md` for the control-plane contract.
- `docs/operations/public-site-repository-control-plane-discovery-20260614.md` before deciding where public-site WordPress code should live or where to implement the bridge plugin.
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`, `docs/tasks/in-progress/TASK-1111-public-website-read-only-discovery.md`, `docs/tasks/in-progress/TASK-1122-public-site-code-baseline-gitops-binding.md`, `docs/tasks/in-progress/TASK-1116-greenhouse-wp-bridge-draft-only-foundation.md`, and `docs/tasks/in-progress/TASK-1123-greenhouse-ai-content-factory-agent-kit.md`.

Pair with `wp-rest-api`, `wp-wpcli-and-ops`, `wp-abilities-api`, `wp-interactivity-api`, `wp-block-development`, `greenhouse-secret-hygiene`, `greenhouse-browser-diagnostics`, and `greenhouse-documentation-governor` when those domains apply.

## Current Runtime Facts

- Public site: `https://efeoncepro.com`.
- Hosting: Kinsta. WordPress path observed via SSH/WP-CLI: `/www/efeoncegroup_752/public`.
- Active theme: `ohio-child`; parent theme: `ohio`.
- Important plugins observed: Elementor/Elementor Pro, Yoast SEO/Premium, HubSpot/Leadin, `eo-headless-content`, `eo-vibe-coding-api`, and AI provider plugins.
- REST is available through `wp/v2`; `wp-abilities/v1` and `application-passwords` are advertised.
- Authenticated discovery currently resolves the integration account as user login `Greenhouse INTEGRATION`, slug `greenhouse-integration`, display `Greenhouse`. Its current role is `administrator`; reduce privileges before production bridge rollout.
- Authenticated WP Abilities discovery returned 33 abilities.
- Public inventory observed: 40 pages, 32 posts, private CPT `landing`.
- Elementor facts observed on 2026-06-14: front page `page_id=2791` is `Home 2` and uses modern containers; `/blog` (`page_id=18456`) mixes legacy sections/columns with containers; `/contacto` (`page_id=20729`) uses legacy sections/columns. Do not assume a single Elementor structural model.
- Ohio/Elementor inventory observed on 2026-06-14: 253 registered Elementor widgets, 37 Ohio Extra widgets, 246 Elementor documents with data, and 67 `elementor_library` templates. Top Ohio widgets by usage are `ohio_heading`, `ohio_service_table`, `ohio_icon_box`, `ohio_button`, `ohio_counter`, `ohio_clients_logo`, `ohio_badge`, `ohio_testimonial`, `ohio_recent_posts`, and `ohio_recent_projects`.
- Visual foundation observed on 2026-06-14: effective Ohio runtime uses `--clb-color-primary=#023c70`, `--clb-color-link-hover=#024c8f`, body text `Inter`, headings/buttons `DM Sans`, grid gutter `1rem`, container width `86vw`, and footer background `#161519`. Elementor active kit is `7`, but its generated `post-7.css` still exposes Elementor defaults (`#6EC1E4`, `#61CE70`, Roboto), so never treat the kit CSS as brand source of truth without computed-style verification.
- Secret reference for the current Application Password: `public-website-wordpress-application-password`. Never print or commit the value. Rotate before production because the value was pasted during the working session.
- Kinsta API token is still pending for cache/environment/backups automation. Do not claim cache-clear or backup automation is operational until verified.
- Kinsta staging exploration on 2026-06-14: Kinsta docs say each WordPress install can have a free Standard Staging environment unless the plan restricts it; Premium Staging is the paid add-on at USD 20/month per environment. The Efeonce account's actual staging availability is not confirmed because Kinsta API/MyKinsta state is still unavailable from the repo. See `docs/operations/public-site-kinsta-staging-priority-exploration-20260614.md`.
- Repository/control-plane discovery on 2026-06-14: `efeoncepro/efeonce-web` is an Astro/headless historical rebuild and is not the current live WordPress/Ohio/Elementor runtime source. The closest local WordPress operational repo is `/Users/jreye/Documents/efeonce-sp`, but its remote is `cesargrowth11/efeonce-sp` and it is not reconciled with Kinsta live. `TASK-1122` must establish a GitOps baseline/repo binding before `TASK-1116` implements `greenhouse-wp-bridge`.
- Runtime repo binding established on 2026-06-14: private repo `efeoncepro/efeonce-public-site-runtime`, default branch `main`, baseline SHA `0fa6bfd`, tag `baseline-2026-06-14-live`, binding manifest `docs/operations/public-site-runtime-repository-binding-20260614.json`. The repo tracks canonical live `ohio-child`, `eo-headless-content`, `eo-vibe-coding-api`, and `greenhouse-wp-bridge`. Greenhouse status/dry-run commands exist, but automated deploy apply is still blocked by Kinsta token/cache/backups/release policy.
- `greenhouse-wp-bridge` current state: `wp-content/plugins/greenhouse-wp-bridge`, version `0.4.0` in the runtime repo, not deployed to Kinsta yet. Production still runs the last deployed read-only/signed draft foundation from 2026-06-14; authenticated `health`, `inspection/elementor-document/244079`, `inspection/block-document/249766`, and `inspection/ohio-widget-catalog` were smoke-tested as `200`, while anonymous health returns `401 ghwpb_auth_required`. v0.3.x adds HMAC/shared-secret signature verification, body hash, timestamp window, replay guard and `draft/private` routes in code. v0.3.1 avoids `wp-config.php` edits by supporting constants/env first and WP options fallback (`autoload=no`) with `wp greenhouse-bridge ...` WP-CLI commands. v0.4.0 adds a draft-only `POST /drafts/from-existing-post` endpoint for Gutenberg refresh plans that revalidates source/block fingerprints server-side before creating a draft/private clone. Writes remain disabled until `GREENHOUSE_WP_BRIDGE_WRITES_ENABLED`, shared secret, staging/preview and least-privilege are ready. No publish, cache clear, backups or Abilities registration yet.
- Public Site content module model: Gutenberg posts use `blockName` from `parse_blocks()`; Elementor landings use `widgetType` from `_elementor_data`. Recent Efeonce posts are Gutenberg (`hasBlocks=true`, `elementorDataPresent=false`) and often include `core/freeform` legacy chunks plus `core/paragraph`, `core/heading`, `core/image`, `core/list`, `core/group`, `core/columns`, `yoast-seo/table-of-contents` and occasional third-party blocks. Treat both `blockName` and `widgetType` as builder modules, but keep the native field for patch planning.
- Content factory priority: for scaling production, treat posts and landings as two lanes. Posts should be Gutenberg/block-first (`post_draft_gutenberg`) because current Efeonce posts are already block-editor content. Landings should be constrained Elementor/Ohio modules (`landing_draft_elementor`) and only move to custom Elementor widgets when a module is reusable and fragile as raw Elementor structure.
- Content factory edit/refresh requirement: Greenhouse AI Content Factory must support `create`, `refresh` and `fix`. Before any existing post/page/module is edited, agents must inspect the live object and build a Content Intelligence Map covering post/page id, editor model, blocks/widgets, Ohio/theme metas, Elementor settings, assets, SEO/Yoast, HubSpot/CTA, anchors, ownership, freshness and content fingerprint. Refresh/fix should clone or derive a draft/private object first; direct patches to published content require explicit task/release approval.
- Content Intelligence Map MVP: `src/lib/public-site/content-factory/intelligence-map.ts` builds `contentFactoryInspectionMap.v1` from live bridge inspections. Use `pnpm public-website:content-factory:inspect -- --write` for the default samples (`249766` Gutenberg post and `244079` Elementor/Ohio landing). If local GCP auth/Secret Manager is unavailable, use `--from-bridge-inspection <path>` with versioned bridge reports. Evidence is stored in `docs/operations/public-site-content-factory-catalogs/content-intelligence-map-*.json`. The map is read-only and normalizes `blockName`, `widgetType`, `themeMeta` and `hubspot` modules with freshness/fingerprint metadata for agent refresh/fix planning.
- Gutenberg draft validator MVP: `src/lib/public-site/content-factory/gutenberg-validator.ts` exposes `validateGeneratedGutenbergDraft()` and `pnpm public-website:content-factory:validate -- --file <draft.json>`. Input is a local `contentFactoryGeneratedDraft.v1` artifact; output is `contentFactoryValidation.v1`. It blocks invalid metadata, unsafe markup, unbalanced Gutenberg comments and unsupported blocks; it warns on legacy `core/freeform` and thin structure. It never calls WordPress.
- Gutenberg plan + golden example MVP: `src/lib/public-site/content-factory/gutenberg-planner.ts` exposes `planGeneratedGutenbergPostDraft()` and `pnpm public-website:content-factory:plan -- --file <brief.json>`. Input is a local `contentFactoryBrief.v1`; output is a `contentFactoryGeneratedDraft.v1` plus validation. Golden example: `docs/documentation/public-site/content-factory-golden-examples/gutenberg-post-ai-revops-draft.json`.
- Gutenberg post deep inspection MVP: `src/lib/public-site/content-factory/post-deep-inspection.ts` exposes `contentFactoryPostDeepInspection.v1` and `pnpm public-website:content-factory:inspect-post-deep -- --post-id <id>`. It runs read-only WP-CLI `parse_blocks()` against one post and returns block paths, fingerprints, selected attrs, editability classes, risks, links, media issues and Yoast metadata for guided refresh/fix planning. Use it before editing an existing Gutenberg post; it does not write WordPress.
- Gutenberg refresh plan MVP: `src/lib/public-site/content-factory/refresh-plan.ts` exposes `contentFactoryRefreshPlan.v1` and `pnpm public-website:content-factory:refresh-plan -- --inspection <post-deep-inspection.json>`. It reads a local deep inspection artifact and emits a plan-only refresh contract with source fingerprint, path+fingerprint candidates, SEO/link/media review gates, `sendsWordPressWrite=false` and `modifiesPublishedSource=false`. It never calls WordPress.
- Gutenberg patch plan MVP: `src/lib/public-site/content-factory/patch-plan.ts` exposes `contentFactoryPatchBrief.v1` and `contentFactoryPatchPlan.v1`, plus `pnpm public-website:content-factory:patch-plan -- --refresh-plan <refresh-plan.json> --brief <patch-brief.json>`. It validates proposed text/SEO/link/preserve operations against refresh candidates, source fingerprint and block fingerprints. Output remains `mode=plan_only`, `sendsWordPressWrite=false`, `modifiesPublishedSource=false`; `ready_for_draft_clone` can feed the existing-post refresh draft plan.
- Existing Gutenberg post refresh draft plan MVP: `src/lib/public-site/content-factory/existing-post-refresh-draft-plan.ts` exposes `contentFactoryExistingPostRefreshDraftPlan.v1` and `pnpm public-website:content-factory:refresh-draft-plan -- --patch-plan <patch-plan.json>`. It converts a ready patch plan into a signed dry-run request for `POST /wp-json/greenhouse-wp-bridge/v1/drafts/from-existing-post`, with `sourceFingerprint`, per-block fingerprints, redacted HMAC headers, rollout preconditions and rollback by manifest id. It never calls WordPress or sends writes. The runtime bridge v0.4.0 endpoint is implemented in the runtime repo but not deployed to Kinsta yet.
- Gutenberg capability registry MVP: `src/lib/public-site/content-factory/gutenberg-capability-registry.ts` exposes `gutenbergBlockCapabilityRegistry.v1` and `pnpm public-website:content-factory:capabilities`. Use it before patch planning so agents reason semantically about blocks (`editorial_pullquote`, `navigation_toc`, `media_asset`, `conversion_cta`, etc.), allowed semantic operations (`refresh_editorial_pullquote`, `preserve_or_regenerate_toc`, `review_image_asset`) and required evidence. The registry gives agents creative/guided freedom; patch plans remain the deterministic safety layer that compiles to `path + fingerprint`, draft clone and no published mutation.
- Draft/private smoke plan MVP: `src/lib/public-site/content-factory/draft-smoke-plan.ts` exposes `prepareGutenbergDraftSmokePlan()` and `pnpm public-website:content-factory:smoke-plan -- --file <draft.json>`. Output is `contentFactoryDraftSmokePlan.v1` with the future bridge payload, redacted HMAC headers, rollout preconditions and rollback by manifest id. It is dry-run only and never calls WordPress.
- Greenhouse now exposes a server-side read-only bridge inspection reader at `src/lib/public-site/bridge-inspection.ts`, reused by `pnpm public-website:bridge-inspect`, and admin API `GET /api/admin/public-site/bridge-inspection?pageId=<id>`. The API is gated by `requireAdminTenantContext()` and `platform.public_site.bridge.inspect` (`read`, `all`). It reads WordPress bridge health, Elementor document summary, Gutenberg/block document summary and optional Ohio catalog; the reader adds a cache-buster to avoid stale per-ID inspection responses.

## Safety Rules

- Be read-only by default. Discovery commands must not publish, delete, install plugins, clear cache, or mutate content unless the user explicitly asks for that action.
- Never store raw Application Passwords, SSH passwords, private keys, bearer tokens, cookies, or `Authorization` headers in docs, skills, logs, screenshots, commits, or final answers.
- Use Secret Manager or local env indirection for secrets. If a secret appears in chat or terminal output, treat it as exposed and document rotation as required.
- Prefer page-scoped WordPress meta/settings for Ohio layout fixes. Use CSS only when the issue is presentational and scope it by page/body selector.
- Before live mutation: identify page/post ID, capture backup of relevant meta/file, make the smallest change, clear only the required cache, verify visually, and document rollback.
- Do not convert the public site into a Greenhouse SPA. React belongs in WordPress-native lanes: Gutenberg/admin/editor tooling, `@wordpress/element`, and limited frontend Interactivity API behavior.

## Common Workflows

### Discovery

Use the repo script first:

```bash
pnpm public-website:discover
pnpm public-website:discover -- --authenticated --wpcli --write
pnpm public-website:export-live-code
pnpm public-website:diff-runtime
pnpm public-website:runtime-status
pnpm public-website:deploy-dry-run
pnpm public-website:bridge-inspect -- --page-id 244079
pnpm public-website:content-factory:inspect -- --write
pnpm public-website:content-factory:inspect-post-deep -- --post-id 248398
pnpm public-website:content-factory:patterns
pnpm public-website:content-factory:capabilities
pnpm public-website:content-factory:plan -- --file ./tmp/content-brief.json --out ./tmp/generated-post-draft.json
pnpm public-website:content-factory:refresh-plan -- --inspection ./docs/operations/public-site-content-factory/post-deep-inspection-248398-2026-06-14T19-40-52+00-00.json --write
pnpm public-website:content-factory:patch-plan -- --refresh-plan ./docs/operations/public-site-content-factory/refresh-plan-248398-2026-06-14T19-46-00-721Z.json --brief ./docs/operations/public-site-content-factory/patch-brief-248398-guided-refresh-2026-06-14.json --write
pnpm public-website:content-factory:refresh-draft-plan -- --patch-plan ./docs/operations/public-site-content-factory/patch-plan-248398-2026-06-14T20-34-34-777Z.json --private --write
pnpm public-website:content-factory:validate -- --file ./tmp/generated-post-draft.json
pnpm public-website:content-factory:smoke-plan -- --file ./tmp/generated-post-draft.json --private --write
```

The script auto-loads `.env.local` and then `.env` without overwriting shell/CI variables. Authenticated discovery requires the env/secret plumbing already configured by the repo, but agents should not need to `source .env.local` or paste long inline env commands. Do not paste secret values into the command line. When WP-CLI is needed directly, use the Kinsta SSH env vars and run read-only commands such as `wp option get`, `wp theme list`, `wp plugin list`, `wp post list`, and `wp post meta list`.

Use `pnpm public-website:export-live-code` for `TASK-1122` live-code baseline exports. It downloads only governed code candidates into ignored `tmp/public-site-code-baselines/<timestamp>/` and writes a per-file SHA-256 manifest. It now includes `greenhouse-wp-bridge` alongside `ohio-child`, `eo-headless-content`, and `eo-vibe-coding-api`. It does not mutate Kinsta, WordPress or GitHub.

Use `pnpm public-website:diff-runtime` after a live export to compare the latest Kinsta manifest against `/Users/jreye/Documents/efeonce-public-site-runtime`. It is non-mutating and exits non-zero if a governed live file is missing or drifted in the repo.

Use `pnpm public-website:runtime-status` to read the Greenhouse binding, local runtime repo head and latest drift report. `--write` stores `docs/operations/public-site-runtime-status/status-*.json`.

Use `pnpm public-website:deploy-dry-run` to compare the runtime repo artifact against the latest live export manifest and produce a no-mutation deployment plan. `--write` stores `docs/operations/public-site-deploy-dry-runs/dry-run-*.json`. This command does not SSH, write files, clear cache, create backups or delete live-only files.

Use `pnpm public-website:bridge-inspect -- --page-id <id>` to call the active `greenhouse-wp-bridge` read-only endpoints with Application Password auth from Secret Manager. `--write` stores `docs/operations/public-site-bridge-inspections/inspection-page-*.json`. The command calls health, Elementor document inspection, Gutenberg/block document inspection and Ohio widget catalog, and never prints credentials or `Authorization` headers. Use `--no-catalog` for faster post inspections and `--no-blocks` only when checking older bridge compatibility.

Use `pnpm public-website:content-factory:inspect` to build the agent-facing Content Intelligence Map from bridge reads. By default it inspects `249766` (Gutenberg post sample) and `244079` (Elementor/Ohio landing sample). Add `--target <id[:label]>` or `--targets <id,id>` for other objects. If Secret Manager cannot be reached, pass one or more `--from-bridge-inspection <path>` values to rebuild from versioned `public-site-bridge-inspection.v1` JSON evidence. `--write` stores `docs/operations/public-site-content-factory-catalogs/content-intelligence-map-*.json`. The command is read-only and produces no WordPress mutations.

Use `pnpm public-website:content-factory:inspect-post-deep -- --post-id <id>` before a guided refresh/fix of a Gutenberg post. It executes remote WP-CLI read-only, parses the live `post_content` with `parse_blocks()`, and emits `contentFactoryPostDeepInspection.v1`: post/SEO metadata, heading outline, full block tree flattened by `path`, stable fingerprints, selected native attrs, editability classes, links and media reconciliation issues. `--write` stores `post-deep-inspection-*.json` under `docs/operations/public-site-content-factory/`. Treat any media issue or third-party/inspect-only block as a review gate before writing a clone/draft.

Use `pnpm public-website:content-factory:refresh-plan -- --inspection <post-deep-inspection.json>` after deep inspection and before any existing-post refresh. It emits `contentFactoryRefreshPlan.v1` from a local artifact only: `mode=plan_only`, `sendsWordPressWrite=false`, `modifiesPublishedSource=false`, source fingerprint, candidate updates by `path + fingerprint`, preserve/reconcile gates for TOC/lists/separators/media, and SEO/link review candidates. If the source post is published, the warning is expected: any future write must target a draft/private clone, never the published source.

Use `pnpm public-website:content-factory:patch-plan -- --refresh-plan <refresh-plan.json> --brief <patch-brief.json>` when a human/agent brief proposes concrete refinements for an existing Gutenberg post. The brief must declare `preservePublishedSource=true`, `requireDraftClone=true`, the expected source fingerprint and per-block fingerprints where applicable. The output is `contentFactoryPatchPlan.v1`; it validates proposed text/SEO/link/preserve operations against the refresh candidates and stays plan-only. `ready_for_draft_clone` means the artifact can feed a future clone/draft command; it still does not write WordPress.

Use `pnpm public-website:content-factory:refresh-draft-plan -- --patch-plan <patch-plan.json>` after a patch plan reaches `ready_for_draft_clone`. It emits `contentFactoryExistingPostRefreshDraftPlan.v1`: a signed dry-run request for the bridge v0.4.0 `POST /drafts/from-existing-post` endpoint. The request carries `sourcePostId`, `sourceFingerprint`, `targetPath`, `expectedFingerprint` and proposed text. The command never calls WordPress and never writes; future sends require the v0.4.0 plugin deployed, bridge writes enabled only for a short approved window, shared secret resolution, readback and rollback evidence.

Use `pnpm public-website:content-factory:patterns` to print `gutenbergBlockPatternCatalog.v1`, the machine-readable block policy for Efeonce blogposts. It maps block names to roles, generation policy, refresh policy, constraints and safe examples. Add `--write` to store `block-pattern-catalog-*.json` under `docs/operations/public-site-content-factory-catalogs/`.

Use `pnpm public-website:content-factory:capabilities` to print `gutenbergBlockCapabilityRegistry.v1`, the semantic capability layer for agents. It maps each governed Gutenberg block to agent role, freedom level, editable surfaces, semantic operations, required evidence, preview checks and the low-level refresh/patch operations it compiles to. Use this before writing a patch brief: ask what the block is and what kind of change is legitimate, then let `refresh-plan`/`patch-plan` enforce source fingerprint and block fingerprint later.

Use `pnpm public-website:content-factory:plan -- --file <brief.json>` to turn a local `contentFactoryBrief.v1` into a generated Gutenberg draft artifact and validation result. Add `--out <draft.json>` to store only the `contentFactoryGeneratedDraft.v1` and `--write` to store a planning evidence bundle under `docs/operations/public-site-content-factory/`. This is deterministic starter scaffolding for agents, not autonomous publish and not a model call.

Use `pnpm public-website:content-factory:validate -- --file <draft.json>` before any generated Gutenberg post draft reaches the bridge. The input must be `contentFactoryGeneratedDraft.v1` with `draft.kind=gutenberg_post`; the output is `contentFactoryValidation.v1`. Add `--write` to store validation evidence under `docs/operations/public-site-content-factory/`. Treat `status=block` as a hard stop and `status=warning` as requiring agent/human review before draft write.

For Gutenberg posts, do not generate flat paragraph-only drafts. Recent Efeonce posts are structured Gutenberg documents with intro paragraphs, `yoast-seo/table-of-contents` on long editorial posts, H2/H3 outlines, lists, quotes, pullquotes, separators and real media/embed blocks. The WordPress post title owns the H1; generated `post_content` must not include H1. Use the `EFEONCE_BLOGPOST_COMPOSITION_PROFILE` validator and the recipe at `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`. Treat `core/freeform` as observable legacy debt for inspection/refresh, not as a generated block for new Content Factory drafts.

Use `pnpm public-website:content-factory:smoke-plan -- --file <draft.json> [--private] [--write]` to prepare the first draft/private write smoke without sending it. It emits `contentFactoryDraftSmokePlan.v1`, redacts the HMAC signature, records rollout preconditions, and documents rollback by Greenhouse manifest id. This command is not a send path; actual writes require explicit operator approval, bridge writes enabled only for a short window, shared secret resolution and readback/rollback evidence.

Use `pnpm public-website:bridge-draft-contract` to prepare a non-mutating signed draft contract dry-run. It prints payload shape, route, canonical request and redacted headers. It uses a synthetic dry-run secret unless `--send` is explicitly passed; `--send` requires `PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF` and should not be used against production until writes are enabled intentionally.

For bridge provisioning, do not edit `wp-config.php` as the first path. Prefer Kinsta/env vars if available; otherwise use the v0.3.1 WP-CLI option fallback:

```bash
wp greenhouse-bridge status
wp greenhouse-bridge config set --environment=production --writes-enabled=0
printf %s "$SECRET" | wp greenhouse-bridge secret set --stdin
```

The secret must be piped through stdin, not passed as an argument or written to a temporary PHP file. The option fallback stores with `autoload=no`; constants/env still override options when present.

Use `GET /api/admin/public-site/bridge-inspection?pageId=<id>` for Greenhouse UI/API read-only inspection. Add `includeCatalog=false` for a faster health + Elementor/block pass or `includeBlocks=false` when the caller only needs Elementor/Ohio. The endpoint uses the same reader as the CLI, requires `platform.public_site.bridge.inspect`, and returns `503 public_site_bridge_auth_not_configured` when the current Greenhouse runtime lacks WordPress Application Password secret plumbing.

### Remote WP-CLI PHP Execution

Do not run multiline PHP through inline SSH quoting. Use the wrapper:

```bash
pnpm public-website:wpcli -- --eval-file ./tmp/patch.php --wp-user 12
```

The wrapper loads `.env.local`/`.env`, uploads the local PHP file with `scp`, runs `wp eval-file` in `PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH`, and removes the remote temporary file. It also handles the `ssh -p` vs `scp -P` port difference. Use it for read-only inspections and explicitly requested live mutations. Keep the PHP file out of git unless it is a durable script.

When `Document::save()` succeeds, Elementor deletes the generated post CSS and document cache. Do not treat a missing `wp-content/uploads/elementor/css/post-<id>.css` immediately after save as failure; render the public page or use Elementor's cache APIs, then verify with browser measurements/screenshots.

### Ohio + Elementor Layout Fixes

The most important lesson: several visual seams are Ohio page/meta issues, not global CSS problems.

- Blog page: `page_id=18456`. The container width issue came from `page_full_width_margins_size` being out of sync with `--clb-grid-gutter`; the live fix set it to `16px`. Sidebar logo/hamburger regression was fixed with page-scoped CSS in `wp-content/themes/ohio-child/assets/css/global-fixes.css` for `body.page-id-18456.with-header-sidebar:not(.dark-scheme)`.
- Contact page: `page_id=20729`. The background discontinuity came from Ohio `breadcrumb-holder` and `page-container.bottom-offset`; fix was page meta `page_breadcrumbs_visibility=0` and `page_add_top_padding=0`, not global background CSS.
- HubSpot services page: `page_id=244079`, slug `servicios-contratar-hubspot`. The "Efeonce tu Partner certificado" card section is a legacy Elementor `section` with id `ebe0037`. The margin fix was not CSS: set native section controls `layout=boxed` and `content_width={ unit: "px", size: 1560, sizes: [] }` through `Document::save()`. This preserves the dark background full-width while constraining only the inner `.elementor-container`.
- HubSpot services partner proof module: same page `244079`. The three adjacent legacy sections `83d3781` (intro), `ebe0037` (cards), and `5b75db1` (stack) now share semantic classes `gh-section-hubspot-partner-proof`, section-specific `gh-partner-proof-*` classes, boxed `content_width=1560px`, and 24px lateral padding. This is the preferred no-hardcode pattern for Greenhouse-recognizable Elementor modules.
- HubSpot services hero incident: same page `244079`. Ohio's page headline uses `page_header_title_background_type=featured`; Elementor also contains inline HubSpot logo images inside widgets. Do not confuse those layers. If `.page-headline .bg-image` is blank or wrong, inspect `_thumbnail_id`, `get_the_post_thumbnail_url()`, `page_header_title_background_*` meta, asset dimensions, and browser computed CSS before changing anything. The correct large headline asset restored on 2026-06-14 was attachment `248703` (`EO_Hubspot_Hiro2-2.webp`, `2001x801`), not the small inline logo attachment `243106` (`Hubspot-headline-1.webp`, `221x65`). Backups must include `_thumbnail_id`; Elementor-only backups are insufficient for Ohio headline rollback.
- HubSpot services headline display helper: same page `244079`. Ohio's parent `parts/elements/page_headline.php` has no native visual-only title override, so the child theme now owns `wp-content/themes/ohio-child/parts/elements/page_headline.php`. It reads optional meta `gh_page_headline_display_title` for the visual H1 only, preserving `post_title`, slug, breadcrumbs and SEO. Never patch the Ohio parent theme; updates will overwrite it. Mobile CSS lives in `ohio-child/assets/css/global-fixes.css` scoped to `body.page-id-244079`. The rounded modern white surface belongs to `#content > .page-container`, not `.page-headline` or `.bg-image`. The headline CTA also needs scoped hover states there: keep normal ink/white and use a neutral white/ink inversion on hover/focus. Do not add a new green accent in this hero unless Axis/Public Site tokens formally introduce it.
- Do not patch `#masthead`, footer, hero, or sidebar globally to hide a seam. That caused regressions in the sidebar logo/hamburger.

### Elementor Structure Manipulation

Use the Elementor discovery report before manipulating widgets. The editable source is the Elementor document tree in `_elementor_data`, not frontend DOM selectors.

- Element shape: `id`, `elType`, optional `widgetType`, `settings`, and child `elements`.
- Existing pages use mixed structure: support `container`, `section`, `column`, and `widget`.
- Before picking a widget or template, consult the Ohio/Elementor inventory and landing playbook. Prefer mature Ohio widgets already used heavily on the site (`ohio_heading`, `ohio_service_table`, `ohio_icon_box`, `ohio_button`, `ohio_counter`, `ohio_clients_logo`, `ohio_testimonial`, `ohio_recent_projects`) over low-use widgets unless the landing explicitly needs them.
- Use `element.id` + `elType` + `widgetType` + a light fingerprint (`title`, `_css_classes`, `css_classes`, parent path) to find existing nodes. Treat `path` as diagnostic only because it changes when the tree is reordered.
- For Greenhouse-owned landings, add semantic anchors in `settings.css_classes` / `settings._css_classes`, such as `gh-owned`, `gh-section-hero`, `gh-widget-primary-cta`, or `gh-slot-hubspot-form`.
- Do not write `_elementor_data` directly as the normal path. A WordPress bridge should load `\Elementor\Plugin::$instance->documents->get($postId)` and call `Document::save([ 'elements' => $elements, 'settings' => $settings ])` so Elementor runs permissions, hooks, version/template saves, post CSS deletion, and document cache deletion.
- Keep mutations draft/private first. For published pages, duplicate to a draft/private preview before patching.
- For legacy sections that need a full-width background but balanced inner margins, prefer Elementor's native `layout=boxed` + `content_width` on the section. Do not add page CSS for this if the Elementor control exists.
- For new Greenhouse-owned landing modules, avoid spacer-driven layout where possible. Prefer native section/container padding, gap, boxed width, and semantic `gh-*` classes.

### Visual Design Manipulation

Do not only inspect width. For every visual landing change, inspect the design layer in this order:

1. Widget type and native controls.
2. Elementor document/page settings and generated `post-<id>.css`.
3. Ohio page meta and global `--clb-*` variables.
4. Computed CSS in browser for desktop/mobile.
5. Child theme overrides only when no native control exists.

Useful Ohio controls:

- `ohio_button`: `title_color`, `button_color`, `border_color`, `title_hover_color`, `button_hover_color`, `border_hover_color`, `border_radius`, `drop_shadow`, `drop_shadow_intensity`.
- Cards/proof modules: `tilt_effect`, `drop_shadow`, `drop_shadow_intensity`, `card_effect`, `bg_color`, `bg_hover_color`, `overlay_color`, `border_color`.
- `ohio_heading`: `heading_color`, `subtitle_color`, `highlighted_color`, `highlighter_color`, `highlighted_animation`.
- Motion-heavy widgets: `ohio_recent_projects`, `ohio_recent_posts`, `ohio_carousel`, `ohio_video`, `ohio_dynamic_text`, `ohio_marquee`, `ohio_vertical_slider`.

Design guardrails:

- Blue brand should dominate (`#023c70` family); green should act as an elegant light/accent, not a new base theme.
- Keep typography aligned to runtime truth: Inter for body, DM Sans for headings/buttons.
- Fix hover/active states in widget controls first. Avoid blue-on-black, unreadable active states, or sudden non-brand hover colors.
- Motion must be enterprise-grade and subtle. Ohio has motion controls but no consistent reduced-motion contract was found, so custom aurora/background motion requires `prefers-reduced-motion`, performance checks, and visual QA.

### Greenhouse Bridge / Landing Pages

- Greenhouse is the control plane for manifests, versions, approvals, deployments, rollback, and drift.
- WordPress remains the public runtime. Kinsta owns hosting/cache. HubSpot remains attribution/CRM.
- Bridge direction: Abilities-first when available, REST fallback when needed.
- Initial bridge work must be draft-only/private until staging, preview, audit trail, rollback, permissions, and cache behavior are proven.
- Keep full API parity in mind: Greenhouse UI actions must map to command/read contracts, not one-off buttons.
- Do not implement the bridge in an unconfirmed repository/path. The confirmed repo/path is `efeoncepro/efeonce-public-site-runtime:wp-content/plugins/greenhouse-wp-bridge`. The initial read-only plugin is deployed/active on Kinsta, but any future deploy/activation that adds writes, Abilities, HMAC, cache, backup or publish behavior still requires an explicit release task and rollback plan.
- Operators should work from Greenhouse. GitHub remains the behind-the-scenes versioning/deployment rail, not a separate manual operating surface for normal public-site work.
- Treat direct Kinsta filesystem edits as emergency-only; backport every live change to the repo baseline.
- Do not use `efeonce-web` as the deploy source unless a new ADR explicitly moves the public site to Astro/headless.

### WordPress React Boundary

- WordPress can use React through its native developer stack, but EPIC-019 must not become a React SPA rewrite.
- Prefer server-rendered blocks plus the Interactivity API for small frontend interactions.
- Use `@wordpress/element`/Gutenberg packages for editor/admin UI. Watch React 19 compatibility with WordPress/Gutenberg/plugins before upgrading assumptions.
- Custom Elementor widgets are allowed when Ohio/Elementor native widgets do not cover a reusable Greenhouse-owned module. Implement them in a plugin in `efeoncepro/efeonce-public-site-runtime`, not in Ohio parent or as freeform frontend React. First pilot candidate: `Greenhouse Partner Proof`.

## Update Protocol

Update this skill when any of these change:

- WordPress version, active theme, major plugin inventory, REST namespace inventory, or WP Abilities inventory.
- Kinsta credentials/token availability, cache/backups/deploy procedure, or SSH/WP-CLI path.
- Greenhouse public-site architecture, ADRs, EPIC-019, TASK-1111, TASK-1122, TASK-1116, or follow-up tasks.
- A new Ohio/Elementor incident teaches a layout rule, selector risk, backup path, or rollback pattern.
- Elementor page structure, widget controls, template inventory, or bridge patch contracts are newly discovered.
- WordPress official developer guidance changes the React/Interactivity/Abilities/agent skill strategy.

How to update:

1. Refresh discovery with the safest available command.
2. Update the canonical docs first when the change is durable.
3. Update both copies of this skill: `.codex/skills/efeonce-public-site-wordpress/SKILL.md` and `.claude/skills/efeonce-public-site-wordpress/SKILL.md`.
4. Keep secrets out; reference secret names and env var names only.
5. Run skill validation plus `pnpm docs:closure-check` and update `project_context.md`, `Handoff.md`, and `changelog.md` if operating behavior changed.
