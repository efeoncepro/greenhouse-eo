# Landing: HubSpot Services

## Identity

- URL: `https://efeoncepro.com/servicios-contratar-hubspot/`
- WordPress `page_id`: `244079`
- Status: publish

## Ohio Headline Guardrail

Ohio page headline uses `page_header_title_background_type=featured`.

Correct large headline asset:

- Attachment id: `248703`
- File: `EO_Hubspot_Hiro2-2.webp`
- Dimensions observed: `2001x801`

Do not confuse with inline HubSpot logo attachment:

- Attachment id: `243106`
- File: `Hubspot-headline-1.webp`
- Purpose: small inline logo, not page headline background

Before `Document::save()` on this page, snapshot and verify:

- `_thumbnail_id`;
- `get_the_post_thumbnail_url()`;
- `page_header_title_background_type`;
- `page_header_title_background_*`;
- `elementorFrontendConfig.post.featuredImage`.

## Partner Proof Module

Legacy Elementor sections:

- `83d3781` intro
- `ebe0037` cards
- `5b75db1` stack

Preferred fix pattern for full-width background with constrained inner content:

- native Elementor section controls;
- `layout=boxed`;
- `content_width=1560px`;
- semantic classes:
  - `gh-section-hubspot-partner-proof`;
  - section-specific `gh-partner-proof-*`.

Do not solve this module with broad page CSS if the native Elementor control owns the issue.

## Headline Display Helper

The child theme owns:

```text
wp-content/themes/ohio-child/parts/elements/page_headline.php
```

It reads optional meta `gh_page_headline_display_title` for visual H1 only, preserving post title, slug, breadcrumbs, and SEO.

Never patch the Ohio parent theme.

The rounded modern white surface belongs to:

```text
#content > .page-container
```

not `.page-headline` or `.bg-image`.
