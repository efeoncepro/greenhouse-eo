/**
 * TASK-1082 — Markdown normalization + chunking (pure, no IO except node:crypto).
 *
 * Convierte un documento markdown en chunks heading-pathed para retrieval, con
 * `citation_anchor` estable y `token_estimate`. Sin dependencias externas (el repo
 * no tiene remark/marked/gray-matter).
 */

import { createHash } from 'node:crypto'

export interface MarkdownChunk {
  headingPath: string[]
  bodyText: string
  citationAnchor: string
  tokenEstimate: number
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/
/** Soft-split: secciones más largas que esto se parten por párrafo para retrieval. */
const DEFAULT_MAX_CHARS = 4000

/** Estimación grosera de tokens (≈ 4 chars/token). */
export const estimateTokens = (text: string): number => Math.max(1, Math.ceil(text.length / 4))

/** SHA-256 del contenido normalizado (lineage / idempotencia por checksum). */
export const checksumMarkdown = (markdown: string): string =>
  `sha256:${createHash('sha256').update(markdown, 'utf8').digest('hex')}`

export const slugifyHeading = (text: string): string => {
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')

  return slug.length > 0 ? slug : 'seccion'
}

/**
 * Quita el front-matter block-quote (`> **Tipo de documento:** ...`) del tope.
 * El front-matter de los docs Greenhouse es un bloque contiguo de líneas `>`.
 */
export const stripFrontmatter = (markdown: string): string => {
  const lines = markdown.split('\n')
  let i = 0

  while (i < lines.length && lines[i].trim() === '') {
    i += 1
  }

  if (i < lines.length && lines[i].trimStart().startsWith('>')) {
    while (i < lines.length && lines[i].trimStart().startsWith('>')) {
      i += 1
    }
  }

  return lines.slice(i).join('\n').trim()
}

const splitLongSection = (text: string, maxChars: number): string[] => {
  if (text.length <= maxChars) {
    return [text]
  }

  const paragraphs = text.split(/\n{2,}/)
  const parts: string[] = []
  let buffer = ''

  for (const paragraph of paragraphs) {
    const candidate = buffer.length === 0 ? paragraph : `${buffer}\n\n${paragraph}`

    if (candidate.length > maxChars && buffer.length > 0) {
      parts.push(buffer)
      buffer = paragraph
    } else {
      buffer = candidate
    }
  }

  if (buffer.length > 0) {
    parts.push(buffer)
  }

  return parts
}

/**
 * Parte el markdown en chunks por encabezados. Cada chunk lleva el heading_path
 * completo (ancestros + actual), el cuerpo (incluye la línea del heading para
 * contexto de cita) y un citation_anchor estable y único por documento.
 */
export const chunkMarkdown = (
  markdown: string,
  options: { maxChars?: number } = {}
): MarkdownChunk[] => {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS
  const body = stripFrontmatter(markdown)
  const lines = body.split('\n')

  const chunks: MarkdownChunk[] = []
  const headingStack: Array<{ level: number; text: string }> = []
  const anchorCounts = new Map<string, number>()

  let current: { headingPath: string[]; lines: string[] } | null = null

  const flush = (): void => {
    if (!current) {
      return
    }

    const text = current.lines.join('\n').trim()

    if (text.length === 0) {
      current = null

      return
    }

    const lastHeading = current.headingPath[current.headingPath.length - 1] ?? 'intro'
    const baseAnchor = slugifyHeading(lastHeading)

    for (const part of splitLongSection(text, maxChars)) {
      const seen = anchorCounts.get(baseAnchor) ?? 0

      anchorCounts.set(baseAnchor, seen + 1)
      const citationAnchor = seen === 0 ? baseAnchor : `${baseAnchor}-${seen + 1}`

      chunks.push({
        headingPath: [...current.headingPath],
        bodyText: part,
        citationAnchor,
        tokenEstimate: estimateTokens(part)
      })
    }

    current = null
  }

  for (const line of lines) {
    const match = HEADING_RE.exec(line)

    if (match) {
      flush()
      const level = match[1].length
      const text = match[2].trim()

      while (
        headingStack.length > 0 &&
        headingStack[headingStack.length - 1].level >= level
      ) {
        headingStack.pop()
      }

      headingStack.push({ level, text })
      current = { headingPath: headingStack.map(h => h.text), lines: [line] }
    } else {
      if (!current) {
        current = { headingPath: [], lines: [] }
      }

      current.lines.push(line)
    }
  }

  flush()

  return chunks
}
