/**
 * TASK-1304 — Captura semanal del perfil de enlaces (`seo_backlink_snapshots`).
 *
 * Backlinks es live (síncrono): dos llamadas por target — `summary/live` (perfil:
 * rank, backlinks, referring domains, spam score del perfil entrante) +
 * `bulk_new_lost_backlinks/live` (flujo new/lost de la ventana de 30 días del
 * proveedor). Snapshot semanal idempotente por `(seo_target_id, capture_date)`.
 *
 * Contratos duros (patrón TASK-1303):
 * - Pre-check de idempotencia ANTES de pegar el provider (re-run del mismo día = cero
 *   gasto). El trigger de TASK-1299 bloquea UPDATE incondicionalmente sobre la tabla:
 *   el INSERT lleva `ON CONFLICT DO NOTHING` solo como guardia de carrera.
 * - Gate de costo con `consumesAuditAllowance: false` — el snapshot de backlinks no
 *   consume el cupo de site-audits; su único freno es presupuesto/expiración.
 * - Honest degradation: si `summary` falla NO se fabrica snapshot; si solo falla el
 *   delta new/lost se persiste el snapshot con `new_lost_delta` vacío y el resultado
 *   se declara `partial` (dato faltante visible, jamás inventado).
 * - `toxic_share` es un PROXY: `backlinks_spam_score / 100` (spam score promedio del
 *   perfil entrante, bandas oficiales 0–30 bajo / 31–60 medio / 61–100 alto).
 * - `domain_rank` se pide en escala 0–100 (`rank_scale: one_hundred`) — comparable a
 *   DR/DA; NUNCA mezclar con la escala default 0–1000 del proveedor.
 */

import 'server-only'

import { postDataForSeoTask, type DataForSeoTaskPayload } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  SEO_BACKLINK_SNAPSHOT_CAPTURED_EVENT,
  SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
  type SeoBacklinkCaptureResult
} from '../contracts'
import { SEO_MODULE_KEY, enforceSeoRunEntitlement } from '../entitlement'
import { isSeoModuleEnabled } from '../flags'
import { resolveSantiagoCaptureDate } from '../rank-capture'

export const BACKLINKS_SUMMARY_ENDPOINT = '/v3/backlinks/summary/live'
export const BACKLINKS_BULK_NEW_LOST_ENDPOINT = '/v3/backlinks/bulk_new_lost_backlinks/live'

/**
 * Estimación conservadora de las 2 llamadas para el gate ($0.024/req + filas; el
 * summary con `internal_list_limit` bajo ronda $0.025 y el bulk $0.024 — se
 * sobreestima ~2× para absorber drift de tarifas).
 */
export const BACKLINK_CAPTURE_ESTIMATED_COST_USD = 0.1

/** Actor de sistema con el que el cron ejecuta el command gobernado. */
export const SEO_BACKLINK_CRON_ACTOR = 'system:seo-backlink-capture-cron'

type TargetRow = {
  seo_target_id: string
  organization_id: string
  root_domain: string
  status: string
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export interface BacklinksSummaryObservation {
  referringDomains: number | null
  backlinksTotal: number | null
  /** Rank 0–100 (`rank_scale: one_hundred`). */
  domainRank: number | null
  /** Spam score promedio del perfil entrante, 0–100. */
  backlinksSpamScore: number | null
}

/** Parser puro de `summary/live` (tasks[0].result[0]). */
export const parseBacklinksSummary = (tasks: unknown[]): BacklinksSummaryObservation | null => {
  const task = asRecord(tasks[0])
  const statusCode = typeof task?.status_code === 'number' ? task.status_code : null

  if (statusCode !== 20000) {
    return null
  }

  const result = asRecord(Array.isArray(task?.result) ? task.result[0] : null)

  if (!result) {
    return null
  }

  const toFiniteNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null

  return {
    referringDomains: toFiniteNumber(result.referring_domains),
    backlinksTotal: toFiniteNumber(result.backlinks),
    domainRank: toFiniteNumber(result.rank),
    backlinksSpamScore: toFiniteNumber(result.backlinks_spam_score)
  }
}

export interface BacklinksNewLostObservation {
  newBacklinks: number | null
  lostBacklinks: number | null
}

/** Parser puro de `bulk_new_lost_backlinks/live` (tasks[0].result[0].items[0]). */
export const parseBacklinksNewLost = (tasks: unknown[]): BacklinksNewLostObservation | null => {
  const task = asRecord(tasks[0])

  if ((typeof task?.status_code === 'number' ? task.status_code : null) !== 20000) {
    return null
  }

  const result = asRecord(Array.isArray(task?.result) ? task.result[0] : null)
  const item = asRecord(Array.isArray(result?.items) ? result.items[0] : null)

  if (!item) {
    return null
  }

  const toFiniteNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null

  return {
    newBacklinks: toFiniteNumber(item.new_backlinks),
    lostBacklinks: toFiniteNumber(item.lost_backlinks)
  }
}

const mapBlockedReason = (
  reason: 'no_entitlement' | 'expired' | 'quota_exhausted' | 'budget_exhausted' | null
): 'no_entitlement' | 'expired' | 'budget_exhausted' => {
  if (reason === 'expired') return 'expired'
  if (reason === 'budget_exhausted' || reason === 'quota_exhausted') return 'budget_exhausted'

  return 'no_entitlement'
}

/**
 * Captura el snapshot semanal del perfil de enlaces de un target.
 *
 * Command gobernado (Full API Parity): el cron es un caller de sistema; un trigger
 * manual llega vía propose → confirm → execute.
 */
export const captureBacklinkSnapshot = async (
  seoTargetId: string,
  actor: string,
  options: { captureDate?: string } = {}
): Promise<SeoBacklinkCaptureResult> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const targetRows = await runGreenhousePostgresQuery<TargetRow>(
    `SELECT seo_target_id, organization_id, root_domain, status
       FROM greenhouse_growth.seo_targets
      WHERE seo_target_id = $1`,
    [seoTargetId]
  )

  const target = targetRows[0]

  if (!target) {
    return { ok: false, errorCode: 'target_not_found', status: null }
  }

  if (target.status !== 'active') {
    return { ok: false, errorCode: 'target_not_active', status: null }
  }

  const captureDate = options.captureDate ?? resolveSantiagoCaptureDate()

  // Idempotencia SIN gasto: el snapshot del día ya existe → cero llamadas.
  const existingRows = await runGreenhousePostgresQuery<{ backlink_snapshot_id: string }>(
    `SELECT backlink_snapshot_id
       FROM greenhouse_growth.seo_backlink_snapshots
      WHERE seo_target_id = $1
        AND capture_date = $2::date`,
    [seoTargetId, captureDate]
  )

  if (existingRows.length > 0) {
    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      captureDate,
      status: 'already_captured',
      providerCostUsd: 0
    }
  }

  const gate = await enforceSeoRunEntitlement(target.organization_id, {
    estimatedCostUsd: BACKLINK_CAPTURE_ESTIMATED_COST_USD,
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    return { ok: false, errorCode: mapBlockedReason(gate.blockedReason), status: null }
  }

  let summary: BacklinksSummaryObservation
  let costUsd = 0

  try {
    const summaryTask: DataForSeoTaskPayload = {
      target: target.root_domain,
      include_subdomains: true,
      rank_scale: 'one_hundred',
      internal_list_limit: 10
    }

    const summaryResult = await postDataForSeoTask({
      family: 'backlinks',
      endpoint: BACKLINKS_SUMMARY_ENDPOINT,
      tasks: [summaryTask],
      organizationId: target.organization_id
    })

    if (!summaryResult.ok) {
      return {
        ok: false,
        errorCode: summaryResult.breakerOpen ? 'breaker_open' : 'provider_error',
        status: null
      }
    }

    const parsed = parseBacklinksSummary(summaryResult.tasks)

    if (!parsed) {
      // HTTP 200 con task fallida (status_code ≠ 20000): NUNCA fabricar snapshot.
      return { ok: false, errorCode: 'provider_error', status: null }
    }

    summary = parsed
    costUsd += typeof summaryResult.cost === 'number' && Number.isFinite(summaryResult.cost) ? summaryResult.cost : 0
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_backlink_capture', family: 'backlinks' },
      extra: { seoTargetId, captureDate, phase: 'summary' }
    })

    return { ok: false, errorCode: 'provider_error', status: null }
  }

  // Delta new/lost: enriquecimiento. Su fallo NO invalida el snapshot (partial honesto).
  let newLostDelta: Record<string, unknown> = {}
  let deltaOk = false

  try {
    const deltaResult = await postDataForSeoTask({
      family: 'backlinks',
      endpoint: BACKLINKS_BULK_NEW_LOST_ENDPOINT,
      tasks: [{ targets: [target.root_domain] }],
      organizationId: target.organization_id
    })

    if (deltaResult.ok) {
      const parsed = parseBacklinksNewLost(deltaResult.tasks)

      if (parsed) {
        newLostDelta = {
          newBacklinks: parsed.newBacklinks,
          lostBacklinks: parsed.lostBacklinks,
          // Ventana default del proveedor (`date_from` = hoy − 30 días).
          windowDays: 30
        }
        deltaOk = true
      }

      costUsd += typeof deltaResult.cost === 'number' && Number.isFinite(deltaResult.cost) ? deltaResult.cost : 0
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_backlink_capture', family: 'backlinks' },
      extra: { seoTargetId, captureDate, phase: 'new_lost' }
    })
  }

  // `toxic_share` = spam score promedio del perfil entrante / 100 (proxy documentado).
  const toxicShare =
    summary.backlinksSpamScore !== null ? Math.min(1, Math.max(0, summary.backlinksSpamScore / 100)) : null

  // El trigger anti-mutation prohíbe DO UPDATE: DO NOTHING actúa solo como guardia de
  // carrera (el pre-check ya cubrió el caso normal).
  const insertRows = await runGreenhousePostgresQuery<{ backlink_snapshot_id: string }>(
    `INSERT INTO greenhouse_growth.seo_backlink_snapshots (
       seo_target_id, capture_date, referring_domains, backlinks_total, domain_rank,
       toxic_share, new_lost_delta, provider_cost
     )
     VALUES ($1, $2::date, $3, $4, $5, $6, $7::jsonb, $8)
     ON CONFLICT (seo_target_id, capture_date) DO NOTHING
     RETURNING backlink_snapshot_id`,
    [
      seoTargetId,
      captureDate,
      summary.referringDomains,
      summary.backlinksTotal,
      summary.domainRank,
      toxicShare,
      JSON.stringify(newLostDelta),
      costUsd
    ]
  )

  if (insertRows.length === 0) {
    // Carrera: otro proceso insertó el snapshot del día entre el pre-check y el INSERT.
    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      captureDate,
      status: 'already_captured',
      providerCostUsd: costUsd
    }
  }

  await publishOutboxEvent({
    aggregateType: SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
    aggregateId: seoTargetId,
    eventType: SEO_BACKLINK_SNAPSHOT_CAPTURED_EVENT,
    payload: {
      seoTargetId,
      organizationId: target.organization_id,
      captureDate,
      backlinkSnapshotId: insertRows[0].backlink_snapshot_id,
      actor
    }
  })

  return {
    ok: true,
    seoTargetId,
    organizationId: target.organization_id,
    captureDate,
    status: deltaOk ? 'captured' : 'partial',
    providerCostUsd: costUsd
  }
}

export interface BacklinkCaptureTargetOutcome {
  seoTargetId: string
  organizationId: string
  status: 'captured' | 'partial' | 'skipped' | 'blocked' | 'failed'
  costUsd: number
  errorCode: string | null
}

export interface BacklinkCaptureBatchResult {
  targets: number
  captured: number
  partial: number
  skipped: number
  blocked: number
  failed: number
  costUsd: number
  outcomes: BacklinkCaptureTargetOutcome[]
}

const BLOCK_CODES: ReadonlySet<string> = new Set(['no_entitlement', 'expired', 'budget_exhausted', 'disabled'])

/**
 * Batch semanal (Cloud Scheduler → ops-worker) con per-target resilience: un target
 * bloqueado o caído no impide capturar el perfil de los demás.
 */
export const runBacklinkCaptureBatch = async (
  options: { captureDate?: string; maxTargets?: number } = {}
): Promise<BacklinkCaptureBatchResult> => {
  const rows = await runGreenhousePostgresQuery<{ seo_target_id: string; organization_id: string }>(
    `SELECT t.seo_target_id, t.organization_id
       FROM greenhouse_growth.seo_targets t
      WHERE t.status = 'active'
        AND EXISTS (
          SELECT 1
            FROM greenhouse_client_portal.module_assignments ma
           WHERE ma.organization_id = t.organization_id
             AND ma.module_key = $1
             AND ma.effective_to IS NULL
             AND ma.status IN ('active', 'pilot')
        )
      ORDER BY t.seo_target_id`,
    [SEO_MODULE_KEY]
  )

  const targets =
    typeof options.maxTargets === 'number' && options.maxTargets > 0 ? rows.slice(0, options.maxTargets) : rows

  const outcomes: BacklinkCaptureTargetOutcome[] = []

  for (const target of targets) {
    try {
      const result = await captureBacklinkSnapshot(target.seo_target_id, SEO_BACKLINK_CRON_ACTOR, {
        captureDate: options.captureDate
      })

      if (result.ok) {
        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status: result.status === 'already_captured' ? 'skipped' : result.status,
          costUsd: result.providerCostUsd,
          errorCode: null
        })
      } else {
        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status: BLOCK_CODES.has(result.errorCode) ? 'blocked' : 'failed',
          costUsd: 0,
          errorCode: result.errorCode
        })
      }
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_backlink_capture_batch' },
        extra: { seoTargetId: target.seo_target_id, organizationId: target.organization_id }
      })

      outcomes.push({
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        status: 'failed',
        costUsd: 0,
        errorCode: 'unexpected_error'
      })
    }
  }

  return {
    targets: targets.length,
    captured: outcomes.filter(outcome => outcome.status === 'captured').length,
    partial: outcomes.filter(outcome => outcome.status === 'partial').length,
    skipped: outcomes.filter(outcome => outcome.status === 'skipped').length,
    blocked: outcomes.filter(outcome => outcome.status === 'blocked').length,
    failed: outcomes.filter(outcome => outcome.status === 'failed').length,
    costUsd: outcomes.reduce((total, outcome) => total + outcome.costUsd, 0),
    outcomes
  }
}
