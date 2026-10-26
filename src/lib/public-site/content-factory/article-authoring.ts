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
import { renderEditorialChartBlock, type EditorialChartBlockInput } from './gutenberg-editorial-chart'
import { renderGrowthCtaBlock } from './gutenberg-growth-cta'
import { slugifyPublicSiteDraft } from './gutenberg-planner'

/** Service lines of AXIS `efeonce.mention` (`efeonceGraphicLine.lines`). */
export type GutenbergMentionLine = 'growth' | 'brand' | 'engine' | 'voice' | 'revenue-hubspot' | 'revenue-salesforce'

export const GUTENBERG_MENTION_LINES: readonly GutenbergMentionLine[] = [
  'growth',
  'brand',
  'engine',
  'voice',
  'revenue-hubspot',
  'revenue-salesforce'
]

export type GutenbergRichTextSegment = {
  text: string
  href?: string
  strong?: boolean
  /**
   * Renders the link as an AXIS `efeonce.mention` (pill + isotype painted by the site-wide `axis-mention.css`).
   * Only for Efeonce services or products: requires an https `href` on efeoncepro.com / efeonce.org or a subdomain.
   */
  mention?: { line: GutenbergMentionLine; surface?: 'light' | 'dark' }
}

export type GutenbergRichText = string | GutenbergRichTextSegment[]

export type GutenbergFaqItem = {
  question: string
  answer: GutenbergArticleBlock[]
  open?: boolean
}

export type GutenbergFaqSchemaOptions = {
  enabled?: boolean
  /**
   * Who writes the FAQPage schema. `plugin` (default since 2026-10-24, efeonce-editorial-blocks 0.3.0 live): no
   * JSON-LD in the content; the plugin builds the FAQ schema from the styled `core/details` blocks and joins it to the
   * Yoast graph. `inline`: a governed `core/html` JSON-LD block, only for a host without the plugin. A post with an
   * inline FAQPage keeps it: the plugin skips it, so the two never stack.
   */
  source?: 'inline' | 'plugin'
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
  /**
   * `style` = Efeonce editorial list styles (efeonce-editorial-blocks ≥ 0.4.0): `steps` («Pasos», numbered steps,
   * ordered lists only) and `box` («Recuadro», a tinted panel for a short set worth seeing at once).
   */
  | { kind: 'list'; items: GutenbergRichText[]; ordered?: boolean; style?: 'steps' | 'box' }
  | { kind: 'details'; summary: string; blocks: GutenbergArticleBlock[]; open?: boolean; className?: string }
  | { kind: 'faq'; items: GutenbergFaqItem[]; schema?: GutenbergFaqSchemaOptions }
  | {
      kind: 'table'
      headers: GutenbergRichText[]
      rows: GutenbergRichText[][]
      caption?: GutenbergRichText
      /**
       * `efeonce`: «Tabla Efeonce» (efeonce-editorial-blocks ≥ 0.6.0), the default for blog posts — paper panel, and
       * under 600 px one card per row with each cell labeled by its header. `stripes`: core `is-style-stripes`.
       */
      style?: 'efeonce' | 'stripes'
    }
  | { kind: 'quote'; text: string }
  /**
   * Efeonce pullquote styles (efeonce-editorial-blocks ≥ 0.8.0). `variant`: `destacado` (default) is the thesis a
   * section stands on — ring → sphere, no quotation marks; mark the landing phrase with `strong` (Bricolage 700).
   * `cita` is a real quote and requires `cite` (who said it; a link is welcome). `tone`: `dark` (navy, default) or
   * `light` (paper).
   */
  | {
      kind: 'pullquote'
      text: GutenbergRichText
      cite?: GutenbergRichText
      variant?: 'destacado' | 'cita'
      tone?: 'dark' | 'light'
    }
  | { kind: 'separator' }
  /** Plain-text code sample (`core/code`). Newlines are kept; the text is escaped like the block editor does. */
  | { kind: 'code'; code: string }
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
      /** `center` for images narrower than the column (diagrams, square illustrations). */
      align?: 'center'
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
  /**
   * Governed Growth CTA of Greenhouse placed in the post (`efeoncepro/growth-cta`, efeonce-editorial-blocks ≥ 0.7.0).
   * Copy, action and measurement live in the Growth CTA engine; the slug must be allowed by the blog surface.
   */
  | { kind: 'growthCta'; cta: string; location?: string; emphasis?: string; tone?: 'dark' | 'light'; mark?: 'aeo-assessment' }
  /**
   * «Gráfico Efeonce» (`efeoncepro/chart`, dynamic block): line, column, bar, pie, funnel, before-after, measure,
   * per-hundred, matrix or venn. The table of numbers is printed in the HTML; the chart is painted on top.
   */
  | ({ kind: 'chart' } & EditorialChartBlockInput)
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

      if (!segment.href) {
        if (segment.mention) throw new Error('content_factory_article_mention_href_required')

        return text
      }

      const url = new URL(segment.href)

      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
        throw new Error(`content_factory_article_link_protocol_invalid:${url.protocol}`)
      }

      if (segment.mention) {
        const { line, surface = 'light' } = segment.mention
        const efeonceHost = /(^|\.)(efeoncepro\.com|efeonce\.org)$/.test(url.hostname)

        if (url.protocol !== 'https:' || !efeonceHost) {
          throw new Error(`content_factory_article_mention_destination_invalid:${url.hostname}`)
        }

        if (!GUTENBERG_MENTION_LINES.includes(line) || !['light', 'dark'].includes(surface)) {
          throw new Error(`content_factory_article_mention_line_invalid:${line}`)
        }

        return `<a class="axis-mention" href="${escapeGutenbergHtml(segment.href)}" data-line="${line}" data-surface="${surface}">${text}</a>`
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

/** Efeonce editorial block styles registered by efeonce-editorial-blocks ≥ 0.4.0. */
export const EDITORIAL_STYLE_CLASS = {
  pullquote: 'is-style-efeonce-destacado',
  pullquoteLight: 'is-style-efeonce-destacado-claro',
  quoteAttributed: 'is-style-efeonce-cita',
  quoteAttributedLight: 'is-style-efeonce-cita-clara',
  steps: 'is-style-efeonce-pasos',
  box: 'is-style-efeonce-recuadro'
} as const

const listBlock = (items: GutenbergRichText[], ordered = false, style?: 'steps' | 'box'): string => {
  if (style === 'steps' && !ordered) {
    throw new Error('content_factory_article_list_steps_requires_ordered')
  }

  if (style !== undefined && style !== 'steps' && style !== 'box') {
    throw new Error('content_factory_article_list_style_invalid')
  }

  const tag = ordered ? 'ol' : 'ul'
  const lis = items.map(item => `<li>${renderRichText(item)}</li>`).join('')
  const className = style ? EDITORIAL_STYLE_CLASS[style] : undefined
  const attrs: Record<string, unknown> = {}

  if (ordered) attrs.ordered = true
  if (className) attrs.className = className

  const attr = Object.keys(attrs).length ? ` ${JSON.stringify(attrs)}` : ''
  const open = className ? `<${tag} class="${className}">` : `<${tag}>`

  return [`<!-- wp:list${attr} -->`, `${open}${lis}</${tag}>`, '<!-- /wp:list -->'].join('\n')
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

  const styleClasses: Record<string, string> = { efeonce: 'is-style-efeonce-tabla', stripes: 'is-style-stripes' }

  if (block.style !== undefined && !(block.style in styleClasses)) {
    throw new Error(`content_factory_article_table_style_invalid:${String(block.style)}`)
  }

  const styleClass = block.style ? styleClasses[block.style] : ''
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

  const className = block.className?.trim()

  if (className !== undefined && !/^[a-z0-9-]+(?: [a-z0-9-]+)*$/.test(className)) {
    throw new Error('content_factory_article_details_class_invalid')
  }

  const attrs: Record<string, unknown> = { summary: block.summary }

  if (block.open) attrs.showContent = true
  if (className) attrs.className = className

  const open = block.open ? ' open' : ''
  const classes = className ? `wp-block-details ${className}` : 'wp-block-details'
  const children = block.blocks.map(child => renderArticleBlock(child, context)).join('\n')

  return [
    `<!-- wp:details ${JSON.stringify(attrs)} -->`,
    `<details class="${classes}"${open}><summary>${escapeGutenbergHtml(block.summary)}</summary>`,
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
      return block.text
    case 'pullquote':
      return [renderRichTextPlainText(block.text), block.cite ? renderRichTextPlainText(block.cite) : ''].join(' ')
    case 'code':
      return block.code
    case 'glitchDrop':
      return block.lines.join(' ')
    case 'chart':
      return [block.title ?? '', block.caption ?? ''].join(' ')
    case 'growthCta':
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

/** Block style of a FAQ question (efeonce-editorial-blocks «Pregunta frecuente»): design + automatic schema. */
export const FAQ_DETAILS_CLASS_NAME = 'is-style-efeonce-faq'

const faqBlock = (
  block: Extract<GutenbergArticleBlock, { kind: 'faq' }>,
  context: { canonicalUrl?: string; inLanguage?: string }
): string => {
  if (!block.items.length) {
    throw new Error('content_factory_article_faq_items_required')
  }

  const seenQuestions = new Set<string>()

  for (const [index, item] of block.items.entries()) {
    const normalizedQuestion = normalizePlainText(item.question).toLowerCase()

    if (normalizedQuestion && seenQuestions.has(normalizedQuestion)) {
      throw new Error(`content_factory_article_faq_question_duplicated:${index}`)
    }

    seenQuestions.add(normalizedQuestion)

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
    .map(item =>
      detailsBlock(
        { kind: 'details', summary: item.question, blocks: item.answer, open: item.open, className: FAQ_DETAILS_CLASS_NAME },
        context
      )
    )
    .join('\n\n')

  if (block.schema?.enabled === false || (block.schema?.source ?? 'plugin') === 'plugin') return details

  return [details, renderFaqJsonLdBlock(block, context)].join('\n\n')
}

const quoteBlock = (text: string): string =>
  [
    '<!-- wp:quote -->',
    `<blockquote class="wp-block-quote"><p>${escapeGutenbergHtml(text)}</p></blockquote>`,
    '<!-- /wp:quote -->'
  ].join('\n')

const pullquoteBlock = (block: Extract<GutenbergArticleBlock, { kind: 'pullquote' }>): string => {
  const variant = block.variant ?? 'destacado'
  const tone = block.tone ?? 'dark'

  if (variant !== 'destacado' && variant !== 'cita') throw new Error(`content_factory_article_pullquote_variant_invalid:${String(variant)}`)
  if (tone !== 'dark' && tone !== 'light') throw new Error(`content_factory_article_pullquote_tone_invalid:${String(tone)}`)

  const text = renderRichText(block.text)

  if (!renderRichTextPlainText(block.text).trim()) throw new Error('content_factory_article_pullquote_text_empty')

  const cite = block.cite ? renderRichText(block.cite) : ''

  if (variant === 'cita' && !(block.cite && renderRichTextPlainText(block.cite).trim())) {
    throw new Error('content_factory_article_pullquote_cita_requires_cite')
  }

  const className =
    variant === 'cita'
      ? tone === 'light' ? EDITORIAL_STYLE_CLASS.quoteAttributedLight : EDITORIAL_STYLE_CLASS.quoteAttributed
      : tone === 'light' ? EDITORIAL_STYLE_CLASS.pullquoteLight : EDITORIAL_STYLE_CLASS.pullquote

  const source = cite.trim() ? `<cite>${cite}</cite>` : ''

  return [
    `<!-- wp:pullquote {"className":"${className}"} -->`,
    `<figure class="wp-block-pullquote ${className}"><blockquote><p>${text}</p>${source}</blockquote></figure>`,
    '<!-- /wp:pullquote -->'
  ].join('\n')
}

const codeBlock = (code: string): string => {
  if (!code.trim()) {
    throw new Error('content_factory_article_code_required')
  }

  // Same escaping as the block editor's code block: HTML entities plus `[` (keeps shortcodes from running).
  const escaped = code
    .replace(/\r\n?/g, '\n')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[/g, '&#91;')

  return ['<!-- wp:code -->', `<pre class="wp-block-code"><code>${escaped}</code></pre>`, '<!-- /wp:code -->'].join('\n')
}

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

  if (block.align !== undefined && block.align !== 'center') {
    throw new Error('content_factory_article_image_align_invalid')
  }

  const align = block.align === 'center' ? ',"align":"center"' : ''
  const alignClass = block.align === 'center' ? ' aligncenter' : ''

  return [
    `<!-- wp:image {"id":${block.mediaId},"sizeSlug":"${sizeSlug}","linkDestination":"${linkDestination}"${align}} -->`,
    `<figure class="wp-block-image${alignClass} size-${sizeSlug}">${media}${caption}</figure>`,
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
      return listBlock(block.items, block.ordered, block.style)
    case 'details':
      return detailsBlock(block, context)
    case 'faq':
      return faqBlock(block, context)
    case 'table':
      return tableBlock(block)
    case 'quote':
      return quoteBlock(block.text)
    case 'pullquote':
      return pullquoteBlock(block)
    case 'separator':
      return separatorBlock()
    case 'code':
      return codeBlock(block.code)
    case 'image':
      return imageBlock(block)
    case 'embed':
      return embedBlock(block)
    case 'glitchDrop':
      return renderGlitchDropBlock(block.lines)
    case 'growthCta':
      return renderGrowthCtaBlock(block)
    case 'chart':
      return renderEditorialChartBlock(block)
    case 'buttons':
      return buttonsBlock(block)
    default:
      // Specs arrive as JSON, so the union does not protect them: an unknown kind (e.g. a `heading` block instead of a
      // level-3 section) used to render as nothing and vanish from the draft without a trace.
      throw new Error(`content_factory_article_block_kind_unknown:${String((block as { kind?: unknown }).kind)}`)
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
