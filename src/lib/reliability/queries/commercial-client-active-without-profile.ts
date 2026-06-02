import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-991 Slice 0 — Reliability signal: organizations active_client sin client_profile.
 *
 * Cuenta `greenhouse_core.organizations` en etapa `active_client` que NO tienen
 * fila en `greenhouse_finance.client_profiles` (LEFT JOIN por `organization_id`).
 * Un cliente activo sin perfil financiero no puede facturarse ni aparece completo
 * en el facet Finanzas del Account 360. El path canónico que crea el profile es
 * `instantiateClientForParty` (al promover a `active_client`); un count > 0 indica
 * que la promoción ocurrió sin materializar el facet financiero.
 *
 * **Kind**: `data_quality` (facet faltante, no breakage estructural).
 * **Severidad**: `warning` cuando count > 0.
 *
 * Steady state esperado = 0.
 *
 * Pattern reference: `finance-client-profile-unlinked.ts` (TASK-613). Es el
 * espejo inverso: aquel mide profiles sin org; éste mide orgs (active) sin profile.
 */
export const COMMERCIAL_CLIENT_ACTIVE_WITHOUT_PROFILE_SIGNAL_ID =
  'commercial.client.active_without_profile'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.organizations o
  LEFT JOIN greenhouse_finance.client_profiles cp
    ON cp.organization_id = o.organization_id
  WHERE o.lifecycle_stage = 'active_client'
    AND cp.organization_id IS NULL
`

export const getCommercialClientActiveWithoutProfileSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<{ n: number }>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)

      return {
        signalId: COMMERCIAL_CLIENT_ACTIVE_WITHOUT_PROFILE_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'data_quality',
        source: 'getCommercialClientActiveWithoutProfileSignal',
        label: 'Organizations active_client sin client_profile financiero',
        severity: count === 0 ? 'ok' : 'warning',
        summary:
          count === 0
            ? 'Todas las organizations active_client tienen client_profile financiero.'
            : `${count} organization${count === 1 ? '' : 's'} active_client sin client_profile. El facet Finanzas del Account 360 queda vacío y no se puede facturar. Completar el facet vía instantiateClientForParty o el flujo de onboarding (TASK-992).`,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "SELECT COUNT(*) FROM greenhouse_core.organizations o LEFT JOIN greenhouse_finance.client_profiles cp ON cp.organization_id=o.organization_id WHERE o.lifecycle_stage='active_client' AND cp.organization_id IS NULL"
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
        tags: { source: 'reliability_signal_commercial_client_active_without_profile' }
      })

      return {
        signalId: COMMERCIAL_CLIENT_ACTIVE_WITHOUT_PROFILE_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'data_quality',
        source: 'getCommercialClientActiveWithoutProfileSignal',
        label: 'Organizations active_client sin client_profile financiero',
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
