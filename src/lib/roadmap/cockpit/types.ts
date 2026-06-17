/**
 * TASK-1153 — View model del cockpit de Roadmap (puro, client-safe).
 *
 * Proyección del índice read-only de TASK-1152 al modelo que consume la UI:
 * cada work item ya trae su lane derivada + los campos que la card y el inspector
 * necesitan. El Markdown sigue siendo SSOT; esto es solo presentación.
 */
import type {
  WorkItemHealthLevel,
  WorkItemKind,
  WorkItemReadiness
} from '@/lib/roadmap/work-item-index/types'

/** Las 7 lanes canónicas del board, en orden de lectura operativa. */
export type RoadmapLaneId =
  | 'programs'
  | 'ready'
  | 'blocked'
  | 'issues'
  | 'grooming'
  | 'progress'
  | 'done'

export const ROADMAP_LANE_ORDER: readonly RoadmapLaneId[] = [
  'programs',
  'ready',
  'blocked',
  'issues',
  'grooming',
  'progress',
  'done'
]

/** Prioridad normalizada (P0..P3) o null si el front-matter no la declara. */
export type RoadmapPriority = 'P0' | 'P1' | 'P2' | 'P3' | null

/** Item proyectado para card + inspector. */
export interface RoadmapWorkItemVM {
  id: string
  kind: WorkItemKind
  lane: RoadmapLaneId
  title: string
  priority: RoadmapPriority
  /** Dominios (split por `|`). */
  domains: string[]
  healthLevel: WorkItemHealthLevel
  readiness: WorkItemReadiness
  summary: string | null
  why: string | null
  rootCause: string | null
  environment: string | null
  blockedBy: string[]
  dependsOn: string[]
  related: string[]
  filesOwned: string[]
  parentEpic: string | null
  path: string
  /** Findings de salud (warnings de grooming) que el inspector lista. */
  findings: string[]
  /** Texto de meta de la card ("Sin bloqueos", "producción", "3 tasks vinculadas"). */
  meta: string
  /** Solo las tasks ejecutables muestran el comando `/implement-task`. */
  isExecutableTask: boolean
}

/** Contrato del payload del cockpit (versión estable). */
export const ROADMAP_COCKPIT_CONTRACT_VERSION = 'roadmap-cockpit.v1' as const

export interface RoadmapCockpitData {
  contractVersion: typeof ROADMAP_COCKPIT_CONTRACT_VERSION
  /** Backlog activo + muestra reciente de resueltas (filtrable client-side). */
  items: RoadmapWorkItemVM[]
  /** Dominios únicos presentes (para el filtro). */
  domains: string[]
  /** Items que el parser degradó (van a «Necesitan grooming»). */
  degradedCount: number
  /** ISO timestamp de cuándo se construyó el índice. */
  generatedAt: string
}
