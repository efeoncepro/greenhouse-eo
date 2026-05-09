import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-836 Slice 7 — reliability signal reader.
 *
 * Defense-in-depth detection contra el trigger PG `services_lineage_protection_trigger`
 * (Slice 2). El trigger debería bloquear:
 *   - chain regular -> regular
 *   - parent missing
 *   - parent legacy_seed_archived
 *   - auto-referencia
 *
 * Este signal cuenta cualquier fila que llegue al estado patológico — si el
 * trigger funcionara como debe, count = 0 siempre. Si emite > 0, indica:
 *   (a) un bypass del trigger (e.g. via session_replication_role='replica'),
 *   (b) un bug en el trigger,
 *   (c) un service legacy histórico que predates el trigger.
 *
 * Steady state esperado = 0.
 * Severidad = error cuando count > 0.
 */

export const SERVICE_ENGAGEMENT_LINEAGE_ORPHAN_SIGNAL_ID = 'commercial.service_engagement.lineage_orphan'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.services s
  WHERE s.parent_service_id IS NOT NULL
    AND s.status != 'legacy_seed_archived'
    AND (
      -- Caso 1: parent_service_id apunta a si mismo (self-reference invalida)
      s.parent_service_id = s.service_id
      OR
      -- Caso 2: parent missing
      NOT EXISTS (
        SELECT 1 FROM greenhouse_core.services p
          WHERE p.service_id = s.parent_service_id
      )
      OR
      -- Caso 3: child es regular AND parent es regular (chain regular->regular invalida)
      EXISTS (
        SELECT 1 FROM greenhouse_core.services p
          WHERE p.service_id = s.parent_service_id
            AND p.engagement_kind = 'regular'
            AND s.engagement_kind = 'regular'
      )
      OR
      -- Caso 4: parent legacy_seed_archived
      EXISTS (
        SELECT 1 FROM greenhouse_core.services p
          WHERE p.service_id = s.parent_service_id
            AND p.status = 'legacy_seed_archived'
      )
    )
`

export const getServiceEngagementLineageOrphanSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: SERVICE_ENGAGEMENT_LINEAGE_ORPHAN_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'data_quality',
      source: 'getServiceEngagementLineageOrphanSignal',
      label: 'Service lineage orphan',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin lineage orphans: todo parent_service_id resuelve a parent valido (non-regular o operativo).'
          : `${count} ${count === 1 ? 'servicio tiene' : 'servicios tienen'} lineage inválida (parent missing, regular->regular, legacy o auto-referencia). Revisar trigger services_lineage_protection_trigger.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'services WHERE parent_service_id resolves to invalid parent (4 cases checked)'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Trigger',
          value: 'greenhouse_core.services_lineage_protection_trigger (TASK-836 Slice 2)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_service_engagement_lineage_orphan' }
    })

    return {
      signalId: SERVICE_ENGAGEMENT_LINEAGE_ORPHAN_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'data_quality',
      source: 'getServiceEngagementLineageOrphanSignal',
      label: 'Service lineage orphan',
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
