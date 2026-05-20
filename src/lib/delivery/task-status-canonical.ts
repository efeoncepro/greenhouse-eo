/**
 * Canonical task status vocabulary (TASK-908 foundation prep, 2026-05-18)
 * ========================================================================
 *
 * **NOT server-only**: this module exports constants + pure helpers that are
 * safe on both server and client. Client UI components consume the alias map
 * to derive display colors/labels. Server consumers additionally use the SQL
 * builders (`taskStatusGroupSql`, `taskStatusSql`, `buildTaskStatusToCscPhaseSql`)
 * to embed canonical lists in BQ/PG queries.
 *
 *
 * **Single source of truth para los 11 estados canonical V1** del lifecycle de
 * tareas Greenhouse cross-tenant, más el normalizer canonical que acepta
 * variantes legacy (Efeonce pre-rename, Sky pre-rename, variantes BQ históricas).
 *
 * Por qué existe este módulo:
 * - Antes: 19 archivos × ~50 callsites con literales hardcodeados de status
 *   ("Cambios Solicitados", "Listo para diseñar", "Detenido", etc.). Cada
 *   rename de Notion rompía silenciosamente N callsites (no error, métricas
 *   incorrectas).
 * - Ahora: 1 single source of truth. Renames de Notion son transparentes vía
 *   el alias map. Lint-able mediante una rule futura `no-inline-task-status`.
 *
 * Plan A canonical (2026-05-18). Plan B (canonical `status_code` enum column
 * persistido en PG al boundary del sync) llega con TASK-908 y este módulo se
 * vuelve la capa de view-presentation puro (label) + el `status_code` toma
 * el rol de match canonical para business logic.
 *
 * **⚠️ Reglas duras**:
 * - **NUNCA** hardcodear un literal de status en TS/SQL/BQ. Usar siempre las
 *   constantes `TASK_STATUS_CANONICAL.*` o los grupos `TASK_STATUS_GROUPS.*`.
 * - **NUNCA** comparar status con `===` contra un nombre canonical sin
 *   normalizar el lado raw antes (`isCanonicalStatus(raw, canonical)` o
 *   `isCanonicalStatusInGroup(raw, group)`). Pre-rename data tiene variantes.
 * - **NUNCA** modificar `TASK_STATUS_ALIASES` para REMOVER un legacy alias
 *   sin verificar que BQ/PG no tiene rows residuales con ese nombre.
 * - **SIEMPRE** que emerja un cliente nuevo con custom status names, NO
 *   agregar aliases. Enforce canonical template L1 en Notion antes del
 *   onboarding (eso es lo escalable).
 */

// ── Canonical V1 (11 estados) ───────────────────────────────────────────────

export const TASK_STATUS_CANONICAL = {
  SIN_EMPEZAR: 'Sin empezar',
  BRIEF_LISTO: 'Brief listo',
  PENDIENTE_APROBACION_INTERNA: 'Pendiente aprobación interna',
  EN_PAUSA: 'En pausa',
  BLOQUEADO: 'Bloqueado',
  EN_CURSO: 'En curso',
  LISTO_PARA_REVISION: 'Listo para revisión',
  CAMBIOS_SOLICITADOS: 'Cambios solicitados',
  APROBADO: 'Aprobado',
  CANCELADO: 'Cancelado',
  ARCHIVADO: 'Archivado'
} as const

export type TaskStatusCanonical = (typeof TASK_STATUS_CANONICAL)[keyof typeof TASK_STATUS_CANONICAL]

export const ALL_CANONICAL_STATUSES: readonly TaskStatusCanonical[] = Object.values(TASK_STATUS_CANONICAL)

// ── Aliases (legacy variantes → canonical) ──────────────────────────────────

/**
 * Map de cualquier variante conocida (legacy + canonical + observada en BQ)
 * → canonical V1.
 *
 * Categorías:
 * 1. Canonical self-maps (los 11 V1 → sí mismos).
 * 2. Efeonce legacy (pre-rename → canonical). Se borran cuando 0% rows en BQ
 *    tengan el nombre viejo + se ejecute TASK-908 (canonical status_code enum).
 * 3. Sky legacy (pre-2026-05-18 rename → canonical). Migrados pero pueden
 *    quedar rows residuales en BQ pre-cleanup.
 * 4. English / accent-less variantes observadas en BQ históricas.
 */
export const TASK_STATUS_ALIASES: Readonly<Record<string, TaskStatusCanonical>> = Object.freeze({
  // 1. Canonical V1 self-maps
  'Sin empezar': TASK_STATUS_CANONICAL.SIN_EMPEZAR,
  'Brief listo': TASK_STATUS_CANONICAL.BRIEF_LISTO,
  'Pendiente aprobación interna': TASK_STATUS_CANONICAL.PENDIENTE_APROBACION_INTERNA,
  'En pausa': TASK_STATUS_CANONICAL.EN_PAUSA,
  Bloqueado: TASK_STATUS_CANONICAL.BLOQUEADO,
  'En curso': TASK_STATUS_CANONICAL.EN_CURSO,
  'Listo para revisión': TASK_STATUS_CANONICAL.LISTO_PARA_REVISION,
  'Cambios solicitados': TASK_STATUS_CANONICAL.CAMBIOS_SOLICITADOS,
  Aprobado: TASK_STATUS_CANONICAL.APROBADO,
  Cancelado: TASK_STATUS_CANONICAL.CANCELADO,
  Archivado: TASK_STATUS_CANONICAL.ARCHIVADO,

  // 2. Efeonce legacy → canonical (pre-rename window)
  'Listo para diseñar': TASK_STATUS_CANONICAL.BRIEF_LISTO,
  'Pendiente Dir. Arte': TASK_STATUS_CANONICAL.PENDIENTE_APROBACION_INTERNA,
  Detenido: TASK_STATUS_CANONICAL.EN_PAUSA,
  'Cambios Solicitados': TASK_STATUS_CANONICAL.CAMBIOS_SOLICITADOS, // S mayúscula
  Listo: TASK_STATUS_CANONICAL.APROBADO,
  Cancelada: TASK_STATUS_CANONICAL.CANCELADO,
  Archivadas: TASK_STATUS_CANONICAL.ARCHIVADO,
  Archivada: TASK_STATUS_CANONICAL.ARCHIVADO,

  // 3. Sky legacy → canonical (post-2026-05-18 rename, residuos BQ posibles)
  Tomado: TASK_STATUS_CANONICAL.BRIEF_LISTO,
  Pendiente: TASK_STATUS_CANONICAL.PENDIENTE_APROBACION_INTERNA,
  'En feedback': TASK_STATUS_CANONICAL.CAMBIOS_SOLICITADOS,
  'En Feedback': TASK_STATUS_CANONICAL.CAMBIOS_SOLICITADOS,

  // 4. English / accent-less / observed BQ variants
  Done: TASK_STATUS_CANONICAL.APROBADO,
  Finalizado: TASK_STATUS_CANONICAL.APROBADO,
  Completado: TASK_STATUS_CANONICAL.APROBADO,
  Cancelled: TASK_STATUS_CANONICAL.CANCELADO,
  Canceled: TASK_STATUS_CANONICAL.CANCELADO,
  'Listo para revision': TASK_STATUS_CANONICAL.LISTO_PARA_REVISION, // sin tilde
  'En Curso': TASK_STATUS_CANONICAL.EN_CURSO, // capital C
  'Listo para Revision': TASK_STATUS_CANONICAL.LISTO_PARA_REVISION, // capital R sin tilde
  Backlog: TASK_STATUS_CANONICAL.SIN_EMPEZAR // Efeonce variant
})

// ── Semantic groups ─────────────────────────────────────────────────────────

/**
 * Grupos semánticos canonical para consumers downstream.
 *
 * Cada grupo lista SOLO los nombres canonical V1. El helper `taskStatusGroupSql`
 * expande a TODAS las variantes (legacy + canonical) para queries BQ/PG durante
 * el transition window.
 */
export const TASK_STATUS_GROUPS = {
  /** Briefing / pre-execution. Operador conoce el work pero aún no arranca. */
  BRIEFING: [
    TASK_STATUS_CANONICAL.SIN_EMPEZAR,
    TASK_STATUS_CANONICAL.BRIEF_LISTO,
    TASK_STATUS_CANONICAL.PENDIENTE_APROBACION_INTERNA
  ] as readonly TaskStatusCanonical[],

  /** Active work (en ejecución o ciclo cliente). */
  ACTIVE: [
    TASK_STATUS_CANONICAL.EN_CURSO,
    TASK_STATUS_CANONICAL.LISTO_PARA_REVISION,
    TASK_STATUS_CANONICAL.CAMBIOS_SOLICITADOS
  ] as readonly TaskStatusCanonical[],

  /** Stopped / blocked — trabajo detenido. */
  BLOCKED: [
    TASK_STATUS_CANONICAL.BLOQUEADO,
    TASK_STATUS_CANONICAL.EN_PAUSA
  ] as readonly TaskStatusCanonical[],

  /** Completed positively (success). */
  COMPLETED: [TASK_STATUS_CANONICAL.APROBADO] as readonly TaskStatusCanonical[],

  /** Closed but excluded from delivery metrics. */
  EXCLUDED: [
    TASK_STATUS_CANONICAL.CANCELADO,
    TASK_STATUS_CANONICAL.ARCHIVADO
  ] as readonly TaskStatusCanonical[],

  /** Client review queue (esperando feedback del cliente). */
  READY_FOR_REVIEW: [
    TASK_STATUS_CANONICAL.LISTO_PARA_REVISION
  ] as readonly TaskStatusCanonical[],

  /** Client changes requested (the RpA increment trigger). */
  CLIENT_CHANGES: [
    TASK_STATUS_CANONICAL.CAMBIOS_SOLICITADOS
  ] as readonly TaskStatusCanonical[]
} as const

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize any raw status string to canonical V1.
 *
 * Returns:
 * - `null` if input is null/undefined/empty/whitespace
 * - canonical V1 string if input matches a known variant
 * - `null` if input is non-null but doesn't match any known variant (UNKNOWN —
 *   caller decides whether to treat as exclusion or alert)
 *
 * Whitespace-tolerant (trims input). NOT case-insensitive (Notion case is
 * meaningful; legacy variants are pre-mapped with exact case in TASK_STATUS_ALIASES).
 */
export const normalizeTaskStatus = (raw: string | null | undefined): TaskStatusCanonical | null => {
  if (!raw) return null
  const trimmed = raw.trim()

  if (!trimmed) return null

  return TASK_STATUS_ALIASES[trimmed] ?? null
}

/**
 * Check if a raw status (any variant) matches a specific canonical status.
 *
 * `isCanonicalStatus('Cambios Solicitados', 'Cambios solicitados')` → true
 * `isCanonicalStatus('Listo', 'Aprobado')` → true (legacy alias)
 * `isCanonicalStatus(null, 'Aprobado')` → false
 */
export const isCanonicalStatus = (
  raw: string | null | undefined,
  canonical: TaskStatusCanonical
): boolean => normalizeTaskStatus(raw) === canonical

/**
 * Check if a raw status (any variant) belongs to a canonical group.
 *
 * `isCanonicalStatusInGroup('Detenido', TASK_STATUS_GROUPS.BLOCKED)` → true
 * `isCanonicalStatusInGroup('En curso', TASK_STATUS_GROUPS.ACTIVE)` → true
 */
export const isCanonicalStatusInGroup = (
  raw: string | null | undefined,
  group: readonly TaskStatusCanonical[]
): boolean => {
  const normalized = normalizeTaskStatus(raw)

  if (!normalized) return false

  return group.includes(normalized)
}

/**
 * Return ALL known variants (canonical + legacy aliases) for a single canonical
 * status. Useful for building SQL IN clauses that match both old and new data.
 */
export const allVariantsForCanonical = (canonical: TaskStatusCanonical): string[] => {
  const variants = new Set<string>([canonical])

  for (const [alias, target] of Object.entries(TASK_STATUS_ALIASES)) {
    if (target === canonical) variants.add(alias)
  }

  return Array.from(variants)
}

/**
 * Return ALL known variants (canonical + legacy aliases) for a canonical group.
 */
export const allVariantsForGroup = (group: readonly TaskStatusCanonical[]): string[] => {
  const variants = new Set<string>()

  for (const canonical of group) {
    for (const v of allVariantsForCanonical(canonical)) variants.add(v)
  }

  return Array.from(variants)
}

/**
 * Build a SQL `IN (...)` list expression for a canonical group. Includes ALL
 * legacy variants so the query matches data written pre-rename.
 *
 * Example:
 *   const sqlList = taskStatusGroupSql(TASK_STATUS_GROUPS.COMPLETED)
 *   // → "'Aprobado','Listo','Done','Finalizado','Completado'"
 *
 *   `WHERE task_status IN (${taskStatusGroupSql(TASK_STATUS_GROUPS.COMPLETED)})`
 *
 * The output is SQL-string-safe via single-quote escaping. All variants are
 * constants in code (never user input), so SQL injection risk is zero.
 */
export const taskStatusGroupSql = (group: readonly TaskStatusCanonical[]): string => {
  const variants = allVariantsForGroup(group)

  return variants.map(v => `'${v.replace(/'/g, "''")}'`).join(',')
}

/**
 * Build a SQL `IN (...)` list for a single canonical status (with all its
 * legacy aliases).
 */
export const taskStatusSql = (canonical: TaskStatusCanonical): string =>
  taskStatusGroupSql([canonical])

/**
 * Build a CASE WHEN expression that maps any raw status variant to a canonical
 * CSC (Creative Supply Chain) phase code:
 *   - briefing
 *   - en_ejecucion
 *   - cambios_cliente
 *   - aprobado
 *   - bloqueado
 *   - excluido
 *
 * Used in BQ/PG views that materialize the CSC distribution.
 */
export const buildTaskStatusToCscPhaseSql = (column: string): string => {
  const briefingList = taskStatusGroupSql(TASK_STATUS_GROUPS.BRIEFING)
  const blockedList = taskStatusGroupSql(TASK_STATUS_GROUPS.BLOCKED)
  const completedList = taskStatusGroupSql(TASK_STATUS_GROUPS.COMPLETED)
  const excludedList = taskStatusGroupSql(TASK_STATUS_GROUPS.EXCLUDED)
  const reviewList = taskStatusGroupSql(TASK_STATUS_GROUPS.READY_FOR_REVIEW)
  const clientChangesList = taskStatusGroupSql(TASK_STATUS_GROUPS.CLIENT_CHANGES)
  const enCursoList = taskStatusSql(TASK_STATUS_CANONICAL.EN_CURSO)

  return `CASE
    WHEN ${column} IN (${briefingList}) THEN 'briefing'
    WHEN ${column} IN (${enCursoList}) THEN 'en_ejecucion'
    WHEN ${column} IN (${reviewList}) THEN 'revision_interna'
    WHEN ${column} IN (${clientChangesList}) THEN 'cambios_cliente'
    WHEN ${column} IN (${completedList}) THEN 'aprobado'
    WHEN ${column} IN (${blockedList}) THEN 'bloqueado'
    WHEN ${column} IN (${excludedList}) THEN 'excluido'
    ELSE 'unknown'
  END`
}
