import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-794 — Chile honorarios RUT-unverified signal.
 *
 * Cuenta engagements `honorarios_cl` NO terminales (status NOT IN ('ended',
 * 'cancelled')) cuyo `profile_id` NO tiene un documento `CL_RUT` (país `CL`) con
 * `verification_status='verified'`. Estos engagements no pueden generar un payable
 * pagable: el gate de readiness `rut_unverified` (TASK-794) los bloquea fail-closed
 * antes de llegar a Finance. Es el análogo contractor de
 * `identity.legal_profile.payroll_chile_blocking_finiquito` (que cubre members
 * Chile dependientes para finiquito).
 *
 * **Kind**: `data_quality`. Steady state esperado: 0 (todo honorarios activo
 * debería tener su RUT verificado vía person-legal-profile).
 * **Subsystem rollup**: `Identity & Access` (moduleKey=identity), junto al resto
 * de signals de lifecycle de relaciones laborales contractor.
 * **Severity matrix**:
 *   - count = 0 → ok
 *   - count > 0 → warning (honorarios activo sin RUT verificado; payable bloqueado)
 *   - query falla → unknown
 *
 * Pattern fuente: mirror de `getContractorEngagementClassificationRiskOpenSignal`
 * (TASK-790) + SQL de `getIdentityLegalProfilePayrollBlockingSignal` (TASK-784).
 */
export const CONTRACTOR_PAYABLE_HONORARIOS_RUT_UNVERIFIED_SIGNAL_ID =
  'hr.contractor_payable.honorarios_rut_unverified'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.contractor_engagements e
  WHERE e.relationship_subtype = 'honorarios_cl'
    AND e.status NOT IN ('ended', 'cancelled')
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_core.person_identity_documents d
      WHERE d.profile_id = e.profile_id
        AND d.document_type = 'CL_RUT'
        AND d.country_code = 'CL'
        AND d.verification_status = 'verified'
    )
`

type RutUnverifiedQueryRow = {
  n: number
}

export const getContractorPayableHonorariosRutUnverifiedSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<RutUnverifiedQueryRow>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)
      const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

      const summary =
        count === 0
          ? 'Sin honorarios activos pendientes de RUT verificado.'
          : `${count} engagement${count === 1 ? '' : 's'} honorarios activo${count === 1 ? '' : 's'} sin RUT chileno verificado (payable bloqueado por readiness).`

      return {
        signalId: CONTRACTOR_PAYABLE_HONORARIOS_RUT_UNVERIFIED_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'data_quality',
        source: 'getContractorPayableHonorariosRutUnverifiedSignal',
        label: 'Honorarios sin RUT verificado',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "greenhouse_hr.contractor_engagements e WHERE relationship_subtype='honorarios_cl' AND status NOT IN ('ended','cancelled') AND NOT EXISTS (CL_RUT verified for e.profile_id)"
          },
          {
            kind: 'metric',
            label: 'count',
            value: String(count)
          },
          {
            kind: 'doc',
            label: 'Spec',
            value:
              'docs/tasks/in-progress/TASK-794-chile-honorarios-compliance-sii-retention.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'reliability_signal_contractor_payable_honorarios_rut_unverified' }
      })

      return {
        signalId: CONTRACTOR_PAYABLE_HONORARIOS_RUT_UNVERIFIED_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'data_quality',
        source: 'getContractorPayableHonorariosRutUnverifiedSignal',
        label: 'Honorarios sin RUT verificado',
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
