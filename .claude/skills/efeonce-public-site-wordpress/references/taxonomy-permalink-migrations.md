# WordPress Taxonomy and Permalink Migrations

Use this reference when changing a live post category hierarchy, a category
slug/base, a Yoast primary category, or any published permalink derived from
taxonomy. This is a URL migration, not a cosmetic taxonomy edit.

The Efeonce public site currently uses `/%category%/%postname%/`. A category
reparent can therefore change every affected post URL as well as its archive,
canonical, breadcrumb and social/schema graph.

## Contents

1. Non-negotiable rules
2. Preflight inventory
3. Snapshot and rollback
4. Core category mutation
5. Yoast Premium redirect rail
6. Update owned internal links
7. Titles and social/schema readback
8. Purge and live QA
9. Definition of done

## Non-negotiable Rules

- Use WordPress core APIs. Reparent an existing category with
  `wp_update_term($term_id, 'category', ['parent' => $new_parent])`. Never edit
  `wp_terms`, `wp_term_taxonomy` or relationships with SQL, and never
  delete/recreate a category to move it: term IDs, relationships and external
  references must remain stable.
- Treat the current permalink structure as runtime data. Read
  `get_option('permalink_structure')` and `get_option('category_base')`; do not
  assume this site's observed structure applies elsewhere or forever.
- Inventory every affected post in every relevant state before the write. Term
  count alone is insufficient.
- A hierarchy-only move does not require changing post category assignments.
  Preserve and verify `_yoast_wpseo_primary_category` for every affected post.
- Create explicit permanent redirects for every changed published post URL and
  the old category archive. Do not rely on WordPress canonical guessing, on an
  archive-only redirect, or on one wildcard unless its exact capture semantics
  and exclusions are proven.
- Redirects are compatibility, not internal-link strategy. Update owned links
  to the new canonical, including reciprocal pillar/service links.
- Snapshot, prepare rollback, purge cache and independently verify live output.

## 1. Preflight Inventory

Resolve and record:

- term ID, taxonomy, name, slug, parent ID, description, count and old archive;
- intended new parent and computed new archive;
- permalink structure and category base;
- all posts assigned to the term across `publish`, `future`, `private` and
  `draft` (include trash when restoration history matters);
- for each post: ID, status, slug, current permalink, assigned categories,
  `_yoast_wpseo_primary_category`, canonical override and index policy;
- every old → new published post URL and old → new archive URL;
- internal occurrences of old URLs in Gutenberg, Elementor, menus, widgets,
  reusable blocks, options and governed source artifacts;
- active redirect implementation and exact API availability. On the current
  site, verify both Yoast SEO Premium activation and
  `class_exists('WPSEO_Redirect_Manager')` / `class_exists('WPSEO_Redirect')`;
- current redirect collisions for every planned origin, with and without a
  trailing slash;
- current canonical, breadcrumbs, `og:url`, schema IDs, sitemap membership and
  archive cards for a representative affected post.

Do not infer the affected set from visible archive cards. Query WordPress by
term and inspect assignments. A multi-category post can derive its permalink
from the Yoast primary category; record the actual `get_permalink()` before and
after rather than predicting from category order.

## 2. Snapshot and Rollback

Before mutation, write a timestamped remote snapshot containing:

- complete term fields and old parent;
- permalink/category-base options;
- affected post inventory with old permalinks and primary categories;
- the exact redirect option fingerprint and any pre-existing redirect at a
  planned origin;
- internal-link documents that will be changed, including Elementor data,
  settings, `post_content`, `_thumbnail_id`, Ohio metas and semantic widget
  hashes where applicable.

Prepare rollback before applying the forward change:

1. restore the original parent with `wp_update_term()`;
2. remove only the redirect objects created by this migration;
3. restore each changed internal-link document from its scoped snapshot using
   its canonical write rail;
4. flush relevant WordPress caches/rewrite state, purge Kinsta and repeat live
   readback.

Never restore the entire Yoast redirects option blindly; doing so can erase
unrelated redirects created concurrently.

## 3. Core Category Mutation

Assert the expected term ID, slug and current parent immediately before write:

```php
$term = get_term($term_id, 'category');
if (!$term || is_wp_error($term) || (int) $term->parent !== $expected_parent) {
    WP_CLI::error('Category precondition failed.');
}

$result = wp_update_term($term_id, 'category', ['parent' => $new_parent]);
if (is_wp_error($result)) {
    WP_CLI::error($result->get_error_message());
}
```

Then clear the term/post caches used by the readback and, when route structure
changed, run `flush_rewrite_rules(false)` once. Do not flush rewrite rules on
every request or use a database update as a shortcut.

Immediate readback must prove:

- the same term ID and slug now have the intended parent;
- the new `get_term_link()` is exact;
- every affected post retains its intended category assignments and Yoast
  primary category;
- each `get_permalink()` equals the planned new URL;
- no unintended post changed URL.

If this readback differs from plan, roll the term back before continuing.

## 4. Yoast Premium Redirect Rail

The active Efeonce redirect owner is Yoast SEO Premium. Use its runtime API
after verifying the classes; do not write `wpseo-premium-redirects-base`
directly and do not install a second redirect plugin.

Create plain `301` redirects with explicit origins:

```php
$manager = new WPSEO_Redirect_Manager();
$redirect = new WPSEO_Redirect($origin, $target, 301, 'plain');

if ($manager->get_redirect($origin)) {
    WP_CLI::error('Redirect origin already exists.');
}
if (!$manager->create_redirect($redirect)) {
    WP_CLI::error('Redirect creation failed.');
}
```

Build the set from the inventory:

- one old post path → new post path for every changed published permalink;
- old category archive → new category archive;
- additional feed/pagination routes only when they are indexable or have real
  inbound/internal demand. Do not invent redirect surface without evidence.

Create redirects as one governed set. If creation fails partway, remove only
the newly created `WPSEO_Redirect` objects and restore the term before leaving
the operation.

Yoast may normalize storage/readback by trimming or serializing trailing
slashes. Compare semantic paths, not raw strings:

```php
$stored = $manager->get_redirect($origin);
$same_target = $stored instanceof WPSEO_Redirect
    && trim($stored->get_target(), '/') === trim($target, '/')
    && (int) $stored->get_type() === 301
    && $stored->get_format() === 'plain';
```

Still test both real HTTP variants. The no-slash and slash request must resolve
without a loop or multi-hop chain to the exact new canonical. A successful
manager readback alone is not live redirect evidence.

## 5. Update Owned Internal Links

Search for every old canonical after the redirect exists. Replace owned links
with the new final URL so users and crawlers do not pay a redirect hop.

For Gutenberg, use the governed existing-post update path and preserve the
validated block structure. For Elementor, decode `_elementor_data`, mutate the
exact semantic widget/value and save with:

```php
$document = \Elementor\Plugin::$instance->documents->get($page_id);
$document->save([
    'elements' => $elements,
    'settings' => is_array($settings) ? $settings : [],
]);
```

Do not write `_elementor_data` directly. After save:

- decode the stored Elementor JSON and count old/new URLs semantically;
- account for escaped `\/` when using a diagnostic raw-string search;
- verify the live DOM has the expected visible anchor and exact canonical href;
- re-read protected settings and `_thumbnail_id`;
- accept a changed `post_content` hash only after confirming it is Elementor's
  normal synchronization and the semantic page is intact.

Known failure to avoid: a governed `Document::save()` succeeded, but a raw
`substr_count()` for the unescaped URL returned zero and the script reported a
readback error. The link was already live. Never retry solely from that error;
decoded-tree and browser readback must decide whether a retry is safe.

For a pillar/service relationship, test bidirectionality explicitly:

- article → canonical service landing;
- service landing → canonical article;
- zero owned links remain on the redirected article URL.

## 6. Titles and Social/Schema Readback

A title refinement and a permalink migration can occur together, but verify
their surfaces separately:

| Surface | Typical owner | Required readback |
| --- | --- | --- |
| Editorial title / single-post H1 | WordPress `post_title` + Ohio template | one visible H1 with exact approved copy |
| Browser/SERP title | Yoast `_yoast_wpseo_title` or template | rendered `<title>` |
| Open Graph title | explicit Yoast OG title or Yoast fallback | `meta[property="og:title"]` |
| Twitter title | explicit Yoast Twitter title or social fallback | rendered Twitter tags and fallback behavior |
| Article headline | Yoast schema graph derived from current post data | `Article`/`BlogPosting.headline` |

Do not assume `post_title` should be copied verbatim into the SEO title: the H1
can carry editorial punch while the SEO title remains compact. Likewise, the
absence of `twitter:title` is not automatically a defect when the live card
correctly falls back to a verified `og:title`; validate the actual emitted head
instead of forcing redundant metadata. Canonical URL changes must propagate to
`link[rel=canonical]`, `og:url`, schema `@id`/URL relationships and breadcrumbs
regardless of title strategy.

## 7. Purge and Live QA

After all live writes:

1. flush the relevant WordPress object cache and run
   `wp kinsta cache purge --all` through the governed WP-CLI rail;
2. request every old post URL and old archive without following redirects;
   assert one `301` hop and exact `Location` semantics;
3. request every new URL anonymously and assert `200`, canonical self-reference,
   intended robots, `og:url`, titles, social image and schema graph;
4. confirm breadcrumbs and archive links no longer include the old parent;
5. confirm the new category archive and affected posts appear in the correct
   Yoast sitemap with honest `lastmod`; confirm old canonicals are absent;
6. re-scan internal links for old paths and verify intended reciprocal links;
7. run Playwright at desktop `1440x1000` and mobile `390x844`: one H1, required
   links visible, article/landing content intact, images loaded, no critical
   console/page errors and `scrollWidth <= clientWidth`;
8. repeat anonymous readback after the purge to detect stale edge output.

Record unrelated pre-existing visual or media debt as residual evidence. Do not
attribute it to the migration, but do not hide it to obtain a false pass.

## Definition of Done

- [ ] Runtime permalink/category settings and full affected-post inventory captured.
- [ ] Snapshot and scoped rollback prepared before mutation.
- [ ] Category moved through `wp_update_term()` with term ID/slug preserved.
- [ ] Category assignments and Yoast primary categories unchanged or intentionally updated.
- [ ] Explicit Yoast Premium plain `301` redirects cover every changed published post and archive.
- [ ] Redirect readback accounts for slash normalization and live HTTP is one-hop/correct.
- [ ] Owned internal links use new canonicals; reciprocal pillar/service links pass both ways.
- [ ] Canonical, breadcrumbs, `og:url`, schema and Yoast sitemaps reflect the new hierarchy.
- [ ] H1, SEO title, OG/Twitter behavior and schema headline were independently verified.
- [ ] Kinsta cache was purged and repeated anonymous readback is stable.
- [ ] Desktop/mobile render and overflow QA passed or exact residuals were recorded.
- [ ] No SQL/direct serialized-option/direct `_elementor_data` write was used.
