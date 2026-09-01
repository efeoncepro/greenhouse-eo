# Public Site Miscellaneous Surfaces V1

Status: **Proposed after live discovery · not implemented**

Owner: Public Site / WordPress

Runtime: `efeoncepro.com` · WordPress/Kinsta · Ohio/Elementor

Evidence: [discovery 2026-08-31](../../audits/public-site/2026-08-31-wordpress-miscellaneous-surfaces-discovery.md)

## Purpose

Define the technical ownership and invariants for non-singular public-site surfaces: 404, search, empty search,
taxonomy/author/date archives and empty archive states. The contract avoids two unsafe simplifications:

1. treating every special query as a normal editable WordPress page;
2. assigning every special query to one visual template despite different HTTP, indexability, canonical, schema
   and editorial responsibilities.

This document proposes architecture. It does not authorize a WordPress mutation, runtime release, global footer
cleanup or content-status change.

## Observed baseline

- `ohio/404.php` owns 404.
- `ohio/search.php` owns search and delegates empty results to `parts/content-none.php`.
- `ohio/index.php` owns category/tag/author/date/format/portfolio taxonomy via WordPress fallback.
- `ohio/searchform.php` owns the search form.
- `ohio-child/parts/elements/page_headline.php` owns visible 404/search headlines.
- Elementor Pro has no live 404/search/archive templates or conditions.
- Ohio integrates only Elementor header/footer locations; the special templates do not call a Theme Builder
  location.

## Surface taxonomy

### 1. Recovery

Includes:

- a real 404;
- search with zero results;
- an existing taxonomy with zero content;
- optionally a governed retired/moved-content state, provided its HTTP and redirect policy are decided first.

Recovery shares a visual composition, not HTTP semantics. The renderer receives an explicit context and never
derives status, robots or canonical from decorative settings.

### 2. Search

Search owns:

- non-empty term validation;
- global vs. editorial scope;
- allowlisted public post types;
- result count and success/empty outcome;
- cards/list density, pagination and accessibility;
- search diagnostics without leaking raw queries.

The search UI must not expose content merely because its post type is public. Published status, intentional
searchability and editorial ownership remain separate gates.

### 3. Editorial archive

Category, author, tag, date and custom taxonomy archives use variants based on SEO/editorial contract:

- **indexable archive:** visible introduction, synchronized metadata/schema, navigation and canonical pagination;
- **noindex compact archive:** useful browsing without presenting it as an acquisition landing;
- **empty archive:** recovery renderer with the archive's query context, never generic “search terms” copy.

### 4. Global chrome

Header, footer, social rails, sidebar widgets, institutional data and global search are shared chrome. A local
template may consume them but must not patch them globally. Demo/legacy cleanup requires its own snapshot,
ownership and rollback.

## Target architecture

### Route and semantic owner

`ohio-child` owns overrides and integration:

```text
wp-content/themes/ohio-child/
├── 404.php
├── searchform.php
├── parts/
│   ├── content-none.php
│   └── elements/
│       └── utility-page.php
└── assets/css/
    └── public-utility-surfaces.css
```

`search.php` is added only if the complete results experience needs a different document composition. Do not fork
the parent file merely to change the empty state. Category/author/tag/date templates are separate later slices;
do not replace `index.php` wholesale.

### Shared renderer contract

The proposed `utility-page.php` accepts a server-derived view model:

- `kind`: `not_found | search_empty | archive_empty | retired`;
- `eyebrow`, `title`, `description`;
- `search`: visible/hidden, current term only for display and input value;
- `primaryAction` and `secondaryLinks`;
- optional governed media;
- analytics-safe `pageType` and `outcome`.

The partial renders semantic HTML only. It cannot change status headers, redirects, robots, canonical, schema,
query scope or global navigation.

### Editability

Layout, semantic markup, fallback copy and asset contracts remain versioned. Editorially variable copy/media/links
may come from options registered in code or a dedicated WordPress menu, with:

- safe defaults when options are absent;
- allowlisted URLs/media;
- snapshot/readback/rollback;
- no raw `_elementor_data` writes.

If drag-and-drop is later required, a saved Elementor section may occupy an optional body slot after a compatibility
spike. The PHP fallback remains mandatory and Elementor never owns HTTP/SEO or the complete shell.

## Invariants

### HTTP and SEO

- 404 stays HTTP `404`, `noindex, follow`, with no invented canonical or blanket redirect to Home.
- Search stays HTTP `200`, `noindex, follow`; preserve Yoast `SearchResultsPage` when applicable.
- Do not apply blanket robots/canonical rules to category, author, tag, date or custom taxonomy.
- Impossible pagination remains a 404.
- Machine-readable surfaces are outside this renderer.
- Visible archive introductions, metadata and schema must derive from compatible governed sources.

### Accessibility and responsive

- Exactly one visible H1 for the primary content.
- `<main id="main">` matches the skip link.
- Search has a persistent label or owned accessible name; placeholder is not its label.
- Focus order and focus-visible styles are intentional.
- Icon-only controls and social links have discernible names.
- Back/recovery never uses empty `href`; use a deterministic destination and optional history enhancement.
- `prefers-reduced-motion` reaches the same final meaning.
- `scrollWidth === clientWidth` at 390 px; archive drawers may be contained scrollers only when explicitly
  declared and verified.

### Search policy

- Empty query is rejected or normalized before returning an unbounded public inventory.
- Global search uses an explicit allowlist of intentional public types.
- Editorial search restricts to `post` and governed editorial taxonomies.
- Content marked “Borrador” in its title is not automatically safe because `post_status=publish`.
- Search and archive cards do not inherit demo sidebar/tag-cloud content.

### Measurement

- Existing `page_view` and `view_search_results` remain authoritative GA4 events.
- Optional diagnostic events may add `page_type`, `outcome`, `results_count` and selected recovery destination.
- Do not duplicate a raw search term in custom events or send PII-bearing paths/referrers without sanitization.
- Diagnostic events are not key events.

## Release and rollback

Before any live write:

1. verify `pnpm public-website:ssh-check` and current template/options/plugin state;
2. export/reconcile the live `ohio-child` baseline;
3. snapshot every file, option/menu and relevant SEO setting being changed;
4. create a scoped artifact containing only owned child-theme files;
5. run syntax/static checks and a local/preview harness;
6. deploy only after explicit publication authorization;
7. purge Kinsta and read back status/robots/canonical/schema/DOM at desktop and 390 px.

Rollback restores the exact prior child-theme files and option/menu snapshot, purges cache and repeats public
readback. Never full-deploy the runtime repository while `fullRepoDeploySafe=false`.

## Implementation slices

1. Resolve or separately own P0 public-content/global-chrome issues.
2. Persist 2–3 visual directions; accept the first fold for 404 desktop/390.
3. Implement `404.php` + shared renderer + scoped CSS.
4. Add contextual `content-none.php` + accessible/localized `searchform.php`.
5. Define and implement search policy/results experience; add `search.php` only if required.
6. Implement indexable and noindex archive variants with separate SEO/readback matrices.
7. Add governed diagnostic tracking and verify `/g/collect` without PII duplication.

## Acceptance evidence

- HTTP/robots/canonical/schema matrix for every query type.
- 1440/1280/390 captures, keyboard, skip link, focus, landmarks and reduced motion.
- Page overflow and contained-drawer checks.
- Search empty/non-empty/type-policy tests.
- Zero demo/placeholder/broken destinations in the owned surface.
- Scoped release manifest, cache purge, public hashes/readback and rollback proof.

## ADR gate

The discovery establishes a proposed owner and implementation shape. Before implementation, identify whether the
child-theme integration and shared renderer require a dedicated accepted ADR or can remain within the existing
public-site runtime/control-plane decisions. Do not mark this proposal `Accepted` from documentation alone.
