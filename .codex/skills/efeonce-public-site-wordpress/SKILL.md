---
name: efeonce-public-site-wordpress
description: Operate and update the Efeonce public WordPress site knowledge base for efeoncepro.com. Use when working with the public site, Kinsta, WordPress REST/WP-CLI, WP Abilities, Ohio theme, Elementor, Greenhouse-to-WordPress landing pages, HubSpot attribution, public-site layout incidents, authenticated discovery, repository/GitOps binding, or docs/tasks for EPIC-019/TASK-1111/TASK-1116/TASK-1122.
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
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md` and `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md` for the control-plane contract.
- `docs/operations/public-site-repository-control-plane-discovery-20260614.md` before deciding where public-site WordPress code should live or where to implement the bridge plugin.
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`, `docs/tasks/in-progress/TASK-1111-public-website-read-only-discovery.md`, `docs/tasks/to-do/TASK-1122-public-site-code-baseline-gitops-binding.md`, and `docs/tasks/to-do/TASK-1116-greenhouse-wp-bridge-draft-only-foundation.md`.

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
- Repository/control-plane discovery on 2026-06-14: `efeoncepro/efeonce-web` is an Astro/headless historical rebuild and is not the current live WordPress/Ohio/Elementor runtime source. The closest local WordPress operational repo is `/Users/jreye/Documents/efeonce-sp`, but its remote is `cesargrowth11/efeonce-sp` and it is not reconciled with Kinsta live. `TASK-1122` must establish a GitOps baseline/repo binding before `TASK-1116` implements `greenhouse-wp-bridge`.

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
```

The script auto-loads `.env.local` and then `.env` without overwriting shell/CI variables. Authenticated discovery requires the env/secret plumbing already configured by the repo, but agents should not need to `source .env.local` or paste long inline env commands. Do not paste secret values into the command line. When WP-CLI is needed directly, use the Kinsta SSH env vars and run read-only commands such as `wp option get`, `wp theme list`, `wp plugin list`, `wp post list`, and `wp post meta list`.

Use `pnpm public-website:export-live-code` for `TASK-1122` live-code baseline exports. It downloads only governed code candidates into ignored `tmp/public-site-code-baselines/<timestamp>/` and writes a per-file SHA-256 manifest. It does not mutate Kinsta, WordPress or GitHub.

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
- Do not implement the bridge in an unconfirmed repository/path. First run the `TASK-1122` flow: reconcile live `ohio-child`/custom plugins, decide or create the governed `efeoncepro/*` repo, record baseline SHA/hashes, and define the GitHub->Kinsta deploy/rollback rail.
- Operators should work from Greenhouse. GitHub remains the behind-the-scenes versioning/deployment rail, not a separate manual operating surface for normal public-site work.
- Treat direct Kinsta filesystem edits as emergency-only; backport every live change to the repo baseline.
- Do not use `efeonce-web` as the deploy source unless a new ADR explicitly moves the public site to Astro/headless.

### WordPress React Boundary

- WordPress can use React through its native developer stack, but EPIC-019 must not become a React SPA rewrite.
- Prefer server-rendered blocks plus the Interactivity API for small frontend interactions.
- Use `@wordpress/element`/Gutenberg packages for editor/admin UI. Watch React 19 compatibility with WordPress/Gutenberg/plugins before upgrading assumptions.

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
