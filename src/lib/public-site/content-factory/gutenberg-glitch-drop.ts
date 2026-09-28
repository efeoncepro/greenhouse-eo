/**
 * Governed builder + checks for the dynamic `efeoncepro/glitch-drop` block.
 *
 * The block (plugin `efeonce-editorial-blocks`, TASK-1337) is dynamic: its text
 * lives in the `content` attribute of a self-closing block comment and
 * `render.php` owns the markup. Before this module existed, Content Factory could
 * not emit it and agents inserted it after the private write with a
 * parse_blocks/serialize_blocks recipe (post 251941, 2026-09-28). Now the spec
 * declares `{ kind: 'glitchDrop', lines }` and this module serializes the block
 * byte-identical to WordPress `serialize_block_attributes()`.
 *
 * Contract: `docs/documentation/public-site/glitch-drop-gutenberg-block.md`.
 */

import { serializeGutenbergBlockAttributes } from './gutenberg-blocks'

export const GLITCH_DROP_BLOCK_NAME = 'efeoncepro/glitch-drop'
export const GLITCH_DROP_MIN_LINES = 1
export const GLITCH_DROP_MAX_LINES = 4

/** Attributes the live block understands. `tone` is deferred in the plugin (v0.1.0). */
export const GLITCH_DROP_ALLOWED_ATTRIBUTES = ['content', 'label'] as const

// A tag starts with `<` immediately followed by a name (`a < b` is plain text).
const MARKUP_PATTERN = /<\/?[a-z!?]/i
const LINK_LIKE_PATTERN = /\b(?:https?:\/\/|www\.)\S/i
// Control characters (incl. newlines/tabs), backslash and Unicode line terminators.
const INVALID_CHARACTER_PATTERN = /[\u0000-\u001f\u007f\\\u2028\u2029]/

/**
 * Text escape for one drop line, matching what the block editor's RichText
 * stores (`&` and `<` escaped; `>` escaped too for parity with the rest of the
 * Content Factory pipeline). Quotes stay literal: WordPress serializes them as
 * `\u0022` inside the attribute.
 */
const escapeGlitchDropLine = (line: string): string =>
  line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Validate the authored lines. Throws with a stable code so the spec author
 * (agent or human) gets an actionable reason before any markup exists.
 */
export const assertGlitchDropLines = (lines: unknown): string[] => {
  if (!Array.isArray(lines) || lines.length < GLITCH_DROP_MIN_LINES || lines.length > GLITCH_DROP_MAX_LINES) {
    throw new Error('content_factory_article_glitch_drop_lines_count_invalid')
  }

  return lines.map((raw, index) => {
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new Error(`content_factory_article_glitch_drop_line_required:${index}`)
    }

    const line = raw.trim()

    if (INVALID_CHARACTER_PATTERN.test(line)) {
      throw new Error(`content_factory_article_glitch_drop_line_characters_invalid:${index}`)
    }

    if (MARKUP_PATTERN.test(line)) {
      throw new Error(`content_factory_article_glitch_drop_markup_not_allowed:${index}`)
    }

    if (LINK_LIKE_PATTERN.test(line)) {
      throw new Error(`content_factory_article_glitch_drop_link_not_allowed:${index}`)
    }

    return line
  })
}

/** The `content` attribute value: escaped lines joined by `<br>` (the live format). */
export const buildGlitchDropContent = (lines: string[]): string =>
  assertGlitchDropLines(lines).map(escapeGlitchDropLine).join('<br>')

/**
 * Render the self-closing dynamic block exactly as WordPress stores it:
 * `<!-- wp:efeoncepro/glitch-drop {"content":"…\u003cbr\u003e…"} /-->`.
 */
export const renderGlitchDropBlock = (lines: string[]): string =>
  `<!-- wp:${GLITCH_DROP_BLOCK_NAME} ${serializeGutenbergBlockAttributes({ content: buildGlitchDropContent(lines) })} /-->`

const BR_PATTERN = /<br\s*\/?>/gi

/** Split a stored `content` attribute back into plain-text lines. */
export const splitGlitchDropContent = (content: string): string[] =>
  content
    .split(BR_PATTERN)
    .map(line =>
      line
        .replace(/<[^>]*>/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)

export const glitchDropContentHasLink = (content: string): boolean => /<\s*a[\s>]/i.test(content)

/** True when `content` carries any HTML tag other than `<br>`. */
export const glitchDropContentHasForeignMarkup = (content: string): boolean =>
  /<\/?[a-z!?][^>]*>/i.test(content.replace(BR_PATTERN, ''))

// ---------------------------------------------------------------------------
// Redundancy with the neighbouring paragraphs
// ---------------------------------------------------------------------------

/**
 * Redundancy rule (documented in content-factory-gutenberg.md):
 * - Units: every drop line AND every sentence inside a line (split on `.`, `!`,
 *   `?`, `…`). Units shorter than `REDUNDANCY_MIN_WORDS` words are ignored — they
 *   are too short to be a meaningful repeat («Por eso.»).
 * - Text is normalized: accents stripped, lowercase, punctuation/quotes removed,
 *   whitespace collapsed.
 * - Similarity = share of the unit's 4-word shingles that also appear in the
 *   neighbour text. A unit with exactly 4 words therefore needs to appear
 *   verbatim. The warning fires at `REDUNDANCY_THRESHOLD` (0.6) or above.
 * - It also fires when the unit and the neighbour share a verbatim run of
 *   `REDUNDANCY_MIN_SHARED_RUN_WORDS` (8) or more words, even if that run is a
 *   small part of a long sentence (a repeated clause reads as a repeat).
 *
 * Calibrated on the real 251941 case: the drop's second line and the next
 * paragraph («La pregunta cambia. Ya no es…») share 14/16 shingles (0.875).
 */
export const GLITCH_DROP_REDUNDANCY_SHINGLE_SIZE = 4
export const GLITCH_DROP_REDUNDANCY_MIN_WORDS = 4
export const GLITCH_DROP_REDUNDANCY_THRESHOLD = 0.6
export const GLITCH_DROP_REDUNDANCY_MIN_SHARED_RUN_WORDS = 8

export const normalizeForRedundancy = (value: string): string[] =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

const shingles = (words: string[], size: number): string[] => {
  if (words.length < size) return []

  const result: string[] = []

  for (let index = 0; index + size <= words.length; index += 1) {
    result.push(words.slice(index, index + size).join(' '))
  }

  return result
}

const splitSentences = (line: string): string[] =>
  line
    .split(/(?<=[.!?…])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean)

export type GlitchDropRedundancyMatch = {
  unit: string
  /** Share of the unit's 4-word shingles found in the neighbour (0–1). */
  similarity: number
  /** Longest verbatim run (in words) shared with the neighbour. */
  sharedRunWords: number
}

/**
 * Return the most redundant drop unit against `neighbourText`, or null when no
 * unit reaches the threshold.
 */
export const findGlitchDropRedundancy = (
  lines: string[],
  neighbourText: string
): GlitchDropRedundancyMatch | null => {
  const neighbourShingles = new Set(shingles(normalizeForRedundancy(neighbourText), GLITCH_DROP_REDUNDANCY_SHINGLE_SIZE))

  if (neighbourShingles.size === 0) return null

  const units = Array.from(new Set(lines.flatMap(line => [line, ...splitSentences(line)])))
  let best: GlitchDropRedundancyMatch | null = null

  for (const unit of units) {
    const words = normalizeForRedundancy(unit)

    if (words.length < GLITCH_DROP_REDUNDANCY_MIN_WORDS) continue

    const unitShingles = shingles(words, GLITCH_DROP_REDUNDANCY_SHINGLE_SIZE)

    if (unitShingles.length === 0) continue

    let shared = 0
    let run = 0
    let longestRun = 0

    for (const shingle of unitShingles) {
      if (neighbourShingles.has(shingle)) {
        shared += 1
        run += 1
        longestRun = Math.max(longestRun, run)
      } else {
        run = 0
      }
    }

    const similarity = shared / unitShingles.length
    const sharedRunWords = longestRun > 0 ? longestRun + GLITCH_DROP_REDUNDANCY_SHINGLE_SIZE - 1 : 0

    const redundant =
      similarity >= GLITCH_DROP_REDUNDANCY_THRESHOLD || sharedRunWords >= GLITCH_DROP_REDUNDANCY_MIN_SHARED_RUN_WORDS

    if (redundant && (!best || similarity > best.similarity || sharedRunWords > best.sharedRunWords)) {
      best = { unit, similarity: Math.round(similarity * 1000) / 1000, sharedRunWords }
    }
  }

  return best
}
