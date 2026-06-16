/**
 * TASK-1152 — Work item Markdown parser (server-side).
 *
 * Espeja la semántica de parseo de los linters canónicos
 * (`scripts/ci/task-lint/parser.mjs` + `scripts/ci/ops-artifact-lint.mjs`) en
 * TypeScript, con tests de paridad. NO importa los `.mjs` en runtime porque los
 * scripts CI no se bundlean en la serverless function — portamos la semántica y
 * la bloqueamos con tests.
 *
 * Este módulo NO lee filesystem: recibe `source` (string) y produce una
 * proyección base + señales para el clasificador de salud (`health.ts`). El walk
 * de directorios + lectura de archivos vive en `reader.ts`.
 */
import type { WorkItem, WorkItemKind, WorkItemLifecycle } from './types'

const STATUS_HEADING_RE = /^##\s+Status\s*$/i
const H1_RE = /^#\s+(.+?)\s*$/m
const STATUS_FIELD_RE = /^-\s+([^:]+):\s*(.*)$/
const WORK_ITEM_ID_RE = /\b(?:EPIC|TASK|MINI|ISSUE)-\d{3,}(?:\.\d+)?\b/g
const SUMMARY_CAP = 600

interface IdPrefixConfig {
  prefix: string
  /** Folder lifecycles válidos para este kind. */
  folderStates: readonly string[]
}

const KIND_CONFIG: Record<WorkItemKind, IdPrefixConfig> = {
  epic: { prefix: 'EPIC', folderStates: ['to-do', 'in-progress', 'complete'] },
  task: { prefix: 'TASK', folderStates: ['to-do', 'in-progress', 'complete'] },
  mini_task: { prefix: 'MINI', folderStates: ['to-do', 'in-progress', 'complete'] },
  issue: { prefix: 'ISSUE', folderStates: ['open', 'resolved'] }
}

/** Strip de inline code (backticks envolventes) — mirror de los linters. */
const stripInlineCode = (value: string): string => value.trim().replace(/^`(.+)`$/, '$1').trim()

const normalizeHeading = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase()

/** Normaliza para comparar headers tolerando acentos (issues: `síntoma` ≡ `sintoma`). */
const deburr = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const truncate = (value: string, cap = SUMMARY_CAP): string =>
  value.length > cap ? `${value.slice(0, cap).trimEnd()}…` : value

/** Resultado del parser: proyección base + señales para `health.ts`. */
export interface WorkItemParseSignals {
  kind: WorkItemKind
  filename: string
  hasStatus: boolean
  /** Keys normalizadas (lowercase + collapse) de los Status fields presentes. */
  statusFieldKeys: Set<string>
  /** Keys normalizadas + deburred de las secciones `## ...` presentes. */
  sectionKeys: Set<string>
  folderLifecycle: WorkItemLifecycle
  declaredLifecycle: string | null
  hasCanonicalFilename: boolean
  /** Tasks: markers ZONE 0..4 presentes. Otros kinds: siempre `false`. */
  hasTemplateShape: boolean
}

export interface WorkItemParseResult {
  /** Proyección base (sin `health`, que la compone `reader.ts`). */
  base: Omit<WorkItem, 'health'>
  signals: WorkItemParseSignals
}

// ---------------------------------------------------------------------------
// Low-level Markdown extraction (mirror de los linters)
// ---------------------------------------------------------------------------

interface StatusBlock {
  fields: Record<string, string>
  hasStatus: boolean
}

const extractStatusBlock = (lines: string[]): StatusBlock => {
  const start = lines.findIndex(line => STATUS_HEADING_RE.test(line))

  if (start === -1) return { fields: {}, hasStatus: false }

  const fields: Record<string, string> = {}
  let current: string | null = null

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]

    if (/^##\s+/.test(line)) break

    const match = line.match(STATUS_FIELD_RE)

    if (match) {
      current = match[1].trim()
      fields[current] = stripInlineCode(match[2] ?? '')
      continue
    }

    if (current && line.trim()) {
      fields[current] = `${fields[current]}\n${line.trim()}`
    }
  }

  return { fields, hasStatus: true }
}

interface Section {
  raw: string
  content: string
}

/** Extrae secciones `## Header` → contenido hasta el próximo `## `. */
const extractSections = (source: string): Map<string, Section> => {
  const sections = new Map<string, Section>()
  const matches = Array.from(source.matchAll(/^##\s+(.+?)\s*$/gm))

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const raw = match[1]
    const key = normalizeHeading(raw)
    const start = (match.index ?? 0) + match[0].length
    const end = matches[index + 1]?.index ?? source.length

    sections.set(key, { raw, content: source.slice(start, end).trim() })
  }

  return sections
}

/** Lee una sección tolerando variantes con/sin acento (issues legacy). */
const sectionContent = (sections: Map<string, Section>, ...keys: string[]): string | null => {
  for (const key of keys) {
    const direct = sections.get(key)

    if (direct) return direct.content || null
  }

  // Fallback deburr: `síntoma` ≡ `sintoma`, `solución` ≡ `solucion`.
  const wanted = keys.map(deburr)

  for (const [key, section] of sections) {
    if (wanted.includes(deburr(key))) return section.content || null
  }

  return null
}

const extractTitle = (source: string, fallback: string): string => {
  const match = source.match(H1_RE)

  if (!match) return fallback

  return match[1].trim()
}

const extractIds = (source: string): string[] => {
  const ids = new Set<string>()
  const matches = source.matchAll(WORK_ITEM_ID_RE)

  for (const match of matches) ids.add(match[0])

  return Array.from(ids)
}

/** IDs de un substring/sección (preserva orden de aparición, dedup). */
const extractIdsFrom = (value: string | null): string[] => (value ? extractIds(value) : [])

/** Extrae paths code-spanned (`src/lib/...`) de una sección. */
const extractOwnedPaths = (value: string | null): string[] => {
  if (!value) return []

  const paths = new Set<string>()
  // Code-spanned paths: `src/...`, `docs/...`, `migrations/...`, `scripts/...`.
  const matches = value.matchAll(/`([^`]+?\.[A-Za-z0-9]+|[A-Za-z0-9._/-]+\/[A-Za-z0-9._/*-]+)`/g)

  for (const match of matches) {
    const candidate = match[1].trim()

    if (/^(src|docs|migrations|scripts|services|tests|eslint-plugins)\//.test(candidate)) {
      paths.add(candidate)
    }
  }

  return Array.from(paths)
}

/** Primera fecha ISO/`YYYY-MM-DD` que aparece en un texto. */
const extractFirstDate = (value: string | null): string | null => {
  if (!value) return null

  const match = value.match(/\b(\d{4}-\d{2}-\d{2})\b/)

  return match ? match[1] : null
}

const idPattern = (kind: WorkItemKind): RegExp => new RegExp(`${KIND_CONFIG[kind].prefix}-\\d{3,}(?:\\.\\d+)?`)

const canonicalFilenameRe = (kind: WorkItemKind): RegExp => new RegExp(`^${KIND_CONFIG[kind].prefix}-\\d{3,}-`)

/**
 * Lifecycle del FOLDER es la fuente de verdad de dónde vive el archivo.
 * `relativePath` viene normalizado a `/`.
 */
const detectFolderLifecycle = (relativePath: string, kind: WorkItemKind): WorkItemLifecycle => {
  const parts = relativePath.split('/')
  const docsIndex = parts.indexOf('docs')
  const candidate = docsIndex >= 0 ? parts[docsIndex + 2] : null

  if (candidate && KIND_CONFIG[kind].folderStates.includes(candidate)) {
    return candidate as WorkItemLifecycle
  }

  return 'unknown'
}

// ---------------------------------------------------------------------------
// Per-kind field extraction
// ---------------------------------------------------------------------------

const statusField = (fields: Record<string, string>, ...names: string[]): string | null => {
  for (const name of names) {
    const value = fields[name]

    if (typeof value === 'string' && value.trim()) return stripInlineCode(value)
  }

  return null
}

const LIFECYCLE_TOKEN_RE = /\b(to-do|in-progress|complete|open|resolved)\b/i

/**
 * Normaliza el valor declarado de `Lifecycle`: extrae el token canónico aunque
 * venga con notas parentéticas o backticks parciales (ej. `` `to-do` (revertida…) ``
 * → `to-do`). Evita falsos «lifecycle mismatch» por anotaciones del operador.
 */
const normalizeDeclaredLifecycle = (raw: string | null): string | null => {
  if (!raw) return null

  const match = raw.match(LIFECYCLE_TOKEN_RE)

  return match ? match[1].toLowerCase() : stripInlineCode(raw)
}

/** Lista de IDs declarada en un Status field (`Blocked by: TASK-1, TASK-2` o `none`). */
const idListFromField = (value: string | null): string[] => {
  if (!value) return []

  const normalized = value.trim().toLowerCase()

  if (normalized === 'none' || normalized === 'n/a' || normalized === '-') return []

  return extractIds(value)
}

export const parseWorkItem = ({
  kind,
  filePath,
  repoRoot,
  source
}: {
  kind: WorkItemKind
  filePath: string
  /** Repo root (para derivar path relativo). */
  repoRoot: string
  source: string
}): WorkItemParseResult => {
  const normalized = source.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const filename = filePath.split('/').pop() ?? filePath

  const relativePath = filePath.startsWith(repoRoot)
    ? filePath.slice(repoRoot.length).replace(/^[\\/]+/, '').split('\\').join('/')
    : filePath.split('\\').join('/')

  const parseWarnings: string[] = []

  const idFromFilename = filename.match(idPattern(kind))?.[0] ?? null
  const idFromBody = normalized.match(idPattern(kind))?.[0] ?? null
  const id = idFromFilename ?? idFromBody

  if (!idFromFilename && idFromBody) {
    parseWarnings.push('ID derivado del cuerpo; el filename no es canónico')
  }

  const status = extractStatusBlock(lines)
  const sections = extractSections(normalized)
  const folderLifecycle = detectFolderLifecycle(relativePath, kind)
  const title = extractTitle(normalized, id ?? filename.replace(/\.md$/, ''))

  if (folderLifecycle === 'unknown') {
    parseWarnings.push('Lifecycle del folder no reconocible')
  }

  const statusFieldKeys = new Set(Object.keys(status.fields).map(normalizeHeading))
  const sectionKeys = new Set(Array.from(sections.keys()))

  const hasCanonicalFilename = canonicalFilenameRe(kind).test(filename)

  const hasTemplateShape =
    kind === 'task' && ['ZONE 0', 'ZONE 1', 'ZONE 2', 'ZONE 3', 'ZONE 4'].every(marker => normalized.includes(marker))

  // --- common fields ---
  const relatedIds = extractIds(normalized).filter(other => other !== id)

  let base: Omit<WorkItem, 'health'>

  if (kind === 'issue') {
    // Issues: sin Status block; headers español con/sin acento.
    const environment = sectionContent(sections, 'ambiente')
    const detectedRaw = sectionContent(sections, 'detectado')
    const declaredEstado = sectionContent(sections, 'estado')
    const declaredLifecycle = declaredEstado ? declaredEstado.split('\n')[0].trim().toLowerCase() : null
    const summary = sectionContent(sections, 'síntoma', 'sintoma')
    const severity = statusField(status.fields, 'Severidad', 'Severity') ?? null

    base = {
      id: id ?? filename.replace(/\.md$/, ''),
      kind,
      title,
      path: relativePath,
      lifecycle: folderLifecycle,
      declaredLifecycle: declaredLifecycle || null,
      priority: null,
      impact: null,
      effort: null,
      type: null,
      rank: null,
      executionProfile: null,
      uiImpact: null,
      backendImpact: null,
      domain: null,
      blockedBy: [],
      branch: null,
      filesOwned: extractOwnedPaths(sectionContent(sections, 'archivos afectados', 'archivos')),
      dependsOn: [],
      blocks: [],
      relatedIds,
      parentEpic: null,
      environment: environment ? truncate(environment, 120) : null,
      detectedAt: extractFirstDate(detectedRaw) ?? (detectedRaw ? truncate(detectedRaw.split('\n')[0], 80) : null),
      resolvedAt:
        folderLifecycle === 'resolved'
          ? extractFirstDate(
              sectionContent(sections, 'resuelto', 'resolución', 'resolucion', 'solución aplicada', 'solucion aplicada')
            )
          : null,
      severity,
      rootCause: (() => {
        const raw = sectionContent(sections, 'causa raíz', 'causa raiz')

        return raw ? truncate(raw) : null
      })(),
      parseWarnings,
      summary: summary ? truncate(summary) : null,
      why: null,
      goalPreview: sectionContent(sections, 'solución', 'solucion', 'solución propuesta', 'solucion propuesta')
        ? truncate(
            sectionContent(sections, 'solución', 'solucion', 'solución propuesta', 'solucion propuesta') as string
          )
        : null
    }

    return { base, signals: buildSignals() }
  }

  // --- epic / task / mini_task: Status block driven ---
  const fields = status.fields
  const declaredLifecycle = normalizeDeclaredLifecycle(statusField(fields, 'Lifecycle'))

  if (!status.hasStatus) parseWarnings.push('Falta el bloque ## Status')

  if (declaredLifecycle && folderLifecycle !== 'unknown' && declaredLifecycle !== folderLifecycle) {
    parseWarnings.push(`Lifecycle declarado "${declaredLifecycle}" ≠ folder "${folderLifecycle}"`)
  }

  const parentEpic = (() => {
    if (kind === 'epic') return null

    const epicField = statusField(fields, 'Epic', 'Parent epic')

    if (!epicField) return null

    const normalizedEpic = epicField.trim().toLowerCase()

    if (normalizedEpic === 'none' || normalizedEpic === 'n/a') return null

    return epicField.match(/EPIC-\d{3,}/)?.[0] ?? null
  })()

  const whyKey = kind === 'epic' ? 'why this epic exists' : kind === 'task' ? 'why this task exists' : 'why mini'
  const goalKey = kind === 'epic' ? 'outcome' : kind === 'task' ? 'goal' : 'proposed change'

  const dependsOnSection = sections.get('dependencies & impact')?.content ?? null

  const dependsOn = extractIdsFrom(
    // Tasks/epics declaran depends-on dentro de `## Dependencies & Impact` → `### Depends on`.
    extractSubSection(dependsOnSection, 'depends on') ?? extractSubSection(dependsOnSection, 'depende de')
  ).filter(other => other !== id)

  const blocks = extractIdsFrom(
    extractSubSection(dependsOnSection, 'blocks / impacts') ??
      extractSubSection(dependsOnSection, 'blocks') ??
      extractSubSection(dependsOnSection, 'impacta a')
  ).filter(other => other !== id)

  const filesOwned = extractOwnedPaths(
    extractSubSection(dependsOnSection, 'files owned') ?? extractSubSection(dependsOnSection, 'archivos owned')
  )

  const summary = sectionContent(sections, 'summary', 'resumen')
  const why = sectionContent(sections, whyKey)
  const goalPreview = sectionContent(sections, goalKey)

  base = {
    id: id ?? filename.replace(/\.md$/, ''),
    kind,
    title,
    path: relativePath,
    lifecycle: folderLifecycle,
    declaredLifecycle,
    priority: statusField(fields, 'Priority'),
    impact: statusField(fields, 'Impact'),
    effort: statusField(fields, 'Effort'),
    type: statusField(fields, 'Type')?.toLowerCase() ?? null,
    rank: statusField(fields, 'Rank'),
    executionProfile: statusField(fields, 'Execution profile')?.toLowerCase() ?? null,
    uiImpact: statusField(fields, 'UI impact')?.toLowerCase() ?? null,
    backendImpact: statusField(fields, 'Backend impact')?.toLowerCase() ?? null,
    domain: statusField(fields, 'Domain')?.toLowerCase() ?? null,
    blockedBy: idListFromField(statusField(fields, 'Blocked by')),
    branch: statusField(fields, 'Branch'),
    filesOwned,
    dependsOn,
    blocks,
    relatedIds,
    parentEpic,
    environment: null,
    detectedAt: null,
    resolvedAt: null,
    severity: null,
    rootCause: null,
    parseWarnings,
    summary: summary ? truncate(summary) : null,
    why: why ? truncate(why) : null,
    goalPreview: goalPreview ? truncate(goalPreview) : null
  }

  return { base, signals: buildSignals() }

  function buildSignals(): WorkItemParseSignals {
    return {
      kind,
      filename,
      hasStatus: status.hasStatus,
      statusFieldKeys,
      sectionKeys,
      folderLifecycle,
      declaredLifecycle:
        kind === 'issue' ? base.declaredLifecycle : normalizeDeclaredLifecycle(statusField(status.fields, 'Lifecycle')),
      hasCanonicalFilename,
      hasTemplateShape
    }
  }
}

/** Extrae el contenido de un `### Sub-header` dentro del bloque de una sección H2. */
const extractSubSection = (content: string | null, header: string): string | null => {
  if (!content) return null

  const matches = Array.from(content.matchAll(/^###\s+(.+?)\s*$/gm))
  const wanted = deburr(header.toLowerCase())

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]

    if (deburr(match[1].trim().toLowerCase()) === wanted) {
      const start = (match.index ?? 0) + match[0].length
      const end = matches[index + 1]?.index ?? content.length

      return content.slice(start, end).trim()
    }
  }

  return null
}
