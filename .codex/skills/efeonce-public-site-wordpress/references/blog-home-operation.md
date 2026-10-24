# Blog home (/blog/) — operación por agentes

Live since 2026-10-24 (TASK-2050/2051): page 18456 renders the `eo-blog-home` plugin (`[eo_blog_home]`), fed by the
content model of `efeonce-editorial-blocks` 0.2.0 (PDR-029). Three boards (desktop ≥1100, tablet 768–1099, mobile),
canonical site nav, `eo_content_model_enabled = 1`.

## Use the CLI, never ad hoc scripts

`pnpm public-website:blog-home <command>` — manual `docs/manual-de-uso/public-site/operar-portada-blog-por-cli.md`.

- Read (always safe): `status`, `slider`, `post <id|slug>`, `verify [--browser]`.
- Write (plan unless `--apply`; operator's go in production): `pin/unpin`, `format`, `hero`, `resource <json>`,
  `review`, `event <json>`, `retire`, `flag`, `purge`. Every apply prints `before` (its rollback), reads back, purges
  /blog/ and appends to `scripts/public-website/blog-home/ledger/<YYYY-MM>.jsonl` — commit the ledger.
- Deploy: `deploy home|content-model [--apply]` (exports the live baseline first; content-model toggles the flag
  off → deploy → restore). Page: `page publish|rollback --snapshot <option>` (cutover snapshot
  `_gh_blog_home_v3_before_20261024_081327`).

## Rules that bite

- Slider order: pins → Glitch (newsletter resource, else latest edition/Flash) → guide/tool → diagnostic → recent
  `auto_slide_candidate` posts up to five. A **Novedad** only enters when pinned. WordPress «sticky» is ignored.
- A post without `_eo_hero_image` gets a reading scrim and a two-line dek; slider art goes in via `hero --image`.
- Author circle: the author's uploaded WordPress profile photo (`get_avatar_url`), initials when there is none; a
  Gravatar fallback never stands in.
- Resources hide after 180 days without `review`. Events never store private meeting links (the CLI refuses them).
- Template changes are not edits to WordPress: they go through `scripts/public-website/blog-v3/` (bind-canvas →
  make-tablet → build-plugin → equivalence + PHP parity + pixel gate ≤1 %), are committed in the runtime and shipped
  with `deploy home`. Deviations from the canvas are listed in
  `docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md`.
- A new PHP file reaches PHP-FPM 1–2 min after a deploy.
