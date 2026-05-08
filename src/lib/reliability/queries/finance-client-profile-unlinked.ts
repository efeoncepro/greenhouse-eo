import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-613 Slice 3 — Reliability signal: client_profiles sin organization_id canónica.
 *
 * Cuenta `greenhouse_finance.client_profiles` activas (`active=TRUE`) cuya
 * `organization_id IS NULL`. El backbone canónico 360 (TASK-535) requiere que
 * todo `client_profile` tenga su `organization_id` resuelto — sin él la URL
 * `/finance/clients/[id]` no puede componer la projection del Organization
 * Workspace shell (TASK-611/612/613) y el page cae al legacy `<ClientDetailView>`
 * como degradación honesta.
 *
 * Cualquier valor > 0 indica:
 *  - Profile creado por un path histórico (anterior a TASK-535) que aún no fue
 *    backfilled. Acción: re-correr el backfill de `client_profile.organization_id`
 *    o linkear manualmente desde Admin Center.
 *  - O un break en el writer canónico de profiles (e.g. nuevo onboarding flow
 *    que omite `organization_id`).
 *
 * Steady state esperado = 0.
 *
 * **Kind**: `data_quality` (drift entre el contrato 360 y el dataset).
 * **Severidad**: `warning` cuando count > 0 (degradación silenciosa, no breakage).
 *
 * Pattern reference: TASK-766 Slice 2 reliability queries
 * (`expense-payments-clp-drift.ts`).
 */
export const FINANCE_CLIENT_PROFILE_UNLINKED_SIGNAL_ID =
  'finance.client_profile.unlinked_organizations'

// `client_profiles` no tiene columna `active` — la tabla es append-only y
// el linkeo canónico al modelo 360 es la única dimensión relevante para este
// signal. Si emerge necesidad de filtrar por estado de cliente, el JOIN
// canónico es contra `greenhouse_core.clients` (no contra `client_profiles`).
const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_finance.client_profiles
  WHERE organization_id IS NULL
`

export const getFinanceClientProfileUnlinkedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: FINANCE_CLIENT_PROFILE_UNLINKED_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getFinanceClientProfileUnlinkedSignal',
      label: 'Client profiles sin organization_id canónica',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Todos los client_profiles activos tienen organization_id canónica resuelta.'
          : `${count} client_profile${count === 1 ? '' : 's'} activo${count === 1 ? '' : 's'} sin organization_id. /finance/clients/[id] cae al legacy detail view en estos casos. Re-corre el backfill de organizations o linkea manualmente desde Admin Center.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            'SELECT COUNT(*) FROM greenhouse_finance.client_profiles WHERE organization_id IS NULL AND active = TRUE'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-613-finance-clients-organization-workspace-convergence.md (slice 3)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_finance_client_profile_unlinked' }
    })

    return {
      signalId: FINANCE_CLIENT_PROFILE_UNLINKED_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getFinanceClientProfileUnlinkedSignal',
      label: 'Client profiles sin organization_id canónica',
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
