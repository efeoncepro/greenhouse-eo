import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1285 — Reliability signal: orgs cuya web vive en el raw layer pero NO en la org canónica.
 *
 * Cuenta `greenhouse_core.organizations` activas con `website_url` NULL/vacío cuando la company
 * HubSpot enlazada (`greenhouse_crm.companies` por `hubspot_company_id`) SÍ tiene `website_url`.
 * Es el drift exacto que dejó a Grupo Berel sin su web (`berel.com` vivía en crm.companies pero no
 * se promovía a la org). La capa de detección hace el gap auto-convergente: si un sync futuro
 * crea/actualiza una company sin promover su web, el signal lo levanta y el backfill lo cierra.
 *
 * **Kind**: `drift` (divergencia entre el raw layer y la proyección canónica).
 * **Severidad**: `warning` cuando count > 0 (degradación de data-quality, no bloqueante).
 *
 * Steady state esperado = 0 (post wiring de la promoción + backfill TASK-1285).
 *
 * Pattern reference: `commercial-organization-type-lifecycle-drift.ts` (TASK-991 Slice 0).
 */
export const ORGANIZATION_WEBSITE_URL_UNSYNCED_SIGNAL_ID = 'commercial.organization.website_url_unsynced'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.organizations o
  JOIN greenhouse_crm.companies c ON c.hubspot_company_id = o.hubspot_company_id
  WHERE o.active = TRUE
    AND (o.website_url IS NULL OR o.website_url = '')
    AND c.website_url IS NOT NULL
`

export const getOrganizationWebsiteUrlUnsyncedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: ORGANIZATION_WEBSITE_URL_UNSYNCED_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getOrganizationWebsiteUrlUnsyncedSignal',
      label: 'Organizations sin website_url canónica (la web está sólo en el raw layer)',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Todas las organizations con company HubSpot enlazada tienen su website_url promovida.'
          : `${count} organization${count === 1 ? '' : 's'} con web en greenhouse_crm.companies pero website_url NULL en la org canónica. Cerrar con scripts/account-360/backfill-organization-website-url.ts --apply (TASK-1285).`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "SELECT COUNT(*) FROM greenhouse_core.organizations o JOIN greenhouse_crm.companies c ON c.hubspot_company_id=o.hubspot_company_id WHERE o.active AND (o.website_url IS NULL OR o.website_url='') AND c.website_url IS NOT NULL"
        },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/complete/TASK-1285-canonical-organization-website-url.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_organization_website_url_unsynced' }
    })

    return {
      signalId: ORGANIZATION_WEBSITE_URL_UNSYNCED_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getOrganizationWebsiteUrlUnsyncedSignal',
      label: 'Organizations sin website_url canónica (la web está sólo en el raw layer)',
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
