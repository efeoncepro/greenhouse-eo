/**
 * TASK-1428 — Growth CTA engine: adapter Tier B de exposición (arch §9.4).
 *
 * `eligible/suppressed/viewed` NUNCA entran al ledger OLTP (`cta_conversion_event`):
 * van a `greenhouse_growth.cta_exposure_rollup` como AGREGADOS horarios (cardinalidad
 * acotada por dims; jamás 1 fila por pageview). Server observa eligible/suppressed en
 * el render path; el browser solo aporta `viewed` (tras la misma cadena de defensa
 * del ingest).
 *
 * Postura de fallo (task §Frequency and re-entry semantics): el adapter es FAIL-OPEN
 * — analytics jamás bloquea el render ni el suppression state (que es fail-closed por
 * sus propias reglas). Un fallo del sink deja breadcrumb `exposure_backpressure`
 * (dedupe 1/día — fuente del signal `growth.cta.event_ingest_backpressure`).
 *
 * Sampling: `GROWTH_CTA_EXPOSURE_SAMPLE_RATE` (0..1; 0 apaga el adapter). El rollup
 * registra `observed_count` (eventos que pasaron el sampler) + `estimated_count`
 * (observed/rate) para reconciliación bajo sampling.
 *
 * Retención explícita (task §Slice 2): 400 días de buckets; purga oportunista
 * best-effort (mismo patrón del visitor state; sin cron nuevo).
 */
import 'server-only'

import { query } from '@/lib/db'

import type { CtaExposureDecisionSource, CtaExposureKind, CtaSuppressionReason } from './contracts'
import { resolveCtaExposureSampleRate } from './flags'
import { recordServerErrorEventOncePerDay } from './store'

export const CTA_EXPOSURE_ROLLUP_RETENTION_DAYS = 400

const OPPORTUNISTIC_PURGE_MODULO = 64
const PURGE_BATCH_LIMIT = 500

let writeCounter = 0

export interface RecordExposureInput {
  ctaId: string | null
  surfaceId: string | null
  placement: string | null
  exposureKind: CtaExposureKind
  reasonClass: CtaSuppressionReason | null
  decisionSource: CtaExposureDecisionSource
  enforced: boolean
}

/**
 * UPSERT increment del bucket horario. El sampler corre ANTES del write; bajo
 * rate < 1 los conteos estimados escalan por 1/rate.
 */
const upsertRollup = async (input: RecordExposureInput, sampleRate: number): Promise<void> => {
  await query(
    `INSERT INTO greenhouse_growth.cta_exposure_rollup
       (bucket_start, cta_id, surface_id, placement, exposure_kind, reason_class,
        decision_source, enforced, observed_count, estimated_count)
     VALUES (date_trunc('hour', NOW()), $1, $2, $3, $4, $5, $6, $7, 1, 1.0 / $8::numeric)
     ON CONFLICT (bucket_start, cta_id, surface_id, placement, exposure_kind, reason_class, decision_source, enforced)
     DO UPDATE SET
       observed_count = greenhouse_growth.cta_exposure_rollup.observed_count + 1,
       estimated_count = greenhouse_growth.cta_exposure_rollup.estimated_count + (1.0 / $8::numeric),
       last_seen_at = NOW()`,
    [
      input.ctaId,
      input.surfaceId,
      input.placement,
      input.exposureKind,
      input.reasonClass,
      input.decisionSource,
      input.enforced,
      String(sampleRate),
    ],
  )
}

const opportunisticRollupPurge = async (): Promise<void> => {
  writeCounter += 1

  if (writeCounter % OPPORTUNISTIC_PURGE_MODULO !== 0) return

  try {
    await query(
      `DELETE FROM greenhouse_growth.cta_exposure_rollup
        WHERE rollup_id IN (
          SELECT rollup_id FROM greenhouse_growth.cta_exposure_rollup
           WHERE bucket_start < NOW() - ($1 || ' days')::interval
           LIMIT ${PURGE_BATCH_LIMIT}
        )`,
      [String(CTA_EXPOSURE_ROLLUP_RETENTION_DAYS)],
    )
  } catch {
    // Best-effort: la purga jamás rompe el path de exposición.
  }
}

/**
 * Registra exposición Tier B. FIRE-AND-FORGET friendly: no lanza (fail-open); el
 * fallo del sink deja el breadcrumb de backpressure y sigue. Devuelve si el evento
 * pasó el sampler (para tests/reconciliación).
 */
export const recordCtaExposure = async (input: RecordExposureInput): Promise<{ sampled: boolean }> => {
  const sampleRate = resolveCtaExposureSampleRate()

  if (sampleRate <= 0) return { sampled: false }

  if (sampleRate < 1 && Math.random() >= sampleRate) return { sampled: false }

  try {
    await upsertRollup(input, sampleRate)
    void opportunisticRollupPurge()

    return { sampled: true }
  } catch {
    // Backpressure/fallo del sink: breadcrumb dedupe 1/día (fuente del signal
    // growth.cta.event_ingest_backpressure). Best-effort: jamás rompe el caller.
    try {
      await recordServerErrorEventOncePerDay({
        ctaId: input.ctaId,
        ctaVersionId: null,
        surfaceId: input.surfaceId,
        reason: 'exposure_backpressure',
      })
    } catch {
      // Sentry cubre el error primario en la route; acá solo evitamos romper el render.
    }

    return { sampled: false }
  }
}

/** Registra un batch de decisiones del render path sin bloquear la respuesta. */
export const recordCtaExposureBatch = (inputs: RecordExposureInput[]): void => {
  for (const input of inputs) {
    void recordCtaExposure(input)
  }
}

// ─── Reader (cockpit/reliability; server-only) ────────────────────────────────

export interface CtaExposureSummaryRow {
  bucketDate: string
  ctaId: string | null
  surfaceId: string | null
  exposureKind: string
  reasonClass: string | null
  decisionSource: string
  enforced: boolean
  observedCount: number
  estimatedCount: number
}

/**
 * Resumen diario de exposición (ventana acotada) para cockpit TASK-1430 y signals.
 * `ctaId` opcional acota el rollup a un CTA (panel de detalle del cockpit).
 */
export const summarizeCtaExposure = async (
  windowDays: number,
  ctaId?: string | null,
): Promise<CtaExposureSummaryRow[]> => {
  const rows = await query<{
    bucket_date: string
    cta_id: string | null
    surface_id: string | null
    exposure_kind: string
    reason_class: string | null
    decision_source: string
    enforced: boolean
    observed_count: number
    estimated_count: string
  }>(
    `SELECT date_trunc('day', bucket_start)::date::text AS bucket_date,
            cta_id, surface_id, exposure_kind, reason_class, decision_source, enforced,
            SUM(observed_count)::int AS observed_count,
            SUM(estimated_count)::numeric AS estimated_count
       FROM greenhouse_growth.cta_exposure_rollup
      WHERE bucket_start > NOW() - ($1 || ' days')::interval
        AND ($2::text IS NULL OR cta_id::text = $2::text)
      GROUP BY 1, 2, 3, 4, 5, 6, 7
      ORDER BY 1 DESC, 4, 5`,
    [String(windowDays), ctaId ?? null],
  )

  return rows.map(row => ({
    bucketDate: row.bucket_date,
    ctaId: row.cta_id,
    surfaceId: row.surface_id,
    exposureKind: row.exposure_kind,
    reasonClass: row.reason_class,
    decisionSource: row.decision_source,
    enforced: row.enforced,
    observedCount: row.observed_count,
    estimatedCount: Number(row.estimated_count),
  }))
}

/**
 * TASK-1430 — impresiones `viewed` de un CTA por ventana (actual vs previa).
 * Insumo del reader de métricas de marketing (`getCtaMarketingMetrics`): las
 * impresiones son Tier B browser-observed (rollup agregado), por eso el reader
 * las etiqueta `browser_reported` — jamás verdad de conversión.
 */
export interface CtaViewedWindowCount {
  window: 'current' | 'previous'
  viewed: number
  lastBucketAt: string | null
}

export const summarizeViewedExposureWindows = async (
  ctaId: string,
  windowDays: number,
): Promise<CtaViewedWindowCount[]> => {
  const rows = await query<{ window_key: 'current' | 'previous'; viewed: number; last_bucket_at: string | null }>(
    `SELECT CASE WHEN bucket_start > NOW() - ($2 || ' days')::interval THEN 'current' ELSE 'previous' END AS window_key,
            COALESCE(SUM(observed_count), 0)::int AS viewed,
            MAX(bucket_start)::text AS last_bucket_at
       FROM greenhouse_growth.cta_exposure_rollup
      WHERE cta_id::text = $1::text
        AND exposure_kind = 'viewed'
        AND bucket_start > NOW() - ($3 || ' days')::interval
      GROUP BY 1`,
    [ctaId, String(windowDays), String(windowDays * 2)],
  )

  return rows.map(row => ({ window: row.window_key, viewed: row.viewed, lastBucketAt: row.last_bucket_at }))
}

/** Test-only: resetea el contador de purga oportunista. */
export const __resetExposurePurgeCounterForTests = (): void => {
  writeCounter = 0
}
