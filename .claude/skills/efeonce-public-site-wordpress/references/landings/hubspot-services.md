# Landing: HubSpot Services

## Identity

- URL: `https://efeoncepro.com/servicios-contratar-hubspot/`
- WordPress `page_id`: `244079`
- Status: publish

## Content authority for the pending rebuild

- Current live identity above remains authoritative until `TASK-1352` executes and verifies the 301.
- Positioning: `docs/public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md`.
- Content spec: `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md`.
- Offer taxonomy: `docs/services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md`.
- Product evidence: `.codex/skills/hubspot-solutions-partner/SOURCES.md`, refreshed at publication.

Do not reintroduce a fixed agent roster, “seven Hubs,” or Customer Agent as the root service. Use six Hubs connected
to Smart CRM and route copy through the six outcome families; Agent Hub, AEO, workspaces and CRM objects are
transversal capabilities.

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
