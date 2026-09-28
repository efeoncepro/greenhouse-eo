/**
 * Structured authoring primitive for the AI Content Factory.
 *
 * The template planner (`gutenberg-planner.ts`) produces structurally valid but
 * generic copy. Real editorial value comes from an *author* — an agent (Claude /
 * Codex) or a future governed LLM — writing differentiated content. This primitive
 * is the deterministic layer under that authoring: the author decides the content
 * (a typed `GutenbergArticleSpec`), and this function assembles a correct,
 * validated `contentFactoryGeneratedDraft.v1` — anchored headings, a populated
 * Yoast TOC, escaped text, no invented media.
 *
 * Design principle (canonized in TASK-1123): agent freedom lives in the semantic
 * spec; determinism lives in this assembly layer. An author never hand-writes
 * block markup, so the 250748 defect class (dead TOC, unanchored headings, raw
 * HTML) cannot reappear.
 */

import type { ContentFactoryGeneratedDraft } from './contracts'
import {
  escapeGutenbergHtml,
  renderHeadingBlock,
  renderYoastTableOfContents,
  serializeGutenbergBlockAttributes,
  type GutenbergOutlineHeading
} from './gutenberg-blocks'
import { renderGlitchDropBlock } from './gutenberg-glitch-drop'
import { slugifyPublicSiteDraft } from './gutenberg-planner'

export type GutenbergRichTextSegment = {
  text: string
  href?: string
  strong?: boolean
}

export type GutenbergRichText = string | GutenbergRichTextSegment[]

export type GutenbergFaqItem = {
  question: string
  answer: GutenbergArticleBlock[]
  open?: boolean
}

export type GutenbergFaqSchemaOptions = {
  enabled?: boolean
  name?: string
  canonicalUrl?: string
  id?: string
  inLanguage?: string
}

export type GutenbergButtonVariant = 'fill' | 'outline'

export type GutenbergButtonItem = {
  /** Visible label, plain text (escaped). */
  text: string
  /** Reviewed destination: `https:`, `http:` or `mailto:` only. */
  href: string
  /** Core-registered button styles only. `fill` is the core default and emits no class. */
  variant?: GutenbergButtonVariant
}

export const GUTENBERG_BUTTONS_MAX_ITEMS = 3

export type GutenbergArticleBlock =
  | { kind: 'paragraph'; text: GutenbergRichText }
  | { kind: 'list'; items: GutenbergRichText[]; ordered?: boolean }
  | { kind: 'details'; summary: string; blocks: GutenbergArticleBlock[]; open?: boolean }
  | { kind: 'faq'; items: GutenbergFaqItem[]; schema?: GutenbergFaqSchemaOptions }
  | {
      kind: 'table'
      headers: GutenbergRichText[]
      rows: GutenbergRichText[][]
      caption?: GutenbergRichText
      /** Core-registered table style (`is-style-stripes`). Check Ohio at 390 px on wide tables. */
      style?: 'stripes'
    }
  | { kind: 'quote'; text: string }
  | { kind: 'pullquote'; text: string }
  | { kind: 'separator' }
  // Media requires a real WordPress asset — never invent ids/urls.
  | {
      kind: 'image'
      mediaId: number
      url: string
      alt: string
      width?: number
      height?: number
      sizeSlug?: string
      caption?: GutenbergRichText
      linkDestination?: 'none' | 'media'
      /** Optional art-directed sources. The fallback attachment remains the Gutenberg image owner. */
      sources?: Array<{ url: string; media: string; type?: 'image/webp' | 'image/jpeg' | 'image/png' }>
    }
  | {
      kind: 'embed'
      provider: 'youtube'
      url: string
      /** Source credit (Glitch convention «Fuente: <medio>»), rendered as a real figcaption. */
      caption?: GutenbergRichText
    }
  /**
   * Efeonce POV callout for Glitch posts (`efeoncepro/glitch-drop`, dynamic block).
   * 1–4 plain-text lines joined by `<br>`; no links or markup (the link goes in the
   * next paragraph). Serialized byte-identical to WordPress.
   */
  | { kind: 'glitchDrop'; lines: string[] }
  /** Governed CTA buttons: 1–3 items, closed variants, no literal colors or custom classes. */
  | { kind: 'buttons'; items: GutenbergButtonItem[] }

export type GutenbergArticleSection = {
  heading: string
  level: 2 | 3
  blocks: GutenbergArticleBlock[]
}

export type GutenbergArticleSpec = {
  /** WordPress owns the H1 — this is the post title, never emitted inside the body. */
  title: string
  slug?: string
  excerpt: string
  seo: {
    title: string
    description: string
    canonicalUrl?: string
    inLanguage?: string
    indexPolicy?: 'index' | 'noindex'
  }
  /** Intro paragraphs framing the piece, rendered before the TOC. */
  intro: GutenbergRichText[]
  sections: GutenbergArticleSection[]
  /** Defaults to true when there are >= 2 H2 sections. */
  tableOfContents?: boolean
  /** Optional closing CTA paragraph, separated by a rule. */
  cta?: { text: GutenbergRichText }
  intent?: 'create'
  attribution?: {
    campaignId?: string
    hubspotCampaignId?: string
    utm?: Record<string, string>
  }
}

const renderRichText = (value: GutenbergRichText): string => {
  if (typeof value === 'string') return escapeGutenbergHtml(value)

  return value
    .map(segment => {
      const text = segment.strong
        ? `<strong>${escapeGutenbergHtml(segment.text)}</strong>`
        : escapeGutenbergHtml(segment.text)

      if (!segment.href) return text

      const url = new URL(segment.href)

      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
        throw new Error(`content_factory_article_link_protocol_invalid:${url.protocol}`)
      }

      return `<a href="${escapeGutenbergHtml(segment.href)}">${text}</a>`
    })
    .join('')
}

const renderRichTextPlainText = (value: GutenbergRichText): string => {
  if (typeof value === 'string') return value

  return value.map(segment => segment.text).join('')
}

const normalizePlainText = (value: string): string => value.replace(/\s+/g, ' ').trim()

const paragraphBlock = (text: GutenbergRichText): string =>
  ['<!-- wp:paragraph -->', `<p>${renderRichText(text)}</p>`, '<!-- /wp:paragraph -->'].join('\n')

const listBlock = (items: GutenbergRichText[], ordered = false): string => {
  const tag = ordered ? 'ol' : 'ul'
  const lis = items.map(item => `<li>${renderRichText(item)}</li>`).join('')
  const attr = ordered ? ' {"ordered":true}' : ''

  return [`<!-- wp:list${attr} -->`, `<${tag}>${lis}</${tag}>`, '<!-- /wp:list -->'].join('\n')
}

const tableBlock = (block: Extract<GutenbergArticleBlock, { kind: 'table' }>): string => {
  if (block.headers.length === 0) {
    throw new Error('content_factory_article_table_headers_required')
  }

  if (block.rows.length === 0) {
    throw new Error('content_factory_article_table_rows_required')
  }

  if (block.rows.some(row => row.length !== block.headers.length)) {
    throw new Error('content_factory_article_table_column_count_mismatch')
  }

  const headers = block.headers.map(header => `<th scope="col">${renderRichText(header)}</th>`).join('')

  const rows = block.rows
    .map(row => `<tr>${row.map(cell => `<td>${renderRichText(cell)}</td>`).join('')}</tr>`)
    .join('')

  const caption = block.caption
    ? `<figcaption class="wp-element-caption">${renderRichText(block.caption)}</figcaption>`
    : ''

  if (block.style !== undefined && block.style !== 'stripes') {
    throw new Error(`content_factory_article_table_style_invalid:${String(block.style)}`)
  }

  const styleClass = block.style === 'stripes' ? 'is-style-stripes' : ''
  const comment = styleClass ? `<!-- wp:table ${serializeGutenbergBlockAttributes({ className: styleClass })} -->` : '<!-- wp:table -->'
  const figureClass = styleClass ? `wp-block-table ${styleClass}` : 'wp-block-table'

  return [
    comment,
    `<figure class="${figureClass}"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>${caption}</figure>`,
    '<!-- /wp:table -->'
  ].join('\n')
}

const detailsBlock = (
  block: Extract<GutenbergArticleBlock, { kind: 'details' }>,
  context: { canonicalUrl?: string; inLanguage?: string }
): string => {
  if (!block.summary.trim()) {
    throw new Error('content_factory_article_details_summary_required')
  }

  if (block.blocks.length === 0) {
    throw new Error('content_factory_article_details_blocks_required')
  }

  const attrs = block.open ? { summary: block.summary, showContent: true } : { summary: block.summary }
  const open = block.open ? ' open' : ''
  const children = block.blocks.map(child => renderArticleBlock(child, context)).join('\n')

  return [
    `<!-- wp:details ${JSON.stringify(attrs)} -->`,
    `<details class="wp-block-details"${open}><summary>${escapeGutenbergHtml(block.summary)}</summary>`,
    children,
    '</details>',
    '<!-- /wp:details -->'
  ].join('\n')
}

const blockToPlainText = (block: GutenbergArticleBlock): string => {
  switch (block.kind) {
    case 'paragraph':
      return renderRichTextPlainText(block.text)
    case 'list':
      return block.items.map(item => renderRichTextPlainText(item)).join(' ')
    case 'details':
      return [block.summary, ...block.blocks.map(child => blockToPlainText(child))].join(' ')
    case 'table':
      return [
        ...block.headers.map(header => renderRichTextPlainText(header)),
        ...block.rows.flatMap(row => row.map(cell => renderRichTextPlainText(cell))),
        block.caption ? renderRichTextPlainText(block.caption) : ''
      ].join(' ')
    case 'quote':
    case 'pullquote':
      return block.text
    case 'glitchDrop':
      return block.lines.join(' ')
    case 'separator':
    case 'image':
    case 'embed':
    case 'buttons':
      return ''
    case 'faq':
      throw new Error('content_factory_article_faq_nested_unsupported')
  }
}

const faqAnswerText = (answer: GutenbergArticleBlock[]): string => normalizePlainText(answer.map(blockToPlainText).join(' '))

const jsonLdScriptBlock = (data: Record<string, unknown>): string => {
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c')

  return [
    '<!-- wp:html -->',
    `<script type="application/ld+json">${json}</script>`,
    '<!-- /wp:html -->'
  ].join('\n')
}

const renderFaqJsonLdBlock = (
  block: Extract<GutenbergArticleBlock, { kind: 'faq' }>,
  context: { canonicalUrl?: string; inLanguage?: string }
): string => {
  const schema = block.schema ?? {}
  const canonicalUrl = schema.canonicalUrl ?? context.canonicalUrl
  const id = schema.id ?? (canonicalUrl ? `${canonicalUrl.replace(/\/?$/, '/')}#faq` : undefined)
  const inLanguage = schema.inLanguage ?? context.inLanguage

  const faqPage: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: schema.name ?? 'Preguntas frecuentes',
    mainEntity: block.items.map(item => ({
      '@type': 'Question',
      name: item.question.trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: faqAnswerText(item.answer)
      }
    }))
  }

  if (id) faqPage['@id'] = id
  if (canonicalUrl) faqPage.url = canonicalUrl
  if (inLanguage) faqPage.inLanguage = inLanguage

  return jsonLdScriptBlock(faqPage)
}

const faqBlock = (
  block: Extract<GutenbergArticleBlock, { kind: 'faq' }>,
  context: { canonicalUrl?: string; inLanguage?: string }
): string => {
  if (!block.items.length) {
    throw new Error('content_factory_article_faq_items_required')
  }

  for (const [index, item] of block.items.entries()) {
    if (!item.question.trim()) {
      throw new Error(`content_factory_article_faq_question_required:${index}`)
    }

    if (!item.answer.length) {
      throw new Error(`content_factory_article_faq_answer_required:${index}`)
    }

    if (!faqAnswerText(item.answer)) {
      throw new Error(`content_factory_article_faq_answer_text_required:${index}`)
    }
  }

  const details = block.items
    .map(item => detailsBlock({ kind: 'details', summary: item.question, blocks: item.answer, open: item.open }, context))
    .join('\n\n')

  if (block.schema?.enabled === false) return details

  return [details, renderFaqJsonLdBlock(block, context)].join('\n\n')
}

const quoteBlock = (text: string): string =>
  [
    '<!-- wp:quote -->',
    `<blockquote class="wp-block-quote"><p>${escapeGutenbergHtml(text)}</p></blockquote>`,
    '<!-- /wp:quote -->'
  ].join('\n')

const pullquoteBlock = (text: string): string =>
  [
    '<!-- wp:pullquote -->',
    `<figure class="wp-block-pullquote"><blockquote><p>${escapeGutenbergHtml(text)}</p></blockquote></figure>`,
    '<!-- /wp:pullquote -->'
  ].join('\n')

const separatorBlock = (): string =>
  [
    '<!-- wp:separator -->',
    '<hr class="wp-block-separator has-alpha-channel-opacity"/>',
    '<!-- /wp:separator -->'
  ].join('\n')

const imageBlock = (block: Extract<GutenbergArticleBlock, { kind: 'image' }>): string => {
  const sizeSlug = block.sizeSlug ?? 'large'
  const linkDestination = block.linkDestination ?? 'none'

  if ((block.width !== undefined && (!Number.isInteger(block.width) || block.width <= 0)) ||
      (block.height !== undefined && (!Number.isInteger(block.height) || block.height <= 0))) {
    throw new Error('content_factory_article_image_dimensions_invalid')
  }

  const dimensions = block.width && block.height ? ` width="${block.width}" height="${block.height}"` : ''

  const caption = block.caption
    ? `<figcaption class="wp-element-caption">${renderRichText(block.caption)}</figcaption>`
    : ''

  const image = `<img src="${escapeGutenbergHtml(block.url)}" alt="${escapeGutenbergHtml(
    block.alt
  )}" class="wp-image-${block.mediaId}"${dimensions}/>`

  const sources = (block.sources ?? [])
    .map(source => {
      const safeMedia = /^\((?:prefers-color-scheme:\s*(?:dark|light)|max-width:\s*\d+px)\)(?:\s+and\s+\((?:prefers-color-scheme:\s*(?:dark|light)|max-width:\s*\d+px)\))*$/

      if (!safeMedia.test(source.media)) {
        throw new Error(`content_factory_article_image_media_invalid:${source.media}`)
      }

      const type = source.type ? ` type="${source.type}"` : ''

      return `<source media="${escapeGutenbergHtml(source.media)}" srcset="${escapeGutenbergHtml(source.url)}"${type}/>`
    })
    .join('')

  const responsiveImage = sources ? `<picture>${sources}${image}</picture>` : image

  const media =
    linkDestination === 'media'
      ? `<a href="${escapeGutenbergHtml(block.url)}">${responsiveImage}</a>`
      : responsiveImage

  return [
    `<!-- wp:image {"id":${block.mediaId},"sizeSlug":"${sizeSlug}","linkDestination":"${linkDestination}"} -->`,
    `<figure class="wp-block-image size-${sizeSlug}">${media}${caption}</figure>`,
    '<!-- /wp:image -->'
  ].join('\n')
}

const YOUTUBE_EMBED_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'])

const assertEmbedUrl = (block: Extract<GutenbergArticleBlock, { kind: 'embed' }>): string => {
  if (block.provider !== 'youtube') {
    throw new Error(`content_factory_article_embed_provider_unsupported:${String(block.provider)}`)
  }

  let url: URL

  try {
    url = new URL(block.url)
  } catch {
    throw new Error('content_factory_article_embed_url_invalid')
  }

  if (url.protocol !== 'https:' || !YOUTUBE_EMBED_HOSTS.has(url.hostname)) {
    throw new Error('content_factory_article_embed_url_invalid')
  }

  return block.url
}

const embedBlock = (block: Extract<GutenbergArticleBlock, { kind: 'embed' }>): string => {
  const url = assertEmbedUrl(block)

  const attrs = serializeGutenbergBlockAttributes({
    url,
    type: 'video',
    providerNameSlug: block.provider,
    responsive: true,
    className: 'wp-embed-aspect-16-9 wp-has-aspect-ratio'
  })

  // Same shape WordPress stores for a captioned embed (Glitch #17, 251605): the
  // figcaption follows the wrapper inside the figure.
  const caption = block.caption
    ? `<figcaption class="wp-element-caption">${renderRichText(block.caption)}</figcaption>`
    : ''

  return [
    `<!-- wp:embed ${attrs} -->`,
    `<figure class="wp-block-embed is-type-video is-provider-${block.provider} wp-block-embed-${block.provider} wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">${escapeGutenbergHtml(url)}</div>${caption}</figure>`,
    '<!-- /wp:embed -->'
  ].join('\n')
}

const assertButtonHref = (href: string, index: number): string => {
  let url: URL

  try {
    url = new URL(href)
  } catch {
    throw new Error(`content_factory_article_button_href_invalid:${index}`)
  }

  if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
    throw new Error(`content_factory_article_button_href_protocol_invalid:${index}:${url.protocol}`)
  }

  return href
}

const buttonsBlock = (block: Extract<GutenbergArticleBlock, { kind: 'buttons' }>): string => {
  if (!Array.isArray(block.items) || block.items.length === 0 || block.items.length > GUTENBERG_BUTTONS_MAX_ITEMS) {
    throw new Error('content_factory_article_buttons_count_invalid')
  }

  const buttons = block.items.map((item, index) => {
    if (typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error(`content_factory_article_button_text_required:${index}`)
    }

    if (/<\/?[a-z!?]/i.test(item.text)) {
      throw new Error(`content_factory_article_button_markup_not_allowed:${index}`)
    }

    const variant = item.variant ?? 'fill'

    if (variant !== 'fill' && variant !== 'outline') {
      throw new Error(`content_factory_article_button_variant_invalid:${index}:${String(variant)}`)
    }

    const href = assertButtonHref(item.href, index)

    // `fill` is the core default style: no class, exactly what the editor stores.
    const styleClass = variant === 'outline' ? 'is-style-outline' : ''
    const comment = styleClass ? `<!-- wp:button ${serializeGutenbergBlockAttributes({ className: styleClass })} -->` : '<!-- wp:button -->'
    const wrapperClass = styleClass ? `wp-block-button ${styleClass}` : 'wp-block-button'

    return [
      comment,
      `<div class="${wrapperClass}"><a class="wp-block-button__link wp-element-button" href="${escapeGutenbergHtml(href)}">${escapeGutenbergHtml(item.text.trim())}</a></div>`,
      '<!-- /wp:button -->'
    ].join('\n')
  })

  // WordPress serializes inner blocks joined by a blank line, inside the wrapper div.
  return ['<!-- wp:buttons -->', `<div class="wp-block-buttons">${buttons.join('\n\n')}</div>`, '<!-- /wp:buttons -->'].join('\n')
}

const renderArticleBlock = (
  block: GutenbergArticleBlock,
  context: { canonicalUrl?: string; inLanguage?: string }
): string => {
  switch (block.kind) {
    case 'paragraph':
      return paragraphBlock(block.text)
    case 'list':
      return listBlock(block.items, block.ordered)
    case 'details':
      return detailsBlock(block, context)
    case 'faq':
      return faqBlock(block, context)
    case 'table':
      return tableBlock(block)
    case 'quote':
      return quoteBlock(block.text)
    case 'pullquote':
      return pullquoteBlock(block.text)
    case 'separator':
      return separatorBlock()
    case 'image':
      return imageBlock(block)
    case 'embed':
      return embedBlock(block)
    case 'glitchDrop':
      return renderGlitchDropBlock(block.lines)
    case 'buttons':
      return buttonsBlock(block)
  }
}

const collectObservedBlocks = (postContent: string): string[] => {
  const names = new Set<string>()

  for (const match of postContent.matchAll(/<!--\s*wp:([a-z0-9-]+(?:\/[a-z0-9-]+)?)/gi)) {
    const raw = match[1]

    names.add(raw.includes('/') ? raw : `core/${raw}`)
  }

  return Array.from(names).sort()
}

/**
 * Assemble a validated-ready Gutenberg draft from a structured article spec.
 * The author fills the spec (real content); this function guarantees the
 * structure is correct. Pair with `validateGeneratedGutenbergDraft` before any write.
 */
export const authorGutenbergDraft = (spec: GutenbergArticleSpec): ContentFactoryGeneratedDraft => {
  if (!spec.title?.trim()) throw new Error('content_factory_article_title_required')
  if (!spec.sections.length) throw new Error('content_factory_article_sections_required')

  const outline: GutenbergOutlineHeading[] = spec.sections.map(section => ({
    level: section.level,
    text: section.heading
  }))

  const level2Count = outline.filter(heading => heading.level === 2).length
  const includeToc = spec.tableOfContents ?? level2Count >= 2

  const parts: string[] = []

  for (const paragraph of spec.intro) {
    parts.push(paragraphBlock(paragraph))
  }

  if (includeToc) {
    parts.push(renderYoastTableOfContents(outline))
  }

  for (const section of spec.sections) {
    parts.push(renderHeadingBlock({ level: section.level, text: section.heading }))

    for (const block of section.blocks) {
      parts.push(
        renderArticleBlock(block, {
          canonicalUrl: spec.seo.canonicalUrl,
          inLanguage: spec.seo.inLanguage
        })
      )
    }
  }

  if (spec.cta?.text) {
    parts.push(separatorBlock())
    parts.push(paragraphBlock(spec.cta.text))
  }

  const postContent = parts.join('\n\n')
  const slug = slugifyPublicSiteDraft(spec.slug || spec.title) || `greenhouse-draft-${Date.now()}`

  return {
    contractVersion: 'contentFactoryGeneratedDraft.v1',
    intent: spec.intent ?? 'create',
    lane: 'post_draft_gutenberg',
    title: spec.title.trim(),
    slug,
    excerpt: spec.excerpt,
    seo: {
      title: spec.seo.title,
      description: spec.seo.description,
      indexPolicy: spec.seo.indexPolicy ?? 'index'
    },
    draft: {
      kind: 'gutenberg_post',
      postContent,
      observedBlocks: collectObservedBlocks(postContent)
    },
    attribution: spec.attribution ?? {}
  }
}
