---
name: efeonce-public-site-wordpress
description: Operate and update the Efeonce public WordPress site knowledge base for efeoncepro.com. Use when working with the public site, Kinsta, WordPress REST/WP-CLI, WP Abilities, Ohio theme, Elementor, Greenhouse-to-WordPress landing pages, HubSpot attribution, public-site layout incidents, authenticated discovery, or docs/tasks for EPIC-019/TASK-1111/TASK-1116.
---

# Efeonce Public Site WordPress

## Purpose

Use this skill as the living operational memory for `efeoncepro.com`: WordPress on Kinsta, Ohio + Elementor layout behavior, REST/WP-CLI discovery, WP Abilities, and the planned Greenhouse public-site bridge. Keep it current whenever a new public-site discovery, incident, integration decision, or WordPress developer update changes the operating model.

## Load First

Before changing the site or Greenhouse bridge code, read the relevant sources:

- `docs/operations/discovery-public-website-wordpress-20260614.md` for the latest inventory and authenticated discovery results.
- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md` and `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md` for Ohio/Elementor layout operations.
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md` and `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md` for the control-plane contract.
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`, `docs/tasks/in-progress/TASK-1111-public-website-read-only-discovery.md`, and `docs/tasks/to-do/TASK-1116-greenhouse-wp-bridge-draft-foundation.md`.

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
- Secret reference for the current Application Password: `public-website-wordpress-application-password`. Never print or commit the value. Rotate before production because the value was pasted during the working session.
- Kinsta API token is still pending for cache/environment/backups automation. Do not claim cache-clear or backup automation is operational until verified.

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
```

Authenticated discovery requires env/secret plumbing already configured by the repo. Do not paste secret values into the command line. When WP-CLI is needed directly, use the Kinsta SSH env vars and run read-only commands such as `wp option get`, `wp theme list`, `wp plugin list`, `wp post list`, and `wp post meta list`.

### Ohio + Elementor Layout Fixes

The most important lesson: several visual seams are Ohio page/meta issues, not global CSS problems.

- Blog page: `page_id=18456`. The container width issue came from `page_full_width_margins_size` being out of sync with `--clb-grid-gutter`; the live fix set it to `16px`. Sidebar logo/hamburger regression was fixed with page-scoped CSS in `wp-content/themes/ohio-child/assets/css/global-fixes.css` for `body.page-id-18456.with-header-sidebar:not(.dark-scheme)`.
- Contact page: `page_id=20729`. The background discontinuity came from Ohio `breadcrumb-holder` and `page-container.bottom-offset`; fix was page meta `page_breadcrumbs_visibility=0` and `page_add_top_padding=0`, not global background CSS.
- Do not patch `#masthead`, footer, hero, or sidebar globally to hide a seam. That caused regressions in the sidebar logo/hamburger.

### Greenhouse Bridge / Landing Pages

- Greenhouse is the control plane for manifests, versions, approvals, deployments, rollback, and drift.
- WordPress remains the public runtime. Kinsta owns hosting/cache. HubSpot remains attribution/CRM.
- Bridge direction: Abilities-first when available, REST fallback when needed.
- Initial bridge work must be draft-only/private until staging, preview, audit trail, rollback, permissions, and cache behavior are proven.
- Keep full API parity in mind: Greenhouse UI actions must map to command/read contracts, not one-off buttons.

### WordPress React Boundary

- WordPress can use React through its native developer stack, but EPIC-019 must not become a React SPA rewrite.
- Prefer server-rendered blocks plus the Interactivity API for small frontend interactions.
- Use `@wordpress/element`/Gutenberg packages for editor/admin UI. Watch React 19 compatibility with WordPress/Gutenberg/plugins before upgrading assumptions.

## Update Protocol

Update this skill when any of these change:

- WordPress version, active theme, major plugin inventory, REST namespace inventory, or WP Abilities inventory.
- Kinsta credentials/token availability, cache/backups/deploy procedure, or SSH/WP-CLI path.
- Greenhouse public-site architecture, ADRs, EPIC-019, TASK-1111, TASK-1116, or follow-up tasks.
- A new Ohio/Elementor incident teaches a layout rule, selector risk, backup path, or rollback pattern.
- WordPress official developer guidance changes the React/Interactivity/Abilities/agent skill strategy.

How to update:

1. Refresh discovery with the safest available command.
2. Update the canonical docs first when the change is durable.
3. Update both copies of this skill: `.codex/skills/efeonce-public-site-wordpress/SKILL.md` and `.claude/skills/efeonce-public-site-wordpress/SKILL.md`.
4. Keep secrets out; reference secret names and env var names only.
5. Run skill validation plus `pnpm docs:closure-check` and update `project_context.md`, `Handoff.md`, and `changelog.md` if operating behavior changed.
