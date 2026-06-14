# Gutenberg Post Authoring Recipes

## Purpose

Greenhouse AI Content Factory must generate and refresh Efeonce blog posts as
structured Gutenberg documents, not plain text pasted into paragraphs. The
agent should understand the editorial outline, the native block dialect and the
legacy block debt before preparing any `post_draft_gutenberg` or
`refresh_existing_gutenberg_post` artifact.

## Live Runtime Findings

Read-only WP-CLI inspection on 2026-06-14 sampled the six latest published
posts on `efeoncepro.com`.

| Example post | Observed structure |
| --- | --- |
| `249766` Glitch #02 | 81 parsed blocks, H2 intro, H3 numbered sections, 8 images, separators, many legacy `core/freeform` fragments. |
| `249768` Surround Discovery | 220 parsed blocks, `yoast-seo/table-of-contents`, H2/H3/H4 hierarchy, galleries, images, quotes, columns, buttons, groups. |
| `249383` Donde cita la IA | 137 parsed blocks, `yoast-seo/table-of-contents`, H2/H3 hierarchy, list/list-item structure, separators. |
| `249056` Express en Loop Marketing | 671 parsed blocks, `yoast-seo/table-of-contents`, H2/H3 hierarchy, lists, separators, quote. |
| `249111` Ley 21.719 | 860 parsed blocks, `yoast-seo/table-of-contents`, H2/H3 hierarchy, quotes, lists, separators. |
| `249114` UCP | 449 parsed blocks, `yoast-seo/table-of-contents`, H2/H3 hierarchy, lists, separators. |
| `248398` Que es Loop Marketing | 400 parsed blocks, clean Gutenberg-only post, `yoast-seo/table-of-contents`, H2/H3/H4 outline, lists, quotes, pullquotes, separators, one reconciled SVG image, no non-empty freeform fragments. |

Runtime implication:

- Existing posts use Gutenberg blocks, not Elementor.
- The WordPress post title owns the visible/page H1; generated body content
  should start at H2.
- Long Efeonce posts usually include `yoast-seo/table-of-contents`.
- `core/freeform` appears frequently in existing content because legacy HTML and
  plugin/editor fragments are interleaved with real blocks. Treat it as
  observable legacy material for inspection and refresh, but do not generate it
  in new drafts unless a migration task explicitly approves it.
- Media blocks (`core/image`, `core/gallery`, `core/embed`) require real asset
  resolution. Do not invent image IDs or decorative video URLs.

## Composition Contract

For new AI-generated Efeonce blogposts, use the code profile
`EFEONCE_BLOGPOST_COMPOSITION_PROFILE` in
`src/lib/public-site/content-factory/gutenberg-validator.ts`.

For machine-readable block policy, use
`pnpm public-website:content-factory:patterns`. It emits
`gutenbergBlockPatternCatalog.v1` from
`src/lib/public-site/content-factory/gutenberg-pattern-catalog.ts`, including
generation policy, refresh policy, constraints and safe examples for each
governed block.

Minimum generated structure:

- Intro paragraphs that frame the problem and promise.
- `core/heading` outline with at least three body headings.
- At least two H2 sections because the post title is already the H1.
- No H1 inside `post_content`.
- No hierarchy jumps such as H2 directly to H4.
- `yoast-seo/table-of-contents` for generated editorial posts.
- `core/list` for TL;DR, checklist, steps, evidence or comparison.
- At least one enrichment block such as quote, separator, image or embed.
- Metadata: title, lowercase kebab-case slug, excerpt, SEO title and SEO
  description.

Recommended enrichment:

- `core/quote` for a clear POV line, claim or principle.
- `core/pullquote` for a short, high-signal editorial callout when the source
  post already uses highlighted claims or stats.
- `core/separator` to separate CTA/final reflection from the body.
- `core/image`, `core/gallery` or `core/embed` only after resolving real
  WordPress media or a valid embed source from the brief/source material.
- CTA paragraph or governed button only when the conversion target is known.

## Block Recipes

### Table of Contents

Use Yoast's block when the draft has multiple H2/H3 sections:

```html
<!-- wp:yoast-seo/table-of-contents -->
<div class="wp-block-yoast-seo-table-of-contents yoast-table-of-contents"><h2>Tabla de contenidos</h2></div>
<!-- /wp:yoast-seo/table-of-contents -->
```

The TOC should follow the intro/TL;DR and precede the body sections.

### Headings

Use H2 for major sections and H3 for children. H4 is allowed only under H3 when
the depth is truly useful. Do not generate H1.

```html
<!-- wp:heading {"level":2} -->
<h2>Qué cambia para el equipo comercial</h2>
<!-- /wp:heading -->
```

### Paragraphs

Use paragraphs for body copy only. A generated post composed mostly of
paragraphs is invalid for Content Factory.

```html
<!-- wp:paragraph -->
<p>El punto no es producir más piezas, sino producir piezas que una persona pueda revisar, mejorar y publicar con trazabilidad.</p>
<!-- /wp:paragraph -->
```

### Lists

Use lists for TL;DR, checklists, steps, tradeoffs and evidence.

```html
<!-- wp:list -->
<ul>
<li>Definir el objetivo comercial antes del prompt.</li>
<li>Separar borrador, validación y aprobación.</li>
<li>Conservar evidencia de cada decisión editorial.</li>
</ul>
<!-- /wp:list -->
```

### Quotes

Use quote blocks for strong POV lines or principles, not decorative pull text.

```html
<!-- wp:quote -->
<blockquote class="wp-block-quote"><p>La AI aporta valor cuando trabaja con contexto, restricciones y evidencia.</p></blockquote>
<!-- /wp:quote -->
```

### Pullquotes

Use pullquotes sparingly for claims, framing lines or evidence snippets that
deserve visual emphasis. They are allowed in generated drafts and should be
preserved during refresh unless the refresh explicitly changes that section.

```html
<!-- wp:pullquote -->
<figure class="wp-block-pullquote"><blockquote><p>El loop no es una campaña: es un sistema que aprende en cada vuelta.</p></blockquote></figure>
<!-- /wp:pullquote -->
```

### Images

Images need a real WordPress media ID and URL before any write. If the agent has
not resolved media, keep an explicit media slot in the plan instead of inventing
an image block.

```html
<!-- wp:image {"id":249787,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="https://efeoncepro.com/wp-content/uploads/..." alt="..." class="wp-image-249787"/></figure>
<!-- /wp:image -->
```

### YouTube / Video Embeds

Use `core/embed` for YouTube only when the source URL is part of the brief or
the source inspection.

```html
<!-- wp:embed {"url":"https://www.youtube.com/watch?v=VIDEO_ID","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=VIDEO_ID</div></figure>
<!-- /wp:embed -->
```

## Refresh / Fix Rules

- Inspect the current post first with bridge/WP-CLI and record post ID, status,
  block counts, heading outline, media refs, links, SEO and CTA state.
- For a guided refresh candidate, run
  `pnpm public-website:content-factory:inspect-post-deep -- --post-id <id>`
  before planning edits. The output is `contentFactoryPostDeepInspection.v1`
  with block paths, fingerprints, native attrs, editability classes, risks,
  links, media issues and Yoast metadata.
- Then run
  `pnpm public-website:content-factory:refresh-plan -- --inspection <post-deep-inspection.json>`
  to produce `contentFactoryRefreshPlan.v1`. This stays local and plan-only:
  it records `sendsWordPressWrite=false`, `modifiesPublishedSource=false`,
  source fingerprint, candidates by `path + fingerprint`, preserve gates and
  media/link/SEO review gates.
- Preserve existing media/embed blocks unless the task explicitly asks to
  replace them.
- Do not rewrite `core/freeform` aggressively. Mark it as legacy and patch
  around it unless a migration task owns conversion.
- For structural refresh, plan the heading diff before writing content diff.
- Work on draft/private clone or bridge-owned draft first; never patch published
  content directly from an AI generation pass.
