/**
 * TASK-1088 — Notion blocks → Markdown (PURE, sin IO).
 *
 * Convierte el árbol de bloques Notion (hidratado por `notion-knowledge-client`)
 * en markdown que el chunker heading-pathed (TASK-1082 `markdown.ts`) consume.
 * Las HEADINGS limpias (`#`/`##`/`###`) son críticas: el chunker arma el
 * `headingPath` desde ellas. Es función pura → testeable con fixtures, sin red.
 *
 * Cubre los block types de prosa-conocimiento (headings, párrafos, listas, quote,
 * callout, code, divider, toggle, tablas). Media se representa como link/placeholder
 * para no contaminar los chunks. Bloques desconocidos con `rich_text` degradan a
 * párrafo; sin `rich_text`, se omiten (degradación honesta, nunca se inventa).
 */

import type { NotionBlock, NotionRichText } from './notion-knowledge-client'

const INDENT = '  '

interface NotionBlockPayload {
  rich_text?: NotionRichText[]
  language?: string
  checked?: boolean
  icon?: { emoji?: string } | null
  caption?: NotionRichText[]
  external?: { url?: string } | null
  file?: { url?: string } | null
  url?: string
  has_column_header?: boolean
  cells?: NotionRichText[][]
  title?: string
}

const escapeInline = (text: string): string => text.replace(/([\\`*_])/g, '\\$1')

/** Convierte un array de rich_text Notion a markdown inline (annotations + link). */
export const richTextToMarkdown = (richText: NotionRichText[] | undefined): string => {
  if (!richText || richText.length === 0) {
    return ''
  }

  return richText
    .map(rt => {
      const raw = rt.plain_text ?? ''

      if (raw.length === 0) {
        return ''
      }

      const annotations = rt.annotations ?? {}

      // Código tiene precedencia: nada de bold/italic adentro.
      let formatted = annotations.code ? `\`${raw}\`` : escapeInline(raw)

      if (!annotations.code) {
        if (annotations.bold) formatted = `**${formatted}**`
        if (annotations.italic) formatted = `*${formatted}*`
        if (annotations.strikethrough) formatted = `~~${formatted}~~`
      }

      if (rt.href) {
        formatted = `[${formatted}](${rt.href})`
      }

      return formatted
    })
    .join('')
}

const payloadOf = (block: NotionBlock): NotionBlockPayload =>
  (block[block.type] as NotionBlockPayload | undefined) ?? {}

const richTextOf = (block: NotionBlock): string => richTextToMarkdown(payloadOf(block).rich_text)

const indentChildLines = (markdown: string, depth: number): string =>
  markdown
    .split('\n')
    .map(line => (line.length > 0 ? `${INDENT.repeat(depth + 1)}${line}` : line))
    .join('\n')

const renderTable = (block: NotionBlock): string => {
  const rows = (block.children ?? []).filter(child => child.type === 'table_row')

  if (rows.length === 0) {
    return ''
  }

  const matrix = rows.map(row => {
    const cells = payloadOf(row).cells ?? []

    return cells.map(cell => richTextToMarkdown(cell).replace(/\|/g, '\\|') || ' ')
  })

  const columnCount = Math.max(...matrix.map(r => r.length), 1)
  const hasHeader = payloadOf(block).has_column_header === true

  const normalize = (row: string[]): string[] => {
    const padded = [...row]

    while (padded.length < columnCount) padded.push(' ')

    return padded
  }

  const lines: string[] = []
  const header = hasHeader ? normalize(matrix[0]) : Array.from({ length: columnCount }, () => ' ')

  lines.push(`| ${header.join(' | ')} |`)
  lines.push(`| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`)

  const bodyRows = hasHeader ? matrix.slice(1) : matrix

  for (const row of bodyRows) {
    lines.push(`| ${normalize(row).join(' | ')} |`)
  }

  return lines.join('\n')
}

/**
 * Renderiza un bloque a un string markdown (puede ser multilínea). `depth` controla
 * la indentación de children anidados en listas. `numberedIndex` es el contador del
 * run contiguo de `numbered_list_item` (1-based).
 */
const renderBlock = (block: NotionBlock, depth: number, numberedIndex: number): string => {
  const text = richTextOf(block)
  const children = block.children ?? []
  const renderChildren = (): string => (children.length > 0 ? renderBlocks(children, depth + 1) : '')

  const withChildren = (head: string): string => {
    const childMarkdown = renderChildren()

    if (!childMarkdown) {
      return head
    }

    // Listas: children indentados bajo el item. No-listas: children como bloques.
    const isListItem =
      block.type === 'bulleted_list_item' || block.type === 'numbered_list_item' || block.type === 'to_do'

    return isListItem ? `${head}\n${indentChildLines(childMarkdown, depth)}` : `${head}\n\n${childMarkdown}`
  }

  switch (block.type) {
    case 'heading_1':
      return `# ${text}`
    case 'heading_2':
      return `## ${text}`
    case 'heading_3':
      return `### ${text}`
    case 'paragraph':
      return text
    case 'bulleted_list_item':
      return withChildren(`- ${text}`)
    case 'numbered_list_item':
      return withChildren(`${numberedIndex}. ${text}`)

    case 'to_do': {
      const checked = payloadOf(block).checked === true

      return withChildren(`- [${checked ? 'x' : ' '}] ${text}`)
    }

    case 'quote':
      return `> ${text}`

    case 'callout': {
      const emoji = payloadOf(block).icon?.emoji
      const prefix = emoji ? `${emoji} ` : ''

      return `> ${prefix}${text}`
    }

    case 'code': {
      const language = payloadOf(block).language ?? ''

      return `\`\`\`${language}\n${text}\n\`\`\``
    }

    case 'divider':
      return '---'
    case 'toggle':
      return withChildren(text)
    case 'table':
      return renderTable(block)
    case 'column_list':
    case 'column':
    case 'synced_block':
      // Contenedores: aplanar children al mismo nivel.
      return renderBlocks(children, depth)
    case 'table_row':
      // Manejado dentro de `renderTable`; suelto se ignora.
      return ''
    case 'child_page':
    case 'child_database':
      // Sub-páginas/DBs: fuera del alcance del documento actual.
      return ''
    case 'image':
    case 'file':
    case 'video':
    case 'pdf':
    case 'bookmark':

    case 'embed': {
      const payload = payloadOf(block)
      const url = payload.external?.url ?? payload.file?.url ?? payload.url ?? ''
      const caption = richTextToMarkdown(payload.caption) || block.type

      return url ? `[${caption}](${url})` : ''
    }

    default: {
      // Desconocido: si es contenedor (trae children — ej. `tab`, agregado 2026-03-25),
      // aplana los children para no perder contenido; sino degrada a párrafo honesto.
      if (children.length === 0) {
        return text
      }

      const flattened = renderBlocks(children, depth)

      return text ? `${text}\n\n${flattened}` : flattened
    }
  }
}

/** Renderiza una secuencia de bloques, gestionando numeración de listas ordenadas. */
const renderBlocks = (blocks: NotionBlock[], depth: number): string => {
  const parts: string[] = []
  let numberedCounter = 0

  for (const block of blocks) {
    if (block.type === 'numbered_list_item') {
      numberedCounter += 1
    } else {
      numberedCounter = 0
    }

    const rendered = renderBlock(block, depth, numberedCounter)

    if (rendered.trim().length > 0) {
      parts.push(rendered)
    }
  }

  return parts.join('\n\n')
}

/** Convierte el árbol de bloques de una página en markdown (entrypoint). */
export const blocksToMarkdown = (blocks: NotionBlock[]): string => {
  const markdown = renderBlocks(blocks, 0)

  // Colapsa runs de 3+ saltos a 2 (markdown canónico).
  return markdown.replace(/\n{3,}/g, '\n\n').trim()
}
