import 'server-only'

import { getIcoEngineProjectId, runIcoEngineQuery } from '@/lib/ico-engine/shared'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-943 Slice 5 — Nexa Insights heartbeat (`no_new_signals_in_24h`).
 *
 * Post-TASK-943 el materializer es **append-only**: cada cron diario inserta
 * nuevos signals con un `generated_at` fresco. La observabilidad implícita
 * que daba el patrón DELETE+INSERT ("run vacío = visible inmediato") se
 * pierde — un cron caído ya no "borra" la última corrida, queda silente.
 *
 * Este signal cierra esa pérdida de observabilidad: chequea cuánto tiempo
 * pasó desde el último `generated_at` registrado en `ai_signals`. Si el cron
 * diario está vivo, debería haber un valor < 24h. Severidad:
 *
 *   - sin filas en `ai_signals`          → unknown (sistema sin signals todavía)
 *   - last_generated_at > 48h            → error  (cron caído sostenido)
 *   - last_generated_at > 24h            → warning (cron skipped or upstream gate active)
 *   - last_generated_at <= 24h           → ok     (heartbeat verde)
 *
 * Complementario a `nexa.insights.stale_with_eligible_signals` (TASK-941 S5):
 * - Aquel detecta "hay señales eligibles pero no enriquecidas en PG serving".
 * - Este detecta "el motor mismo no produjo señales nuevas en 24h" (heartbeat
 *   del materializer canónico).
 *
 * Subsystem rollup: `delivery` (ICO es owned por delivery).
 *
 * Steady state esperado: ok cuando el cron diario corre nominal. Si está
 * gateado por upstream (TASK-942 freshness gate), `icoMaterializerSkippedSafety`
 * lo expone — este signal complementa con "los signals AI específicamente
 * no se actualizaron".
 *
 * Pattern fuente: `ico-materializer-skipped-safety.ts` + `nexa-insights-freshness.ts`.
 */

export const NEXA_INSIGHTS_NO_NEW_SIGNALS_SIGNAL_ID = 'nexa.insights.no_new_signals_in_24h'

interface LastGeneratedAtRow {
  last_generated_at: string | { value?: string } | null
  signal_count: number | string | null
}

const toIsoString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed.length > 0 ? trimmed : null
  }

  if (value && typeof value === 'object' && 'value' in value) {
    const inner = (value as { value?: unknown }).value

    return typeof inner === 'string' ? inner.trim() : null
  }

  return null
}

const toCount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toCount((value as { value?: unknown }).value)
  }

  return 0
}

export const getNexaInsightsNoNewSignalsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const projectId = getIcoEngineProjectId()

    // Lee la VIEW canonical post-TASK-943. Si la raw acumula N generations,
    // el VIEW da la latest por signal_id — exactamente lo que medir como
    // "heartbeat del motor" (la generation más reciente).
    const rows = await runIcoEngineQuery<LastGeneratedAtRow>(
      `SELECT
         MAX(generated_at) AS last_generated_at,
         COUNT(*)          AS signal_count
       FROM \`${projectId}.ico_engine.ai_signals_current\``
    )

    const row = rows[0]
    const lastGeneratedAt = toIsoString(row?.last_generated_at)
    const signalCount = toCount(row?.signal_count)

    if (!lastGeneratedAt || signalCount === 0) {
      return {
        signalId: NEXA_INSIGHTS_NO_NEW_SIGNALS_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'lag',
        source: 'getNexaInsightsNoNewSignalsSignal',
        label: 'Nexa Insights heartbeat',
        severity: 'unknown',
        summary: 'Sin señales en `ai_signals_current` aún; no hay heartbeat que medir.',
        observedAt,
        evidence: [{ kind: 'metric', label: 'signal_count', value: '0' }]
      }
    }

    const lastDate = new Date(lastGeneratedAt)
    const ageMs = Date.now() - lastDate.getTime()
    const ageHours = ageMs / (1000 * 60 * 60)
    const ageHoursLabel = ageHours.toFixed(1)

    let severity: ReliabilitySignal['severity'] = 'ok'
    let summary = `Heartbeat ok: última generation hace ${ageHoursLabel}h (${lastGeneratedAt}).`

    if (ageHours > 48) {
      severity = 'error'
      summary = `Cron Nexa Insights caído: última generation hace ${ageHoursLabel}h (umbral error >48h). Esperado < 24h con cron diario nominal. Cross-check icoMaterializerSkippedSafety por si el upstream gate está activo.`
    } else if (ageHours > 24) {
      severity = 'warning'
      summary = `Heartbeat retrasado: última generation hace ${ageHoursLabel}h (umbral warning >24h). El cron diario podría haber saltado una corrida o el freshness gate está activo.`
    }

    return {
      signalId: NEXA_INSIGHTS_NO_NEW_SIGNALS_SIGNAL_ID,
      moduleKey: 'delivery',
      kind: 'lag',
      source: 'getNexaInsightsNoNewSignalsSignal',
      label: 'Nexa Insights heartbeat',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'last_generated_at', value: lastGeneratedAt },
        { kind: 'metric', label: 'age_hours', value: ageHoursLabel },
        { kind: 'metric', label: 'signal_count', value: String(signalCount) },
        {
          kind: 'sql',
          label: 'BQ',
          value: 'MAX(generated_at) FROM ico_engine.ai_signals_current (TASK-943 append-only event log)'
        },
        {
          kind: 'doc',
          label: 'ADR',
          value: 'docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md Delta 2026-05-28'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'reliability_signal_nexa_insights_no_new_signals' }
    })

    return {
      signalId: NEXA_INSIGHTS_NO_NEW_SIGNALS_SIGNAL_ID,
      moduleKey: 'delivery',
      kind: 'lag',
      source: 'getNexaInsightsNoNewSignalsSignal',
      label: 'Nexa Insights heartbeat',
      severity: 'unknown',
      summary: 'No fue posible leer el heartbeat de Nexa Insights. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
