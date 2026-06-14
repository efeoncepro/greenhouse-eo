# Public Site Repository Control Plane Discovery — 2026-06-14

## Context

The operator wants to control `efeoncepro.com` from Greenhouse instead of opening a separate public-site repository. This discovery checks the current GitHub/local repository situation against the live Kinsta WordPress runtime.

This document is read-only discovery. It does not mutate WordPress, Kinsta, GitHub or Vercel.

## Sources Checked

- GitHub org `efeoncepro` via `gh repo list`.
- Local repository `/Users/jreye/Documents/efeonce-web`.
- Local repository `/Users/jreye/Documents/efeonce-sp`.
- Live Kinsta WordPress through `pnpm public-website:wpcli -- --eval-file tmp/public-site-control-plane/live-wp-code-inventory.php`.
- Live code baseline export through `pnpm public-website:export-live-code`.

## Findings

### `efeoncepro/efeonce-web`

`efeoncepro/efeonce-web` is the private repository described as `Sitio publico`.

Current local state:

- Path: `/Users/jreye/Documents/efeonce-web`
- Default branch: `main`
- Active local branch: `develop`
- Stack: Astro/Vite/Vercel headless rebuild
- README states it consumes WordPress headlessly from `cms.efeoncepro.com`
- Last observed GitHub update: 2026-04-12

Interpretation:

`efeonce-web` is not the source of truth for the current live WordPress/Ohio/Elementor runtime at `efeoncepro.com`. It is useful as historical architecture/reference for a headless direction, but using it directly now would be a runtime strategy change, not a control-plane baseline.

### `efeonce-sp`

Local repo `/Users/jreye/Documents/efeonce-sp` is the closer operational match.

Current local state:

- Remote: `git@github.com:cesargrowth11/efeonce-sp.git`
- Active branch: `feat/ohio-widget-orchestration-and-builder-services`
- Contains WordPress code under `wp-content/`
- Contains custom plugins:
  - `eo-headless-content`
  - `eo-vibe-coding-api`
  - `eo-ohio-elementor-widgets`
  - `eo-ohio-gutenberg-blocks`
  - `ohio-hubspot-form-styler`
- Contains `wp-content/themes/ohio-child`
- Contains historical Ohio/Elementor docs and visual captures.

Interpretation:

`efeonce-sp` is the closest available code lineage for the live site, but it is not currently an `efeoncepro/*` GitHub repo and it is not cleanly synced with Kinsta live. It should not be treated as source of truth until reconciled.

### Live Kinsta WordPress

Read-only WP-CLI inventory confirmed:

- WordPress: `7.0`
- Site URL: `https://efeoncepro.com`
- Active theme: `ohio-child`
- Parent theme: `ohio`
- Live custom code present:
  - `wp-content/themes/ohio-child`
  - `wp-content/plugins/eo-headless-content`
  - `wp-content/plugins/eo-vibe-coding-api`
- Live custom code absent:
  - `wp-content/plugins/eo-ohio-elementor-widgets`
  - `wp-content/plugins/eo-ohio-gutenberg-blocks`
  - `wp-content/plugins/ohio-hubspot-form-styler`

Notable drift:

- Live `ohio-child` includes `parts/elements/page_headline.php`; the local `efeonce-sp/wp-content/themes/ohio-child` copy does not.
- Live `ohio-child` includes many emergency/session backup files under `assets/css/*.bak-*`; those should not become canonical deploy artifacts.
- Live `eo-headless-content` has an `includes/acf/` subtree that is not visible in the local file list previously inspected.
- Local `eo-vibe-coding-api` has `includes/class-eov-ohio-widget-catalog-service.php`; this file was not present in the live inventory output.

### Live Code Baseline Export

The repo now has a read-only helper for `TASK-1122`:

```bash
pnpm public-website:export-live-code
pnpm public-website:export-live-code -- --output tmp/public-site-code-baselines/manual
```

Behavior:

- Loads `.env.local` and `.env` like the existing public-site scripts.
- Uses the Kinsta SSH env vars; no secrets are printed.
- Downloads only governed code candidates into ignored `tmp/public-site-code-baselines/<timestamp>/code`.
- Writes `manifest.json` with found/missing targets, excludes, file count and per-file SHA-256.
- Excludes `.git/`, `node_modules/`, `vendor/`, logs, `*.bak`, `*.bak-*`, `.DS_Store` and editor temp files.
- Does not mutate Kinsta, WordPress, GitHub or Vercel.

First successful export in this session:

- Output: `tmp/public-site-code-baselines/2026-06-14T13-18-16-257Z/`
- Files exported: `49`
- Found:
  - `wp-content/themes/ohio-child`
  - `wp-content/plugins/eo-headless-content`
  - `wp-content/plugins/eo-vibe-coding-api`
- Missing:
  - `wp-content/plugins/eo-ohio-elementor-widgets`
  - `wp-content/plugins/eo-ohio-gutenberg-blocks`
  - `wp-content/plugins/ohio-hubspot-form-styler`

The exported code stays local/ignored until a governed public-site runtime repository is chosen.

## Decision Guidance

Greenhouse should become the operator control plane, but GitHub should still remain the versioning and deployment rail.

The operator should not need to open GitHub for daily work. Greenhouse should expose the workflow:

1. Read live WordPress/Kinsta inventory.
2. Show drift against the governed public-site repo baseline.
3. Create a Greenhouse change request.
4. Generate a branch/commit/PR or direct release artifact behind the scenes.
5. Deploy to Kinsta only after preview/QA/approval.
6. Record release, hashes, rollback path and drift state in Greenhouse.

GitHub remains necessary because WordPress code is filesystem code:

- `ohio-child` PHP/CSS templates
- bridge plugin PHP
- custom plugin PHP
- build assets
- rollback history
- code review/audit trail

## Recommended Repository Strategy

Use a governed WordPress-runtime repository as the deploy source for Kinsta code, surfaced inside Greenhouse.

Selected path as of 2026-06-14:

1. Created private repository `efeoncepro/efeonce-public-site-runtime`.
2. Imported canonical runtime code from the read-only Kinsta live export:
   - `wp-content/themes/ohio-child`
   - `wp-content/plugins/eo-headless-content`
   - `wp-content/plugins/eo-vibe-coding-api`
3. Excluded 2 live backup artifacts from the baseline:
   - `wp-content/themes/ohio-child/assets/css/blog-page-meta-backup-20260614015717.txt`
   - `wp-content/themes/ohio-child/assets/css/contacto-page-meta-backup-202606140-bg-continuity.json`
4. Initial baseline commit: `0fa6bfd`
5. Initial baseline tag: `baseline-2026-06-14-live`
6. Binding manifest in Greenhouse repo: `docs/operations/public-site-runtime-repository-binding-20260614.json`

The following was the decision path that led to it:

1. Create or transfer a repository under `efeoncepro`, e.g. `efeonce-public-site-runtime`.
2. Import only canonical runtime code:
   - `wp-content/themes/ohio-child`
   - `wp-content/plugins/eo-headless-content`
   - `wp-content/plugins/eo-vibe-coding-api`
   - future `wp-content/plugins/greenhouse-wp-bridge`
3. Exclude generated/runtime-only artifacts:
   - WordPress uploads
   - Kinsta backups
   - `*.bak-*` emergency files unless intentionally archived
   - `wp-content/uploads/elementor/css/post-*.css`
   - secrets and config files
4. Reconcile live Kinsta code into the repo as a baseline commit.
5. Store the baseline SHA and file manifest in Greenhouse.
6. Treat direct Kinsta edits as emergency-only and require backport to repo baseline.

Alternative path:

- Keep `efeonce-sp` as the implementation repo only if ownership/remote is moved or mirrored into `efeoncepro` and the branch/live drift is reconciled.

Not recommended:

- Treating `efeonce-web` as the current runtime source without a new ADR to move `efeoncepro.com` from WordPress/Ohio/Elementor to Astro/headless.
- Continuing direct child-theme/plugin edits on Kinsta without repository reconciliation.
- Making Greenhouse write arbitrary WordPress files over SSH without a Git-backed release record.

## Greenhouse Product Implication

The Greenhouse `Public Site` module should manage both content and code posture:

- **Inventory**: WordPress pages, Elementor documents, templates, active plugins, theme files and Kinsta state.
- **Drift**: live hashes vs governed repo baseline.
- **Changes**: manifest/content changes and code changes as explicit requests.
- **Releases**: deploy artifact, target, actor, approval, commit SHA, Kinsta operation id and smoke result.
- **Rollback**: previous known-good artifact and exact restore path.

This keeps the operator inside Greenhouse while preserving a professional software delivery trail.

## Follow-up

Create `TASK-1122` before implementing `TASK-1116` so the bridge plugin has a confirmed repo/path/deployment lane.
