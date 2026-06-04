import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-991 Slice 0 — Reliability signal: organizations active_client sin Space operativo.
 *
 * Cuenta `greenhouse_core.organizations` en etapa `active_client` que NO tienen
 * fila en `greenhouse_core.spaces` (LEFT JOIN por `organization_id`). Un cliente
 * activo sin Space no tiene unidad operativa: el facet Delivery del Account 360
 * queda vacío y no se pueden declarar Sample Sprints (requieren `space_id`).
 *
 * **Kind**: `data_quality` (facet operativo faltante).
 * **Severidad**: `warning` cuando count > 0.
 *
 * Steady state esperado = 0 (la creación del Space es paso del onboarding —
 * TASK-992; este signal lo hace visible mientras tanto).
 *
 * Pattern reference: `finance-client-profile-unlinked.ts` (TASK-613).
 */
export const COMMERCIAL_CLIENT_ACTIVE_WITHOUT_SPACE_SIGNAL_ID =
  'commercial.client.active_without_space'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.organizations o
  LEFT JOIN greenhouse_core.spaces s
    ON s.organization_id = o.organization_id
  WHERE o.lifecycle_stage = 'active_client'
    AND s.organization_id IS NULL
`

export const getCommercialClientActiveWithoutSpaceSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<{ n: number }>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)

      return {
        signalId: COMMERCIAL_CLIENT_ACTIVE_WITHOUT_SPACE_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'data_quality',
        source: 'getCommercialClientActiveWithoutSpaceSignal',
        label: 'Organizations active_client sin Space operativo',
        severity: count === 0 ? 'ok' : 'warning',
        summary:
          count === 0
            ? 'Todas las organizations active_client tienen al menos un Space operativo.'
            : `${count} organization${count === 1 ? '' : 's'} active_client sin Space. El facet Delivery del Account 360 queda vacío y no se pueden declarar Sample Sprints. Crear el Space desde Admin Accounts o el flujo de onboarding (TASK-992).`,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "SELECT COUNT(*) FROM greenhouse_core.organizations o LEFT JOIN greenhouse_core.spaces s ON s.organization_id=o.organization_id WHERE o.lifecycle_stage='active_client' AND s.organization_id IS NULL"
          },
          { kind: 'metric', label: 'count', value: String(count) },
          {
            kind: 'doc',
            label: 'Spec',
            value: 'docs/tasks/in-progress/TASK-991-canonical-client-birth-lifecycle.md (Slice 0)'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'commercial', {
        tags: { source: 'reliability_signal_commercial_client_active_without_space' }
      })

      return {
        signalId: COMMERCIAL_CLIENT_ACTIVE_WITHOUT_SPACE_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'data_quality',
        source: 'getCommercialClientActiveWithoutSpaceSignal',
        label: 'Organizations active_client sin Space operativo',
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
