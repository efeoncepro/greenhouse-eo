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

Refresh note 2026-07-09: the broader content-hub audit is now documented in
`docs/documentation/public-site/wordpress-blog-content-hub-search.md` and
`docs/audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md`.
Current WordPress permalinks use `/%category%/%postname%/`, search results are
native WordPress search with Yoast `noindex, follow`, and the visible archive
render is owned by Ohio parent templates plus `global_blog_*` options. When a
new or refreshed article is meant to support the content hub, review category,
tags, featured image, excerpt and search/archive impact before publishing.

| Example post                       | Observed structure                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `249766` Glitch #02                | 81 parsed blocks, H2 intro, H3 numbered sections, 8 images, separators, many legacy `core/freeform` fragments.                                                                                   |
| `249768` Surround Discovery        | 220 parsed blocks, `yoast-seo/table-of-contents`, H2/H3/H4 hierarchy, galleries, images, quotes, columns, buttons, groups.                                                                       |
| `249383` Donde cita la IA          | 137 parsed blocks, `yoast-seo/table-of-contents`, H2/H3 hierarchy, list/list-item structure, separators.                                                                                         |
| `249056` Express en Loop Marketing | 671 parsed blocks, `yoast-seo/table-of-contents`, H2/H3 hierarchy, lists, separators, quote.                                                                                                     |
| `249111` Ley 21.719                | 860 parsed blocks, `yoast-seo/table-of-contents`, H2/H3 hierarchy, quotes, lists, separators.                                                                                                    |
| `249114` UCP                       | 449 parsed blocks, `yoast-seo/table-of-contents`, H2/H3 hierarchy, lists, separators.                                                                                                            |
| `248398` Que es Loop Marketing     | 400 parsed blocks, clean Gutenberg-only post, `yoast-seo/table-of-contents`, H2/H3/H4 outline, lists, quotes, pullquotes, separators, one reconciled SVG image, no non-empty freeform fragments. |

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

- `efeoncepro/glitch-drop` for Efeonce's POV inside `Glitch de la semana`
  once the block exists. Until then, `core/quote` may be used as a temporary
  visual fallback only when the content is clearly Efeonce commentary rather
  than an external citation. Contract:
  `docs/documentation/public-site/glitch-drop-gutenberg-block.md`.
- `core/quote` for actual quotes, strong principles outside the Glitch format,
  or temporary POV fallback when no custom block is available.
- `core/pullquote` for a short, high-signal editorial callout when the source
  post already uses highlighted claims or stats.
- `core/separator` to separate CTA/final reflection from the body.
- `core/image`, `core/gallery` or `core/embed` only after resolving real
  WordPress media or a valid embed source from the brief/source material.
- CTA paragraph or governed button only when the conversion target is known.

## Block Recipes

### Table of Contents

Use Yoast's block when the draft has multiple H2/H3 sections. The TOC must be
**populated** — a `<ul>` of anchor links that resolve to the body headings —
otherwise it renders as a dead heading in the editor (defect that shipped in the
first live post, 250748). Build it with `renderYoastTableOfContents(outline)`
from `src/lib/public-site/content-factory/gutenberg-blocks.ts` so the anchors
always match the headings. Its shape (H3s nest inside their parent H2):

```html
<!-- wp:yoast-seo/table-of-contents -->
<div class="wp-block-yoast-seo-table-of-contents yoast-table-of-contents">
  <h2>Tabla de contenidos</h2>
  <ul>
    <li>
      <a href="#h-que-cambia-para-el-equipo-comercial" data-level="2">Qué cambia para el equipo comercial</a>
      <ul>
        <li><a href="#h-como-aterrizarlo" data-level="3">Cómo aterrizarlo</a></li>
      </ul>
    </li>
  </ul>
</div>
<!-- /wp:yoast-seo/table-of-contents -->
```

The TOC should follow the intro/TL;DR and precede the body sections.

### Headings

Use H2 for major sections and H3 for children. H4 is allowed only under H3 when
the depth is truly useful. Do not generate H1.

Every heading must carry `class="wp-block-heading"` and an `id="h-{slug}"` anchor
(accent-stripped, matching Yoast) so the table of contents can link to it. Build
headings with `renderHeadingBlock({ level, text })` — never hand-write bare
`<h2>text</h2>` (unanchored headings break the TOC).

```html
<!-- wp:heading -->
<h2 class="wp-block-heading" id="h-que-cambia-para-el-equipo-comercial">Qué cambia para el equipo comercial</h2>
<!-- /wp:heading -->
```

H2 omits the `{"level":2}` attr (WordPress default); H3 carries `{"level":3}`.

### Paragraphs

Use paragraphs for body copy only. A generated post composed mostly of
paragraphs is invalid for Content Factory.

```html
<!-- wp:paragraph -->
<p>
  El punto no es producir más piezas, sino producir piezas que una persona pueda revisar, mejorar y publicar con
  trazabilidad.
</p>
<!-- /wp:paragraph -->
```

For inline citations, contextual links or restrained semantic emphasis, use
structured rich-text segments in the article spec instead of raw HTML:

```json
{
  "kind": "paragraph",
  "text": [
    { "text": "La investigación encontró un " },
    { "text": "tradeoff entre novedad y similitud", "strong": true },
    { "text": ". " },
    { "text": "Ver estudio primario", "href": "https://doi.org/10.1126/sciadv.adn5290" },
    { "text": "." }
  ]
}
```

Content Factory escapes text and attributes, renders `strong: true` as semantic
`<strong>` and only accepts `http:`, `https:` and `mailto:` links. Unsupported
or unsafe protocols fail authoring. Use emphasis as a reading signal for the
thesis, contrasts, stage labels or decisive evidence, not on every paragraph.

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
For `Glitch de la semana`, prefer the planned `efeoncepro/glitch-drop` block
for Efeonce's POV; do not model that long-term as an external quote.

```html
<!-- wp:quote -->
<blockquote class="wp-block-quote">
  <p>La AI aporta valor cuando trabaja con contexto, restricciones y evidencia.</p>
</blockquote>
<!-- /wp:quote -->
```

### Glitch

Use `Glitch` for Efeonce's editorial POV attached to a news item in the
weekly Glitch format. It is an aside, not a quote. The target block is
`efeoncepro/glitch-drop`; until implemented, generated drafts may keep a
temporary `core/quote` fallback only if the brief explicitly identifies the text
as Glitch commentary.

Contract:
`docs/documentation/public-site/glitch-drop-gutenberg-block.md`.

### Pullquotes

Use pullquotes sparingly for claims, framing lines or evidence snippets that
deserve visual emphasis. They are allowed in generated drafts and should be
preserved during refresh unless the refresh explicitly changes that section.

```html
<!-- wp:pullquote -->
<figure class="wp-block-pullquote">
  <blockquote><p>El loop no es una campaña: es un sistema que aprende en cada vuelta.</p></blockquote>
</figure>
<!-- /wp:pullquote -->
```

### Images

Images need a real WordPress media ID and URL before any write. If the agent has
not resolved media, keep an explicit media slot in the plan instead of inventing
an image block.

```html
<!-- wp:image {"id":249787,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large">
  <img src="https://efeoncepro.com/wp-content/uploads/..." alt="..." class="wp-image-249787" />
</figure>
<!-- /wp:image -->
```

### YouTube / Video Embeds

Use `core/embed` for YouTube only when the source URL is part of the brief or
the source inspection.

```html
<!-- wp:embed {"url":"https://www.youtube.com/watch?v=VIDEO_ID","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
<figure
  class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"
>
  <div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=VIDEO_ID</div>
</figure>
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
- When a concrete refresh brief exists, run
  `pnpm public-website:content-factory:patch-plan -- --refresh-plan <refresh-plan.json> --brief <patch-brief.json>`
  to produce `contentFactoryPatchPlan.v1`. The brief must require a draft clone,
  preserve the published source and include source/block fingerprints for
  proposed text changes. `ready_for_draft_clone` is not a write approval; it only
  means the local artifact can feed a future draft/private clone command.
- Preserve existing media/embed blocks unless the task explicitly asks to
  replace them.
- Do not rewrite `core/freeform` aggressively. Mark it as legacy and patch
  around it unless a migration task owns conversion.
- For structural refresh, plan the heading diff before writing content diff.
- Work on draft/private clone or bridge-owned draft first; never patch published
  content directly from an AI generation pass.

## Publication Boundary

Content Factory authoring and publication are different transactions:

1. `run --spec` assembles and validates without writing.
2. `run --send --author-id <id>` writes or reuses an idempotent private post.
3. Metadata, media, taxonomies, claims, author entity and render are reviewed while private.
4. `publish` requires a separate, explicit human authorization for the concrete version and URL.
5. Before that transition, capture a complete rollback snapshot.
6. A governed agent publication must return the post to `private` if the required live checks fail.
7. `HTTP 200` alone is insufficient: verify canonical, robots, schema, Open Graph, media, TOC, links,
   duplicate routes and desktop/mobile rendering.

The reusable procedure lives in
`docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`.
Creative Workflows post `251363` is the first complete reference case; its V1–V4 specs and audits remain
case evidence, not a replacement for this general contract.
