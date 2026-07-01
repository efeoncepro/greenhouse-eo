# Runtime and Discovery

Use this reference for public-site inventory, bridge inspection, runtime repo binding, and Kinsta/WP-CLI discovery.

## Current Runtime Facts

- Public site: `https://efeoncepro.com`.
- Hosting: Kinsta.
- WordPress path observed via SSH/WP-CLI: `/www/efeoncegroup_752/public`.
- Active theme: `ohio-child`; parent theme: `ohio`.
- Important plugins: Elementor/Elementor Pro, Yoast SEO/Premium, HubSpot/Leadin, `eo-headless-content`, `eo-vibe-coding-api`, `greenhouse-wp-bridge`, `eo-elementor-widgets`.
- REST advertises `wp/v2`, `wp-abilities/v1`, and application passwords.
- Authenticated discovery resolved the integration account as `Greenhouse INTEGRATION` (`greenhouse-integration`, display `Greenhouse`); observed role was `administrator`, so reduce privileges before production bridge rollout.
- Authenticated WP Abilities discovery returned 33 abilities.
- Public inventory observed: 40 pages, 32 posts, private CPT `landing`.
- Secret reference for the current Application Password: `public-website-wordpress-application-password`. Never print the value.
- Kinsta API token/cache/backups automation has historically been incomplete; do not claim automation is operational unless verified in the current run.
- Kinsta staging availability remains unconfirmed from repo automation. Kinsta docs describe Standard Staging as generally available unless plan-restricted and Premium Staging as paid add-on; verify account state before depending on it.
- Effective visual foundation observed: brand blue `#023c70` family, body `Inter`, headings/buttons `DM Sans`, grid gutter `1rem`, container width `86vw`, footer background `#161519`.
- Elementor active kit can expose default Elementor colors/fonts; always verify computed runtime styles.

## Runtime Repo Binding

Confirmed runtime repo:

```text
efeoncepro/efeonce-public-site-runtime
```

Default branch: `main`.

It tracks governed live code candidates:

- `ohio-child`;
- `eo-headless-content`;
- `eo-vibe-coding-api`;
- `greenhouse-wp-bridge`;
- `eo-elementor-widgets`.

Do not use `efeonce-web` as the live public-site source unless an ADR changes the runtime.

## Common Discovery Commands

```bash
pnpm public-website:discover
pnpm public-website:discover -- --authenticated --wpcli --write
pnpm public-website:bridge-inspect -- --page-id <id>
pnpm public-website:content-factory:inspect -- --write
pnpm public-website:export-live-code
pnpm public-website:diff-runtime
pnpm public-website:runtime-status
pnpm public-website:deploy-dry-run
```

`public-website:*` commands load `.env.local` / `.env` safely. Do not paste secrets into command lines.

## Local/Live Sync Contract

Before any public-site runtime rollout, refresh the live Kinsta snapshot and read the classified
drift report:

```bash
pnpm public-website:export-live-code
pnpm public-website:diff-runtime -- --write
pnpm public-website:runtime-status
```

The drift report keeps legacy `status` counts but also includes:

- `classificationCounts.repo_pending_release`: local repo/worktree differs from Kinsta live because
  a governed file is not deployed yet. Use a scoped release package or explicitly include it.
- `classificationCounts.content_drift`: same governed file differs and is not explained by local
  pending changes. Inspect before any deploy.
- `classificationCounts.live_untracked_file`: Kinsta live has a governed file missing from repo.
  Reconcile or ignore by policy before claiming local/live sync.
- `releaseSafety.fullRepoDeploySafe`: must be `true` before a blind/full runtime repo deploy is
  considered safe. If `false`, do not deploy the full repo; scope the release or reconcile first.

Current known state (2026-07-01): latest classified report
`docs/operations/public-site-drift/drift-2026-07-01T10-19-16-439Z.json` has
`fullRepoDeploySafe=false`, mostly because `eo-elementor-widgets` and the new Growth Forms Ohio host
layer are pending release while Kinsta live still differs. This is expected code-ready/pending-release
state, not permission to upload the whole repo.

## Bridge State

`greenhouse-wp-bridge` is deployed as a read/inspection foundation; writes remain gated by explicit rollout, shared secret, flags, and rollback plan.

Observed bridge lineage:

- read-only inspection foundation active on Kinsta;
- v0.3.x adds HMAC/shared-secret signature verification, body hash, timestamp window and replay guard;
- v0.3.1 supports constants/env first and WP options fallback with `autoload=no`;
- v0.4.0 adds draft-only `POST /drafts/from-existing-post`;
- no publish/delete/cache/backup write behavior should be assumed operational.

Use bridge inspection for read-only Elementor/block/Ohio catalog context when available:

```bash
pnpm public-website:bridge-inspect -- --page-id <id>
```

For bridge provisioning, do not edit `wp-config.php` as the first path. Prefer Kinsta/env vars if available; otherwise use the WP-CLI option fallback:

```bash
wp greenhouse-bridge status
wp greenhouse-bridge config set --environment=production --writes-enabled=0
printf %s "$SECRET" | wp greenhouse-bridge secret set --stdin
```

Pipe secrets through stdin. Do not pass secrets as command args or write them to temp PHP files.

## WordPress React Boundary

- WordPress can use React through its native developer stack, but EPIC-019 must not become a React SPA rewrite.
- Prefer server-rendered blocks plus the Interactivity API for small frontend interactions.
- Use `@wordpress/element`/Gutenberg packages for editor/admin UI.
- Treat React 19 compatibility as a watch item until Kinsta/WordPress/Gutenberg/plugins prove support.

## Kinsta Notes

- Kinsta API token/cache/backups automation has historically been incomplete; do not claim automation is operational unless verified in the current run.
- When using WP-CLI remotely, prefer the wrapper:
  `pnpm public-website:wpcli -- --eval-file ./tmp/<script>.php --wp-user 12`.
- Use `wp kinsta cache purge --all` after live WordPress mutations.
