import { basename, relative, sep } from 'node:path'

const STATUS_HEADING_RE = /^##\s+Status\s*$/i
const H2_RE = /^##\s+(.+?)\s*$/
const H3_RE = /^###\s+(.+?)\s*$/
const STATUS_FIELD_RE = /^-\s+([^:]+):\s*(.*)$/
const TASK_ID_RE = /TASK-\d{3}(?:\.\d+)?/
const CANONICAL_TASK_FILE_RE = /^TASK-\d{3}-/

const stripInlineCode = value => value.trim().replace(/^`(.+)`$/, '$1').trim()

const normalizeHeading = value =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

const lineNumberForIndex = (lineStarts, index) => {
  let low = 0
  let high = lineStarts.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)

    if (lineStarts[mid] <= index) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return Math.max(1, high + 1)
}

const buildLineStarts = source => {
  const starts = [0]

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') starts.push(index + 1)
  }

  return starts
}

const extractStatusBlock = lines => {
  const startLine = lines.findIndex(line => STATUS_HEADING_RE.test(line))

  if (startLine === -1) {
    return {
      fields: {},
      fieldLines: {},
      hasStatus: false,
      startLine: null,
      endLine: null
    }
  }

  let endLine = lines.length

  for (let index = startLine + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      endLine = index
      break
    }
  }

  const fields = {}
  const fieldLines = {}
  let currentField = null

  for (let index = startLine + 1; index < endLine; index += 1) {
    const line = lines[index]
    const match = line.match(STATUS_FIELD_RE)

    if (match) {
      currentField = match[1].trim()
      fields[currentField] = stripInlineCode(match[2] ?? '')
      fieldLines[currentField] = index + 1
      continue
    }

    if (currentField && line.trim().length > 0) {
      fields[currentField] = `${fields[currentField]}\n${line.trim()}`
    }
  }

  return {
    fields,
    fieldLines,
    hasStatus: true,
    startLine: startLine + 1,
    endLine
  }
}

const extractHeadings = (source, lineStarts) => {
  const headings = []
  const lines = source.split('\n')
  let offset = 0

  for (const line of lines) {
    const h2 = line.match(H2_RE)
    const h3 = line.match(H3_RE)

    if (h2 || h3) {
      const raw = h3 ? h3[1] : h2[1]

      headings.push({
        level: h3 ? 3 : 2,
        raw,
        key: normalizeHeading(raw),
        line: lineNumberForIndex(lineStarts, offset)
      })
    }

    offset += line.length + 1
  }

  return headings
}

const extractSections = (source, headings) => {
  const sections = new Map()

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index]

    if (heading.level !== 2) continue

    const next = headings.find((candidate, candidateIndex) => {
      return candidateIndex > index && candidate.level === 2
    })

    const headingLineRe = new RegExp(`^##\\s+${heading.raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm')
    const headingMatch = source.match(headingLineRe)
    const start = headingMatch ? headingMatch.index + headingMatch[0].length : 0
    let end = source.length

    if (next) {
      const nextLineRe = new RegExp(`^##\\s+${next.raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm')
      const slice = source.slice(start)
      const nextMatch = slice.match(nextLineRe)

      if (nextMatch) end = start + nextMatch.index
    }

    sections.set(heading.key, {
      ...heading,
      content: source.slice(start, end).trim()
    })
  }

  return sections
}

const detectFolderLifecycle = relativePath => {
  const parts = relativePath.split(sep)
  const tasksIndex = parts.indexOf('tasks')
  const lifecycle = tasksIndex >= 0 ? parts[tasksIndex + 1] : null

  if (['to-do', 'in-progress', 'complete'].includes(lifecycle)) return lifecycle

  return null
}

export const parseTaskMarkdown = ({ filePath, repoRoot, source }) => {
  const normalizedSource = source.replace(/\r\n/g, '\n')
  const lineStarts = buildLineStarts(normalizedSource)
  const lines = normalizedSource.split('\n')
  const relativePath = repoRoot ? relative(repoRoot, filePath) : filePath
  const filename = basename(filePath)
  const id = filename.match(TASK_ID_RE)?.[0] ?? null
  const idNumber = id ? Number(id.match(/^TASK-(\d{3})/)?.[1] ?? 0) : null
  const status = extractStatusBlock(lines)
  const headings = extractHeadings(normalizedSource, lineStarts)
  const sections = extractSections(normalizedSource, headings)
  const lifecycle = status.fields.Lifecycle ?? status.fields.lifecycle ?? null
  const type = status.fields.Type ?? status.fields.type ?? null
  const effort = status.fields.Effort ?? status.fields.effort ?? null
  const domain = status.fields.Domain ?? status.fields.domain ?? null

  const hasTemplateShape = ['ZONE 0', 'ZONE 1', 'ZONE 2', 'ZONE 3', 'ZONE 4'].every(marker =>
    normalizedSource.includes(marker)
  )

  const template =
    CANONICAL_TASK_FILE_RE.test(filename) &&
    status.hasStatus &&
    typeof lifecycle === 'string' &&
    lifecycle.length > 0 &&
    typeof type === 'string' &&
    type.length > 0 &&
    hasTemplateShape

  return {
    file: relativePath,
    filePath,
    filename,
    id,
    idNumber,
    kind: template ? 'template' : 'legacy',
    folderLifecycle: detectFolderLifecycle(relativePath),
    status,
    lifecycle: lifecycle ? stripInlineCode(lifecycle) : null,
    type: type ? stripInlineCode(type).toLowerCase() : null,
    effort: effort ? stripInlineCode(effort).toLowerCase() : null,
    domain: domain ? stripInlineCode(domain).toLowerCase() : null,
    headings,
    sections,
    source: normalizedSource
  }
}

export const parseTaskIdRegistry = source => {
  const rows = new Map()
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const idMatch = line.match(/^\|\s*`(TASK-\d{3}(?:\.\d+)?)`\s*\|\s*`?([^`|]+)`?\s*\|.*\|\s*`([^`]+)`\s*\|/)

    if (!idMatch) continue

    rows.set(idMatch[1], {
      id: idMatch[1],
      lifecycle: stripInlineCode(idMatch[2]),
      file: idMatch[3],
      line: index + 1
    })
  }

  return rows
}

export const parseReadmeNextId = source => {
  const normalizedSource = source.replace(/\r\n/g, '\n')
  const match = normalizedSource.match(/siguiente ID disponible:\s*`(TASK-(\d{3}))`/i)

  if (!match) return null

  return {
    id: match[1],
    numeric: Number(match[2]),
    line: normalizedSource.slice(0, match.index).split('\n').length
  }
}

export const deriveNextTaskId = registryRows => {
  let max = 0

  for (const id of registryRows.keys()) {
    const match = id.match(/^TASK-(\d{3})$/)

    if (!match) continue
    max = Math.max(max, Number(match[1]))
  }

  return `TASK-${String(max + 1).padStart(3, '0')}`
}
