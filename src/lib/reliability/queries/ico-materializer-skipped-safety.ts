import 'server-only'

import { countRecentSkippedSafetyRuns } from '@/lib/ico-engine/materialize-tracking'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-900 Slice 6 — ICO Materializer skipped_safety detector.
 *
 * Cuenta corridas del materializer ICO con `status='skipped_safety'` en
 * `greenhouse_sync.ico_materialization_runs` ventana 24h. Steady state = 0
 * (gate canonical confía en upstream; cualquier skip indica que el
 * `identity.notion_bridge.coverage_drift` u otro signal upstream activó
 * la defensa anti-bug-class TASK-877).
 *
 * Subsystem rollup: `delivery` module (registry.ts:147). El materializer
 * ICO es owned por delivery (`filesOwned` incluye `src/lib/ico-engine/**`)
 * + `incidentDomainTag='delivery'` ya está. NO crear subsystem nuevo.
 *
 * **Severity matrix canonical**:
 *
 *   - count = 0 sustained → `ok` (steady — gate confía en upstream)
 *   - count > 0           → `warning` (gate detectó upstream degraded y
 *                                       protegió data — operador debe
 *                                       resolver el signal fuente)
 *   - count > 5 en 24h    → `error`   (sostenido — upstream necesita
 *                                       atención humana, signal fuente
 *                                       no se está resolviendo)
 *
 * **Por qué warning y NO error de inmediato**: el gate canonical
 * preserva data buena. Cuando alerta es buena noticia (significa que
 * detectó el problema upstream antes de que el materializer destruyera
 * downstream). Pero un `count > 5 en 24h` indica que el bug class
 * upstream NO se está resolviendo — eso sí es error.
 *
 * **Steady state esperado**: count = 0 sostenido. Cualquier > 0 es signal
 * complementario al `identity.notion_bridge.coverage_drift` — el gate
 * está operando correctamente, pero el operador debe perseguir el signal
 * fuente.
 *
 * **Patron fuente**: TASK-571 / TASK-720 / TASK-877 (VIEW + reader +
 * signal canonical) — mismo shape que `identity-notion-bridge-coverage.ts`.
 */

export const ICO_MATERIALIZER_SKIPPED_SAFETY_SIGNAL_ID =
  'delivery.ico_materializer.skipped_safety'

const WARNING_THRESHOLD = 0 // any count > 0 → at least warning
const ERROR_THRESHOLD = 5 // count > 5 in 24h → error (sustained upstream issue)
const WINDOW_HOURS = 24

const formatIsoDate = (date: Date | null): string =>
  date ? date.toISOString() : 'unknown'

export const getIcoMaterializerSkippedSafetySignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const { count, oldestStartedAt, newestStartedAt } =
        await countRecentSkippedSafetyRuns(WINDOW_HOURS)

      const severity: 'ok' | 'warning' | 'error' =
        count === 0
          ? 'ok'
          : count > ERROR_THRESHOLD
            ? 'error'
            : 'warning'

      const summary =
        count === 0
          ? `Materializer ICO operativo (0 skips en últimas ${WINDOW_HOURS}h). El freshness gate confía en upstream.`
          : count > ERROR_THRESHOLD
            ? `Materializer ICO skipeó ${count} veces últimas ${WINDOW_HOURS}h (sostenido). El upstream signal fuente NO se está resolviendo — revisa identity.notion_bridge.coverage_drift y los demás signals upstream.`
            : `Materializer ICO skipeó ${count} veces últimas ${WINDOW_HOURS}h. El gate protegió data buena cuando upstream estaba degradado. Resuelve el signal fuente y el count baja a 0.`

      return {
        signalId: ICO_MATERIALIZER_SKIPPED_SAFETY_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'drift',
        source: 'getIcoMaterializerSkippedSafetySignal',
        label: 'Materializer ICO skipped_safety',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              'greenhouse_sync.ico_materialization_runs WHERE status=\'skipped_safety\' AND started_at >= NOW() - 24h'
          },
          {
            kind: 'metric',
            label: 'count_24h',
            value: String(count)
          },
          {
            kind: 'metric',
            label: 'warning_threshold',
            value: String(WARNING_THRESHOLD)
          },
          {
            kind: 'metric',
            label: 'error_threshold',
            value: String(ERROR_THRESHOLD)
          },
          {
            kind: 'metric',
            label: 'window_hours',
            value: String(WINDOW_HOURS)
          },
          {
            kind: 'metric',
            label: 'oldest_skip_at',
            value: formatIsoDate(oldestStartedAt)
          },
          {
            kind: 'metric',
            label: 'newest_skip_at',
            value: formatIsoDate(newestStartedAt)
          },
          {
            kind: 'doc',
            label: 'Helper canonical',
            value: 'src/lib/ico-engine/materialize-orchestrator.ts'
          },
          {
            kind: 'doc',
            label: 'Tracking table',
            value: 'greenhouse_sync.ico_materialization_runs'
          },
          {
            kind: 'doc',
            label: 'Upstream signal fuente típica',
            value: 'identity.notion_bridge.coverage_drift'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'delivery', {
        tags: { source: 'reliability_signal_ico_materializer_skipped_safety' }
      })

      return {
        signalId: ICO_MATERIALIZER_SKIPPED_SAFETY_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'drift',
        source: 'getIcoMaterializerSkippedSafetySignal',
        label: 'Materializer ICO skipped_safety',
        severity: 'unknown',
        summary: 'No fue posible leer el signal. Revisa los logs.',
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
