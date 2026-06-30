# Public Site Layout Incidents

Use this reference when touching older public pages or debugging layout seams already encountered on the WordPress/Ohio site.

## Blog Page

- Page id: `18456`
- The container width issue came from Ohio meta `page_full_width_margins_size` being out of sync with `--clb-grid-gutter`; live fix set it to `16px`.
- Sidebar logo/hamburger regression was fixed with page-scoped CSS in `wp-content/themes/ohio-child/assets/css/global-fixes.css` for `body.page-id-18456.with-header-sidebar:not(.dark-scheme)`.
- Do not patch global masthead/sidebar selectors for a local Blog seam.

## Contact Page

- Page id: `20729`
- The background discontinuity came from Ohio `breadcrumb-holder` and `page-container.bottom-offset`.
- Fix was Ohio page meta:
  - `page_breadcrumbs_visibility=0`
  - `page_add_top_padding=0`
- This was not a global background CSS problem.

## HubSpot Services

See `references/landings/hubspot-services.md`.

## Agencia Creativa

See `references/landings/agencia-creativa.md`.

## General Lesson

Several visual seams are Ohio page/meta issues, not global CSS problems.

Before changing CSS:

1. Inspect Ohio page meta.
2. Inspect Elementor structure/settings.
3. Inspect generated page CSS.
4. Verify computed CSS in browser.
5. Use page-scoped CSS only when the issue is presentational and no native control owns it.
