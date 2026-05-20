import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import {
  NotionDemoClientUnavailableError,
  isDemoNotionWritebackConfigured,
  patchNotionDemoPage
} from '@/lib/notion-metrics/notion-demo-client'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { EVENT_TYPES } from '../event-catalog'
import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-913 Slice 2 — Reactive consumer writeback demo: PATCH Notion property
 * `RpA` con el valor del snapshot. Idempotente, retryable, observable.
 *
 * NOTA naming: en el teamspace demo la propiedad se llama `RpA` (sandbox limpio,
 * sin formula legacy con la que colisionar). En productivo (Efeonce/Sky) el
 * sibling TASK-901 mantiene `[GH] RpA v2` porque coexiste con la formula legacy.
 *
 * **Defense in depth canonical (TASK-910 demo isolation + TASK-742 7-layer)**:
 *
 * 1. **Filter strict `payload.metadata.demo_mode === true`** (anti-coersion).
 *    Productive events NUNCA llegan acá — el writeback productivo TASK-901
 *    Slice 4 (futuro) corre en sibling físicamente separado.
 *
 * 2. **Filter strict `payload.workspaceId === 'demo'`**. Doble check.
 *
 * 3. **Lee snapshot from `task_rpa_demo_snapshots` por `snapshot_id`** —
 *    NUNCA confía el `rpaValue` del payload del event (defensive re-read
 *    canonical, pattern fuente reactive-consumer TASK-771 sample-sprint).
 *    El payload es trigger; la fuente de verdad es PG.
 *
 * 4. **Skip silente cuando integration token NO configurado**: degraded
 *    honest. Reliability signal alerta `notion.metrics.writeback_demo_unconfigured`
 *    (Slice 3 future). El snapshot persiste con `written_to_notion_at=NULL`
 *    para que nightly safety net detecte + escale.
 *
 * 5. **PATCH atomic + write_to_notion_at update en misma function**: si PATCH
 *    succeed pero UPDATE PG falla, próximo run reintenta (snapshot sigue
 *    written_to_notion_at=NULL). Idempotente: PATCH Notion mismo valor es
 *    NOOP semántico.
 *
 * 6. **Counter de attempts**: `notion_writeback_attempt_count++` en cada
 *    intento (success o fail). Mass-attempts > 5 → reliability signal alerta.
 *
 * **Throttling rationale (V1 demo)**: low volume <10 tasks/day → reactive
 *  consumer fires every 5 min via Cloud Scheduler ops-reactive-process,
 *  máximo ~3 PATCHes per run. Notion rate limit ~3 req/sec → suficiente headroom.
 *  V2 productive (Sky/Efeonce + cliente) → migrar a Cloud Tasks queue con
 *  rate=3/s explícito.
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-913-rpa-v2-demo-pipeline-end-to-end.md
 * - Upstream emitter: src/lib/sync/projections/notion-rpa-compute-demo.ts
 * - Notion client: src/lib/notion-metrics/notion-demo-client.ts
 * - Notion property target: `RpA` (number) en teamspace Demo Greenhouse
 */

const NOTION_PROPERTY_RPA_V2 = 'RpA'

interface WritebackRequestedDemoPayload {
  schemaVersion?: number
  taskSourceId?: string
  workspaceId?: string
  rpaValue?: number | null
  rpaDataStatus?: string
  snapshotId?: string
  formulaVersion?: string
  computedAt?: string
  metadata?: {
    demo_mode?: boolean
  }
}

export const isWritebackDemoPayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const typed = payload as WritebackRequestedDemoPayload

  return typed.metadata?.demo_mode === true && typed.workspaceId === 'demo'
}

type SnapshotRow = {
  snapshot_id: string
  task_source_id: string
  rpa_value: number | null
  rpa_data_status: string
  written_to_notion_at: Date | string | null
  notion_writeback_attempt_count: number
} & Record<string, unknown>

/**
 * Re-read snapshot from PG (defensive, NUNCA trust payload).
 * Returns null si snapshot no existe (idempotent skip — quizá borrado en
 * cleanup, o snapshotId fake).
 */
const readSnapshotForWriteback = async (
  snapshotId: string
): Promise<SnapshotRow | null> => {
  const rows = await runGreenhousePostgresQuery<SnapshotRow>(
    `SELECT
        snapshot_id,
        task_source_id,
        rpa_value,
        rpa_data_status,
        written_to_notion_at,
        notion_writeback_attempt_count
     FROM greenhouse_delivery.task_rpa_demo_snapshots
     WHERE snapshot_id = $1
       AND workspace_id = 'demo'
     LIMIT 1`,
    [snapshotId]
  )

  return rows[0] ?? null
}

/**
 * UPDATE snapshot post-success: persiste written_to_notion_at + clears error.
 * Append-only triggers exempt para writeback columns (per migration TASK-913 Slice 1).
 */
const markSnapshotWritten = async (
  snapshotId: string,
  notionWritebackEventId: string
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_delivery.task_rpa_demo_snapshots
     SET written_to_notion_at = NOW(),
         notion_writeback_event_id = $2,
         notion_writeback_last_error = NULL,
         notion_writeback_attempt_count = notion_writeback_attempt_count + 1
     WHERE snapshot_id = $1`,
    [snapshotId, notionWritebackEventId]
  )
}

/**
 * UPDATE snapshot post-failure: persiste last_error + increments attempt_count.
 */
const markSnapshotFailed = async (
  snapshotId: string,
  errorMessage: string
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_delivery.task_rpa_demo_snapshots
     SET notion_writeback_last_error = $2,
         notion_writeback_attempt_count = notion_writeback_attempt_count + 1
     WHERE snapshot_id = $1`,
    [snapshotId, errorMessage.slice(0, 1000)] // truncate to avoid runaway
  )
}

export const notionRpaWritebackDemoProjection: ProjectionDefinition = {
  name: 'notion_rpa_writeback_demo',
  description:
    'TASK-913 Slice 2 — PATCH Notion property RpA (demo) con el valor del snapshot. Idempotente (re-reads PG), retryable (counter + last_error). Defense in depth: filter dual demo_mode + workspaceId + token físicamente separado.',
  domain: 'delivery',
  triggerEvents: [EVENT_TYPES.notionTaskMetricsWritebackRequestedDemo],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as WritebackRequestedDemoPayload

    if (!isWritebackDemoPayload(typed)) {
      return null
    }

    const snapshotId = typed.snapshotId?.trim() ?? ''

    if (!snapshotId) {
      return null
    }

    return { entityType: 'rpa_snapshot_demo', entityId: snapshotId }
  },
  refresh: async (_scope, payload) => {
    const typed = payload as unknown as WritebackRequestedDemoPayload

    if (!isWritebackDemoPayload(typed)) {
      return null
    }

    const snapshotId = typed.snapshotId?.trim() ?? ''

    if (!snapshotId) {
      return null
    }

    // Defense layer 4: skip honest cuando token no configurado
    if (!isDemoNotionWritebackConfigured()) {
      captureWithDomain(
        new NotionDemoClientUnavailableError(
          'Demo Notion writeback skipped — NOTION_METRICS_DEMO_TOKEN_SECRET_REF not configured'
        ),
        'integrations.notion',
        {
          level: 'warning',
          tags: { source: 'demo_rpa_writeback', stage: 'config_check' },
          extra: { snapshotId }
        }
      )

      return `rpa_writeback_demo:${snapshotId}:skipped:unconfigured`
    }

    // Defense layer 3: re-read snapshot from PG (NUNCA trust payload value)
    let snapshot: SnapshotRow | null

    try {
      snapshot = await readSnapshotForWriteback(snapshotId)
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'demo_rpa_writeback', stage: 'read_snapshot' },
        extra: { snapshotId }
      })

      throw err
    }

    if (!snapshot) {
      // Snapshot no existe — idempotent skip. Posibles causas:
      // (a) snapshot borrado en cleanup pre-writeback, (b) snapshotId fake.
      // No throw para evitar retry infinito sobre row inexistente.
      return `rpa_writeback_demo:${snapshotId}:skipped:snapshot_missing`
    }

    // Idempotency: si ya escrito a Notion, skip silente
    if (snapshot.written_to_notion_at !== null) {
      return `rpa_writeback_demo:${snapshotId}:idempotent:already_written`
    }

    // Solo escribimos valid + value numérico (defense layer 5)
    if (snapshot.rpa_data_status !== 'valid' || snapshot.rpa_value === null) {
      return `rpa_writeback_demo:${snapshotId}:skipped:not_writable`
    }

    // PATCH Notion
    try {
      await patchNotionDemoPage(snapshot.task_source_id, {
        [NOTION_PROPERTY_RPA_V2]: { number: snapshot.rpa_value }
      })
    } catch (err) {
      // Distinguish "config not ready" vs "real Notion API failure":
      //
      // - `NotionDemoClientUnavailableError` = token not resolved (secret missing
      //   or content corrupt). Degraded honest: skip sin burn attempt_count, sin
      //   Sentry spam, sin mark failed. Next reactive tick reintenta automático;
      //   cuando operador completa setup (uploads token), succeeds. Reliability
      //   signal canonical `writeback_lag_demo` alerta si lag persiste > 30 min.
      //
      // - Cualquier otro error (rate limit, 401 token revocado, 404 page missing,
      //   network) = real failure. Mark failed + capture + re-throw para retry
      //   exponencial canonical (maxRetries=4 → dead-letter).
      if (err instanceof NotionDemoClientUnavailableError) {
        return `rpa_writeback_demo:${snapshotId}:skipped:token_unavailable`
      }

      const message = err instanceof Error ? err.message : String(err)

      // Mark failure first (best effort)
      try {
        await markSnapshotFailed(snapshotId, message)
      } catch (markErr) {
        captureWithDomain(markErr, 'integrations.notion', {
          level: 'warning',
          tags: { source: 'demo_rpa_writeback', stage: 'mark_failed' },
          extra: { snapshotId, originalError: message }
        })
      }

      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'demo_rpa_writeback', stage: 'patch_notion' },
        extra: {
          snapshotId,
          taskSourceId: snapshot.task_source_id,
          rpaValue: snapshot.rpa_value,
          status: (err as Error & { status?: number }).status
        }
      })

      throw err // Re-throw para retry exponencial canonical reactive consumer
    }

    // Success: mark written
    try {
      await markSnapshotWritten(snapshotId, `notion-patch-${Date.now()}`)
    } catch (err) {
      // PATCH succeed pero UPDATE PG falló. Idempotent on retry — PATCH same
      // value is NOOP. Capturar para observability + throw para retry.
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'demo_rpa_writeback', stage: 'mark_written' },
        extra: { snapshotId }
      })

      throw err
    }

    return `rpa_writeback_demo:${snapshotId}:written:${snapshot.rpa_value}`
  },
  maxRetries: 4 // 3 retries + initial = 4 attempts total before dead-letter
}

// Export for tests
export const __testing__ = {
  isWritebackDemoPayload,
  readSnapshotForWriteback,
  markSnapshotWritten,
  markSnapshotFailed,
  NOTION_PROPERTY_RPA_V2
}
