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

Runtime note 2026-07-15: the live WordPress runtime for `efeoncepro.com` registers
both `core/details` and `core/accordion` alongside `yoast/faq-block`. For compact
editorial FAQs inside a long article, prefer `core/details` first: it saves native
`<details><summary>` HTML, keeps the complete answer in the document, needs no
custom JavaScript and lets the global TOC point to the parent FAQ H2 instead of
inflating the outline with every question. Use `core/accordion` only when the
interaction specifically needs a grouped accordion pattern, keyboard roving or
exclusive/open-state behavior that native independent disclosures do not cover.

Runtime note 2026-07-16: when the disclosure is a true FAQ that should emit
structured data, author it as semantic `kind: "faq"` in the `GutenbergArticleSpec`.
Content Factory renders the visible `core/details` blocks and a governed
`FAQPage` JSON-LD block from the same `items[]`. Do not duplicate questions in a
manual schema block. `core/html` is allowed only for generated JSON-LD that the
validator can parse and match back to visible summaries.

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
- `GutenbergArticleSpec.image.sources` admite art direction opcional por viewport y
  `prefers-color-scheme`; cada source exige URL real y una media query allowlisted.
  El attachment fallback conserva el ownership del bloque `core/image`, ALT y caption.
  Declarar también `width` y `height` intrínsecos del fallback para reservar espacio y reducir CLS.

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

- `efeoncepro/glitch-drop` for Efeonce's POV inside Glitch posts (weekly
  edition and Glitch Flash). The block is live since 2026-07-04 (TASK-1337);
  the `core/quote` fallback is retired for new posts. The spec has no `kind`
  for it yet: insert it with the governed recipe in «Glitch Drop» below.
  Contract: `docs/documentation/public-site/glitch-drop-gutenberg-block.md`.
- `core/quote` for actual quotes, strong principles outside the Glitch format,
  or temporary POV fallback when no custom block is available.
- `core/pullquote` for a short, high-signal editorial callout when the source
  post already uses highlighted claims or stats.
- `core/details` for compact FAQ/disclosure moments inside a section when the
  summary must remain visible and the full answer should stay in HTML without a
  custom block.
- `kind: "faq"` in the article spec when those disclosures are true FAQs and
  should also emit `FAQPage` JSON-LD; this is the scalable path because visible
  content and schema share one source of truth.
- `core/separator` to separate CTA/final reflection from the body.
- `core/image`, `core/gallery` or `core/embed` only after resolving real
  WordPress media or a valid embed source from the brief/source material.
- Para diagramas con composiciones independientes desktop/mobile o light/dark,
  declarar `image.sources` en el spec; no insertar `<picture>` manualmente.
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

### Details / FAQ disclosures

Use native `core/details` for compact question/answer or optional-detail moments
inside a section. The block is not a replacement for major article structure:
keep the section H2 as the navigable TOC destination, then put each question in
the `<summary>`. Do not place hidden heading blocks inside the disclosure unless
a reviewed outline/TOC decision owns that change.

If the section is a real FAQ and should emit schema, do not author four
standalone `details` plus a separate JSON-LD block. Use semantic `kind: "faq"`:
the same `items[]` renders the visible disclosures and the `FAQPage` graph. This
is the only generated use of `core/html`; arbitrary HTML remains blocked.

```html
<!-- wp:details {"summary":"¿Qué decide una persona?"} -->
<details class="wp-block-details">
  <summary>¿Qué decide una persona?</summary>
  <!-- wp:paragraph -->
  <p>La persona conserva intención, criterio, excepciones y aprobación final.</p>
  <!-- /wp:paragraph -->
</details>
<!-- /wp:details -->
```

`core/details` differs from `core/accordion`: the former is native disclosure
HTML with independent open/close behavior; the latter is a grouped interactive
block powered by WordPress' Interactivity API. Prefer the lighter primitive
unless the editorial job requires the grouped behavior.

Minimal semantic FAQ shape:

```json
{
  "kind": "faq",
  "schema": {
    "enabled": true,
    "name": "Preguntas frecuentes sobre el tema",
    "canonicalUrl": "https://efeoncepro.com/categoria/post/",
    "inLanguage": "es-CL"
  },
  "items": [
    {
      "question": "¿Qué decide una persona?",
      "answer": [
        {
          "kind": "paragraph",
          "text": "La persona conserva intención, criterio, excepciones y aprobación final."
        }
      ]
    }
  ]
}
```

### Quotes

Use quote blocks for strong POV lines or principles, not decorative pull text.
For Glitch posts, Efeonce's POV goes in `efeoncepro/glitch-drop`, never in an
external quote.

```html
<!-- wp:quote -->
<blockquote class="wp-block-quote">
  <p>La AI aporta valor cuando trabaja con contexto, restricciones y evidencia.</p>
</blockquote>
<!-- /wp:quote -->
```

### Glitch Drop (`efeoncepro/glitch-drop`)

Use it for Efeonce's editorial POV attached to a news item in the weekly Glitch
edition or a Glitch Flash. It is an `aside`, not a quote. The block is
**dynamic**: its text lives in the `content` attribute of the comment, not in
inner HTML. Real syntax (Glitch Flash 251941, serialized by WordPress):

```html
<!-- wp:efeoncepro/glitch-drop {"content":"Primera frase del POV.\u003cbr\u003eSegunda frase, el remate."} /-->
```

Rules: 1–4 short sentences separated by `<br>`; no links inside the drop (the
link goes in the next paragraph); the neighbouring paragraphs must not repeat
its sentences. `GutenbergArticleSpec` has no `kind` for this block yet and the
validator rejects it (`unsupported_gutenberg_block`), so the current path is:
marker paragraph `__GLITCH_DROP__` in the spec → private write →
`parse_blocks` / replace / `serialize_blocks` / `wp_update_post(wp_slash())`
with a prior snapshot. Step-by-step recipe:
`.claude/skills/efeonce-public-site-wordpress/references/content-factory-gutenberg.md`
§Glitch Drop sin `kind`. Never type the comment by hand.

The live plugin is v0.1.0 (callout v1). The approved callout «DROP» v2
(`docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` §6) needs
a plugin update; the stored `content` attribute does not change.

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

### Embed with source caption (not emitted by the spec yet)

Glitch credits the source of every clip. WordPress stores the caption inside
the embed `figure` (real syntax, Glitch #17 251605):

```html
<!-- wp:embed {"url":"https://www.youtube.com/watch?v=VIDEO_ID","type":"video","providerNameSlug":"youtube","responsive":true,"align":"center","className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
<figure class="wp-block-embed aligncenter is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=VIDEO_ID
</div><figcaption class="wp-element-caption">Fuente: <a href="https://…">Medio</a></figcaption></figure>
<!-- /wp:embed -->
```

The spec's `embed` kind has no `caption` today; see the extension proposal.

### Native video (not emitted by the spec yet)

For a clip uploaded to the Media Library (Glitch #16/#17), `core/video` with a
real attachment ID:

```html
<!-- wp:video {"id":VIDEO_ATTACHMENT_ID} -->
<figure class="wp-block-video"><video controls src="https://efeoncepro.com/wp-content/uploads/…/clip.mp4"></video><figcaption class="wp-element-caption">Fuente: …</figcaption></figure>
<!-- /wp:video -->
```

### Table and separator styles (registered by core)

`core/table` declares `regular`/`stripes`; `core/separator` declares
`default`/`wide`/`dots`. Real syntax from published posts:

```html
<!-- wp:table {"className":"is-style-stripes"} -->
<figure class="wp-block-table is-style-stripes"><table class="has-fixed-layout"><thead>…</thead><tbody>…</tbody></table></figure>
<!-- /wp:table -->

<!-- wp:separator {"className":"is-style-wide"} -->
<hr class="wp-block-separator has-alpha-channel-opacity is-style-wide"/>
<!-- /wp:separator -->
```

The spec emits neither style today. Check Ohio's render at 390 px before
adopting stripes on wide tables.

### Layout and CTA blocks (validator allows them; no spec kind)

`core/group`, `core/columns`, `core/buttons` and `core/button` pass the
validator allowlist, but no `GutenbergArticleSpec` kind emits them, so a
generated draft cannot contain them. The only published examples (post 249768,
authored by hand before Content Factory) mix Ohio palette presets
(`brand-color`), inline radii and an unregistered class
(`is-style-fill_content`): **do not copy them as a recipe**. A CTA button or a
styled group enters Content Factory only through a governed kind with closed
variants (see the proposal in the skill reference).

## Inventory and Gap vs. Runtime (2026-09-28)

Read-only WP-CLI inventory of `efeoncepro.com` (WordPress 7.1.2, classic theme
`ohio-child`, no `theme.json`):

- **220 registered blocks** (116 core, 87 Jetpack, 7 Yoast, 5 premium-content,
  `efeoncepro/glitch-drop`, CF7, ActiveCampaign, HubSpot embed, VideoPress).
- **Block styles:** only 4 registered in PHP (Jetpack form fields). Core
  `block.json` styles: button fill/outline, image rounded, quote plain,
  separator wide/dots, table stripes. Neither Ohio nor
  `efeonce-editorial-blocks` registers editorial styles.
- **Patterns:** 18, all core query/navigation or Jetpack forms. Zero editorial
  patterns and zero user patterns (`wp_block`).
- **Real usage** (44 published posts): paragraph, list, heading, separator,
  image, quote dominate; `pullquote` in 15 posts, Yoast TOC in 40,
  `glitch-drop` 34 times in 6 posts, `details` and FAQ JSON-LD in 1 post.
  Glitch Flash 251941 used only paragraph, heading, list, TOC, image, table,
  separator and one drop.

| Class | Blocks / styles |
| --- | --- |
| Supported and used | anchored heading, rich-text paragraph, list, table + caption, image + caption/sources, separator, Yoast TOC, `faq`/`details` |
| Supported, rarely used | `pullquote`, real `quote`, ordered list, `image.linkDestination=media`, YouTube `embed` |
| Not supported, valuable | `efeoncepro/glitch-drop`, `core/video`, embed caption, table stripes, governed CTA buttons, Glitch post pieces approved in the graphic line §6 (opening, rundown, subscription banner, «El hilo de la semana», closing: they need registered styles or synced patterns in `efeonce-editorial-blocks` first) |
| Medium value, on demand | `core/columns`, `core/code`, separator wide/dots, image rounded |
| Not recommended | `core/cover`, `core/media-text`, `core/tabs`/`accordion`, `core/footnotes` (post meta), `yoast/faq-block`, `yoast/how-to-block`, Yoast breadcrumbs/related links in the body, `leadin`/Jetpack/CF7 forms (forms belong to Growth Forms), other Jetpack blocks, `spacer`, unregistered custom classes, inline Ohio palette colors to imitate AXIS |

Detailed counts, reasons and the extension proposal (`kind: 'glitchDrop'`,
embed/video caption, table style, governed buttons, Glitch sections):
`.claude/skills/efeonce-public-site-wordpress/references/content-factory-gutenberg.md`.

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
