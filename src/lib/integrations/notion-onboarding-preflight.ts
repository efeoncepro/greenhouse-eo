import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { normalizeTaskStatus } from '@/lib/delivery/task-status-canonical'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'
import { NOTION_TASK_TITLE_CANDIDATES } from '@/lib/sync/sync-notion-conformed'

import { getNotionRawFreshnessGate, type NotionRawFreshnessSpaceSnapshot } from './notion-readiness'

/**
 * TASK-1009 — Notion onboarding preflight (composer thin, reuse-first).
 *
 * Compone los helpers de readiness/freshness que YA existen y agrega solo los
 * eslabones que ninguno cubría (Estado mapeable a vocabulario V1, tareas
 * aterrizadas en el portal PG) + una verificación barata de `client_id`
 * (ya garantizado estructuralmente por TASK-1004; acá es defense-in-depth).
 *
 * NO re-valida lo que el wizard/checklist ya validan (estructura, token+DBs).
 * NO usa el token Notion crudo en el preflight: la prueba de que el token
 * funciona es que `raw aterrizó` tenga filas. NUNCA loggea token ni secret ref.
 *
 * Read-only. Degradación honesta: un check que falla en su fuente NO rompe el
 * resto — reporta `degraded` con el motivo.
 */

export type OnboardingCheckId =
  | 'token_resolves'
  | 'sync_enabled'
  | 'raw_landed'
  | 'client_id_attributed'
  | 'readiness_gate'
  | 'template_l1'
  | 'conformed_flowing'
  | 'portal_pg'
  | 'freshness'

export type OnboardingCheckStatus = 'ok' | 'fail' | 'degraded'

export interface OnboardingCheck {
  id: OnboardingCheckId
  /** Etiqueta legible es-CL para el output del operador. */
  label: string
  status: OnboardingCheckStatus
  /** Motivo/evidencia (nunca contiene token ni secret ref crudo). */
  detail: string
  /**
   * `true` si el eslabón es crítico para que la data fluya. Un crítico en
   * `fail` o `degraded` baja `readyToOnboard`. Los advisory (token, freshness)
   * nunca bloquean — el raw landing ya prueba que el token funciona.
   */
  critical: boolean
}

export interface NotionOnboardingReadiness {
  spaceId: string
  /** Todos los checks críticos en `ok`. */
  readyToOnboard: boolean
  checks: OnboardingCheck[]
  /** Resumen 1-línea para el item del checklist / CLI. */
  summary: string
  checkedAt: string
}

/**
 * Columnas candidatas (ya normalizadas a snake_case BQ) donde el sync aplana el
 * status de la tarea. Concepto fuente: NAME_PATTERNS.task_status del contrato de
 * gobernanza Notion; acá son nombres de columna BQ, schema-adaptive (se usa la
 * primera presente).
 */
const STATUS_COLUMN_CANDIDATES = ['estado', 'estado_1', 'estatus', 'status', 'estado_tarea', 'task_status'] as const

const CHECK_LABELS: Record<OnboardingCheckId, string> = {
  token_resolves: 'Token Notion resuelve',
  sync_enabled: 'Sync habilitado + data sources',
  raw_landed: 'Raw aterrizó en BigQuery',
  client_id_attributed: 'client_id atribuido',
  readiness_gate: 'Gate de readiness (tareas+proyectos)',
  template_l1: 'Template L1 (Estado mapeable)',
  conformed_flowing: 'Conformed fluye',
  portal_pg: 'Tareas en el portal (PostgreSQL)',
  freshness: 'Sync reciente'
}

const CRITICAL_CHECKS: ReadonlySet<OnboardingCheckId> = new Set<OnboardingCheckId>([
  'sync_enabled',
  'raw_landed',
  'client_id_attributed',
  'readiness_gate',
  'template_l1',
  'conformed_flowing',
  'portal_pg'
])

const STALE_AFTER_HOURS = 48

const toCount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toCount((value as { value?: unknown }).value)
  }

  return 0
}

const toIso = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const text = String(value).trim()

  if (!text) return null

  const parsed = new Date(text)

  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString()
}

// ── Facts gathered for the pure evaluator ──────────────────────────────────

export interface SpaceSourceFacts {
  exists: boolean
  syncEnabled: boolean
  hasTasksDataSource: boolean
  hasProjectsDataSource: boolean
  tokenSecretRef: string | null
  lastSyncedAt: string | null
}

export type OutcomeOrError<T> = { ok: true; value: T } | { ok: false; reason: string }

export interface OnboardingReadinessFacts {
  spaceId: string
  now: string
  source: SpaceSourceFacts
  /** Resultado de resolver el secret ref (sin el valor). */
  tokenResolves: OutcomeOrError<boolean>
  rawSnapshot: OutcomeOrError<NotionRawFreshnessSpaceSnapshot | null>
  clientId: OutcomeOrError<{ total: number; nullCount: number; columnPresent: boolean }>
  templateL1: OutcomeOrError<{ titleColumnPresent: boolean; statusColumnPresent: boolean; unmappedStatuses: string[]; sampled: number }>
  conformedCount: OutcomeOrError<number>
  portalCount: OutcomeOrError<number>
}

/**
 * Evaluador PURO: dado el conjunto de hechos, produce los 9 checks +
 * `readyToOnboard`. Sin IO → unit-testeable (mirror de `evaluateNotionRawFreshnessGate`).
 */
export const evaluateNotionOnboardingReadiness = (facts: OnboardingReadinessFacts): NotionOnboardingReadiness => {
  const checks: OnboardingCheck[] = []

  const push = (id: OnboardingCheckId, status: OnboardingCheckStatus, detail: string) => {
    checks.push({ id, label: CHECK_LABELS[id], status, detail, critical: CRITICAL_CHECKS.has(id) })
  }

  // #1 token — advisory. El raw landing es la prueba real de que el token funciona.
  if (!facts.tokenResolves.ok) {
    push('token_resolves', 'degraded', `No se pudo verificar el token: ${facts.tokenResolves.reason}`)
  } else if (facts.source.tokenSecretRef === null) {
    push('token_resolves', 'degraded', 'Usa token compartido legacy (Efeonce/Sky). Cliente nuevo: se recomienda token scoped por teamspace (TASK-998).')
  } else if (facts.tokenResolves.value) {
    push('token_resolves', 'ok', 'Token scoped resuelve desde Secret Manager.')
  } else {
    push('token_resolves', 'fail', 'El secret ref está configurado pero no resuelve en Secret Manager.')
  }

  // #2 sync_enabled + data sources — crítico
  if (!facts.source.exists) {
    push('sync_enabled', 'fail', 'El space no tiene binding en space_notion_sources.')
  } else if (!facts.source.syncEnabled) {
    push('sync_enabled', 'fail', 'sync_enabled = FALSE para este space.')
  } else if (!facts.source.hasTasksDataSource || !facts.source.hasProjectsDataSource) {
    push('sync_enabled', 'fail', 'Faltan data source ids de Tareas y/o Proyectos.')
  } else {
    push('sync_enabled', 'ok', 'sync_enabled = TRUE con Tareas + Proyectos configurados.')
  }

  // #3 raw aterrizó — crítico (reusa getNotionRawFreshnessGate)
  if (!facts.rawSnapshot.ok) {
    push('raw_landed', 'degraded', `No se pudo leer el raw: ${facts.rawSnapshot.reason}`)
  } else if (!facts.rawSnapshot.value) {
    push('raw_landed', 'fail', 'El space no aparece en el gate de raw (no está en sources activos o sin filas).')
  } else if (facts.rawSnapshot.value.taskRowCount === 0) {
    push('raw_landed', 'fail', 'notion_ops.tareas sin filas para el space.')
  } else {
    push('raw_landed', 'ok', `Raw con ${facts.rawSnapshot.value.taskRowCount} tarea(s), ${facts.rawSnapshot.value.projectRowCount} proyecto(s).`)
  }

  // #4 client_id — crítico (verificación; ya garantizado por TASK-1004)
  if (!facts.clientId.ok) {
    push('client_id_attributed', 'degraded', `No se pudo verificar client_id: ${facts.clientId.reason}`)
  } else if (!facts.clientId.value.columnPresent) {
    push('client_id_attributed', 'degraded', 'notion_ops.tareas no tiene columna client_id (schema previo a TASK-1004).')
  } else if (facts.clientId.value.total === 0) {
    push('client_id_attributed', 'degraded', 'Sin filas para evaluar client_id (ver raw_landed).')
  } else if (facts.clientId.value.nullCount > 0) {
    push('client_id_attributed', 'fail', `${facts.clientId.value.nullCount}/${facts.clientId.value.total} tarea(s) con client_id NULL — el sync no está threadeando el binding (regresión TASK-1004).`)
  } else {
    push('client_id_attributed', 'ok', `client_id atribuido en ${facts.clientId.value.total}/${facts.clientId.value.total} tarea(s).`)
  }

  // #5 readiness gate — crítico (reusa getNotionRawFreshnessGate, sprints opcional TASK-1008)
  if (!facts.rawSnapshot.ok) {
    push('readiness_gate', 'degraded', `No se pudo evaluar el gate: ${facts.rawSnapshot.reason}`)
  } else if (!facts.rawSnapshot.value) {
    push('readiness_gate', 'fail', 'El space no está en el gate de readiness.')
  } else if (!facts.rawSnapshot.value.ready) {
    push('readiness_gate', 'fail', facts.rawSnapshot.value.reasons.join('; ') || 'Gate no listo.')
  } else {
    push('readiness_gate', 'ok', 'Tareas + proyectos listos (sprints opcional, TASK-1008).')
  }

  // #6 template L1 — crítico (NUEVO: Estado mapeable a vocabulario V1)
  if (!facts.templateL1.ok) {
    push('template_l1', 'degraded', `No se pudo inspeccionar el template: ${facts.templateL1.reason}`)
  } else if (!facts.templateL1.value.titleColumnPresent) {
    push('template_l1', 'fail', `Sin columna de título canónica (${NOTION_TASK_TITLE_CANDIDATES.join(' | ')}). Alinear el template L1 en Notion.`)
  } else if (!facts.templateL1.value.statusColumnPresent) {
    push('template_l1', 'degraded', 'Sin columna de Estado detectable en notion_ops.tareas para este space.')
  } else if (facts.templateL1.value.unmappedStatuses.length > 0) {
    push('template_l1', 'fail', `Estados no mapeables a V1: ${facts.templateL1.value.unmappedStatuses.join(', ')}. Alinear el template L1 en Notion (no agregar aliases por cliente).`)
  } else if (facts.templateL1.value.sampled === 0) {
    push('template_l1', 'degraded', 'Sin tareas para inspeccionar el template (inconcluso; ver raw_landed).')
  } else {
    push('template_l1', 'ok', `Título + ${facts.templateL1.value.sampled} estado(s) distinto(s) mapean a vocabulario V1.`)
  }

  // #7 conformed fluye — crítico
  if (!facts.conformedCount.ok) {
    push('conformed_flowing', 'degraded', `No se pudo leer conformed: ${facts.conformedCount.reason}`)
  } else if (facts.conformedCount.value === 0) {
    push('conformed_flowing', 'fail', 'greenhouse_conformed.delivery_tasks sin filas para el space.')
  } else {
    push('conformed_flowing', 'ok', `${facts.conformedCount.value} tarea(s) en conformed.`)
  }

  // #8 portal PG — crítico (NUEVO: la garantía "tareas en el portal")
  if (!facts.portalCount.ok) {
    push('portal_pg', 'degraded', `No se pudo leer el portal PG: ${facts.portalCount.reason}`)
  } else if (facts.portalCount.value === 0) {
    push('portal_pg', 'fail', 'greenhouse_delivery.tasks sin filas — las tareas no llegaron al portal.')
  } else {
    push('portal_pg', 'ok', `${facts.portalCount.value} tarea(s) visibles en el portal.`)
  }

  // #9 freshness — advisory (stale pero fluyendo sigue siendo "fluyó")
  if (!facts.source.lastSyncedAt) {
    push('freshness', 'degraded', 'last_synced_at NULL (ver TASK-1007).')
  } else {
    const ageHours = (new Date(facts.now).getTime() - new Date(facts.source.lastSyncedAt).getTime()) / 3_600_000

    if (Number.isFinite(ageHours) && ageHours > STALE_AFTER_HOURS) {
      push('freshness', 'degraded', `Último sync hace ${Math.round(ageHours)}h (> ${STALE_AFTER_HOURS}h).`)
    } else {
      push('freshness', 'ok', `Último sync: ${facts.source.lastSyncedAt}.`)
    }
  }

  const criticalNotOk = checks.filter(check => check.critical && check.status !== 'ok')
  const readyToOnboard = criticalNotOk.length === 0

  const summary = readyToOnboard
    ? 'Cliente fluye al portal: todos los checks críticos en verde.'
    : `No fluye todavía — ${criticalNotOk.length} check(s) crítico(s) pendiente(s): ${criticalNotOk.map(c => c.label).join(', ')}.`

  return {
    spaceId: facts.spaceId,
    readyToOnboard,
    checks,
    summary,
    checkedAt: facts.now
  }
}

// ── IO gatherers (schema-adaptive, degradación honesta) ─────────────────────

const settle = async <T>(producer: () => Promise<T>): Promise<OutcomeOrError<T>> => {
  try {
    return { ok: true, value: await producer() }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'error desconocido' }
  }
}

const readSpaceSourceFacts = async (spaceId: string): Promise<SpaceSourceFacts> => {
  const rows = await runGreenhousePostgresQuery<{
    sync_enabled: boolean
    notion_db_tareas: string | null
    notion_db_proyectos: string | null
    notion_token_secret_ref: string | null
    last_synced_at: Date | string | null
  }>(
    `SELECT sync_enabled, notion_db_tareas, notion_db_proyectos, notion_token_secret_ref, last_synced_at
     FROM greenhouse_core.space_notion_sources
     WHERE space_id = $1
     LIMIT 1`,
    [spaceId]
  )

  const row = rows[0]

  if (!row) {
    return {
      exists: false,
      syncEnabled: false,
      hasTasksDataSource: false,
      hasProjectsDataSource: false,
      tokenSecretRef: null,
      lastSyncedAt: null
    }
  }

  return {
    exists: true,
    syncEnabled: Boolean(row.sync_enabled),
    hasTasksDataSource: Boolean(row.notion_db_tareas),
    hasProjectsDataSource: Boolean(row.notion_db_proyectos),
    tokenSecretRef: row.notion_token_secret_ref ?? null,
    lastSyncedAt: toIso(row.last_synced_at)
  }
}

const readBqTableColumns = async (dataset: string, table: string): Promise<Set<string>> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = (await bq.query({
    query: `
      SELECT column_name
      FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = @table
    `,
    params: { table }
  })) as [{ column_name: string }[], unknown]

  return new Set(rows.map(row => row.column_name))
}

const readClientIdFacts = async (spaceId: string) => {
  const columns = await readBqTableColumns('notion_ops', 'tareas')

  if (!columns.has('client_id')) {
    return { total: 0, nullCount: 0, columnPresent: false }
  }

  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = (await bq.query({
    query: `
      SELECT COUNT(*) AS total, COUNTIF(client_id IS NULL) AS null_count
      FROM \`${projectId}.notion_ops.tareas\`
      WHERE space_id = @spaceId
    `,
    params: { spaceId }
  })) as [{ total: unknown; null_count: unknown }[], unknown]

  const row = rows[0]

  return {
    total: toCount(row?.total),
    nullCount: toCount(row?.null_count),
    columnPresent: true
  }
}

const readTemplateL1Facts = async (spaceId: string) => {
  const columns = await readBqTableColumns('notion_ops', 'tareas')
  const titleColumnPresent = NOTION_TASK_TITLE_CANDIDATES.some(candidate => columns.has(candidate))
  const statusColumn = STATUS_COLUMN_CANDIDATES.find(candidate => columns.has(candidate)) ?? null

  if (!statusColumn) {
    return { titleColumnPresent, statusColumnPresent: false, unmappedStatuses: [], sampled: 0 }
  }

  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = (await bq.query({
    query: `
      SELECT DISTINCT CAST(\`${statusColumn}\` AS STRING) AS status
      FROM \`${projectId}.notion_ops.tareas\`
      WHERE space_id = @spaceId
        AND \`${statusColumn}\` IS NOT NULL
        AND TRIM(CAST(\`${statusColumn}\` AS STRING)) != ''
    `,
    params: { spaceId }
  })) as [{ status: string | null }[], unknown]

  const statuses = rows.map(row => (row.status ?? '').trim()).filter(Boolean)
  const unmappedStatuses = statuses.filter(status => normalizeTaskStatus(status) === null)

  return {
    titleColumnPresent,
    statusColumnPresent: true,
    unmappedStatuses,
    sampled: statuses.length
  }
}

const readConformedCount = async (spaceId: string): Promise<number> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = (await bq.query({
    query: `
      SELECT COUNT(*) AS total
      FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
      WHERE space_id = @spaceId
        AND NOT is_deleted
    `,
    params: { spaceId }
  })) as [{ total: unknown }[], unknown]

  return toCount(rows[0]?.total)
}

const readPortalCount = async (spaceId: string): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ total: number | string }>(
    `SELECT COUNT(*)::int AS total
     FROM greenhouse_delivery.tasks
     WHERE space_id = $1`,
    [spaceId]
  )

  return toCount(rows[0]?.total)
}

const findRawSnapshot = async (spaceId: string): Promise<NotionRawFreshnessSpaceSnapshot | null> => {
  const gate = await getNotionRawFreshnessGate()

  return gate.spaces.find(space => space.spaceId === spaceId) ?? null
}

/**
 * Composer canónico del preflight de onboarding Notion para UN space.
 * Reúne todos los hechos en paralelo (cada fuente aislada → degradación honesta)
 * y delega la clasificación al evaluador puro.
 */
export const getNotionOnboardingReadiness = async (spaceId: string): Promise<NotionOnboardingReadiness> => {
  const trimmed = spaceId?.trim()

  if (!trimmed) {
    throw new Error('spaceId requerido')
  }

  const source = await readSpaceSourceFacts(trimmed)

  const [tokenResolves, rawSnapshot, clientId, templateL1, conformedCount, portalCount] = await Promise.all([
    settle(async () => {
      if (source.tokenSecretRef === null) return false
      const resolved = await resolveSecretByRef(source.tokenSecretRef)

      return resolved !== null && resolved.length > 0
    }),
    settle(() => findRawSnapshot(trimmed)),
    settle(() => readClientIdFacts(trimmed)),
    settle(() => readTemplateL1Facts(trimmed)),
    settle(() => readConformedCount(trimmed)),
    settle(() => readPortalCount(trimmed))
  ])

  return evaluateNotionOnboardingReadiness({
    spaceId: trimmed,
    now: new Date().toISOString(),
    source,
    tokenResolves,
    rawSnapshot,
    clientId,
    templateL1,
    conformedCount,
    portalCount
  })
}
