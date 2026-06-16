import 'server-only'

/**
 * TASK-1153 — Projection server-side del cockpit de Roadmap.
 *
 * Consume el reader read-only de TASK-1152 (`getAllWorkItems`) y arma el view
 * model del cockpit: cada work item con su lane, prioridad normalizada, meta y
 * los campos que la card + el inspector necesitan. NO muta archivos ni Markdown.
 *
 * Scope del dataset: el backlog ACTIVO (to-do · in-progress · open) completo +
 * una muestra reciente de resueltas (complete · resolved) para la lane «Resueltas
 * hace poco». Las cientos de tasks completas históricas NO inundan el cockpit.
 */
import { getAllWorkItems } from '@/lib/roadmap/work-item-index/reader'
import type { WorkItem } from '@/lib/roadmap/work-item-index/types'

import { assignLane, normalizePriority } from './lanes'
import {
  ROADMAP_COCKPIT_CONTRACT_VERSION,
  type RoadmapCockpitData,
  type RoadmapLaneId,
  type RoadmapWorkItemVM
} from './types'

/** Cuántas resueltas recientes mostrar en la lane «done». */
const DONE_SAMPLE_LIMIT = 24

const splitDomains = (domain: string | null): string[] => {
  if (!domain) return []

  return domain
    .split(/[|,]/)
    .map(part => part.trim())
    .filter(Boolean)
}

const numericId = (id: string): number => Number(id.match(/-(\d+)/)?.[1] ?? 0)

/** Meta legible de la card según su lane/kind (texto; el icono lo decide la UI). */
const buildMeta = (item: WorkItem, lane: RoadmapLaneId, childCount: number): string => {
  if (item.kind === 'epic') {
    if (childCount > 0) return childCount === 1 ? '1 task vinculada' : `${childCount} tasks vinculadas`

    return 'Programa'
  }

  if (item.kind === 'issue') {
    return item.environment ?? 'Incidente'
  }

  if (lane === 'blocked' && item.blockedBy.length > 0) return `Bloqueada por ${item.blockedBy[0]}`
  if (lane === 'progress') return 'En progreso'

  if (lane === 'grooming') {
    const n = item.health.findings.length

    return n === 1 ? '1 warning de parseo' : `${n} warnings de parseo`
  }

  if (lane === 'done') return item.lifecycle === 'resolved' ? 'Resuelto' : 'Completada'

  return 'Sin bloqueos'
}

const toViewModel = (item: WorkItem, lane: RoadmapLaneId, childCount: number): RoadmapWorkItemVM => ({
  id: item.id,
  kind: item.kind,
  lane,
  title: item.title.replace(/^(?:EPIC|TASK|MINI|ISSUE)-\d+(?:\.\d+)?\s*[—-]\s*/i, '').trim() || item.title,
  priority: normalizePriority(item.priority),
  domains: splitDomains(item.domain),
  healthLevel: item.health.level,
  readiness: item.health.readiness,
  summary: item.summary,
  why: item.why,
  rootCause: item.rootCause,
  environment: item.environment,
  blockedBy: item.blockedBy,
  dependsOn: item.dependsOn,
  related: item.relatedIds,
  filesOwned: item.filesOwned,
  parentEpic: item.parentEpic,
  path: item.path,
  findings: item.health.findings,
  meta: buildMeta(item, lane, childCount),
  // El comando /implement-task solo aplica a `task` (no epic/issue/mini-task).
  isExecutableTask: item.kind === 'task'
})

/**
 * Construye el payload del cockpit. Read-only, cacheado por el reader (fingerprint
 * mtime/size). El filtrado/segmentación interactivo lo hace el cliente sobre `items`.
 */
export const buildRoadmapCockpitData = async (): Promise<RoadmapCockpitData> => {
  const { items: all, generatedAt, degradedItemCount } = await getAllWorkItems()

  // Conteo de children por epic (sobre el universo completo, no solo activos).
  const childCountByEpic = new Map<string, number>()

  for (const item of all) {
    if (item.parentEpic) {
      childCountByEpic.set(item.parentEpic, (childCountByEpic.get(item.parentEpic) ?? 0) + 1)
    }
  }

  const active: WorkItem[] = []
  const done: WorkItem[] = []

  for (const item of all) {
    const lane = assignLane(item)

    if (lane === 'done') done.push(item)
    else active.push(item)
  }

  // Muestra reciente de resueltas (id descendente ≈ más reciente).
  const doneSample = [...done].sort((a, b) => numericId(b.id) - numericId(a.id)).slice(0, DONE_SAMPLE_LIMIT)

  const selected = [...active, ...doneSample]

  const items = selected.map(item =>
    toViewModel(item, assignLane(item), item.kind === 'epic' ? (childCountByEpic.get(item.id) ?? 0) : 0)
  )

  const domains = Array.from(new Set(items.flatMap(item => item.domains))).sort((a, b) => a.localeCompare(b))

  // Solo cuentan como «degradados» los del backlog activo (los que el operador groomea).
  const degradedCount = active.filter(item => item.parseWarnings.length > 0).length || degradedItemCount

  return {
    contractVersion: ROADMAP_COCKPIT_CONTRACT_VERSION,
    items,
    domains,
    degradedCount,
    generatedAt
  }
}
