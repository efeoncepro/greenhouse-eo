import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { isSourceDegraded, withSourceTimeout } from '@/lib/platform-health/with-source-timeout'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import {
  __getProjectionCacheSize,
  buildProjectionCacheKey,
  clearProjectionCacheForService,
  clearProjectionCacheForSubject,
  readProjectionFromCache,
  writeProjectionToCache,
  __clearAllProjectionCache
} from './projection-cache'

import {
  SAMPLE_SPRINT_RUNTIME_CONTRACT_VERSION,
  type SampleSprintProjectionDegradedReason,
  type SampleSprintRuntimeConversionRate,
  type SampleSprintRuntimeDetail,
  type SampleSprintRuntimeItem,
  type SampleSprintRuntimeProjection,
  type SampleSprintRuntimeSignal,
  type SampleSprintSignalSeverity,
  type SampleSprintRuntimeTeamMember,
  type SampleSprintRuntimeCapacityRisk
} from './runtime-projection-types'

import type {
  SampleSprintDetail,
  SampleSprintListItem,
  SampleSprintTeamMemberInput
} from './store'

import { getSampleSprintDetail, listSampleSprints } from './store'

/**
 * TASK-835 — Sample Sprints Runtime Projection (server-only).
 *
 * Pattern fuente: `src/lib/organization-workspace/projection.ts` (TASK-611).
 *
 * Esta es la única capa que traduce datos de dominio (services + engagement_*
 * + cost attribution + Commercial Health) al view model que la UI runtime de
 * `/agency/sample-sprints` consume. La UI ya NO deriva progress, costo, team
 * o signals; consume `runtime` field del payload.
 *
 * Composición:
 *  - Source 1: store (listSampleSprints + opcional getSampleSprintDetail)
 *  - Source 2: cost attribution byServiceId (Slice 2)
 *  - Source 3: team enrichment + capacity (Slice 3)
 *  - Source 4: Commercial Health helpers tenant-scoped (Slice 4)
 *
 * Cada source corre via `withSourceTimeout` para que una caída produzca
 * `degraded[]` honest, NUNCA 5xx. Cache TTL 30s in-memory.
 */

export interface ResolveSampleSprintRuntimeProjectionInput {
  tenant: TenantContext
  selectedServiceId?: string | null
  /**
   * Inyección opcional del listado y detalle ya resueltos por el caller.
   * Útil para que el endpoint API no haga doble fetch — la projection reusa.
   * Cuando ausentes, la projection los lee directo del store.
   */
  prefetchedItems?: SampleSprintListItem[] | null
  prefetchedDetail?: SampleSprintDetail | null
}

const SOURCE_TIMEOUT_MS = 4_000

/** Counter in-memory de degradaciones recientes — fuente del reliability signal `commercial.sample_sprint.projection_degraded`. */
const DEGRADED_WINDOW_MS = 5 * 60 * 1000
const degradedTimestamps: number[] = []

const recordDegradationOccurrence = (): void => {
  degradedTimestamps.push(Date.now())

  // Tail trim — preserva sólo las muestras dentro de la ventana.
  while (degradedTimestamps.length > 0 && degradedTimestamps[0]! < Date.now() - DEGRADED_WINDOW_MS) {
    degradedTimestamps.shift()
  }
}

/**
 * Reader del counter para el reliability signal. Devuelve número de degradaciones
 * con severity `error` observadas en los últimos 5 minutos. Steady=0.
 */
export const getRecentProjectionDegradationCount = (): number => {
  const cutoff = Date.now() - DEGRADED_WINDOW_MS

  while (degradedTimestamps.length > 0 && degradedTimestamps[0]! < cutoff) {
    degradedTimestamps.shift()
  }

  return degradedTimestamps.length
}

/** Test helper — reset del counter. */
export const __resetDegradationCounterForTests = (): void => {
  degradedTimestamps.length = 0
}

const buildEmptyProjection = (): SampleSprintRuntimeProjection => ({
  items: [],
  selected: null,
  signals: [],
  conversionRate: null,
  degraded: [],
  generatedAt: new Date().toISOString(),
  contractVersion: SAMPLE_SPRINT_RUNTIME_CONTRACT_VERSION
})

const ensureFiniteNumberInRange = (value: unknown, min: number, max: number): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed)) return null
  if (parsed < min || parsed > max) return null

  return parsed
}

/**
 * Convención canónica TASK-835: el % de progreso vive en
 * `engagement_progress_snapshots.metrics_json.deliveryProgressPct` como
 * número ∈ [0,100]. Aceptamos `progressPct` como fallback compat.
 *
 * Documentado en CLAUDE.md + manual de uso. Future tasks que persistan
 * progreso deben respetar la key.
 */
const extractDeliveryProgressFromSnapshot = (metrics: Record<string, unknown> | null | undefined): number | null => {
  if (!metrics || typeof metrics !== 'object') return null

  const raw = metrics.deliveryProgressPct ?? metrics.progressPct

  return ensureFiniteNumberInRange(raw, 0, 100)
}

/**
 * Computa progressPct canónico:
 *  - outcome terminal → 100
 *  - último snapshot con metrics.deliveryProgressPct válido → snapshot
 *  - sin snapshot o snapshot sin métrica → null + degraded `progress_snapshot_missing`
 *
 * Refactor del switch hardcoded `getProgressPct` que vivía en
 * SampleSprintsWorkspace.tsx:140-147.
 */
interface ResolvedProgress {
  progressPct: number | null
  hasSnapshotProgress: boolean
}

const resolveProgressForItem = (item: SampleSprintListItem): ResolvedProgress => {
  if (item.outcomeKind) return { progressPct: 100, hasSnapshotProgress: true }

  // Sin snapshot → no hay forma de saber progreso real.
  if (!item.latestSnapshotDate) return { progressPct: null, hasSnapshotProgress: false }

  // Hay snapshot pero el listItem no incluye metrics_json — devolvemos null
  // honest. La projection del detalle (resolveDetail) sí lo recupera.
  return { progressPct: null, hasSnapshotProgress: false }
}

/** Versión rica para el detalle: lee metrics_json del último snapshot. */
const resolveProgressForDetail = (detail: SampleSprintDetail): ResolvedProgress => {
  if (detail.outcomeKind) return { progressPct: 100, hasSnapshotProgress: true }

  const lastSnapshot = detail.latestSnapshots[0]

  if (!lastSnapshot) return { progressPct: null, hasSnapshotProgress: false }

  const fromMetrics = extractDeliveryProgressFromSnapshot(lastSnapshot.metrics)

  if (fromMetrics === null) return { progressPct: null, hasSnapshotProgress: false }

  return { progressPct: fromMetrics, hasSnapshotProgress: true }
}

const computeBudgetUsagePct = (actualClp: number | null, expectedInternalCostClp: number): number | null => {
  if (actualClp === null) return null
  if (!Number.isFinite(expectedInternalCostClp) || expectedInternalCostClp <= 0) return null

  return Math.round((actualClp / expectedInternalCostClp) * 1000) / 10
}

const computeDaysSince = (isoDate: string | null): number | null => {
  if (!isoDate) return null

  const parsed = Date.parse(isoDate)

  if (!Number.isFinite(parsed)) return null

  const ms = Date.now() - parsed

  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
}

/**
 * Severity derivada server-side del item. Reemplaza `getSignalSeverity` de
 * `SampleSprintsWorkspace.tsx:150-158`. Reglas:
 *  - outcome converted → success
 *  - outcome cancelled (cliente o provider) → error
 *  - status pending_approval → warning
 *  - status active + último snapshot > 10 días → warning (stale-progress)
 *  - default → info
 */
const STALE_PROGRESS_DAYS = 10

const resolveItemSeverity = (item: SampleSprintListItem): SampleSprintSignalSeverity => {
  if (item.outcomeKind === 'converted') return 'success'

  if (item.outcomeKind === 'cancelled_by_client' || item.outcomeKind === 'cancelled_by_provider') {
    return 'error'
  }

  if (item.status === 'pending_approval') return 'warning'

  if (item.status === 'active') {
    const days = computeDaysSince(item.latestSnapshotDate)

    if (days !== null && days > STALE_PROGRESS_DAYS) return 'warning'
  }

  return 'info'
}

const buildItemProjection = (
  item: SampleSprintListItem,
  costByServiceId: Map<string, number>
): SampleSprintRuntimeItem => {
  const actualClpRaw = costByServiceId.get(item.serviceId)
  const actualClp = typeof actualClpRaw === 'number' && Number.isFinite(actualClpRaw) ? actualClpRaw : null

  const { progressPct } = resolveProgressForItem(item)

  return {
    serviceId: item.serviceId,
    actualClp,
    progressPct,
    budgetUsagePct: computeBudgetUsagePct(actualClp, item.expectedInternalCostClp),
    daysSinceLastSnapshot: computeDaysSince(item.latestSnapshotDate),
    signalSeverity: resolveItemSeverity(item)
  }
}

const buildDegradedReason = (
  code: SampleSprintProjectionDegradedReason['code'],
  source: SampleSprintProjectionDegradedReason['source'],
  severity: SampleSprintProjectionDegradedReason['severity'],
  message: string
): SampleSprintProjectionDegradedReason => ({ code, source, severity, message })

/**
 * Resuelve la projection completa.
 * NO lanza — siempre retorna un payload (degraded honest si algo falla).
 */
export const resolveSampleSprintRuntimeProjection = async (
  input: ResolveSampleSprintRuntimeProjectionInput
): Promise<SampleSprintRuntimeProjection> => {
  const { tenant, selectedServiceId, prefetchedItems, prefetchedDetail } = input

  const cacheKey = buildProjectionCacheKey(tenant.userId, tenant.clientId)
  const cached = readProjectionFromCache(cacheKey)

  if (cached) return cached

  const degraded: SampleSprintProjectionDegradedReason[] = []
  let degradedTouchedError = false

  const recordDegraded = (reason: SampleSprintProjectionDegradedReason) => {
    degraded.push(reason)

    if (reason.severity === 'error') degradedTouchedError = true
  }

  // ── Source 1: items list ────────────────────────────────────────────────
  const itemsResult = await withSourceTimeout(
    async () => prefetchedItems ?? (await listSampleSprints({ tenant })),
    { source: 'sample-sprints.store.list', timeoutMs: SOURCE_TIMEOUT_MS }
  )

  if (isSourceDegraded(itemsResult)) {
    captureWithDomain(new Error(itemsResult.error ?? 'sample sprints list source degraded'), 'commercial', {
      tags: { source: 'sample_sprints_runtime_projection', stage: 'list' }
    })

    // Sin items no hay nada que proyectar — devolvemos empty + degraded.
    recordDegradationOccurrence()

    const emptyWithDegraded: SampleSprintRuntimeProjection = {
      ...buildEmptyProjection(),
      degraded: [
        buildDegradedReason(
          'commercial_health_unavailable',
          'commercial_health',
          'error',
          'No se pudo cargar el listado de Sample Sprints en este momento.'
        )
      ]
    }

    writeProjectionToCache(cacheKey, emptyWithDegraded)

    return emptyWithDegraded
  }

  const items = itemsResult.value ?? []

  // ── Source 2: cost attribution byServiceId (Slice 2 wires) ──────────────
  const costByServiceId = new Map<string, number>()

  if (items.length > 0) {
    // Slice 2 wires `readCommercialCostAttributionByServiceForPeriodV2`. Slice 1 retorna mapa vacío.
    const costResult = await withSourceTimeout(
      async () => new Map<string, number>(),
      { source: 'sample-sprints.cost-attribution.by-service', timeoutMs: SOURCE_TIMEOUT_MS }
    )

    if (isSourceDegraded(costResult)) {
      captureWithDomain(new Error(costResult.error ?? 'cost attribution source degraded'), 'commercial', {
        tags: { source: 'sample_sprints_runtime_projection', stage: 'cost_attribution' }
      })
      recordDegraded(buildDegradedReason(
        'cost_attribution_unavailable',
        'cost_attribution',
        'error',
        'Costo real por sprint no disponible en este momento.'
      ))
    } else {
      for (const [serviceId, amountClp] of costResult.value ?? []) {
        costByServiceId.set(serviceId, amountClp)
      }
    }
  }

  // ── Source 3: signals + conversion (Slice 4 wires los 6 helpers tenant-scoped) ─
  const healthResult = await withSourceTimeout(
    async (): Promise<{ signals: SampleSprintRuntimeSignal[]; conversionRate: SampleSprintRuntimeConversionRate | null }> => ({
      signals: [],
      conversionRate: null
    }),
    { source: 'sample-sprints.commercial-health', timeoutMs: SOURCE_TIMEOUT_MS }
  )

  let signals: SampleSprintRuntimeSignal[] = []
  let conversionRate: SampleSprintRuntimeConversionRate | null = null

  if (isSourceDegraded(healthResult)) {
    captureWithDomain(new Error(healthResult.error ?? 'commercial health source degraded'), 'commercial', {
      tags: { source: 'sample_sprints_runtime_projection', stage: 'health' }
    })
    recordDegraded(buildDegradedReason(
      'commercial_health_unavailable',
      'commercial_health',
      'error',
      'Señales comerciales no disponibles en este momento.'
    ))
  } else {
    signals = healthResult.value?.signals ?? []
    conversionRate = healthResult.value?.conversionRate ?? null
  }

  // ── Source 4: detalle del seleccionado (team + capacity, Slice 3) ───────
  let selected: SampleSprintRuntimeDetail | null = null

  if (selectedServiceId) {
    const detailResult = await withSourceTimeout(
      async () => prefetchedDetail ?? (await getSampleSprintDetail({ tenant, serviceId: selectedServiceId })),
      { source: 'sample-sprints.store.detail', timeoutMs: SOURCE_TIMEOUT_MS }
    )

    if (isSourceDegraded(detailResult)) {
      captureWithDomain(new Error(detailResult.error ?? 'detail source degraded'), 'commercial', {
        tags: { source: 'sample_sprints_runtime_projection', stage: 'detail', serviceId: selectedServiceId }
      })
      recordDegraded(buildDegradedReason(
        'team_enrichment_failed',
        'team',
        'warning',
        'No se pudo cargar el detalle del sprint seleccionado.'
      ))
    } else if (detailResult.value) {
      const detail = detailResult.value

      // Refresh progressPct desde metrics_json (snapshot rico).
      const detailProgress = resolveProgressForDetail(detail)

      if (!detailProgress.hasSnapshotProgress && !detail.outcomeKind) {
        recordDegraded(buildDegradedReason(
          'progress_snapshot_missing',
          'progress',
          'warning',
          'El último snapshot no incluye porcentaje de avance medible.'
        ))
      }

      // Inyectar progressPct rico al item correspondiente si aplica.
      if (detailProgress.progressPct !== null) {
        const idx = items.findIndex(item => item.serviceId === selectedServiceId)

        if (idx >= 0) {
          // Se computa abajo en el map final; aquí sólo notamos que aplica.
        }
      }

      // Slice 3 enriquece con LEFT JOIN members + capacity. Slice 1: passthrough con unresolved=true.
      const team: SampleSprintRuntimeTeamMember[] = detail.proposedTeam.map((member: SampleSprintTeamMemberInput) => ({
        memberId: member.memberId,
        displayName: null,
        roleTitle: null,
        proposedFte: member.proposedFte,
        commitmentRole: member.role ?? null,
        unresolved: true
      }))

      const capacityRisk: SampleSprintRuntimeCapacityRisk | null = null

      selected = {
        serviceId: detail.serviceId,
        team,
        capacityRisk,
        hasCapacityRisk: capacityRisk === null ? null : false
      }

      // Replace progress en items proyectados — el detalle es source of truth
      // para el seleccionado.
      const itemsProjected = items.map(item => {
        const projected = buildItemProjection(item, costByServiceId)

        if (item.serviceId === selectedServiceId && detailProgress.hasSnapshotProgress) {
          return { ...projected, progressPct: detailProgress.progressPct }
        }

        return projected
      })

      const projection: SampleSprintRuntimeProjection = {
        items: itemsProjected,
        selected,
        signals,
        conversionRate,
        degraded,
        generatedAt: new Date().toISOString(),
        contractVersion: SAMPLE_SPRINT_RUNTIME_CONTRACT_VERSION
      }

      if (degradedTouchedError) recordDegradationOccurrence()

      writeProjectionToCache(cacheKey, projection)

      return projection
    }
  }

  // Sin selección o detail null
  const itemsProjected = items.map(item => buildItemProjection(item, costByServiceId))

  const projection: SampleSprintRuntimeProjection = {
    items: itemsProjected,
    selected,
    signals,
    conversionRate,
    degraded,
    generatedAt: new Date().toISOString(),
    contractVersion: SAMPLE_SPRINT_RUNTIME_CONTRACT_VERSION
  }

  if (degradedTouchedError) recordDegradationOccurrence()

  writeProjectionToCache(cacheKey, projection)

  return projection
}

// ═══════════════════════════════════════════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════════════════════════════════════════

export { clearProjectionCacheForService, clearProjectionCacheForSubject }
export { __clearAllProjectionCache, __getProjectionCacheSize }
export type {
  SampleSprintProjectionDegradedReason,
  SampleSprintRuntimeConversionRate,
  SampleSprintRuntimeDetail,
  SampleSprintRuntimeItem,
  SampleSprintRuntimeProjection,
  SampleSprintRuntimeSignal,
  SampleSprintRuntimeTeamMember
} from './runtime-projection-types'
