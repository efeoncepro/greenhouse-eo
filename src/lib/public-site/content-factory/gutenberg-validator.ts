import type {
  ContentFactoryGeneratedDraft,
  ContentFactoryValidation,
  ContentFactoryValidationFinding,
  GutenbergBlogpostCompositionProfile,
  GutenbergHeadingOutlineItem
} from './contracts'
import { resolveContentFactoryValidationStatus } from './contracts'

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
  'core/group',
  'core/heading',
  'core/image',
  'core/list',
  'core/list-item',
  'core/paragraph',
  'core/quote',
  'core/separator',
  'core/spacer',
  'yoast-seo/table-of-contents'
]

export const EFEONCE_BLOGPOST_COMPOSITION_PROFILE: GutenbergBlogpostCompositionProfile = {
  contractVersion: 'gutenbergBlogpostCompositionProfile.v1',
  key: 'efeonce_blogpost',
  description:
    'Efeonce blog posts should be generated as structured Gutenberg editorial pieces, not plain paragraph dumps.',
  requiredBlocks: ['core/heading', 'core/paragraph', 'core/list', 'yoast-seo/table-of-contents'],
  recommendedBlocks: ['core/quote', 'core/separator', 'core/image', 'core/embed'],
  tableOfContentsBlock: 'yoast-seo/table-of-contents',
  minHeadingCount: 3,
  minLevel2HeadingCount: 2,
  minStructuredBlockCount: 5,
  maxHeadingJump: 1,
  disallowedGeneratedBlocks: ['core/freeform'],
  mediaBlocks: ['core/image', 'core/embed'],
  enrichmentBlocks: ['core/list', 'core/quote', 'core/separator', 'core/image', 'core/embed']
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

const validateBlockBalance = (
  blocks: ParsedGutenbergBlockComment[],
  findings: ContentFactoryValidationFinding[]
) => {
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

const hasUnsafeMarkup = (postContent: string) =>
  /<\s*script\b/i.test(postContent) ||
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
    findings.push({ severity: 'block', code: 'seo_title_required', message: 'SEO title is required.', path: 'seo.title' })
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
      message: 'Efeonce blogposts can include image or embed slots; resolve real media before write when the brief calls for visual proof.',
      path: 'draft.postContent'
    })
  }

  if (!profile.enrichmentBlocks.some(blockName => blockNameSet.has(blockName))) {
    findings.push({
      severity: 'block',
      code: 'blogpost_enrichment_block_missing',
      message: 'Generated post needs at least one enrichment block such as list, quote, separator, image or embed.',
      path: 'draft.postContent'
    })
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
