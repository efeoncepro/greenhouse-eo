# Landing: Agencia Creativa

## Identity

- URL: `https://efeoncepro.com/agencia-creativa/`
- WordPress `page_id`: `249582`
- Status: publish

## Featured Hero Guardrail

This page uses Ohio headline background type `featured`.

Correct hero/featured attachment:

- `_thumbnail_id=249672`
- File: `EO_Landing-GiroAgencia.webp`
- Purpose: clean hero background

Do not use attachment `249740` (`EO_Opengraph_AgenciaCreativa.webp`) as the hero background; it is for OpenGraph and has baked-in logo/text.

Before any `Document::save()` on this page, snapshot:

- `_thumbnail_id`;
- `get_the_post_thumbnail_url()`;
- `page_header_title_background_type`;
- `page_header_title_background_*`;
- `elementorFrontendConfig.post.featuredImage` after render.

Restore immediately with `set_post_thumbnail()` if drift occurs.

## "Cómo trabajamos" Sticky Module

Section/container:

- Root: `7489ca6`
- Left column: `49d5a98`
- Right sticky block: `97e545e`

Sticky behavior is CSS `position:sticky`, not Elementor Pro Sticky motion effects.

Class `-sticky-block` in `Landing Custom CSS.css` owns sticky positioning.

`lp-container-offset-left/right` rules are home/front-page-scoped and inert off Home. For this page, the accepted fix is a restrained page-scoped gutter, not full `.page-container` alignment.

Guardrail:

- Do not change Home offset rules.
- Do not align the module to the full page container; the operator rejected that as too much.

## Client Logo Strip

Logo row/grid: `a43cacf`.

If logos distort, prefer page-scoped CSS in `ohio-child/assets/css/global-fixes.css`:

- `width:auto!important`
- `height:auto!important`
- `max-height:54px`
- `max-width:min(100%,170px)`
- `object-fit:contain!important`

Do not mutate page data for logo ratio fixes.

## Comparison Table Widget

The live comparison table uses custom Elementor widget `greenhouse_comparison_table` from plugin `eo-elementor-widgets`.

Widget facts:

- semantic `<table>`;
- `data-gh-schema="comparisonTable.v1"`;
- theme settings mirror `theme_schema()`;
- corner-fold ribbon is the canonical best-option shape;
- motion must respect `prefers-reduced-motion`.

For widget code changes, load `references/custom-elementor-widgets.md`.
