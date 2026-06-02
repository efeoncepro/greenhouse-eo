import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-991 Slice 0 — Reliability signal: organizations client-grade sin identidad tributaria.
 *
 * Cuenta `greenhouse_core.organizations` que YA son client-grade (etapa
 * `active_client` o `organization_type IN ('client','both')`) pero les falta
 * identidad tributaria (`tax_id` o `legal_name` NULL). Sin `tax_id` la
 * conciliación SII/Nubox no puede anclar documentos (caso Berel: factura de
 * exportación `28800562` huérfana porque la org no tenía RFC).
 *
 * IMPORTANTE — alcance acotado a client-grade a propósito: un `prospect` con
 * `hubspot_company_id` y sin `tax_id` es NORMAL (no es cliente todavía). Medir
 * "hubspot-linked sin tax_id" sin acotar daría ~119 falsos positivos (prospects
 * legítimos). El drift accionable es solo sobre orgs que ya son clientes.
 *
 * **Kind**: `data_quality` (completitud de identidad, no breakage estructural).
 * **Severidad**: `warning` cuando count > 0.
 *
 * Steady state esperado = 0 (post derivación de identidad desde origin, Slice 2 +
 * remediación Slice 3).
 *
 * Pattern reference: `finance-client-profile-unlinked.ts` (TASK-613).
 */
export const COMMERCIAL_ORGANIZATION_INCOMPLETE_IDENTITY_SIGNAL_ID =
  'commercial.organization.incomplete_identity'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.organizations
  WHERE (lifecycle_stage = 'active_client'
         OR COALESCE(organization_type, 'other') IN ('client', 'both'))
    AND (tax_id IS NULL OR NULLIF(TRIM(legal_name), '') IS NULL)
`

export const getCommercialOrganizationIncompleteIdentitySignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<{ n: number }>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)

      return {
        signalId: COMMERCIAL_ORGANIZATION_INCOMPLETE_IDENTITY_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'data_quality',
        source: 'getCommercialOrganizationIncompleteIdentitySignal',
        label: 'Organizations client-grade sin identidad tributaria (tax_id/legal_name)',
        severity: count === 0 ? 'ok' : 'warning',
        summary:
          count === 0
            ? 'Todas las organizations client-grade tienen tax_id y legal_name.'
            : `${count} organization${count === 1 ? '' : 's'} client-grade sin tax_id o legal_name. La conciliación SII/Nubox no puede anclar documentos (facturas quedan huérfanas). Derivar identidad desde el origin (TASK-991 Slice 2) o completar manualmente.`,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "SELECT COUNT(*) FROM greenhouse_core.organizations WHERE (lifecycle_stage='active_client' OR organization_type IN ('client','both')) AND (tax_id IS NULL OR legal_name IS NULL)"
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
        tags: { source: 'reliability_signal_commercial_org_incomplete_identity' }
      })

      return {
        signalId: COMMERCIAL_ORGANIZATION_INCOMPLETE_IDENTITY_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'data_quality',
        source: 'getCommercialOrganizationIncompleteIdentitySignal',
        label: 'Organizations client-grade sin identidad tributaria (tax_id/legal_name)',
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
