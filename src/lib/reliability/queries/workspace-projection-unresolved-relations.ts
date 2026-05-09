import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-611 — Reliability signal: client portal users sin client_id resoluble.
 *
 * El relationship resolver (Slice 3) bridges `client_users.client_id` →
 * `greenhouse_core.spaces.client_id` → `spaces.organization_id`. Cualquier
 * client user activo SIN `client_id` o con `client_id` que no aparece en
 * spaces es ORFANO — el resolver devolverá `no_relation` y la projection
 * cae en degraded mode silencioso.
 *
 * Detecta esos huérfanos para que ops resuelva (typically: setear el client_id
 * correcto, o desactivar el cliente legacy). Cuenta sostenida > 7 días marca
 * el path degradado de TASK-613 como cuantificado (per spec §6).
 *
 * Steady state esperado: 0.
 * Severity: `error` si count > 0 (cualquier huérfano activo es bug).
 *
 * Pattern source: TASK-780 home-rollout-drift.ts.
 */
export const WORKSPACE_PROJECTION_UNRESOLVED_RELATIONS_SIGNAL_ID =
  'identity.workspace_projection.unresolved_relations'

const QUERY_SQL = `
  WITH client_user_health AS (
    SELECT
      COUNT(*) FILTER (
        WHERE cu.tenant_type = 'client'
          AND COALESCE(cu.active, TRUE) = TRUE
          AND cu.client_id IS NULL
      ) AS missing_client_id,
      COUNT(*) FILTER (
        WHERE cu.tenant_type = 'client'
          AND COALESCE(cu.active, TRUE) = TRUE
          AND cu.client_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM greenhouse_core.spaces s
            WHERE s.client_id = cu.client_id
              AND s.organization_id IS NOT NULL
              AND COALESCE(s.active, TRUE) = TRUE
          )
      ) AS client_id_without_org_bridge
    FROM greenhouse_core.client_users cu
  )
  SELECT
    COALESCE(missing_client_id,            0)::int AS missing_client_id,
    COALESCE(client_id_without_org_bridge, 0)::int AS client_id_without_org_bridge
  FROM client_user_health
`

type DriftRow = {
  missing_client_id: number
  client_id_without_org_bridge: number
} & Record<string, unknown>

export const getWorkspaceProjectionUnresolvedRelationsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<DriftRow>(QUERY_SQL)
    const row = rows[0] ?? { missing_client_id: 0, client_id_without_org_bridge: 0 }

    const missingClientId = Number(row.missing_client_id ?? 0)
    const missingOrgBridge = Number(row.client_id_without_org_bridge ?? 0)
    const totalUnresolved = missingClientId + missingOrgBridge

    const severity: ReliabilitySignal['severity'] = totalUnresolved === 0 ? 'ok' : 'error'

    const summary =
      totalUnresolved === 0
        ? 'Todos los client portal users activos resuelven a una organización vía spaces.'
        : `${totalUnresolved} client portal user${totalUnresolved === 1 ? '' : 's'} no resolverán a ninguna organización: ${missingClientId} sin client_id, ${missingOrgBridge} con client_id que no tiene space activo con organization_id.`

    return {
      signalId: WORKSPACE_PROJECTION_UNRESOLVED_RELATIONS_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getWorkspaceProjectionUnresolvedRelationsSignal',
      label: 'Client portal users sin organización resoluble',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'missing_client_id', value: String(missingClientId) },
        { kind: 'metric', label: 'client_id_without_org_bridge', value: String(missingOrgBridge) },
        { kind: 'metric', label: 'total_unresolved', value: String(totalUnresolved) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md (§6)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_workspace_projection_unresolved_relations' }
    })

    return {
      signalId: WORKSPACE_PROJECTION_UNRESOLVED_RELATIONS_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getWorkspaceProjectionUnresolvedRelationsSignal',
      label: 'Client portal users sin organización resoluble',
      severity: 'unknown',
      summary: 'No fue posible computar el signal. Revisa los logs.',
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
