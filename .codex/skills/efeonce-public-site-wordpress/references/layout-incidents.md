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

## Agencia Creativa V2 Candidate

- Page id: `251279`
- The left white gutter came from Ohio desktop CSS:
  `.elementor-page .page-container.-full-w .elementor > .e-con-full.e-parent { left: calc((var(--clb-container-side-gutter) - var(--clb-grid-gutter)) * -1) !important; }`
  which computed to `left:16px` on the Elementor root container.
- Fix is page-scoped Elementor custom CSS on `body.page-id-251279`, not a global Ohio patch:
  neutralize `.page-container.-full-w` padding/background, then override the same root selector with enough specificity so `.gh-creative-elementor-shell` computes `left=0`, `right=viewport`, `min-width=100vw`.
- Verify with Playwright computed styles at desktop/wide/mobile: shell and `.gh-creative` `left=0`, `scrollWidth==clientWidth`, edge pixels resolve to the section background.

## General Lesson

Several visual seams are Ohio page/meta issues, not global CSS problems.

Before changing CSS:

1. Inspect Ohio page meta.
2. Inspect Elementor structure/settings.
3. Inspect generated page CSS.
4. Verify computed CSS in browser.
5. Use page-scoped CSS only when the issue is presentational and no native control owns it.
