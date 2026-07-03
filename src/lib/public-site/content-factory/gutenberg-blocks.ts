/**
 * Canonical Gutenberg block builders for the AI Content Factory.
 *
 * These primitives are the single source of truth for emitting editorial blocks
 * that render correctly on efeoncepro.com. They exist because the first live
 * write (post 250748, 2026-07-03) surfaced two recurring defects when blocks
 * were hand-authored or produced by the legacy recipe:
 *
 * 1. The `yoast-seo/table-of-contents` block was emitted empty (just its title
 *    heading, no populated `<ul>` of anchor links) and body headings had no
 *    `id` anchors → the TOC rendered as a dead heading, not a functional index.
 * 2. Heading anchors must match how Yoast/WordPress generate them
 *    (`h-{slug}` with accents stripped) so the TOC links resolve.
 *
 * Any generator (the template planner OR an agent authoring real content) must
 * build headings via `renderHeadingBlock` and the TOC via
 * `renderYoastTableOfContents(outline)` so the anchors always line up.
 */

export type GutenbergOutlineHeading = {
  level: 2 | 3
  text: string
}

/**
 * Escape user/model text before it goes inside block HTML. Never let raw `<`,
 * `>`, `&`, quotes reach WordPress unescaped.
 */
export const escapeGutenbergHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * Build the anchor id WordPress/Yoast use for a heading: `h-` + accent-stripped,
 * lowercased slug with punctuation/emoji removed and spaces collapsed to hyphens.
 * Verified against a live Efeonce post (248398): "¿Qué es Loop Marketing? ♾️"
 * → `h-que-es-loop-marketing`.
 */
export const yoastHeadingAnchor = (text: string): string => {
  const slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  return `h-${slug}`
}

/**
 * Render an anchored heading block. H2 omits the level attr (WordPress default),
 * H3 carries `{"level":3}`. The `wp-block-heading` class + `id` anchor match what
 * the editor/Yoast expect so the TOC can link to it.
 */
export const renderHeadingBlock = (heading: GutenbergOutlineHeading): string => {
  const anchor = yoastHeadingAnchor(heading.text)
  const comment = heading.level === 2 ? '<!-- wp:heading -->' : `<!-- wp:heading {"level":${heading.level}} -->`

  return [
    comment,
    `<h${heading.level} class="wp-block-heading" id="${anchor}">${escapeGutenbergHtml(heading.text)}</h${heading.level}>`,
    '<!-- /wp:heading -->'
  ].join('\n')
}

/**
 * Render a POPULATED Yoast table-of-contents block from the heading outline.
 * H3s nest inside their parent H2's `<ul>`. Each link points at the same anchor
 * `renderHeadingBlock` produces, so the index is clickable. Yoast re-generates
 * this list on save, but pre-populating it means the TOC is correct even if the
 * post is never opened in the editor.
 */
export const renderYoastTableOfContents = (
  outline: GutenbergOutlineHeading[],
  options: { title?: string } = {}
): string => {
  const title = options.title ?? 'Tabla de contenidos'
  const items: string[] = []
  let index = 0

  const linkFor = (heading: GutenbergOutlineHeading) =>
    `<a href="#${yoastHeadingAnchor(heading.text)}" data-level="${heading.level}">${escapeGutenbergHtml(heading.text)}</a>`

  while (index < outline.length) {
    const heading = outline[index]

    if (heading.level === 2) {
      const subItems: string[] = []
      let cursor = index + 1

      while (cursor < outline.length && outline[cursor].level === 3) {
        subItems.push(`<li>${linkFor(outline[cursor])}</li>`)
        cursor += 1
      }

      const subList = subItems.length ? `<ul>${subItems.join('')}</ul>` : ''

      items.push(`<li>${linkFor(heading)}${subList}</li>`)
      index = cursor
    } else {
      // Defensive: an H3 without a preceding H2 still gets listed rather than dropped.
      items.push(`<li>${linkFor(heading)}</li>`)
      index += 1
    }
  }

  return [
    '<!-- wp:yoast-seo/table-of-contents -->',
    `<div class="wp-block-yoast-seo-table-of-contents yoast-table-of-contents"><h2>${escapeGutenbergHtml(
      title
    )}</h2><ul>${items.join('')}</ul></div>`,
    '<!-- /wp:yoast-seo/table-of-contents -->'
  ].join('\n')
}
