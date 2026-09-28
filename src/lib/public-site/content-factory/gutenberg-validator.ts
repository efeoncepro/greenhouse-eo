import type {
  ContentFactoryGeneratedDraft,
  ContentFactoryValidation,
  ContentFactoryValidationFinding,
  GutenbergBlogpostCompositionProfile,
  GutenbergHeadingOutlineItem
} from './contracts'
import { resolveContentFactoryValidationStatus } from './contracts'
import {
  GLITCH_DROP_ALLOWED_ATTRIBUTES,
  GLITCH_DROP_BLOCK_NAME,
  GLITCH_DROP_MAX_LINES,
  findGlitchDropRedundancy,
  glitchDropContentHasForeignMarkup,
  glitchDropContentHasLink,
  splitGlitchDropContent
} from './gutenberg-glitch-drop'

export type GutenbergDraftValidationOptions = {
  allowedBlocks?: string[]
  allowFreeform?: boolean
  compositionProfile?: GutenbergBlogpostCompositionProfile | false
}

export type ParsedGutenbergBlockComment = {
  blockName: string
  rawName: string
  attrs: Record<string, unknown>
  closing: boolean
  selfClosing: boolean
  index: number
}

const DEFAULT_ALLOWED_GUTENBERG_BLOCKS = [
  'core/button',
  'core/buttons',
  'core/column',
  'core/columns',
  'core/embed',
  'core/gallery',
  'core/group',
  'core/details',
  'core/heading',
  'core/html',
  'core/image',
  'core/list',
  'core/list-item',
  'core/paragraph',
  'core/pullquote',
  'core/quote',
  'core/separator',
  'core/spacer',
  'core/table',
  // Dynamic Efeonce POV callout (plugin efeonce-editorial-blocks). Allowed only in its
  // governed shape: self-closing, `content` without links or HTML other than <br>.
  GLITCH_DROP_BLOCK_NAME,
  'yoast-seo/table-of-contents'
]

export const EFEONCE_BLOGPOST_COMPOSITION_PROFILE: GutenbergBlogpostCompositionProfile = {
  contractVersion: 'gutenbergBlogpostCompositionProfile.v1',
  key: 'efeonce_blogpost',
  description:
    'Efeonce blog posts should be generated as structured Gutenberg editorial pieces, not plain paragraph dumps.',
  requiredBlocks: ['core/heading', 'core/paragraph', 'core/list', 'yoast-seo/table-of-contents'],
  recommendedBlocks: [
    'core/quote',
    'core/pullquote',
    'core/details',
    'core/separator',
    'core/table',
    'core/image',
    'core/embed'
  ],
  tableOfContentsBlock: 'yoast-seo/table-of-contents',
  minHeadingCount: 3,
  minLevel2HeadingCount: 2,
  minStructuredBlockCount: 5,
  maxHeadingJump: 1,
  disallowedGeneratedBlocks: ['core/freeform'],
  mediaBlocks: ['core/image', 'core/embed'],
  enrichmentBlocks: [
    'core/list',
    'core/quote',
    'core/pullquote',
    'core/details',
    'core/separator',
    'core/table',
    'core/image',
    'core/embed',
    GLITCH_DROP_BLOCK_NAME
  ]
}

const BLOCK_COMMENT_PATTERN = /<!--\s*(\/)?wp:([A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?)(?:\s+({[\s\S]*?}))?\s*(\/)?-->/gi

const normalizeBlockName = (rawName: string) => (rawName.includes('/') ? rawName : `core/${rawName}`)

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

export const parseGutenbergBlockComments = (postContent: string): ParsedGutenbergBlockComment[] =>
  Array.from(postContent.matchAll(BLOCK_COMMENT_PATTERN)).map(match => {
    const rawName = match[2] ?? ''
    const attrsJson = match[3]
    let attrs: Record<string, unknown> = {}

    if (attrsJson) {
      try {
        attrs = asRecord(JSON.parse(attrsJson))
      } catch {
        attrs = {
          __invalidJson: attrsJson
        }
      }
    }

    return {
      blockName: normalizeBlockName(rawName),
      rawName,
      attrs,
      closing: Boolean(match[1]),
      selfClosing: Boolean(match[4]),
      index: match.index ?? 0
    }
  })

const getOpeningBlocks = (blocks: ParsedGutenbergBlockComment[]) => blocks.filter(block => !block.closing)

const validateBlockBalance = (blocks: ParsedGutenbergBlockComment[], findings: ContentFactoryValidationFinding[]) => {
  const stack: ParsedGutenbergBlockComment[] = []

  for (const block of blocks) {
    if (block.attrs.__invalidJson) {
      findings.push({
        severity: 'block',
        code: 'invalid_block_attrs_json',
        message: `Block ${block.blockName} has invalid JSON attributes.`,
        path: `draft.postContent[${block.index}]`
      })
    }

    if (!block.closing && !block.selfClosing) {
      stack.push(block)
      continue
    }

    if (block.closing) {
      const previous = stack.pop()

      if (!previous || previous.blockName !== block.blockName) {
        findings.push({
          severity: 'block',
          code: 'unbalanced_gutenberg_block',
          message: `Closing block ${block.blockName} does not match the latest open block.`,
          path: `draft.postContent[${block.index}]`
        })
      }
    }
  }

  for (const block of stack) {
    findings.push({
      severity: 'block',
      code: 'unclosed_gutenberg_block',
      message: `Block ${block.blockName} is not closed.`,
      path: `draft.postContent[${block.index}]`
    })
  }
}

const collectAnchors = (blocks: ParsedGutenbergBlockComment[]) =>
  getOpeningBlocks(blocks).flatMap(block => {
    const anchor = typeof block.attrs.anchor === 'string' ? block.attrs.anchor : null
    const className = typeof block.attrs.className === 'string' ? block.attrs.className : ''

    return [anchor, ...className.split(/\s+/)].filter((value): value is string => Boolean(value?.trim()))
  })

const stripHtml = (value: string) =>
  value
    .replace(BLOCK_COMMENT_PATTERN, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const decodeBasicHtmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

const normalizeComparableText = (value: string) => decodeBasicHtmlEntities(stripHtml(value)).replace(/\s+/g, ' ').trim()

const inferHeadingLevel = (block: ParsedGutenbergBlockComment, postContent: string, nextBlockIndex: number) => {
  const attrLevel = typeof block.attrs.level === 'number' ? block.attrs.level : null

  if (attrLevel) return attrLevel

  const blockSlice = postContent.slice(block.index, nextBlockIndex)
  const htmlLevel = blockSlice.match(/<h([1-6])\b/i)?.[1]

  return htmlLevel ? Number(htmlLevel) : 2
}

const collectHeadingOutline = (
  postContent: string,
  blocks: ParsedGutenbergBlockComment[]
): GutenbergHeadingOutlineItem[] => {
  const headings: GutenbergHeadingOutlineItem[] = []

  for (const [blockIndex, block] of blocks.entries()) {
    if (block.closing || block.blockName !== 'core/heading') continue

    const nextBlockIndex = blocks[blockIndex + 1]?.index ?? postContent.length
    const blockSlice = postContent.slice(block.index, nextBlockIndex)
    const text = stripHtml(blockSlice)

    headings.push({
      level: inferHeadingLevel(block, postContent, nextBlockIndex),
      text,
      index: block.index
    })
  }

  return headings
}

const GOVERNED_JSON_LD_SCRIPT_PATTERN =
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/gi

const stripGovernedJsonLdScripts = (postContent: string) => postContent.replace(GOVERNED_JSON_LD_SCRIPT_PATTERN, '')

const hasUnsafeMarkup = (postContent: string) =>
  /<\s*script\b/i.test(stripGovernedJsonLdScripts(postContent)) ||
  /<\s*iframe\b/i.test(postContent) ||
  /\son[a-z]+\s*=/i.test(postContent) ||
  /javascript\s*:/i.test(postContent)

const validateMetadata = (draft: ContentFactoryGeneratedDraft, findings: ContentFactoryValidationFinding[]) => {
  if (draft.contractVersion !== 'contentFactoryGeneratedDraft.v1') {
    findings.push({
      severity: 'block',
      code: 'unsupported_contract_version',
      message: 'Draft must use contentFactoryGeneratedDraft.v1.',
      path: 'contractVersion'
    })
  }

  if (!draft.title?.trim()) {
    findings.push({ severity: 'block', code: 'title_required', message: 'Draft title is required.', path: 'title' })
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug ?? '')) {
    findings.push({
      severity: 'block',
      code: 'slug_invalid',
      message: 'Slug must be lowercase kebab-case without accents or spaces.',
      path: 'slug'
    })
  }

  if (draft.lane !== 'post_draft_gutenberg' && draft.lane !== 'refresh_existing_gutenberg_post') {
    findings.push({
      severity: 'block',
      code: 'lane_not_gutenberg',
      message: 'Gutenberg validator only accepts Gutenberg post lanes.',
      path: 'lane'
    })
  }

  if (draft.draft.kind !== 'gutenberg_post') {
    findings.push({
      severity: 'block',
      code: 'draft_kind_not_gutenberg',
      message: 'Draft payload must be kind=gutenberg_post.',
      path: 'draft.kind'
    })
  }

  if (!draft.seo?.title?.trim()) {
    findings.push({
      severity: 'block',
      code: 'seo_title_required',
      message: 'SEO title is required.',
      path: 'seo.title'
    })
  }

  if (!draft.seo?.description?.trim()) {
    findings.push({
      severity: 'block',
      code: 'seo_description_required',
      message: 'SEO description is required.',
      path: 'seo.description'
    })
  }

  if ((draft.seo?.description?.length ?? 0) > 170) {
    findings.push({
      severity: 'warning',
      code: 'seo_description_long',
      message: 'SEO description is longer than the recommended 170 characters.',
      path: 'seo.description'
    })
  }
}

const validateBlogpostCompositionProfile = ({
  blockNames,
  findings,
  headingOutline,
  profile
}: {
  blockNames: string[]
  findings: ContentFactoryValidationFinding[]
  headingOutline: GutenbergHeadingOutlineItem[]
  profile: GutenbergBlogpostCompositionProfile
}) => {
  const blockNameSet = new Set(blockNames)

  for (const blockName of profile.requiredBlocks) {
    if (!blockNameSet.has(blockName)) {
      findings.push({
        severity: 'block',
        code: 'blogpost_required_block_missing',
        message: `Efeonce blogpost composition requires ${blockName}.`,
        path: 'draft.postContent'
      })
    }
  }

  for (const blockName of profile.disallowedGeneratedBlocks) {
    if (blockNameSet.has(blockName)) {
      findings.push({
        severity: 'warning',
        code: 'blogpost_legacy_block_generated',
        message: `${blockName} is observable in legacy posts but should not be generated for new Content Factory drafts.`,
        path: 'draft.postContent'
      })
    }
  }

  if (headingOutline.length < profile.minHeadingCount) {
    findings.push({
      severity: 'block',
      code: 'blogpost_heading_outline_too_thin',
      message: `Efeonce blogposts require at least ${profile.minHeadingCount} content headings for a scannable outline.`,
      path: 'draft.postContent'
    })
  }

  const level2Count = headingOutline.filter(heading => heading.level === 2).length

  if (level2Count < profile.minLevel2HeadingCount) {
    findings.push({
      severity: 'block',
      code: 'blogpost_level2_headings_missing',
      message: `Post content should include at least ${profile.minLevel2HeadingCount} H2 sections because the WordPress title is the page H1.`,
      path: 'draft.postContent'
    })
  }

  for (const heading of headingOutline) {
    if (heading.level <= 1) {
      findings.push({
        severity: 'block',
        code: 'blogpost_h1_inside_content',
        message: 'Generated Gutenberg post content must not include H1 blocks; WordPress owns the post title H1.',
        path: `draft.postContent[${heading.index}]`
      })
    }
  }

  for (let index = 1; index < headingOutline.length; index += 1) {
    const previous = headingOutline[index - 1]
    const current = headingOutline[index]

    if (current.level - previous.level > profile.maxHeadingJump) {
      findings.push({
        severity: 'block',
        code: 'blogpost_heading_hierarchy_jump',
        message: `Heading hierarchy jumps from H${previous.level} to H${current.level}.`,
        path: `draft.postContent[${current.index}]`
      })
    }
  }

  const structuredBlockCount = blockNames.filter(blockName => blockName !== 'core/paragraph').length

  if (structuredBlockCount < profile.minStructuredBlockCount) {
    findings.push({
      severity: 'block',
      code: 'blogpost_structured_blocks_too_thin',
      message: `Generated post is too flat; expected at least ${profile.minStructuredBlockCount} non-paragraph structure blocks.`,
      path: 'draft.postContent'
    })
  }

  if (!profile.mediaBlocks.some(blockName => blockNameSet.has(blockName))) {
    findings.push({
      severity: 'info',
      code: 'blogpost_media_slot_recommended',
      message:
        'Efeonce blogposts can include image or embed slots; resolve real media before write when the brief calls for visual proof.',
      path: 'draft.postContent'
    })
  }

  if (!profile.enrichmentBlocks.some(blockName => blockNameSet.has(blockName))) {
    findings.push({
      severity: 'block',
      code: 'blogpost_enrichment_block_missing',
      message:
        'Generated post needs at least one enrichment block such as list, quote, separator, table, image or embed.',
      path: 'draft.postContent'
    })
  }
}

const HEADING_ANCHOR_PATTERN = /<h[1-6][^>]*\sid=["'][^"']+["']/i
const TOC_LINK_PATTERN = /data-level=|<a\s+href=["']#/i

/**
 * When a Yoast table of contents is present, the index is only useful if (a) the
 * TOC block is populated with anchor links and (b) the body headings carry `id`
 * anchors those links resolve to. This catches the defect that shipped in the
 * first live post (250748, 2026-07-03) where the TOC rendered as a dead heading.
 */
const validateTableOfContentsIntegrity = (
  postContent: string,
  blocks: ParsedGutenbergBlockComment[],
  findings: ContentFactoryValidationFinding[]
) => {
  const tocIndex = blocks.findIndex(block => !block.closing && block.blockName === 'yoast-seo/table-of-contents')

  if (tocIndex < 0) return

  const tocSlice = postContent.slice(blocks[tocIndex].index, blocks[tocIndex + 1]?.index ?? postContent.length)

  if (!TOC_LINK_PATTERN.test(tocSlice)) {
    findings.push({
      severity: 'warning',
      code: 'blogpost_toc_not_populated',
      message:
        'The yoast-seo/table-of-contents block has no anchor links; build it with renderYoastTableOfContents(outline) so the index is functional.',
      path: `draft.postContent[${blocks[tocIndex].index}]`
    })
  }

  let unanchored = 0

  for (const [blockIndex, block] of blocks.entries()) {
    if (block.closing || block.blockName !== 'core/heading') continue

    const slice = postContent.slice(block.index, blocks[blockIndex + 1]?.index ?? postContent.length)

    if (!HEADING_ANCHOR_PATTERN.test(slice)) unanchored += 1
  }

  if (unanchored > 0) {
    findings.push({
      severity: 'warning',
      code: 'blogpost_toc_headings_unanchored',
      message: `${unanchored} heading block(s) lack an id anchor, so the table of contents cannot link to them; emit headings via renderHeadingBlock().`,
      path: 'draft.postContent'
    })
  }
}

const findMatchingClosingBlockIndex = (blocks: ParsedGutenbergBlockComment[], openingIndex: number) => {
  const opening = blocks[openingIndex]
  let depth = 0

  for (let index = openingIndex; index < blocks.length; index += 1) {
    const block = blocks[index]

    if (block.blockName !== opening.blockName) continue
    if (!block.closing) depth += 1
    if (block.closing) depth -= 1
    if (depth === 0) return index
  }

  return -1
}

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  
return typeof value === 'string' ? [value] : []
}

const hasSchemaType = (value: Record<string, unknown>, type: string) => asStringArray(value['@type']).includes(type)

const collectJsonLdNodes = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.flatMap(collectJsonLdNodes)
  if (!value || typeof value !== 'object') return []

  const record = value as Record<string, unknown>
  const graphNodes = Array.isArray(record['@graph']) ? collectJsonLdNodes(record['@graph']) : []

  return [record, ...graphNodes]
}

const collectDetailsSummaries = (postContent: string, blocks: ParsedGutenbergBlockComment[]) => {
  const summaries = new Set<string>()

  for (const [blockIndex, block] of blocks.entries()) {
    if (block.closing || block.blockName !== 'core/details') continue

    const closingIndex = findMatchingClosingBlockIndex(blocks, blockIndex)
    const blockEnd = closingIndex >= 0 ? blocks[closingIndex + 1]?.index ?? postContent.length : postContent.length
    const blockSlice = postContent.slice(block.index, blockEnd)
    const summary = blockSlice.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ?? ''
    const normalized = normalizeComparableText(summary)

    if (normalized) summaries.add(normalized)
  }

  return summaries
}

const validateFaqPageNode = ({
  faqPage,
  findings,
  path,
  visibleDetailsSummaries
}: {
  faqPage: Record<string, unknown>
  findings: ContentFactoryValidationFinding[]
  path: string
  visibleDetailsSummaries: Set<string>
}) => {
  const mainEntity = Array.isArray(faqPage.mainEntity) ? faqPage.mainEntity : []

  if (mainEntity.length === 0) {
    findings.push({
      severity: 'block',
      code: 'faqpage_main_entity_missing',
      message: 'FAQPage JSON-LD must include at least one mainEntity Question.',
      path
    })

    return
  }

  for (const [index, entity] of mainEntity.entries()) {
    const question = asRecord(entity)
    const answer = asRecord(question.acceptedAnswer)
    const questionName = typeof question.name === 'string' ? normalizeComparableText(question.name) : ''
    const answerText = typeof answer.text === 'string' ? normalizeComparableText(answer.text) : ''
    const entityPath = `${path}.mainEntity[${index}]`

    if (!hasSchemaType(question, 'Question')) {
      findings.push({
        severity: 'block',
        code: 'faqpage_question_type_invalid',
        message: 'FAQPage mainEntity items must be Schema.org Question nodes.',
        path: entityPath
      })
    }

    if (!questionName) {
      findings.push({
        severity: 'block',
        code: 'faqpage_question_name_missing',
        message: 'FAQPage Question nodes need a non-empty name.',
        path: `${entityPath}.name`
      })
    } else if (!visibleDetailsSummaries.has(questionName)) {
      findings.push({
        severity: 'block',
        code: 'faqpage_question_not_visible',
        message: 'FAQPage Question names must match a visible core/details summary in the article body.',
        path: `${entityPath}.name`
      })
    }

    if (!hasSchemaType(answer, 'Answer')) {
      findings.push({
        severity: 'block',
        code: 'faqpage_answer_type_invalid',
        message: 'FAQPage acceptedAnswer must be a Schema.org Answer node.',
        path: `${entityPath}.acceptedAnswer`
      })
    }

    if (!answerText) {
      findings.push({
        severity: 'block',
        code: 'faqpage_answer_text_missing',
        message: 'FAQPage acceptedAnswer.text must be non-empty.',
        path: `${entityPath}.acceptedAnswer.text`
      })
    }
  }
}

const validateGovernedHtmlJsonLdBlocks = (
  postContent: string,
  blocks: ParsedGutenbergBlockComment[],
  findings: ContentFactoryValidationFinding[]
) => {
  const visibleDetailsSummaries = collectDetailsSummaries(postContent, blocks)

  for (const [blockIndex, block] of blocks.entries()) {
    if (block.closing || block.blockName !== 'core/html') continue

    const closingIndex = findMatchingClosingBlockIndex(blocks, blockIndex)
    const blockEnd = closingIndex >= 0 ? blocks[closingIndex + 1]?.index ?? postContent.length : postContent.length
    const blockSlice = postContent.slice(block.index, blockEnd)
    const html = blockSlice.replace(BLOCK_COMMENT_PATTERN, '').trim()
    const scriptMatch = html.match(/^<script type="application\/ld\+json">([\s\S]*?)<\/script>$/i)

    if (!scriptMatch) {
      findings.push({
        severity: 'block',
        code: 'html_block_not_governed_jsonld',
        message:
          'core/html is allowed only for Content Factory generated application/ld+json structured data, not arbitrary HTML.',
        path: `draft.postContent[${block.index}]`
      })
      continue
    }

    let jsonLd: unknown

    try {
      jsonLd = JSON.parse(scriptMatch[1] ?? '')
    } catch {
      findings.push({
        severity: 'block',
        code: 'jsonld_parse_error',
        message: 'core/html JSON-LD must contain valid JSON.',
        path: `draft.postContent[${block.index}]`
      })
      continue
    }

    const faqPages = collectJsonLdNodes(jsonLd).filter(node => hasSchemaType(node, 'FAQPage'))

    if (faqPages.length === 0) {
      findings.push({
        severity: 'block',
        code: 'jsonld_schema_type_unsupported',
        message: 'Content Factory core/html JSON-LD currently supports generated FAQPage nodes only.',
        path: `draft.postContent[${block.index}]`
      })
      continue
    }

    for (const [index, faqPage] of faqPages.entries()) {
      validateFaqPageNode({
        faqPage,
        findings,
        path: `draft.postContent[${block.index}].FAQPage[${index}]`,
        visibleDetailsSummaries
      })
    }
  }
}

const validateDetailsBlocks = (
  postContent: string,
  blocks: ParsedGutenbergBlockComment[],
  findings: ContentFactoryValidationFinding[]
) => {
  for (const [blockIndex, block] of blocks.entries()) {
    if (block.closing || block.blockName !== 'core/details') continue

    const closingIndex = findMatchingClosingBlockIndex(blocks, blockIndex)
    const blockEnd = closingIndex >= 0 ? blocks[closingIndex + 1]?.index ?? postContent.length : postContent.length
    const blockSlice = postContent.slice(block.index, blockEnd)
    const summary = blockSlice.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ?? ''

    if (!stripHtml(summary).trim()) {
      findings.push({
        severity: 'block',
        code: 'details_summary_missing',
        message: 'core/details blocks need a visible summary label.',
        path: `draft.postContent[${block.index}]`
      })
    }

    if (closingIndex >= 0) {
      const childBlocks = blocks.slice(blockIndex + 1, closingIndex).filter(child => !child.closing)

      if (childBlocks.length === 0) {
        findings.push({
          severity: 'block',
          code: 'details_content_missing',
          message: 'core/details blocks need at least one governed child block.',
          path: `draft.postContent[${block.index}]`
        })
      }

      if (childBlocks.some(child => child.blockName === 'core/heading')) {
        findings.push({
          severity: 'warning',
          code: 'details_heading_inside_disclosure',
          message:
            'Avoid heading blocks inside core/details unless the TOC/outline decision explicitly owns hidden headings.',
          path: `draft.postContent[${block.index}]`
        })
      }
    }
  }
}

type GutenbergBlockSpan = {
  block: ParsedGutenbergBlockComment
  start: number
  end: number
  parent: number | null
}

const commentEnd = (postContent: string, index: number) => {
  const end = postContent.indexOf('-->', index)

  return end < 0 ? postContent.length : end + 3
}

/**
 * Flat list of opening blocks with their full span (opening comment → end of the
 * closing comment) and the index of their parent span, so sibling relations can
 * be read without a full parser.
 */
const buildBlockSpans = (postContent: string, blocks: ParsedGutenbergBlockComment[]): GutenbergBlockSpan[] => {
  const spans: GutenbergBlockSpan[] = []
  const stack: number[] = []

  for (const block of blocks) {
    if (block.closing) {
      const openIndex = stack.pop()

      if (openIndex !== undefined) spans[openIndex].end = commentEnd(postContent, block.index)
      continue
    }

    const parent = stack.length ? stack[stack.length - 1] : null

    spans.push({
      block,
      start: block.index,
      end: block.selfClosing ? commentEnd(postContent, block.index) : postContent.length,
      parent
    })

    if (!block.selfClosing) stack.push(spans.length - 1)
  }

  return spans
}

/** Blocks whose visible text can repeat a Glitch Drop sentence. */
const REDUNDANCY_NEIGHBOUR_BLOCKS = new Set(['core/paragraph', 'core/list', 'core/quote', 'core/pullquote'])

/** Blocks skipped when looking for the neighbouring paragraph (they carry no body copy). */
const REDUNDANCY_TRANSPARENT_BLOCKS = new Set(['core/heading', 'core/separator', 'core/spacer', 'yoast-seo/table-of-contents'])

const findRedundancyNeighbour = (
  spans: GutenbergBlockSpan[],
  spanIndex: number,
  direction: -1 | 1
): GutenbergBlockSpan | null => {
  const parent = spans[spanIndex].parent

  for (let index = spanIndex + direction; index >= 0 && index < spans.length; index += direction) {
    const candidate = spans[index]

    if (candidate.parent !== parent) continue
    if (REDUNDANCY_NEIGHBOUR_BLOCKS.has(candidate.block.blockName)) return candidate
    if (REDUNDANCY_TRANSPARENT_BLOCKS.has(candidate.block.blockName)) continue

    return null
  }

  return null
}

/**
 * `efeoncepro/glitch-drop` is allowed only in the governed shape the spec emits:
 * self-closing dynamic block, `content` (and optionally `label`) attributes,
 * text separated by `<br>`, no links or other HTML. A drop that repeats the
 * neighbouring paragraph is a warning (the 251941 QA finding).
 */
const validateGlitchDropBlocks = (
  postContent: string,
  blocks: ParsedGutenbergBlockComment[],
  findings: ContentFactoryValidationFinding[]
) => {
  const spans = buildBlockSpans(postContent, blocks)

  for (const [spanIndex, span] of spans.entries()) {
    const { block } = span

    if (block.blockName !== GLITCH_DROP_BLOCK_NAME) continue

    const path = `draft.postContent[${block.index}]`

    if (!block.selfClosing) {
      findings.push({
        severity: 'block',
        code: 'glitch_drop_not_self_closing',
        message: `${GLITCH_DROP_BLOCK_NAME} is a dynamic block: its text lives in the content attribute of a self-closing comment.`,
        path
      })
    }

    const unsupportedAttrs = Object.keys(block.attrs).filter(
      key => key !== '__invalidJson' && !(GLITCH_DROP_ALLOWED_ATTRIBUTES as readonly string[]).includes(key)
    )

    if (unsupportedAttrs.length > 0) {
      findings.push({
        severity: 'block',
        code: 'glitch_drop_attrs_unsupported',
        message: `${GLITCH_DROP_BLOCK_NAME} only accepts ${GLITCH_DROP_ALLOWED_ATTRIBUTES.join(', ')}; found ${unsupportedAttrs.join(', ')}.`,
        path
      })
    }

    const content = typeof block.attrs.content === 'string' ? block.attrs.content : ''
    const lines = splitGlitchDropContent(content)

    if (lines.length === 0) {
      findings.push({
        severity: 'block',
        code: 'glitch_drop_content_missing',
        message: `${GLITCH_DROP_BLOCK_NAME} needs non-empty content.`,
        path
      })

      continue
    }

    if (glitchDropContentHasLink(content)) {
      findings.push({
        severity: 'block',
        code: 'glitch_drop_link_not_allowed',
        message: 'Glitch Drop must not contain links; put the source link in the following paragraph.',
        path
      })
    } else if (glitchDropContentHasForeignMarkup(content)) {
      findings.push({
        severity: 'block',
        code: 'glitch_drop_html_not_allowed',
        message: 'Glitch Drop content accepts plain text separated by <br> only.',
        path
      })
    }

    if (lines.length > GLITCH_DROP_MAX_LINES) {
      findings.push({
        severity: 'warning',
        code: 'glitch_drop_too_many_lines',
        message: `Glitch Drop has ${lines.length} lines; keep it to ${GLITCH_DROP_MAX_LINES} or fewer.`,
        path
      })
    }

    for (const direction of [-1, 1] as const) {
      const neighbour = findRedundancyNeighbour(spans, spanIndex, direction)

      if (!neighbour) continue

      const neighbourText = normalizeComparableText(postContent.slice(neighbour.start, neighbour.end))
      const match = findGlitchDropRedundancy(lines, neighbourText)

      if (match) {
        findings.push({
          severity: 'warning',
          code: 'glitch_drop_redundant_with_neighbor',
          message: `Glitch Drop repeats the ${direction === -1 ? 'previous' : 'next'} ${neighbour.block.blockName} (similarity ${match.similarity}, ${match.sharedRunWords} shared words in a row): «${match.unit}». Rewrite one of them.`,
          path
        })
      }
    }
  }
}

const GOVERNED_BUTTON_STYLE_CLASSES = new Set(['is-style-fill', 'is-style-outline'])
const LITERAL_STYLE_ATTRS = ['backgroundColor', 'textColor', 'gradient', 'style', 'fontSize', 'fontFamily', 'borderColor']

/**
 * Governed CTA buttons: core-registered styles only, no literal colors, and a
 * reviewed http(s)/mailto destination. Warnings (not blocks) so refreshes of
 * legacy posts (249768) stay possible; generated specs never trigger them.
 */
const validateButtonBlocks = (
  postContent: string,
  blocks: ParsedGutenbergBlockComment[],
  findings: ContentFactoryValidationFinding[]
) => {
  const spans = buildBlockSpans(postContent, blocks)

  for (const span of spans) {
    const { block } = span

    if (block.blockName !== 'core/button' && block.blockName !== 'core/buttons') continue

    const path = `draft.postContent[${block.index}]`
    const literalAttrs = LITERAL_STYLE_ATTRS.filter(attr => attr in block.attrs)
    const classNames = typeof block.attrs.className === 'string' ? block.attrs.className.split(/\s+/).filter(Boolean) : []
    const ungovernedClasses = classNames.filter(name => !GOVERNED_BUTTON_STYLE_CLASSES.has(name))

    if (literalAttrs.length > 0 || ungovernedClasses.length > 0) {
      findings.push({
        severity: 'warning',
        code: 'button_style_not_governed',
        message: `${block.blockName} carries ${[...literalAttrs, ...ungovernedClasses].join(', ')}; use the governed fill/outline variants only.`,
        path
      })
    }

    if (block.blockName !== 'core/button') continue

    const href = postContent.slice(span.start, span.end).match(/<a\b[^>]*\shref=["']([^"']*)["']/i)?.[1]

    if (!href || !/^(?:https?:\/\/|mailto:)/i.test(decodeBasicHtmlEntities(href))) {
      findings.push({
        severity: 'warning',
        code: 'button_link_not_governed',
        message: 'core/button needs a reviewed https:, http: or mailto: destination.',
        path
      })
    }
  }
}

export const validateGeneratedGutenbergDraft = (
  draft: ContentFactoryGeneratedDraft,
  options: GutenbergDraftValidationOptions = {}
): ContentFactoryValidation => {
  const findings: ContentFactoryValidationFinding[] = []

  validateMetadata(draft, findings)

  if (draft.draft.kind !== 'gutenberg_post') {
    return {
      contractVersion: 'contentFactoryValidation.v1',
      status: resolveContentFactoryValidationStatus(findings),
      findings
    }
  }

  const postContent = draft.draft.postContent ?? ''
  const blocks = parseGutenbergBlockComments(postContent)
  const openingBlocks = getOpeningBlocks(blocks)
  const allowedBlocks = new Set(options.allowedBlocks ?? DEFAULT_ALLOWED_GUTENBERG_BLOCKS)
  const blockNames = openingBlocks.map(block => block.blockName)
  const uniqueBlockNames = Array.from(new Set(blockNames)).sort()
  const headingOutline = collectHeadingOutline(postContent, blocks)
  const compositionProfile = options.compositionProfile ?? EFEONCE_BLOGPOST_COMPOSITION_PROFILE

  if (!postContent.trim()) {
    findings.push({
      severity: 'block',
      code: 'post_content_required',
      message: 'Gutenberg postContent is required.',
      path: 'draft.postContent'
    })
  }

  if (!blocks.length) {
    findings.push({
      severity: 'block',
      code: 'gutenberg_blocks_required',
      message: 'postContent must contain Gutenberg block comments, not plain HTML only.',
      path: 'draft.postContent'
    })
  }

  if (hasUnsafeMarkup(postContent)) {
    findings.push({
      severity: 'block',
      code: 'unsafe_markup_detected',
      message: 'Scripts, iframes, inline event handlers and javascript: URLs are not allowed in generated drafts.',
      path: 'draft.postContent'
    })
  }

  validateBlockBalance(blocks, findings)

  for (const blockName of uniqueBlockNames) {
    if (blockName === 'core/freeform' && !options.allowFreeform) {
      findings.push({
        severity: 'warning',
        code: 'freeform_block_discouraged',
        message: 'core/freeform exists in legacy posts but should not be generated for new drafts.',
        path: 'draft.postContent'
      })
      continue
    }

    if (!allowedBlocks.has(blockName)) {
      findings.push({
        severity: 'block',
        code: 'unsupported_gutenberg_block',
        message: `Block ${blockName} is not in the governed Content Factory allowlist.`,
        path: 'draft.postContent'
      })
    }
  }

  if (!blockNames.includes('core/heading')) {
    findings.push({
      severity: 'warning',
      code: 'heading_block_missing',
      message: 'Generated posts should include at least one heading block for scanability.',
      path: 'draft.postContent'
    })
  }

  if (!blockNames.includes('core/paragraph')) {
    findings.push({
      severity: 'warning',
      code: 'paragraph_block_missing',
      message: 'Generated posts should include paragraph blocks for body copy.',
      path: 'draft.postContent'
    })
  }

  if (compositionProfile) {
    validateBlogpostCompositionProfile({
      blockNames,
      findings,
      headingOutline,
      profile: compositionProfile
    })
  }

  validateTableOfContentsIntegrity(postContent, blocks, findings)
  validateGovernedHtmlJsonLdBlocks(postContent, blocks, findings)
  validateDetailsBlocks(postContent, blocks, findings)
  validateGlitchDropBlocks(postContent, blocks, findings)
  validateButtonBlocks(postContent, blocks, findings)

  if (postContent.length < 600) {
    findings.push({
      severity: 'warning',
      code: 'post_content_short',
      message: 'Generated postContent is short for an Efeonce editorial draft.',
      path: 'draft.postContent'
    })
  }

  const declaredBlocks = new Set(draft.draft.observedBlocks ?? [])

  for (const blockName of uniqueBlockNames) {
    if (!declaredBlocks.has(blockName)) {
      findings.push({
        severity: 'warning',
        code: 'observed_blocks_mismatch',
        message: `observedBlocks does not declare ${blockName}.`,
        path: 'draft.observedBlocks'
      })
    }
  }

  const anchors = collectAnchors(blocks)
  const greenhouseAnchors = anchors.filter(anchor => anchor.startsWith('gh-'))

  if (draft.intent !== 'create' && greenhouseAnchors.length === 0) {
    findings.push({
      severity: 'warning',
      code: 'greenhouse_anchor_missing',
      message: 'Refresh/fix drafts should preserve or introduce gh-* anchors for patch planning.',
      path: 'draft.postContent'
    })
  }

  return {
    contractVersion: 'contentFactoryValidation.v1',
    status: resolveContentFactoryValidationStatus(findings),
    findings,
    summary: {
      blockCount: openingBlocks.length,
      uniqueBlocks: uniqueBlockNames,
      headingOutline,
      hasTableOfContents: blockNames.includes('yoast-seo/table-of-contents'),
      hasMedia: blockNames.some(blockName => compositionProfile && compositionProfile.mediaBlocks.includes(blockName)),
      greenhouseAnchors
    }
  }
}

export const listAllowedGeneratedGutenbergBlocks = () => [...DEFAULT_ALLOWED_GUTENBERG_BLOCKS]
