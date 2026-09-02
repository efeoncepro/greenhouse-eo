# Native public-site navigation

Use for an authorized menu label, destination or hierarchy change. A landing publication alone does
not prove it appears in navigation. Keep Ohio's existing menu rendering; do not replace global chrome
or introduce a second navigation component for a new landing.

## Discover and snapshot

1. Resolve theme locations, the assigned menu, its complete item list and the destination page/permalink.
   Search by object id and URL before creating an item: an existing link may only need a label change.
2. Identify the target item, parent chain, type/object, status and requested semantic change. Preserve
   target, classes, XFN, description and attributes unless the request changes them.
3. Snapshot the menu membership/order and relevant item posts/metas before writing. Record both the
   API's display sequence and raw persisted `menu_order`, using a separate persisted-post read.

`wp_get_nav_menu_items()` defaults to `output=ARRAY_A` and `output_key=menu_order`; it sorts and rewrites
that output property to consecutive positions in memory. Those positions are not proof of the raw
stored values. Never reuse a display rank as a persisted position without checking the distinction.
[WordPress source](https://developer.wordpress.org/reference/functions/wp_get_nav_menu_items/).

## Write and verify

- Use WordPress APIs through the governed wrapper with `edit_theme_options` capability, a target guard
  and a recoverable snapshot. For a label-only change to an existing item, assess a minimal post-title
  update instead of resubmitting unrelated menu fields; check effective title and hooks afterward.
- If using `wp_update_nav_menu_item()`, verify the entire menu afterward, not only its return value or
  the target link. Compare membership, label, destination, parent and relative sequence; compare raw
  persisted values separately when that is part of the contract.
- A failed post-write check may leave a successful label change plus an unintended reorder. Inspect
  first; repair only proven changes through WordPress APIs with current-state guards. Do not make a
  bulk position rewrite a standard step, or overwrite concurrent edits to restore an old snapshot.
- Invalidate the appropriate menu/cache layers, then verify the public desktop and mobile navigation,
  submenu activation, actual destination click and absence of duplicates. Do not claim keyboard or
  mobile coverage from an HTML-only menu readback.

## Content Marketing evidence and limit

The 2026-08-31 request reused item `242917` in menu `61` under Soluciones → Crecimiento Multicanal.
The menu API update changed positions; recovery used `wp_update_post()` on the menu items' positions.
Snapshot `_gh_content_marketing_menu_20260831_122837` and subsequent readback established the original
display sequence with only the requested label difference. That snapshot stored normalized display
positions, so it does **not** establish byte-for-byte preservation of all original raw `menu_order`
values. Do not describe this recovery as a universally required WordPress reorder or infer a hook cause.
Landing state, public click evidence and scope: `landings/content-marketing.md` and
`docs/audits/public-site/2026-08-31-content-marketing-publication.md`.

## Indexing checks for menu pages

Resolve assigned menus and compare rendered navigation; exclude `#` group labels and external social
links. Audit each unique internal destination for robots meta/HTTP headers, robots.txt, canonical, status
and sitemap before changing anything. An indexing request for the menu does not authorize unblocking
backups or pilots outside it. 2026-08-31: 18 destinations verified, only Redes Sociales needed its native
Yoast noindex flag changed. Use the native meta/Yoast path for that change; an Elementor save is not
needed when no page content changes. Rebuild the affected indexable, invalidate sitemap/cache, and
verify public robots, canonical and sitemap again. This establishes eligibility, not Google indexing
or a GSC request. Evidence: `docs/audits/public-site/2026-08-31-menu-indexability.md`.
