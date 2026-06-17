import 'server-only'

/**
 * TASK-1152 — Roadmap work item index reader (server-side).
 *
 * Walk de `docs/{epics,tasks,mini-tasks,issues}/**` → parse + clasificación de
 * salud → índice tipado `roadmap-work-item-index.v1`, read-only y cacheado por
 * fingerprint. NUNCA muta archivos, lifecycle ni Markdown (invariante de la task).
 *
 * Filesystem en runtime: en Vercel los `docs/**` se bundlean vía
 * `outputFileTracingIncludes` (ver `next.config.ts`). El root se resuelve con
 * `process.cwd()`.
 */
import type { Dirent } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

import {
  type CachedWorkItemIndex,
  readCachedWorkItemIndex,
  writeCachedWorkItemIndex
} from './cache'
import { classifyHealth } from './health'
import { parseWorkItem } from './parser'
import {
  ROADMAP_WORK_ITEM_INDEX_CONTRACT_VERSION,
  WORK_ITEM_HEALTH_LEVELS,
  WORK_ITEM_KINDS,
  WORK_ITEM_LIFECYCLES,
  type WorkItem,
  type WorkItemFilters,
  type WorkItemHealthLevel,
  type WorkItemIndexFacets,
  type WorkItemIndexResponse,
  type WorkItemKind,
  type WorkItemLifecycle,
  type WorkItemPagination
} from './types'

interface KindSource {
  kind: WorkItemKind
  /** Carpeta bajo `docs/`. */
  docsDir: string
  /** Prefijo del filename canónico. */
  filePrefix: string
}

const KIND_SOURCES: readonly KindSource[] = [
  { kind: 'epic', docsDir: 'epics', filePrefix: 'EPIC-' },
  { kind: 'task', docsDir: 'tasks', filePrefix: 'TASK-' },
  { kind: 'mini_task', docsDir: 'mini-tasks', filePrefix: 'MINI-' },
  { kind: 'issue', docsDir: 'issues', filePrefix: 'ISSUE-' }
]

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 500

const resolveRepoRoot = (): string => process.cwd()

interface DiscoveredFile {
  kind: WorkItemKind
  absolutePath: string
  mtimeMs: number
  size: number
}

/** Recorre recursivamente un directorio devolviendo los `.md` que matchean el prefijo. */
const walkKindDir = async (root: string, source: KindSource): Promise<DiscoveredFile[]> => {
  const baseDir = join(root, 'docs', source.docsDir)
  const out: DiscoveredFile[] = []

  const walk = async (dir: string): Promise<void> => {
    let entries: Dirent[]

    try {
      entries = await readdir(dir, { withFileTypes: true, encoding: 'utf8' })
    } catch {
      // Directorio inexistente (kind sin artefactos aún) → degradación honesta.
      return
    }

    for (const entry of entries) {
      const absolute = join(dir, entry.name)

      if (entry.isDirectory()) {
        await walk(absolute)
        continue
      }

      if (!entry.name.endsWith('.md')) continue
      if (!entry.name.startsWith(source.filePrefix)) continue

      try {
        const stats = await stat(absolute)

        out.push({ kind: source.kind, absolutePath: absolute, mtimeMs: stats.mtimeMs, size: stats.size })
      } catch {
        // Archivo desaparecido entre readdir y stat → ignorar.
      }
    }
  }

  await walk(baseDir)

  return out
}

const discoverFiles = async (root: string): Promise<DiscoveredFile[]> => {
  const perKind = await Promise.all(KIND_SOURCES.map(source => walkKindDir(root, source)))

  return perKind.flat().sort((a, b) => a.absolutePath.localeCompare(b.absolutePath))
}

/** Fingerprint barato: count + Σ(mtimeMs+size). Estable, sin leer contenido. */
const fingerprintFiles = (files: DiscoveredFile[]): string => {
  let acc = 0

  for (const file of files) {
    // Bitwise-safe accumulation sobre números grandes evitando precisión float.
    acc = (acc + Math.round(file.mtimeMs) + file.size) % Number.MAX_SAFE_INTEGER
  }

  return `${files.length}:${acc}`
}

const buildDegradedItem = (file: DiscoveredFile, root: string): WorkItem => {
  const relativePath = file.absolutePath.startsWith(root)
    ? file.absolutePath.slice(root.length).replace(/^[\\/]+/, '').split('\\').join('/')
    : file.absolutePath.split('\\').join('/')

  const filename = file.absolutePath.split(/[\\/]/).pop() ?? file.absolutePath
  const id = filename.replace(/\.md$/, '')

  return {
    id,
    kind: file.kind,
    title: id,
    path: relativePath,
    lifecycle: 'unknown',
    declaredLifecycle: null,
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
    filesOwned: [],
    dependsOn: [],
    blocks: [],
    relatedIds: [],
    parentEpic: null,
    environment: null,
    detectedAt: null,
    resolvedAt: null,
    severity: null,
    rootCause: null,
    health: {
      templateStatus: 'unknown',
      lintErrors: 0,
      lintWarnings: 1,
      needsGrooming: true,
      level: 'needs_grooming',
      readiness: 'needs_triage',
      findings: ['No se pudo leer el archivo; metadata mínima desde el filename.']
    },
    parseWarnings: ['unreadable_file'],
    summary: null,
    why: null,
    goalPreview: null
  }
}

const buildItem = async (file: DiscoveredFile, root: string): Promise<WorkItem> => {
  let source: string

  try {
    source = await readFile(file.absolutePath, 'utf8')
  } catch {
    return buildDegradedItem(file, root)
  }

  const { base, signals } = parseWorkItem({
    kind: file.kind,
    filePath: file.absolutePath,
    repoRoot: root,
    source
  })

  return { ...base, health: classifyHealth(base, signals) }
}

/**
 * Construye (o reusa del cache) el índice completo de work items.
 * Devuelve los items sin filtrar (el filtrado/paginado vive aparte).
 */
const buildIndex = async (): Promise<CachedWorkItemIndex> => {
  const root = resolveRepoRoot()
  const files = await discoverFiles(root)
  const fingerprint = fingerprintFiles(files)

  const cachedIndex = readCachedWorkItemIndex()

  if (cachedIndex && cachedIndex.fingerprint === fingerprint) return cachedIndex

  const items = await Promise.all(files.map(file => buildItem(file, root)))

  const next: CachedWorkItemIndex = {
    fingerprint,
    items,
    generatedAt: new Date().toISOString()
  }

  writeCachedWorkItemIndex(next)

  return next
}

const emptyKindRecord = (): Record<WorkItemKind, number> => ({ epic: 0, task: 0, mini_task: 0, issue: 0 })

const emptyLifecycleRecord = (): Record<WorkItemLifecycle, number> =>
  WORK_ITEM_LIFECYCLES.reduce(
    (acc, key) => {
      acc[key] = 0

      return acc
    },
    {} as Record<WorkItemLifecycle, number>
  )

const emptyHealthRecord = (): Record<WorkItemHealthLevel, number> =>
  WORK_ITEM_HEALTH_LEVELS.reduce(
    (acc, key) => {
      acc[key] = 0

      return acc
    },
    {} as Record<WorkItemHealthLevel, number>
  )

const computeFacets = (items: WorkItem[]): WorkItemIndexFacets => {
  const byKind = emptyKindRecord()
  const byLifecycle = emptyLifecycleRecord()
  const byHealth = emptyHealthRecord()

  for (const item of items) {
    byKind[item.kind] += 1
    byLifecycle[item.lifecycle] += 1
    byHealth[item.health.level] += 1
  }

  return { byKind, byLifecycle, byHealth }
}

const matchesFilters = (item: WorkItem, filters: WorkItemFilters): boolean => {
  if (filters.kind && item.kind !== filters.kind) return false
  if (filters.lifecycle && item.lifecycle !== filters.lifecycle) return false
  if (filters.domain && (item.domain ?? '').toLowerCase() !== filters.domain.toLowerCase()) return false
  if (filters.executionProfile && (item.executionProfile ?? '') !== filters.executionProfile.toLowerCase()) return false
  if (filters.uiImpact && (item.uiImpact ?? '') !== filters.uiImpact.toLowerCase()) return false
  if (filters.backendImpact && (item.backendImpact ?? '') !== filters.backendImpact.toLowerCase()) return false
  if (filters.health && item.health.level !== filters.health) return false
  if (filters.readiness && item.health.readiness !== filters.readiness) return false
  if (filters.parentEpic && (item.parentEpic ?? '') !== filters.parentEpic) return false

  if (typeof filters.blocked === 'boolean') {
    const isBlocked = item.blockedBy.length > 0

    if (filters.blocked !== isBlocked) return false
  }

  if (filters.search) {
    const needle = filters.search.toLowerCase()
    const haystack = `${item.id} ${item.title} ${item.summary ?? ''}`.toLowerCase()

    if (!haystack.includes(needle)) return false
  }

  return true
}

/**
 * API canónica del reader: índice tipado, filtrado + paginado, con facets del
 * universo completo (sin filtros) para el cockpit.
 */
export const getWorkItemIndex = async (
  filters: WorkItemFilters = {},
  pagination: Partial<WorkItemPagination> = {}
): Promise<WorkItemIndexResponse> => {
  const { items, generatedAt } = await buildIndex()

  const page = Math.max(1, Math.trunc(pagination.page ?? 1))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(pagination.pageSize ?? DEFAULT_PAGE_SIZE)))

  const facets = computeFacets(items)
  const degradedItemCount = items.filter(item => item.parseWarnings.includes('unreadable_file')).length

  const filtered = items.filter(item => matchesFilters(item, filters))
  const total = filtered.length

  const start = (page - 1) * pageSize
  const pageItems = filtered.slice(start, start + pageSize)

  return {
    contractVersion: ROADMAP_WORK_ITEM_INDEX_CONTRACT_VERSION,
    items: pageItems,
    total,
    page,
    pageSize,
    facets,
    degradedItemCount,
    generatedAt
  }
}

/**
 * Devuelve el índice COMPLETO sin paginar — para consumidores server-side que
 * necesitan el universo (ej. el cockpit de TASK-1153, que agrupa todo el backlog
 * en lanes). Read-only; reusa el cache por fingerprint.
 */
export const getAllWorkItems = async (): Promise<{
  items: WorkItem[]
  generatedAt: string
  degradedItemCount: number
}> => {
  const { items, generatedAt } = await buildIndex()
  const degradedItemCount = items.filter(item => item.parseWarnings.includes('unreadable_file')).length

  return { items, generatedAt, degradedItemCount }
}

/**
 * Markdown crudo de un work item por su ID canónico (ej. `TASK-1153`).
 *
 * Resuelve el path SIEMPRE desde el índice construido del filesystem (paths
 * confiables); el `id` del cliente solo se usa para un `find` exacto contra ese
 * índice — NUNCA se compone un path con input del cliente (cero path traversal).
 * Devuelve `null` cuando el id no existe o el archivo no es legible (anti-oracle:
 * el route lo mapea a 404, sin filtrar existencia). Read-only; reusa el cache.
 */
export const getWorkItemMarkdownById = async (
  id: string
): Promise<{ id: string; kind: WorkItemKind; title: string; path: string; content: string } | null> => {
  const trimmed = id.trim()

  if (!trimmed) return null

  const { items } = await buildIndex()
  const item = items.find(candidate => candidate.id === trimmed)

  if (!item) return null

  const root = resolveRepoRoot()
  const absolute = join(root, ...item.path.split('/'))

  try {
    const content = await readFile(absolute, 'utf8')

    return { id: item.id, kind: item.kind, title: item.title, path: item.path, content }
  } catch {
    // Archivo desaparecido entre el index y la lectura → degradación honesta.
    return null
  }
}

/** Helpers de validación de query params (para el route). */
export const isWorkItemKind = (value: string): value is WorkItemKind =>
  (WORK_ITEM_KINDS as readonly string[]).includes(value)

export const isWorkItemLifecycle = (value: string): value is WorkItemLifecycle =>
  (WORK_ITEM_LIFECYCLES as readonly string[]).includes(value)

export const isWorkItemHealthLevel = (value: string): value is WorkItemHealthLevel =>
  (WORK_ITEM_HEALTH_LEVELS as readonly string[]).includes(value)
