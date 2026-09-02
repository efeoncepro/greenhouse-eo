# Miscellaneous WordPress Surfaces

Use for 404, search results/no-results, category/tag/author/date/custom-taxonomy archives, impossible pagination
and empty archive states on `efeoncepro.com`.

Canonical sources:

- `docs/architecture/public-site/PUBLIC_MISCELLANEOUS_SURFACES_V1.md`
- `docs/documentation/public-site/public-miscellaneous-surfaces.md`
- `docs/manual-de-uso/public-site/operar-paginas-miscelaneas.md`
- `docs/audits/public-site/2026-08-31-wordpress-miscellaneous-surfaces-discovery.md`

## Live baseline — 2026-08-31

- 404 → parent `ohio/404.php`.
- Search → parent `ohio/search.php`; empty → parent `parts/content-none.php`.
- Category/tag/author/date/format/portfolio taxonomy → parent `ohio/index.php`.
- Search form → parent `ohio/searchform.php`.
- Headline → child `parts/elements/page_headline.php`.
- Elementor Library: zero 404/search/archive templates and zero conditions.
- Ohio registers/executes Elementor only for header/footer locations; special templates are not Theme Builder
  plug-and-play.

Reverify before acting. A plugin update, new condition or child override can change the owner.

## Required classification

Do not call all of these “misc pages” after intake. Classify:

1. **Recovery:** real 404, search-empty, existing empty taxonomy.
2. **Search:** query validation, global/editorial scope, type allowlist, results and pagination.
3. **Editorial archive:** category/author indexable; tag/date/custom taxonomy according to live robots/canonical.
4. **Global chrome:** footer/sidebar/social/institutional data, owned separately.

Machine-readable feeds/sitemaps/robots and Kinsta/Cloudflare 403/500/maintenance are outside this renderer.

## Hard rules

- Child-theme-first. Never edit Ohio parent.
- Theme Builder requires a compatibility spike; active Elementor Pro is not proof of route ownership.
- PHP owns status, redirects, robots/canonical/schema integration and fallback. Optional Elementor content never
  owns the full shell.
- Keep 404 HTTP 404/noindex/no invented canonical; keep internal search 200/noindex.
- Never blanket-index/noindex archives. Inspect each query type.
- Empty search and empty archive need different copy/context.
- Search requires an explicit public-type policy; empty query must not dump the whole site.
- Do not hide a published “Borrador” or demo page only from cards; resolve its editorial/indexing state.
- Preserve `<main id="main">`, one H1, keyboard/focus, named controls, reduced motion and 390px no-overflow.
- Do not duplicate raw search terms in custom analytics events.
- Never full-deploy the runtime repo while drift reports `fullRepoDeploySafe=false`; use a scoped child-theme
  artifact with snapshot and rollback.

## Preferred implementation shape

Start with:

- child `404.php`;
- shared `parts/elements/utility-page.php`;
- contextual `parts/content-none.php`;
- accessible/localized `searchform.php`;
- page-scoped CSS.

Add a child `search.php` only for a complete results redesign, not only to change the empty state. Treat archive
templates as a later Content Hub/SEO slice.

## Verification matrix

- HTTP/robots/canonical/schema per query type.
- 1440/1280/390 browser evidence.
- main/skip link/H1/headings/focus/keyboard/named icons.
- empty and successful search, empty query, type allowlist and pagination.
- overflow including archive filter drawers.
- zero approved-scope demo/broken destinations.
- dataLayer and `/g/collect` evidence without query/PII duplication.
- scoped deploy manifest, cache purge, public readback and rollback proof.
