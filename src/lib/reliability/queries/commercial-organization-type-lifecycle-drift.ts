import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-991 Slice 0 — Reliability signal: organizations con lifecycle/type drift.
 *
 * Cuenta `greenhouse_core.organizations` cuya etapa comercial es `active_client`
 * pero cuyo `organization_type` NO es client-capable (`client`/`both`). Es el
 * drift exacto que dejó a Grupo Berel invisible en Finanzas: nació por la puerta
 * HubSpot (`createPartyFromHubSpotCompany`) que escribe `lifecycle_stage` pero
 * NUNCA `organization_type`, mientras el filtro de la lista de clientes exige
 * `COALESCE(organization_type,'other') IN ('client','both')`
 * (`src/app/api/finance/clients/route.ts`).
 *
 * `organization_type` y `lifecycle_stage` son dos columnas ortogonales que deben
 * reconciliarse: un `active_client` SIEMPRE debe ser `client` o `both`. TASK-991
 * Slice 1 introduce `deriveOrganizationType` + un CHECK constraint de consistencia;
 * este signal es la capa de detección (defense-in-depth) que confirma steady=0.
 *
 * **Kind**: `drift` (divergencia estructural entre dos columnas canónicas).
 * **Severidad**: `error` cuando count > 0 (la org queda invisible/inconsistente).
 *
 * Steady state esperado = 0 (post Slice 1 + remediación Slice 3).
 *
 * Pattern reference: `finance-client-profile-unlinked.ts` (TASK-613).
 */
export const COMMERCIAL_ORGANIZATION_TYPE_LIFECYCLE_DRIFT_SIGNAL_ID =
  'commercial.organization.type_lifecycle_drift'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.organizations
  WHERE lifecycle_stage = 'active_client'
    AND COALESCE(organization_type, 'other') NOT IN ('client', 'both')
`

export const getCommercialOrganizationTypeLifecycleDriftSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<{ n: number }>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)

      return {
        signalId: COMMERCIAL_ORGANIZATION_TYPE_LIFECYCLE_DRIFT_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'drift',
        source: 'getCommercialOrganizationTypeLifecycleDriftSignal',
        label: 'Organizations active_client con organization_type inconsistente',
        severity: count === 0 ? 'ok' : 'error',
        summary:
          count === 0
            ? 'Todas las organizations active_client tienen organization_type client-capable (client/both).'
            : `${count} organization${count === 1 ? '' : 's'} active_client con organization_type NOT IN (client,both). Quedan invisibles en la lista de clientes de Finanzas. Remediar con scripts/commercial/remediate-half-baked-orgs.ts (TASK-991 Slice 3).`,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "SELECT COUNT(*) FROM greenhouse_core.organizations WHERE lifecycle_stage='active_client' AND COALESCE(organization_type,'other') NOT IN ('client','both')"
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
        tags: { source: 'reliability_signal_commercial_org_type_lifecycle_drift' }
      })

      return {
        signalId: COMMERCIAL_ORGANIZATION_TYPE_LIFECYCLE_DRIFT_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'drift',
        source: 'getCommercialOrganizationTypeLifecycleDriftSignal',
        label: 'Organizations active_client con organization_type inconsistente',
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
