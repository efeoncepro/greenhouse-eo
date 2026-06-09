import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const ORGANIZATION_BRAND_ASSET_COVERAGE_SIGNAL_ID = 'identity.organization_brand_asset.coverage_gap'
export const ORGANIZATION_BRAND_ASSET_DISCOVERY_FAILURE_SIGNAL_ID =
  'identity.organization_brand_asset.discovery_failures'

export const getOrganizationBrandAssetCoverageSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ total: number; missing: number; pending: number }>(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE logo_asset_id IS NULL)::int AS missing,
          (
            SELECT COUNT(*)::int
            FROM greenhouse_core.organization_brand_asset_candidates
            WHERE status = 'pending_review'
          ) AS pending
        FROM greenhouse_core.organizations
        WHERE is_operating_entity = FALSE
      `
    )

    const total = Number(rows[0]?.total ?? 0)
    const missing = Number(rows[0]?.missing ?? 0)
    const pending = Number(rows[0]?.pending ?? 0)

    return {
      signalId: ORGANIZATION_BRAND_ASSET_COVERAGE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getOrganizationBrandAssetCoverageSignal',
      label: 'Organizaciones sin logo comercial',
      severity: missing === 0 ? 'ok' : 'warning',
      summary:
        missing === 0
          ? 'Todas las organizaciones no-operating tienen logo comercial canónico.'
          : `${missing} de ${total} organizaciones no-operating no tienen logo comercial canónico. ${pending} candidato${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de revisión.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'non_operating_organizations', value: String(total) },
        { kind: 'metric', label: 'missing_logo', value: String(missing) },
        { kind: 'metric', label: 'pending_candidates', value: String(pending) },
        {
          kind: 'doc',
          label: 'Task',
          value: 'docs/tasks/in-progress/TASK-999-organization-brand-asset-enrichment.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_organization_brand_asset_coverage' }
    })

    return {
      signalId: ORGANIZATION_BRAND_ASSET_COVERAGE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getOrganizationBrandAssetCoverageSignal',
      label: 'Organizaciones sin logo comercial',
      severity: 'unknown',
      summary: 'No fue posible leer la cobertura de logos comerciales.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}

export const getOrganizationBrandAssetDiscoveryFailuresSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ failed: number }>(
      `
        SELECT COUNT(*)::int AS failed
        FROM greenhouse_core.organization_brand_asset_candidates
        WHERE status = 'failed'
          AND discovered_at >= NOW() - INTERVAL '24 hours'
      `
    )

    const failed = Number(rows[0]?.failed ?? 0)

    return {
      signalId: ORGANIZATION_BRAND_ASSET_DISCOVERY_FAILURE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getOrganizationBrandAssetDiscoveryFailuresSignal',
      label: 'Discovery de logos con fallas recientes',
      severity: failed === 0 ? 'ok' : failed > 10 ? 'error' : 'warning',
      summary:
        failed === 0
          ? 'No hay fallas recientes en discovery de logos comerciales.'
          : `${failed} candidato${failed === 1 ? '' : 's'} de logo fallaron en las últimas 24 horas. Revisar metadata pública, MIME soportado o tamaño de imagen.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'failed_last_24h', value: String(failed) },
        {
          kind: 'doc',
          label: 'Task',
          value: 'docs/tasks/in-progress/TASK-999-organization-brand-asset-enrichment.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_organization_brand_asset_discovery_failures' }
    })

    return {
      signalId: ORGANIZATION_BRAND_ASSET_DISCOVERY_FAILURE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getOrganizationBrandAssetDiscoveryFailuresSignal',
      label: 'Discovery de logos con fallas recientes',
      severity: 'unknown',
      summary: 'No fue posible leer las fallas recientes de discovery de logos.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
