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
  type GutenbergOutlineHeading
} from './gutenberg-blocks'
import { slugifyPublicSiteDraft } from './gutenberg-planner'

export type GutenbergRichTextSegment = {
  text: string
  href?: string
  strong?: boolean
}

export type GutenbergRichText = string | GutenbergRichTextSegment[]

export type GutenbergArticleBlock =
  | { kind: 'paragraph'; text: GutenbergRichText }
  | { kind: 'list'; items: GutenbergRichText[]; ordered?: boolean }
  | {
      kind: 'table'
      headers: GutenbergRichText[]
      rows: GutenbergRichText[][]
      caption?: GutenbergRichText
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
      sizeSlug?: string
      caption?: GutenbergRichText
      linkDestination?: 'none' | 'media'
    }
  | { kind: 'embed'; provider: 'youtube'; url: string }

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

  return [
    '<!-- wp:table -->',
    `<figure class="wp-block-table"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>${caption}</figure>`,
    '<!-- /wp:table -->'
  ].join('\n')
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

  const caption = block.caption
    ? `<figcaption class="wp-element-caption">${renderRichText(block.caption)}</figcaption>`
    : ''

  const image = `<img src="${escapeGutenbergHtml(block.url)}" alt="${escapeGutenbergHtml(
    block.alt
  )}" class="wp-image-${block.mediaId}"/>`

  const media = linkDestination === 'media' ? `<a href="${escapeGutenbergHtml(block.url)}">${image}</a>` : image

  return [
    `<!-- wp:image {"id":${block.mediaId},"sizeSlug":"${sizeSlug}","linkDestination":"${linkDestination}"} -->`,
    `<figure class="wp-block-image size-${sizeSlug}">${media}${caption}</figure>`,
    '<!-- /wp:image -->'
  ].join('\n')
}

const embedBlock = (block: Extract<GutenbergArticleBlock, { kind: 'embed' }>): string =>
  [
    `<!-- wp:embed {"url":"${block.url}","type":"video","providerNameSlug":"${block.provider}","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->`,
    `<figure class="wp-block-embed is-type-video is-provider-${block.provider} wp-block-embed-${block.provider} wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">${block.url}</div></figure>`,
    '<!-- /wp:embed -->'
  ].join('\n')

const renderArticleBlock = (block: GutenbergArticleBlock): string => {
  switch (block.kind) {
    case 'paragraph':
      return paragraphBlock(block.text)
    case 'list':
      return listBlock(block.items, block.ordered)
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
      parts.push(renderArticleBlock(block))
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
