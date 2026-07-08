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
- Custom Elementor widget media packages that are part of a widget contract can
  live under `eo-elementor-widgets/assets/...` instead of WordPress Media
  Library, but they must be mapped by semantic slot id in code, backed up
  before Kinsta upload, and verified as direct public assets. Current example:
  Redes Sociales wall assets v1 under `assets/img/social/wall/v1/`; full note
  `docs/operations/public-site-social-wall-media-production-20260708.md`.

## Classic Navigation Menu Facts

Use this when the user asks how to add a URL to the public-site menu. Do not
mutate the menu during discovery.

- WordPress uses the classic menu model here, not a block-theme
  `wp_navigation` source of truth.
- Active location: `primary`.
- Current menu term: `61` (`Menu 1`, slug `menu-1`, observed `count=25`
  after the 2026-07-08 visibility/creative menu update).
- Ohio renders the same menu in desktop `nav#site-navigation ul#menu-primary`
  and mobile `ul#mobile-menu`.
- REST exposes `/wp/v2/menu-items`, `/wp/v2/menus` and
  `/wp/v2/menu-locations`, but prefer WP-CLI/PHP core for governed writes.

Storage model:

- menu container = `nav_menu` taxonomy term;
- item = `post_type=nav_menu_item`;
- membership = term relationship to the `nav_menu` term;
- label = `post_title`; order = `menu_order`; title attr = `post_excerpt`;
- parent = `_menu_item_menu_item_parent`;
- type/object = `_menu_item_type`, `_menu_item_object`,
  `_menu_item_object_id`;
- custom URL = `_menu_item_url` only when `_menu_item_type=custom`.

Confirmed parent IDs:

- `Soluciones`: `242525`;
- `Estrategia & Posicionamiento`: `244255`, parent `242525`;
- `Experiencia Personalizada`: `248605`, parent `242525`;
- `Crecimiento Multicanal`: `248606`, parent `242525`;
- `Visibilidad`: `248628`, parent `242525`;
- `Servicios Destacados`: `248629`, parent `242525`;
- `Recursos`: `242524`.

Confirmed live service item:

- `Producción Creativa`: item `251313`, parent `244255`
  (`Estrategia & Posicionamiento`), `type=post_type`, `object=page`,
  `object_id=251279`, URL `https://efeoncepro.com/agencia-creativa-v2/`.
- `Diseño & Desarrollo Web`: item `242916`, parent `248605`
  (`Experiencia Personalizada`), `type=post_type`, `object=page`,
  `object_id=250816`, URL `https://efeoncepro.com/desarrollo-sitios-web/`.
- `Posicionamiento SEO`: item `251312`, parent `248628` (`Visibilidad`),
  `type=post_type`, `object=page`, `object_id=251078`, URL
  `https://efeoncepro.com/servicios/posicionamiento-seo/`.
- `AEO (AI Engine Optimization)`: item `250691`, parent `248628`
  (`Visibilidad`), `type=post_type`, `object=page`, `object_id=250265`,
  URL `https://efeoncepro.com/aeo-2/`.
- `Redes Sociales`: item `251311`, parent `248629` (`Servicios Destacados`),
  `type=post_type`, `object=page`, `object_id=251300`, URL
  `https://efeoncepro.com/servicios/redes-sociales/`. Rollback snapshot option:
  `_gh_backup_before_menu_social_20260707T205950Z`.

2026-07-08 rollback snapshot for the visibility/creative menu update:
WP option `gh_backup_before_public_menu_visibility_creative_v2_20260708T154302Z`
and post meta `_gh_backup_before_public_menu_visibility_creative_v2_20260708T154302Z`
on page `251279`.

Operational learning from the 2026-07-07 menu write:

- "Assigning a URL to the menu" means creating/updating a `nav_menu_item`, not
  editing the Ohio masthead, Elementor header HTML, or `wp_navigation`.
- Discover the live menu every time with `get_registered_nav_menus()`,
  `get_nav_menu_locations()`, `wp_get_nav_menu_object($term_id)` and
  `wp_get_nav_menu_items($term_id)`. Do not assume menu term `61` without a
  current snapshot.
- Preflight duplicates by normalized label, `object_id`, URL/permalink and
  parent item. The same page can otherwise be inserted twice under a dropdown.
- If the destination is a WordPress page, create a `post_type` item
  (`menu-item-type=post_type`, `menu-item-object=page`,
  `menu-item-object-id=<PAGE_ID>`). The visible URL then follows the page
  permalink; `_menu_item_url` is not the source of truth for this item type.
- Use `custom` only for external URLs, anchors, or internal URLs that are not a
  WordPress object.
- Set `menu-item-parent-id` from the discovered parent item (`248629` for
  `Servicios Destacados`) and set/verify `menu_order` when sibling order
  matters.
- The repo wrapper accepts the governed `--eval-file` flow; do not rely on raw
  WP-CLI subcommands being passed through by `pnpm public-website:wpcli`.
- Do not call `clean_nav_menu_cache()` in eval scripts; it is not a safe public
  function in this runtime. Let `wp_update_nav_menu_item()` perform core cache
  invalidation, then run `wp cache flush` or `wp kinsta cache purge --all`.
- Verify the rendered DOM, not only DB state: desktop `#menu-primary`, mobile
  `#mobile-menu`, correct parent label, no duplicate anchors, no overflow.

For a future custom URL write, snapshot `wp_get_nav_menu_items(61)` and metas
first, then use:

```php
$parent_item_id = 248629; // Servicios Destacados; choose from snapshot.

wp_update_nav_menu_item(61, 0, [
    'menu-item-title' => 'Texto del menu',
    'menu-item-url' => 'https://efeoncepro.com/ruta/',
    'menu-item-type' => 'custom',
    'menu-item-status' => 'publish',
    'menu-item-parent-id' => $parent_item_id,
]);
```

For a WordPress page destination, prefer a `post_type` menu item with
`object=page` and `object_id=<PAGE_ID>` so the URL follows the permalink:

```php
$page_id = 251300;
$parent_item_id = 248629; // Servicios Destacados; choose from snapshot.

wp_update_nav_menu_item(61, 0, [
    'menu-item-title' => 'Redes Sociales',
    'menu-item-type' => 'post_type',
    'menu-item-object' => 'page',
    'menu-item-object-id' => $page_id,
    'menu-item-status' => 'publish',
    'menu-item-parent-id' => $parent_item_id,
]);
```

After any menu write: `wp kinsta cache purge --all`, verify `#menu-primary` and
`#mobile-menu`, and check dropdown/overflow behavior.

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
`docs/operations/public-site-drift/drift-2026-07-01T10-54-46-557Z.json` has
`fullRepoDeploySafe=true`, `content_drift=0`, `repo_pending_release=0` and
`live_untracked_file=0`; only three live backup artifacts are ignored by policy. The runtime repo
is clean at `1d36d51` after reconciling the AEO engine avatar group and Growth Form catalog widget
files with Kinsta. A full production deploy still requires an explicit release decision; do not infer
authorization from a green drift report alone.

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
