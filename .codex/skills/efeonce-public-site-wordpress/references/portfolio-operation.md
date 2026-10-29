# Portfolio operation (EO Portfolio, `/portafolio/`)

Load for any work on the public portfolio: loading, editing, publishing or unpublishing a project, the client approval
gate, the plugin `eo-portfolio`, its REST, or the migration from Ohio's `ohio_portfolio` (EPIC-056, PDR-028).

## State (2026-10-29)

- Plugin `eo-portfolio` v0.2.0 (with the admin) **active in production**, runtime commit 3ab38ad, **no projects**.
- `/portafolio/` is still the Elementor page 247116 with Ohio's widget. Entries `/portafolio/<slug>/` answer 404 until
  `TASK-2048` hooks `eo_portfolio_render_entry`. The 15 real projects load in `TASK-2049`.
- Ohio's 44 demo entries are drafts with Yoast 410 (TASK-2046); the 15 real ones still live at `/project/<slug>/`.

## Admin screen

`Portafolio` menu (plugin v0.2.0, live since 2026-10-29, built on the approved design): list and
structured editor over the same `EOP_Store`. Review it locally with
`efeonce-public-site-runtime/tests/playground/serve-eo-portfolio.sh` (Playground on :9400, fixtures loaded, logged in).

## The only way to change a project

```bash
pnpm public-website:portfolio -- list | pull <slug> | new <slug> --from <file> | validate <slug> [--remote]
pnpm public-website:portfolio -- preview <slug> | diff <slug> | apply <slug> --message "…" [--dry-run]
pnpm public-website:portfolio -- publish <slug> --message "…" [--dry-run] | unpublish <slug> --message "…"
pnpm public-website:portfolio -- revisions <slug> | log <slug> | restore <slug> <rev> --message "…" | verify [<slug>]
```

- Working copies live in `tmp/portfolio/<slug>/` (`live.json`, `working.json`, `preview.json`, `before-r<N>-*.json`).
- `validate` and `preview` run the plugin's own validator and projection locally (no SSH), from the runtime repo.
- Remote steps go `pnpm public-website:wpcli` → `scripts/public-website/portfolio/remote.php` → `wp eo-portfolio`: the
  same save service as the admin. Never write `post_content` or `_eop_*` meta directly, never a parallel PHP script.
- `apply`, `publish`, `unpublish`, `restore` write production: **ask the operator first, each time**.

## Rules the plugin enforces (do not re-implement, do not work around)

- No publish without `clientApproval` with `ref` (opaque pointer to where the approval is recorded, never a contact's
  name or email), `date` and a non-empty `scope` (`logo`, `pieces`, `metrics`, `testimonial`). A published project
  cannot be saved without it (`eop_publish_gate`): unpublish first.
- The scope decides what the public sees; what it does not cover is not served even if loaded.
- Every `results[]` has `source`; `percent` is 0–100 without `%`; only a percent enables the measure orbit.
- Every media item has real `width`, `height` and `alt`; images use a Media Library `mediaId`; videos use `src` and
  `poster` in the public AXIS bucket (`portfolio/v<N>/<slug>/`) and `captionsVtt` when they have voice. No video upload
  to WordPress.
- `services` only from `schema/services.v1.json`; `line` is growth | brand | engine | voice | revenue.
- Video `src`, `poster` and `captionsVtt` must be under `schema/media-hosts.v1.json` (public AXIS bucket); anything else
  fails with `MEDIA_HOST_NOT_ALLOWED`.
- Saves are against a base revision: a conflict means someone saved in between → `pull`, reapply, `apply`.
- No rule may depend on a client, campaign or slug name.

## Gotchas learned building it

- Yoast matches the full request URL: verify 410s **without** a cache-busting query (`?nc=` makes it miss).
- WordPress guesses a 404 destination by slug prefix before Yoast's 410 (`lifestyle-app` → `lifestyle-app-elementor`);
  the plugin turns that off under `/project/` and `/portafolio/`.
- Ohio entries duplicated from demos inherited the demos' slugs as `_wp_old_slug`; WordPress redirected those URLs
  before Yoast answered. TASK-2046 deleted the 71 rows; the store never copies that meta.
- `export-live-code` exports an allowlist of plugin directories; `eo-portfolio` was added on 2026-10-29. Without it
  the deploy refuses with «Live drift» (correctly).

## Deploy the plugin

Runtime gates: `php tests/eo-portfolio.test.php` + `tests/playground/run-eo-portfolio.sh`. Then
`export-live-code` → `build-portfolio-plugin-package.cjs` → `deploy-portfolio-plugin-package.php` (see the manual).
The deploy refuses on drift or if `/portafolio/` has child pages.

## References

- Manual: `docs/manual-de-uso/public-site/operar-portafolio.md`
- Architecture: `docs/architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md`
- Decision: `docs/public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md`
- Tasks: `TASK-2047` (plugin), `TASK-2048` (templates), `TASK-2049` (migration); cleanup `TASK-2046` (complete)
