import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1129 — Reliability signal de turnos degradados de Nexa.
 *
 * Lee el ledger `greenhouse_ai.nexa_turn_telemetry` (poblado por cada respuesta del chat) y cuenta,
 * en las últimas 24h, los turnos que NO fueron limpios:
 *   - `graceful_fallback` → Nexa no pudo conectarse al motor de IA (permission denied / infra) y
 *     sirvió un texto canned. Steady=0 (es una regresión de configuración/infra).
 *   - `did_failover=true` → el provider primario falló y el secundario salvó el turno. Steady≈0 hoy
 *     (el chat usa Gemini single-step; con el auto-router de TASK-1134 un failover puntual es esperable,
 *     pero una tasa alta es regresión).
 *
 * Los hard-fail (`provider_failed`/`aborted`) NO llegan al ledger (lanzan antes de persistir) y quedan
 * cubiertos por `captureWithDomain('home')` en el endpoint del chat (TASK-1131, incident del módulo Home).
 *
 * Subsystem rollup: `home` (el chat de Nexa es la superficie del Home). El ledger habilita además
 * filtrado ad-hoc por prompt_version / resolved_provider / outcome (la "lectura interna" de la spec).
 *
 * Severidad: 0 → ok · 1-9 → warning · >=10 → error · tabla ausente/sin tráfico → unknown.
 */

export const NEXA_TURN_DEGRADED_OUTCOMES_SIGNAL_ID = 'nexa.turn.degraded_outcomes'

type DegradedOutcomesRow = Record<string, unknown> & {
  total_turns: number | string | null
  graceful_fallback_count: number | string | null
  failover_count: number | string | null
}

const toCount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export const getNexaTurnDegradedOutcomesSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<DegradedOutcomesRow>(
      `
        SELECT
          COUNT(*)                                                        AS total_turns,
          COUNT(*) FILTER (WHERE outcome = 'graceful_fallback')           AS graceful_fallback_count,
          COUNT(*) FILTER (WHERE did_failover = true)                     AS failover_count
        FROM greenhouse_ai.nexa_turn_telemetry
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `
    )

    const row = rows[0]
    const totalTurns = toCount(row?.total_turns)
    const gracefulFallback = toCount(row?.graceful_fallback_count)
    const failover = toCount(row?.failover_count)
    const degraded = gracefulFallback + failover

    if (totalTurns === 0) {
      return {
        signalId: NEXA_TURN_DEGRADED_OUTCOMES_SIGNAL_ID,
        moduleKey: 'home',
        kind: 'drift',
        source: 'getNexaTurnDegradedOutcomesSignal',
        label: 'Nexa: turnos degradados (24h)',
        severity: 'unknown',
        summary: 'Sin turnos de Nexa registrados en 24h (sin tráfico o ledger de telemetría ausente).',
        observedAt,
        evidence: [{ kind: 'metric', label: 'total_turns_24h', value: '0' }]
      }
    }

    let severity: ReliabilitySignal['severity'] = 'ok'
    let summary = `Sin turnos degradados en 24h (${totalTurns} turnos, todos limpios).`

    if (degraded >= 10) {
      severity = 'error'
      summary = `${degraded} turnos degradados de ${totalTurns} en 24h (graceful_fallback=${gracefulFallback}, failover=${failover}). Umbral error >=10 — revisa acceso al motor de IA / estabilidad del provider.`
    } else if (degraded > 0) {
      severity = 'warning'
      summary = `${degraded} turnos degradados de ${totalTurns} en 24h (graceful_fallback=${gracefulFallback}, failover=${failover}). Esperado 0 en config nominal.`
    }

    return {
      signalId: NEXA_TURN_DEGRADED_OUTCOMES_SIGNAL_ID,
      moduleKey: 'home',
      kind: 'drift',
      source: 'getNexaTurnDegradedOutcomesSignal',
      label: 'Nexa: turnos degradados (24h)',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'total_turns_24h', value: String(totalTurns) },
        { kind: 'metric', label: 'graceful_fallback', value: String(gracefulFallback) },
        { kind: 'metric', label: 'failover', value: String(failover) },
        {
          kind: 'sql',
          label: 'PG',
          value: 'greenhouse_ai.nexa_turn_telemetry (TASK-1129 ledger; filtrable por prompt_version/resolved_provider/outcome)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'home', {
      tags: { source: 'reliability_signal_nexa_turn_degraded_outcomes' }
    })

    return {
      signalId: NEXA_TURN_DEGRADED_OUTCOMES_SIGNAL_ID,
      moduleKey: 'home',
      kind: 'drift',
      source: 'getNexaTurnDegradedOutcomesSignal',
      label: 'Nexa: turnos degradados (24h)',
      severity: 'unknown',
      summary: 'No fue posible leer el ledger de telemetría de Nexa. Revisa los logs.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }
      ]
    }
  }
}
