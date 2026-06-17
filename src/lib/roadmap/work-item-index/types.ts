/**
 * TASK-1152 — Roadmap work item index (Markdown SSOT) — contract types.
 *
 * **Por qué existe**: el backlog operativo de Greenhouse vive como Markdown en
 * `docs/epics/**`, `docs/tasks/**`, `docs/mini-tasks/**` y `docs/issues/**`. Ese
 * Markdown sigue siendo el SOURCE OF TRUTH para agentes. Este módulo construye
 * una proyección DERIVADA, read-only y tolerante a formatos canonical + legacy,
 * para que humanos (y la futura UI de `TASK-1153`) puedan navegar el backlog sin
 * parsear Markdown client-side ni inventar un segundo backlog store.
 *
 * **Reglas duras del contrato** (mirror del invariante de la task):
 * - El reader NUNCA mueve archivos, cambia lifecycle ni reescribe Markdown.
 * - Un work item legacy o incompleto degrada a `health: legacy | needs_grooming`,
 *   NUNCA rompe toda la respuesta.
 * - La relación epic → task se deriva de `Epic: EPIC-###` / `Parent epic`, no de
 *   heurísticas opacas.
 * - Issues son incidentes reactivos; se exponen en el Roadmap pero NO se mezclan
 *   como tasks ejecutables.
 *
 * Este archivo es PURO (sin `server-only`): los tipos los consume el reader
 * server-side y, a futuro, la UI de `TASK-1153`. La lectura de filesystem vive
 * exclusivamente en `reader.ts` / `parser.ts`.
 */

/** Versión estable del contrato. Bumpear a `v2` ante cambio breaking de shape. */
export const ROADMAP_WORK_ITEM_INDEX_CONTRACT_VERSION = 'roadmap-work-item-index.v1' as const

export type RoadmapWorkItemContractVersion = typeof ROADMAP_WORK_ITEM_INDEX_CONTRACT_VERSION

/** Tipo de artefacto operativo. */
export type WorkItemKind = 'epic' | 'task' | 'mini_task' | 'issue'

export const WORK_ITEM_KINDS: readonly WorkItemKind[] = ['epic', 'task', 'mini_task', 'issue']

/**
 * Lifecycle/status canónico unificado cross-kind.
 * - epics/tasks/mini-tasks: `to-do | in-progress | complete`
 * - issues: `open | resolved`
 * - `unknown`: el folder no es reconocible (degradación honesta).
 */
export type WorkItemLifecycle = 'to-do' | 'in-progress' | 'complete' | 'open' | 'resolved' | 'unknown'

export const WORK_ITEM_LIFECYCLES: readonly WorkItemLifecycle[] = [
  'to-do',
  'in-progress',
  'complete',
  'open',
  'resolved',
  'unknown'
]

/**
 * Salud del template, espejo de la clasificación de los linters:
 * - `template`: tasks que pasan `template=1` (filename canónico + Status + ZONE 0-4).
 * - `canonical`: epics/mini-tasks que pasan la forma canónica (filename + Status).
 * - `legacy`: no cumple la forma canónica de su kind.
 * - `unknown`: kind sin linter (issues) o sin forma evaluable.
 */
export type WorkItemTemplateStatus = 'template' | 'canonical' | 'legacy' | 'unknown'

/** Nivel de salud agregado para grooming/priorización. */
export type WorkItemHealthLevel = 'ok' | 'needs_grooming' | 'legacy'

export const WORK_ITEM_HEALTH_LEVELS: readonly WorkItemHealthLevel[] = ['ok', 'needs_grooming', 'legacy']

/** Estado operativo derivado (para vistas de "qué puedo tomar ahora"). */
export type WorkItemReadiness =
  | 'ready_to_execute'
  | 'in_progress'
  | 'blocked'
  | 'needs_triage'
  | 'complete'
  | 'resolved'

export const WORK_ITEM_READINESS_STATES: readonly WorkItemReadiness[] = [
  'ready_to_execute',
  'in_progress',
  'blocked',
  'needs_triage',
  'complete',
  'resolved'
]

/** Salud + readiness del work item (mirror testeado de la semántica de lint). */
export interface WorkItemHealth {
  /** Forma del template/canonical según el linter del kind. */
  templateStatus: WorkItemTemplateStatus
  /** Conteo de findings de severidad `error` (mirror de las reglas del linter). */
  lintErrors: number
  /** Conteo de findings de severidad `warning`. */
  lintWarnings: number
  /** `true` si el item necesita grooming (legacy o con findings abiertos). */
  needsGrooming: boolean
  /** Nivel agregado para chips/filtros. */
  level: WorkItemHealthLevel
  /** Estado operativo derivado. */
  readiness: WorkItemReadiness
  /** Mensajes legibles de las reglas que disparó (no rutas absolutas). */
  findings: string[]
}

/**
 * Proyección compacta de un work item para backlog humano + UI.
 * Todos los campos opcionales degradan a `null`/`[]` cuando el Markdown no los
 * declara o no se pudieron parsear (degradación honesta).
 */
export interface WorkItem {
  // --- identificación ---
  /** ID estable: `EPIC-012`, `TASK-1152`, `MINI-001`, `ISSUE-047`. */
  id: string
  kind: WorkItemKind
  /** Título humano (desde el primer H1 o el filename). */
  title: string
  /** Path RELATIVO al repo (nunca absoluto/local). */
  path: string
  /** Lifecycle canónico unificado. */
  lifecycle: WorkItemLifecycle
  /** Lifecycle declarado en el Markdown (`Status` field o `## Estado`), si existe. */
  declaredLifecycle: string | null

  // --- triage ---
  priority: string | null
  impact: string | null
  effort: string | null
  type: string | null
  rank: string | null

  // --- contratos ---
  executionProfile: string | null
  uiImpact: string | null
  backendImpact: string | null
  domain: string | null

  // --- operación ---
  blockedBy: string[]
  branch: string | null
  filesOwned: string[]
  dependsOn: string[]
  blocks: string[]
  /** Todos los IDs (`EPIC-/TASK-/MINI-/ISSUE-`) referenciados en el body. */
  relatedIds: string[]
  /** Epic padre derivado de `Epic: EPIC-###` / `Parent epic`. */
  parentEpic: string | null

  // --- issue metadata (solo kind=issue, null en el resto) ---
  environment: string | null
  detectedAt: string | null
  resolvedAt: string | null
  severity: string | null
  /** Causa raíz declarada en `## Causa raíz` (solo issues; TASK-1153 inspector). */
  rootCause: string | null

  // --- salud ---
  health: WorkItemHealth
  /** Warnings de parseo (sección ilegible, ID solo por filename, etc.). */
  parseWarnings: string[]

  // --- resumen (recortado para payload liviano) ---
  summary: string | null
  why: string | null
  goalPreview: string | null
}

/** Filtros aceptados por el reader/endpoint (todos opcionales, AND entre ellos). */
export interface WorkItemFilters {
  kind?: WorkItemKind
  lifecycle?: WorkItemLifecycle
  domain?: string
  executionProfile?: string
  uiImpact?: string
  backendImpact?: string
  /** `true` → solo items con `blockedBy` no vacío; `false` → solo sin bloqueo. */
  blocked?: boolean
  health?: WorkItemHealthLevel
  readiness?: WorkItemReadiness
  parentEpic?: string
  /** Búsqueda de texto libre sobre id/title/summary (case-insensitive). */
  search?: string
}

/** Paginación simple. */
export interface WorkItemPagination {
  page: number
  pageSize: number
}

/** Conteos agregados por dimensión (para chips del cockpit). */
export interface WorkItemIndexFacets {
  byKind: Record<WorkItemKind, number>
  byLifecycle: Record<WorkItemLifecycle, number>
  byHealth: Record<WorkItemHealthLevel, number>
}

/** Respuesta canónica del reader/endpoint. */
export interface WorkItemIndexResponse {
  contractVersion: RoadmapWorkItemContractVersion
  items: WorkItem[]
  /** Total que matchea los filtros (antes de paginar). */
  total: number
  page: number
  pageSize: number
  /** Conteos del universo completo (sin filtros), para el cockpit. */
  facets: WorkItemIndexFacets
  /** Cantidad de archivos que el reader no pudo leer del todo (degradados). */
  degradedItemCount: number
  /** ISO timestamp del momento en que se construyó el índice. */
  generatedAt: string
}
