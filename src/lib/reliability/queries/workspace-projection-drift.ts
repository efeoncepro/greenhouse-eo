import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'
import { FACET_TO_VIEW_CODE } from '@/lib/organization-workspace/facet-view-mapping'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-611 — Reliability signal: facet ↔ viewCode catalog drift.
 *
 * Detecta si `FACET_TO_VIEW_CODE` (TASK-611 Slice 1) referencia un viewCode
 * que NO está declarado en el `VIEW_REGISTRY` canónico de
 * `src/lib/admin/view-access-catalog.ts`. Drift estructural — un rename de
 * viewCode en el registry sin update del mapping = warning.
 *
 * **V1 scope** (decisión Open Question §14.2 V1.1): runtime structural drift.
 * Comparación user-level (subjects con capability pero sin authorizedView)
 * queda como follow-up V1.2 cuando `authorized_views` esté materializado
 * en PG/serving.
 *
 * Steady state esperado: 0. Cualquier valor > 0 → severity `warning`.
 *
 * Pattern source: TASK-780 home-rollout-drift.ts.
 */
export const WORKSPACE_PROJECTION_FACET_VIEW_DRIFT_SIGNAL_ID =
  'identity.workspace_projection.facet_view_drift'

export const getWorkspaceProjectionFacetViewDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const registryViewCodes = new Set(VIEW_REGISTRY.map(entry => entry.viewCode))
    const driftEntries: Array<{ facet: string; viewCode: string }> = []

    for (const [facet, viewCode] of Object.entries(FACET_TO_VIEW_CODE)) {
      if (!registryViewCodes.has(viewCode)) {
        driftEntries.push({ facet, viewCode })
      }
    }

    const driftCount = driftEntries.length
    const severity: ReliabilitySignal['severity'] = driftCount === 0 ? 'ok' : 'error'

    return {
      signalId: WORKSPACE_PROJECTION_FACET_VIEW_DRIFT_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getWorkspaceProjectionFacetViewDriftSignal',
      label: 'Drift facet → viewCode (Organization Workspace)',
      severity,
      summary:
        driftCount === 0
          ? 'Mapping facet → viewCode alineado con view-access-catalog.'
          : `${driftCount} facet${driftCount === 1 ? '' : 's'} apuntan a viewCodes que ya no existen en el registry: ${driftEntries
              .map(entry => `${entry.facet}→${entry.viewCode}`)
              .join(', ')}.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'drift_count', value: String(driftCount) },
        { kind: 'metric', label: 'mapped_facets', value: String(Object.keys(FACET_TO_VIEW_CODE).length) },
        { kind: 'metric', label: 'registry_viewcodes', value: String(registryViewCodes.size) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md (§6, Apéndice B)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_workspace_projection_facet_view_drift' }
    })

    return {
      signalId: WORKSPACE_PROJECTION_FACET_VIEW_DRIFT_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getWorkspaceProjectionFacetViewDriftSignal',
      label: 'Drift facet → viewCode (Organization Workspace)',
      severity: 'unknown',
      summary: 'No fue posible computar el drift. Revisa los logs.',
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
