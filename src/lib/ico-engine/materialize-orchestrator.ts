import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'

import {
  isFreshnessGateEnabled,
  runUpstreamFreshnessGate,
  summarizeBlockingSignals
} from './materialize-guards'
import {
  beginIcoMaterializationRun,
  completeIcoMaterializationRun,
  failIcoMaterializationRun,
  getLastSuccessfulMaterializationAt,
  skipIcoMaterializationRun,
  type IcoMaterializerTableName
} from './materialize-tracking'

/**
 * TASK-900 Slice 5 — Orchestrator canonical para materializers ICO.
 *
 * Single source of truth para las 4 capas defensivas del materializer:
 *   Capa 1 — Freshness gate (skipea cuando upstream signal bloqueando)
 *   Capa 2 — Tracking begin (audit row status='running' en PG)
 *   Capa 2b — Delta cutoff lookup (incremental delta filter Slice 4)
 *   Capa 3 — Execute MERGE o legacy DELETE+INSERT (caller-provided callbacks)
 *   Capa 4 — Tracking complete (status='succeeded' + rows_merged + notes) o
 *            fail+rethrow (status='failed' + error message + captureWithDomain)
 *
 * Cada materializer (member/project/sprint/organization/business_unit) provee
 * sus dos callbacks de ejecución (legacy + merge). El orchestrator maneja
 * gate, tracking, delta lookup, captureWithDomain con domain='delivery' y
 * tags canonical.
 *
 * Bug class fuente: TASK-877 follow-up 2026-05-14 → 2026-05-16. Bridge
 * Notion→member degradado destruyó 2 noches de data buena en
 * `metrics_by_member` via DELETE+INSERT sin warning. El orchestrator protege
 * a TODOS los 5 materializers ICO simétricamente.
 *
 * Coherence enforced por `assertMaterializerFlagCoherence` exportado de
 * materialize-flags.ts: INCREMENTAL_DELTA_ENABLED=true requires
 * MERGE_PATTERN_ENABLED=true (defense in depth — el orchestrator NO invoca
 * delta lookup si !useMerge).
 */

export interface IcoMaterializerCycleInput {
  tableName: IcoMaterializerTableName
  periodYear: number
  periodMonth: number

  /**
   * Legacy DELETE-then-INSERT path. Invocado cuando flag
   * `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED=false`. Devuelve row count
   * post-INSERT.
   */
  runLegacyDeleteInsert: () => Promise<number>

  /**
   * MERGE path. Invocado cuando `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED=true`.
   * Recibe `deltaCutoffIso` (string ISO) si delta enabled AND previous run
   * succeeded; null para full period.
   */
  runMerge: (deltaCutoffIso: string | null) => Promise<number>

  /**
   * Coherence assertion — caller debe pasar la función exportada por
   * materialize-flags.ts. Permite tests inyectar mocks sin acoplar al
   * archivo de flags real.
   */
  assertFlagCoherence: () => void

  /**
   * Flag readers — caller debe pasar los readers exportados por
   * materialize-flags.ts. Permite tests controlar flags vía env vars.
   */
  isMergePatternEnabled: () => boolean
  isIncrementalDeltaEnabled: () => boolean
}

const DELTA_OVERLAP_MS = 60 * 60 * 1000 // 1h defensa contra races

export const runIcoMaterializerCycle = async (
  input: IcoMaterializerCycleInput
): Promise<number> => {
  const { tableName, periodYear, periodMonth } = input

  // Hard-rule: INCREMENTAL requires MERGE. Throw runtime si drift.
  input.assertFlagCoherence()

  // ── Capa 1: Freshness gate (flag-gated) ──────────────────────────────────
  if (isFreshnessGateEnabled()) {
    const gate = await runUpstreamFreshnessGate()

    if (!gate.safe) {
      const blockingSignals = summarizeBlockingSignals(gate.blockingSignals)

      try {
        await skipIcoMaterializationRun({
          tableName,
          periodYear,
          periodMonth,
          blockingSignals,
          reason: gate.reason
        })
      } catch (trackingError) {
        captureWithDomain(trackingError, 'delivery', {
          tags: {
            source: 'ico_materializer_tracking_failed',
            table: tableName,
            stage: 'skip_persist'
          },
          extra: { periodYear, periodMonth }
        })
      }

      captureWithDomain(
        new Error(
          `ico_materializer_skipped_safety: ${tableName} ${periodYear}-${String(periodMonth).padStart(2, '0')} (${gate.reason})`
        ),
        'delivery',
        {
          level: 'warning',
          tags: {
            source: 'ico_materializer_skipped_safety',
            table: tableName
          },
          extra: {
            periodYear,
            periodMonth,
            blockingSignals: gate.blockingSignals.map(s => ({
              signalId: s.signalId,
              severity: s.severity
            }))
          }
        }
      )

      return 0
    }
  }

  // ── Capa 2: Tracking begin (cuando MERGE pattern activo) ─────────────────
  const useMerge = input.isMergePatternEnabled()
  let materializationId: string | null = null

  if (useMerge) {
    try {
      const run = await beginIcoMaterializationRun({
        tableName,
        periodYear,
        periodMonth
      })

      materializationId = run.materializationId
    } catch (trackingError) {
      captureWithDomain(trackingError, 'delivery', {
        tags: {
          source: 'ico_materializer_tracking_failed',
          table: tableName,
          stage: 'begin'
        },
        extra: { periodYear, periodMonth }
      })
    }
  }

  // ── Capa 2b: Incremental delta cutoff lookup ─────────────────────────────
  let deltaCutoffIso: string | null = null

  if (useMerge && input.isIncrementalDeltaEnabled()) {
    try {
      const lastMaterializedAt = await getLastSuccessfulMaterializationAt({
        tableName,
        periodYear,
        periodMonth
      })

      if (lastMaterializedAt) {
        deltaCutoffIso = new Date(
          lastMaterializedAt.getTime() - DELTA_OVERLAP_MS
        ).toISOString()
      }
    } catch (lookupError) {
      captureWithDomain(lookupError, 'delivery', {
        tags: {
          source: 'ico_materializer_tracking_failed',
          table: tableName,
          stage: 'delta_lookup'
        },
        extra: { periodYear, periodMonth }
      })
    }
  }

  // ── Capa 3: Ejecutar MERGE o legacy DELETE+INSERT ────────────────────────
  let rowCount: number

  try {
    rowCount = useMerge
      ? await input.runMerge(deltaCutoffIso)
      : await input.runLegacyDeleteInsert()
  } catch (executionError) {
    if (materializationId) {
      try {
        await failIcoMaterializationRun({
          materializationId,
          errorMessage:
            executionError instanceof Error
              ? executionError.message
              : String(executionError)
        })
      } catch (trackingError) {
        captureWithDomain(trackingError, 'delivery', {
          tags: {
            source: 'ico_materializer_tracking_failed',
            table: tableName,
            stage: 'fail_persist'
          },
          extra: { periodYear, periodMonth }
        })
      }
    }

    captureWithDomain(executionError, 'delivery', {
      tags: {
        source: useMerge
          ? 'ico_materializer_merge_failed'
          : 'ico_materializer_legacy_failed',
        table: tableName
      },
      extra: { periodYear, periodMonth }
    })

    throw executionError
  }

  // ── Capa 4: Tracking complete ────────────────────────────────────────────
  if (materializationId) {
    const notes = deltaCutoffIso
      ? `incremental from ${deltaCutoffIso}`
      : 'full period'

    try {
      await completeIcoMaterializationRun({
        materializationId,
        rowsMerged: rowCount,
        notes
      })
    } catch (trackingError) {
      captureWithDomain(trackingError, 'delivery', {
        tags: {
          source: 'ico_materializer_tracking_failed',
          table: tableName,
          stage: 'complete'
        },
        extra: { periodYear, periodMonth, rowCount }
      })
    }
  }

  return rowCount
}
