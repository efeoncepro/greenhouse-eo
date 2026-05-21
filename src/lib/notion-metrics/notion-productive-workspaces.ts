/**
 * TASK-912 — Resolver canonical de workspace productivo desde un Notion ID.
 *
 * La suscripción webhook Notion productiva es ÚNICA y AMPLIA (cubre todos los
 * teamspaces). El pipeline de captura productivo solo debe procesar tareas de
 * Efeonce + Sky; NUNCA el demo (`36339c2f-…`, tiene su propio endpoint
 * `/notion-tasks-demo` + tabla separada) ni otros teamspaces.
 *
 * **Resolución autoritativa**: el `data_source_id` del `parent` de la página
 * re-fetcheada (read version 2026-03-11). El handler hace un best-effort drop
 * del demo con el `parent.id` del webhook (shape no garantizado); el CONSUMER es
 * autoritativo leyendo `parent.data_source_id` del GET de la página.
 *
 * IDs verificados vía Notion fetch 2026-05-21 (ver TASK-912 §"Inventario de
 * schemas Notion"). Normalización dashless + lowercase para tolerar ambos
 * formatos (con/sin guiones) que Notion puede reportar.
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-912-ico-status-transition-webhook-ingestion-and-bq-formula.md
 * - Demo sibling: src/lib/notion-metrics/notion-demo-client.ts (DEMO_STATUS_PROPERTY_NAMES)
 */

export type ProductiveWorkspace = 'efeonce' | 'sky'

/** Data source IDs canónicos de las DB `Tareas` productivas (verificado 2026-05-21). */
export const PRODUCTIVE_TAREAS_DATA_SOURCE_IDS = {
  efeonce: '5126d7d8-bf3f-454c-80f4-be31d1ca38d4',
  sky: '23039c2f-efe7-81f8-af2d-000b67594d18'
} as const

/** Data source ID de la DB `Tareas` del teamspace demo (NUNCA productivo). */
export const DEMO_TAREAS_DATA_SOURCE_ID = '36339c2f-efe7-81a6-980c-000b0056bba8'

const normalize = (id: string): string => id.replace(/-/g, '').trim().toLowerCase()

const WORKSPACE_BY_NORMALIZED_ID = new Map<string, ProductiveWorkspace>([
  [normalize(PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.efeonce), 'efeonce'],
  [normalize(PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.sky), 'sky']
])

const DEMO_NORMALIZED_ID = normalize(DEMO_TAREAS_DATA_SOURCE_ID)

/**
 * Resuelve el workspace productivo (`efeonce` | `sky`) desde un Notion data
 * source / parent id. Retorna `null` si el id no corresponde a un teamspace
 * productivo (incluye el demo y cualquier otro teamspace de la suscripción
 * amplia) — el consumer debe SKIP en ese caso (no persistir).
 */
export const resolveProductiveWorkspace = (notionId?: string | null): ProductiveWorkspace | null => {
  if (!notionId || typeof notionId !== 'string') {
    return null
  }

  return WORKSPACE_BY_NORMALIZED_ID.get(normalize(notionId)) ?? null
}

/**
 * Predicate: ¿el id corresponde al data source de Tareas del teamspace demo?
 * Usado por el handler productivo para descartar (best-effort) events del demo
 * que la suscripción amplia entregue — el demo tiene su propio endpoint.
 */
export const isDemoTareasDataSource = (notionId?: string | null): boolean => {
  if (!notionId || typeof notionId !== 'string') {
    return false
  }

  return normalize(notionId) === DEMO_NORMALIZED_ID
}
