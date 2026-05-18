import 'server-only'

import { getIdentityNotionBridgeCoverageSignal } from '@/lib/reliability/queries/identity-notion-bridge-coverage'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

/**
 * TASK-900 — Upstream freshness gate canonical.
 *
 * Helper que verifica reliability signals upstream ANTES de cualquier corrida
 * destructiva del materializer ICO. Cuando un signal upstream esta en severity
 * bloqueante (default `error`), el materializer skipea preservando data buena
 * en lugar de destruirla via DELETE+INSERT (o sobrescribirla via MERGE con
 * source incompleto).
 *
 * Bug class motivador: incidente 2026-05-14 → 2026-05-16, TASK-877 follow-up
 * degrado el bridge Notion→member. Cada noche desde el 14 mayo el materializer
 * destruyo rows correctos en `metrics_by_member` y reinsertaba vacio (0-2 rows
 * vs 5-9 esperados) sin emitir warning, sin abortar, sin preservar lo bueno.
 *
 * Patron canonical reusable para futuros materializers downstream (Frame.io,
 * HubSpot, Nubox, etc.) — consumen el mismo helper con su set de signals
 * relevantes.
 *
 * **Forma canonical**: `requireSignals` recibe un array de fetchers (closures)
 * en lugar de signal IDs literales. Permite tests inyectar mocks sin afectar
 * la red ni la base de datos, y permite a V1.1 agregar signals nuevos
 * (e.g. `delivery.conformed_sync.freshness` cuando emerja) sin refactor.
 *
 * **Severity default bloqueante**: `['error']`. Warning NO bloquea por default
 * — el operador decide via `blockingSeverity` per-callsite. Cualquier signal
 * que retorne `severity='unknown'` se trata como NO bloqueante (degradacion
 * honesta — si no podemos leer el signal, asumimos seguro y dejamos el log
 * + captureWithDomain del reader fuente alerten).
 */

export type FreshnessSignalFetcher = () => Promise<ReliabilitySignal>

export const DEFAULT_BLOCKING_SEVERITY: ReliabilitySeverity[] = ['error']

export const DEFAULT_REQUIRE_SIGNALS: FreshnessSignalFetcher[] = [
  getIdentityNotionBridgeCoverageSignal
]

export interface FreshnessGateOptions {
  /**
   * Array de fetchers de signals upstream. Cada fetcher es un closure async
   * que retorna un ReliabilitySignal. Si emerge un signal nuevo en V1.1
   * (e.g. `delivery.conformed_sync.freshness`), agregar su fetcher aqui.
   * Defaults a [getIdentityNotionBridgeCoverageSignal].
   */
  requireSignals?: FreshnessSignalFetcher[]

  /**
   * Severities consideradas bloqueantes. Default `['error']`. Subir a
   * `['error', 'warning']` per-callsite si el caso requiere conservadurismo
   * extra (e.g. materializer que alimenta bonus de payroll real).
   */
  blockingSeverity?: ReliabilitySeverity[]
}

export type FreshnessGateResult =
  | {
      safe: true
      reason: null
      blockingSignals: []
    }
  | {
      safe: false
      reason: string
      blockingSignals: ReliabilitySignal[]
    }

/**
 * Ejecuta el gate. Fetchea todos los signals en paralelo (Promise.all con
 * catch-and-null por signal — un signal roto no bloquea al resto). Filtra
 * por severity bloqueante. Si emerge al menos uno bloqueante → safe=false.
 *
 * Honest degradation: signals que fallan al fetchear (throw o promise reject)
 * son filtrados como `null` y NO cuentan como bloqueantes. El reader original
 * tipicamente ya emite captureWithDomain en su catch — no duplicamos.
 *
 * Stable order: el resultado preserva el orden de `requireSignals` para
 * facilitar debugging + tests deterministicos.
 */
export const runUpstreamFreshnessGate = async (
  options: FreshnessGateOptions = {}
): Promise<FreshnessGateResult> => {
  const fetchers = options.requireSignals ?? DEFAULT_REQUIRE_SIGNALS
  const blockingSeverity = options.blockingSeverity ?? DEFAULT_BLOCKING_SEVERITY

  const settled = await Promise.all(
    fetchers.map(fetcher =>
      fetcher()
        .then(signal => signal)
        .catch(() => null)
    )
  )

  const validSignals = settled.filter(
    (signal): signal is ReliabilitySignal => signal !== null
  )

  const blocking = validSignals.filter(signal =>
    blockingSeverity.includes(signal.severity)
  )

  if (blocking.length > 0) {
    const reason = blocking
      .map(signal => `${signal.signalId}=${signal.severity}`)
      .join(', ')

    return {
      safe: false,
      reason,
      blockingSignals: blocking
    }
  }

  return {
    safe: true,
    reason: null,
    blockingSignals: []
  }
}

/**
 * Shape estable para persistir en `greenhouse_sync.ico_materialization_runs.
 * blocking_signals` (JSONB). Mantener en sync con
 * `materialize-tracking.ts:recordIcoMaterializationRun`.
 */
export interface BlockingSignalSummary {
  signalId: string
  severity: ReliabilitySeverity
  label: string
  summary: string
}

export const summarizeBlockingSignals = (
  signals: readonly ReliabilitySignal[]
): BlockingSignalSummary[] =>
  signals.map(signal => ({
    signalId: signal.signalId,
    severity: signal.severity,
    label: signal.label,
    summary: signal.summary
  }))

/**
 * Flag gating canonical Greenhouse: lee env var `ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED`.
 * Default `false` (legacy behavior bit-for-bit). Flip `true` post-staging shadow >=7d
 * sin abortos espurios.
 */
export const isFreshnessGateEnabled = (): boolean =>
  process.env.ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED === 'true'
