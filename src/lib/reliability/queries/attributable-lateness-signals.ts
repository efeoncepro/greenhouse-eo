import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-922 (M2) — Reliability signals del cómputo shadow de atraso imputable
 * (`task_attributable_lateness_shadow`). Subsystem rollup `delivery`.
 *
 * Pre-activación (flag `ATTRIBUTABLE_LATENESS_OTD_ENABLED` default OFF) la tabla
 * está vacía → ambos reportan steady state (ok). El signal de pending-reason
 * (`delivery.reschedule.pending_reason_confirmation`) se REUSA de TASK-921 — no
 * se duplica acá.
 */

const MODULE_KEY = 'delivery' as const

const buildErrorSignal = (
  signalId: string,
  label: string,
  kind: ReliabilitySignal['kind'],
  err: unknown,
  observedAt: string
): ReliabilitySignal => ({
  signalId,
  moduleKey: MODULE_KEY,
  kind,
  source: 'attributable-lateness-signal',
  label,
  severity: 'unknown',
  summary: 'No fue posible computar el signal — revisar logs.',
  observedAt,
  evidence: [{ kind: 'metric', label: 'error', value: err instanceof Error ? err.message : String(err) }]
})

// ════════════════════════════════════════════════════════════════════════════
// delivery.attributable_lateness.shadow_paridad
// ════════════════════════════════════════════════════════════════════════════

export const ATTRIBUTABLE_LATENESS_SHADOW_PARIDAD_SIGNAL_ID =
  'delivery.attributable_lateness.shadow_paridad'

// Umbral de sanidad: el freeze flipea ALGUNOS buckets (esperado, no falla — ADR
// §16.3). Pero si flipea > 30% de las tareas, es sospechoso (posible bug de
// reconstrucción de intervalos o de reschedules) → warning para revisión.
const DIVERGENCE_WARNING_PCT = 30

/**
 * Mide la divergencia POR freeze: % de filas `valid` donde el bucket con freeze
 * (`bucket_attributable`) difiere del bucket sin freeze (`bucket_no_freeze`).
 * Es la corrección que el freeze introduce — ESPERADA, no es falla. El signal
 * la SURFACEA para sanity-check pre-cutover (8 stop-gates + HR). > 30% → warning.
 */
export const getAttributableLatenessShadowParidadSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ total: string; diverged: string }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE bucket_attributable <> bucket_no_freeze)::text AS diverged
       FROM greenhouse_delivery.task_attributable_lateness_shadow
       WHERE data_status = 'valid'`
    )

    const total = Number(rows[0]?.total ?? 0)
    const diverged = Number(rows[0]?.diverged ?? 0)
    const pct = total > 0 ? Math.round((diverged / total) * 1000) / 10 : 0

    const severity: ReliabilitySignal['severity'] =
      total === 0 || pct <= DIVERGENCE_WARNING_PCT ? 'ok' : 'warning'

    return {
      signalId: ATTRIBUTABLE_LATENESS_SHADOW_PARIDAD_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: 'getAttributableLatenessShadowParidadSignal',
      label: 'Atraso imputable — divergencia por freeze (shadow)',
      severity,
      summary:
        total === 0
          ? 'Sin datos shadow de atraso imputable aún (captura/flag pendiente).'
          : `El freeze cambia el bucket en ${diverged}/${total} tareas (${pct}%). Esperado (corrección reason-aware); >30% requiere revisión pre-cutover.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'total_valid', value: String(total) },
        { kind: 'metric', label: 'diverged', value: String(diverged) },
        { kind: 'metric', label: 'divergence_pct', value: String(pct) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md §16.3'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'reliability_signal_attributable_lateness_shadow_paridad' }
    })

    return buildErrorSignal(
      ATTRIBUTABLE_LATENESS_SHADOW_PARIDAD_SIGNAL_ID,
      'Atraso imputable — divergencia por freeze (shadow)',
      'drift',
      error,
      observedAt
    )
  }
}

// ════════════════════════════════════════════════════════════════════════════
// delivery.attributable_lateness.freeze_reschedule_overlap
// ════════════════════════════════════════════════════════════════════════════

export const ATTRIBUTABLE_LATENESS_OVERLAP_SIGNAL_ID =
  'delivery.attributable_lateness.freeze_reschedule_overlap'

/**
 * Invariante anti-doble-descuento (ADR §5): el freeze y las extensiones de fecha
 * justa son disjuntos por construcción (el helper clampa freeze a post-fairDeadline).
 * Este signal es defensa-en-profundidad: cuenta filas con valores IMPOSIBLES
 * (`frozen_days_excluded < 0` o `attributable_days_late < 0`) que indicarían una
 * violación del invariante o un bug de cómputo. Steady state = 0; > 0 → error.
 */
export const getAttributableLatenessOverlapSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
       FROM greenhouse_delivery.task_attributable_lateness_shadow
       WHERE frozen_days_excluded < 0 OR attributable_days_late < 0`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: ATTRIBUTABLE_LATENESS_OVERLAP_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'data_quality',
      source: 'getAttributableLatenessOverlapSignal',
      label: 'Atraso imputable — invariante anti-doble-descuento',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Invariante de partición disjunta intacto (sin valores imposibles).'
          : `${count} fila(s) con valores imposibles (freeze/atraso negativo) — posible violación del invariante anti-doble-descuento o bug de cómputo.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md §5'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'reliability_signal_attributable_lateness_overlap' }
    })

    return buildErrorSignal(
      ATTRIBUTABLE_LATENESS_OVERLAP_SIGNAL_ID,
      'Atraso imputable — invariante anti-doble-descuento',
      'data_quality',
      error,
      observedAt
    )
  }
}
