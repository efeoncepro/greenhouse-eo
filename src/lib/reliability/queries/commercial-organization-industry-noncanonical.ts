import 'server-only'

import { HUBSPOT_INDUSTRIES } from '@/config/hubspot-industries'
import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-997 Slice 1 — Reliability signal: organizations con `industry` fuera del
 * enum canónico HubSpot (`src/config/hubspot-industries.ts`).
 *
 * La industria es una Controlled Vocabulary alineada al enum `companies.industry`
 * de HubSpot. El wizard de alta guarda el `value` estable (ej. 'RETAIL'). Este
 * signal cuenta filas con texto libre residual (legacy "Minoristas", o un valor no
 * presente en el SSOT) — drift de calidad de datos que rompe reportes/segmentación.
 *
 * **Kind**: `data_quality` (completitud/consistencia, no breakage estructural).
 * **Severidad**: `warning` cuando count > 0. **Soft** a propósito: el enum HubSpot
 * puede crecer (custom industries) — no hay CHECK duro; el signal es el detector.
 *
 * Steady state esperado = 0 (post combobox del wizard + coerción de legacy).
 *
 * Pattern reference: `commercial-organization-incomplete-identity.ts` (TASK-991 Slice 0).
 */
export const COMMERCIAL_ORGANIZATION_INDUSTRY_NONCANONICAL_SIGNAL_ID =
  'commercial.organization.industry_noncanonical'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.organizations
  WHERE NULLIF(TRIM(industry), '') IS NOT NULL
    AND industry <> ALL($1::text[])
`

const CANONICAL_INDUSTRY_VALUES = HUBSPOT_INDUSTRIES.map(option => option.value)

export const getCommercialOrganizationIndustryNoncanonicalSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<{ n: number }>(QUERY_SQL, [CANONICAL_INDUSTRY_VALUES])
      const count = Number(rows[0]?.n ?? 0)

      return {
        signalId: COMMERCIAL_ORGANIZATION_INDUSTRY_NONCANONICAL_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'data_quality',
        source: 'getCommercialOrganizationIndustryNoncanonicalSignal',
        label: 'Organizations con industria fuera del enum canónico HubSpot',
        severity: count === 0 ? 'ok' : 'warning',
        summary:
          count === 0
            ? 'Todas las organizations con industria usan un valor canónico de HubSpot.'
            : `${count} organization${count === 1 ? '' : 's'} con industria fuera del enum HubSpot (texto libre residual). El combobox del wizard de alta (TASK-997) la alinea; remediar las legacy con el valor canónico.`,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              'SELECT COUNT(*) FROM greenhouse_core.organizations WHERE NULLIF(TRIM(industry), \'\') IS NOT NULL AND industry <> ALL($canonical_hubspot_industry_values)'
          },
          { kind: 'metric', label: 'count', value: String(count) },
          {
            kind: 'doc',
            label: 'Spec',
            value:
              'docs/tasks/in-progress/TASK-997-wizard-canonical-external-reference-association.md (Slice 1)'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'commercial', {
        tags: { source: 'reliability_signal_commercial_org_industry_noncanonical' }
      })

      return {
        signalId: COMMERCIAL_ORGANIZATION_INDUSTRY_NONCANONICAL_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'data_quality',
        source: 'getCommercialOrganizationIndustryNoncanonicalSignal',
        label: 'Organizations con industria fuera del enum canónico HubSpot',
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
