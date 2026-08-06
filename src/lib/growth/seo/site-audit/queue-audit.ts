/**
 * TASK-1304 — Command gobernado `queueSiteAudit` (fase 1 del ciclo async OnPage).
 *
 * OnPage es task-based: el crawl puede tardar minutos a horas, así que este command
 * NUNCA espera el resultado — crea la task en DataForSEO (`task_post`), persiste
 * `seo_site_audit_runs` con `status=running` + `provider_task_id` y retorna. La fase 2
 * (`collect.ts`) poll-ea idempotente y materializa cuando la task termina.
 *
 * Contratos duros:
 * - **Gate de costo ANTES de gastar**: `enforceSeoRunEntitlement` con el estimado del
 *   crawl completo. A diferencia del rank capture, el audit SÍ consume el cupo mensual
 *   de site-audits (`consumesAuditAllowance: true` — default del chokepoint).
 * - **Guard anti doble-encolado**: un run `running` en vuelo bloquea (`audit_already_running`);
 *   un run `succeeded` de hoy bloquea (`already_captured_today`). Un `failed`/`degraded`
 *   de hoy NO bloquea: reintentar un crawl fallido es legítimo (y consume cupo de nuevo).
 *   Residual conocido: dos llamadas EXACTAMENTE concurrentes pueden pasar ambas el
 *   pre-check (mismo residual documentado del rank capture); el caller canónico es un
 *   cron semanal secuencial, así que el costo del residual es un crawl duplicado, no
 *   corrupción — `provider_task_id` es UNIQUE y cada run queda trazado.
 * - **El ledger de gasto lo escribe el TRANSPORTE** (TASK-1300): acá solo se pasa
 *   `organizationId` y se persiste `provider_cost` como procedencia por fila.
 * - Full API Parity: el cron es un caller de sistema; un trigger manual (UI/Nexa) llega
 *   vía propose → confirm → execute — el LLM nunca dispara el crawl directo.
 */

import 'server-only'

import { postDataForSeoTask, type DataForSeoTaskPayload } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
  SEO_SITE_AUDIT_QUEUED_EVENT,
  type SeoSiteAuditQueueResult
} from '../contracts'
import { enforceSeoRunEntitlement } from '../entitlement'
import { isSeoModuleEnabled } from '../flags'
import { resolveSantiagoCaptureDate } from '../rank-capture'

/** Endpoint canónico de creación de crawl OnPage (POST, compatible con el transporte). */
export const ONPAGE_TASK_POST_ENDPOINT = '/v3/on_page/task_post'

/**
 * Techo de páginas del crawl V1. El proveedor cobra por página efectivamente crawleada
 * (refund de lo no usado), así que el techo acota el peor caso, no el caso típico.
 */
export const SITE_AUDIT_MAX_CRAWL_PAGES = 100

/**
 * Estimación conservadora del crawl completo para el gate de costo.
 *
 * Base $0.00015/pág (skill `dataforseo-operator` as-of 2026-08-06) × 100 págs = $0.015;
 * se sobreestima ~3× para absorber extras (micromarkup) y drift de tarifas — el gate
 * debe sobreestimar, el costo REAL lo reporta el provider y lo contabiliza el transporte.
 */
export const SITE_AUDIT_ESTIMATED_COST_USD = 0.05

type TargetRow = {
  seo_target_id: string
  organization_id: string
  root_domain: string
  status: string
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

/**
 * Parser puro de la respuesta de `task_post`: extrae el `id` de la task creada.
 *
 * HTTP 200 ≠ éxito en DataForSEO: cada task trae su propio `status_code` (`20100` =
 * task created; `20000` = ok). Cualquier otro código es un fallo del provider aunque el
 * HTTP haya sido 200.
 */
export const parseOnPageTaskPost = (
  tasks: unknown[]
): { providerTaskId: string | null; statusCode: number | null } => {
  const task = asRecord(tasks[0])

  if (!task) {
    return { providerTaskId: null, statusCode: null }
  }

  const statusCode = typeof task.status_code === 'number' ? task.status_code : null
  const id = typeof task.id === 'string' && task.id.trim() !== '' ? task.id.trim() : null

  if (statusCode !== 20000 && statusCode !== 20100) {
    return { providerTaskId: null, statusCode }
  }

  return { providerTaskId: id, statusCode }
}

const mapBlockedReason = (
  reason: 'no_entitlement' | 'expired' | 'quota_exhausted' | 'budget_exhausted' | null
): 'no_entitlement' | 'expired' | 'quota_exhausted' | 'budget_exhausted' =>
  reason ?? 'no_entitlement'

export interface QueueSiteAuditOptions {
  /** Techo de páginas del crawl (default `SITE_AUDIT_MAX_CRAWL_PAGES`). */
  maxCrawlPages?: number
  /** YYYY-MM-DD explícito; default = hoy en America/Santiago. */
  captureDate?: string
}

/**
 * Encola un site audit OnPage para un target.
 *
 * No espera el crawl: persiste el run en `running` y retorna. `actor` queda en el
 * payload del outbox event como rastro (cron = `system:*`; humano = user id).
 */
export const queueSiteAudit = async (
  seoTargetId: string,
  actor: string,
  options: QueueSiteAuditOptions = {}
): Promise<SeoSiteAuditQueueResult> => {
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

  // Guard anti doble-encolado (idempotencia SIN gasto): una task en vuelo o un audit
  // exitoso del mismo día se detectan ANTES de pegar el provider.
  const existingRows = await runGreenhousePostgresQuery<{ status: string; capture_date: string }>(
    `SELECT status, capture_date::text AS capture_date
       FROM greenhouse_growth.seo_site_audit_runs
      WHERE seo_target_id = $1
        AND (status = 'running' OR (capture_date = $2::date AND status = 'succeeded'))`,
    [seoTargetId, captureDate]
  )

  if (existingRows.some(row => row.status === 'running')) {
    return { ok: false, errorCode: 'audit_already_running', status: null }
  }

  if (existingRows.length > 0) {
    return { ok: false, errorCode: 'already_captured_today', status: null }
  }

  const maxCrawlPages =
    typeof options.maxCrawlPages === 'number' && Number.isFinite(options.maxCrawlPages) && options.maxCrawlPages > 0
      ? Math.floor(options.maxCrawlPages)
      : SITE_AUDIT_MAX_CRAWL_PAGES

  // Gate de costo con el estimado del crawl COMPLETO. El audit consume el cupo mensual
  // de site-audits (default del chokepoint) además del presupuesto.
  const gate = await enforceSeoRunEntitlement(target.organization_id, {
    estimatedCostUsd: SITE_AUDIT_ESTIMATED_COST_USD * (maxCrawlPages / SITE_AUDIT_MAX_CRAWL_PAGES)
  })

  if (!gate.allowed) {
    return { ok: false, errorCode: mapBlockedReason(gate.blockedReason), status: null }
  }

  // `validate_micromarkup` habilita el endpoint `microdata` (validación JSON-LD — insumo
  // AEO) sin costo extra listado. Sin JS ni browser rendering en V1: el diagnóstico CWV
  // de campo viene de GSC (doctrina §3), y JS multiplica ×9 el costo del crawl.
  const crawlTask: DataForSeoTaskPayload = {
    target: target.root_domain,
    max_crawl_pages: maxCrawlPages,
    validate_micromarkup: true,
    tag: seoTargetId
  }

  let providerTaskId: string
  let providerCostUsd: number

  try {
    const result = await postDataForSeoTask({
      family: 'onpage',
      endpoint: ONPAGE_TASK_POST_ENDPOINT,
      tasks: [crawlTask],
      organizationId: target.organization_id
    })

    if (!result.ok) {
      return {
        ok: false,
        errorCode: result.breakerOpen ? 'breaker_open' : 'provider_error',
        status: null
      }
    }

    const parsed = parseOnPageTaskPost(result.tasks)

    if (!parsed.providerTaskId) {
      captureWithDomain(new Error(`OnPage task_post sin task id (status_code=${parsed.statusCode ?? 'null'})`), 'growth', {
        tags: { source: 'seo_site_audit_queue', family: 'onpage' },
        extra: { seoTargetId, statusCode: parsed.statusCode }
      })

      return { ok: false, errorCode: 'provider_error', status: null }
    }

    providerTaskId = parsed.providerTaskId
    providerCostUsd = typeof result.cost === 'number' && Number.isFinite(result.cost) ? result.cost : 0
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_site_audit_queue', family: 'onpage' },
      extra: { seoTargetId, captureDate }
    })

    return { ok: false, errorCode: 'provider_error', status: null }
  }

  const runRows = await runGreenhousePostgresQuery<{ audit_run_id: string }>(
    `INSERT INTO greenhouse_growth.seo_site_audit_runs (
       seo_target_id, capture_date, status, provider_task_id, provider_cost, started_at
     )
     VALUES ($1, $2::date, 'running', $3, $4, NOW())
     RETURNING audit_run_id`,
    [seoTargetId, captureDate, providerTaskId, providerCostUsd]
  )

  const auditRunId = runRows[0]?.audit_run_id

  if (!auditRunId) {
    // La task OnPage YA existe en el provider pero el run no quedó persistido: el gasto
    // está trazado en el ledger (transporte) y el crawl expira solo a los 30 días.
    throw new Error('queueSiteAudit: el INSERT del run no retornó audit_run_id')
  }

  await publishOutboxEvent({
    aggregateType: SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
    aggregateId: seoTargetId,
    eventType: SEO_SITE_AUDIT_QUEUED_EVENT,
    payload: {
      seoTargetId,
      organizationId: target.organization_id,
      auditRunId,
      providerTaskId,
      captureDate,
      maxCrawlPages,
      actor
    }
  })

  return {
    ok: true,
    auditRunId,
    seoTargetId,
    organizationId: target.organization_id,
    captureDate,
    providerTaskId,
    providerCostUsd,
    status: 'running'
  }
}
