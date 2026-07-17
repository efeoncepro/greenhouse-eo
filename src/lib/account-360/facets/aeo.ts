import 'server-only'

import { observeAndRethrow } from '@/lib/account-360/facet-observability'
import { listOperatorCrossOrgAeoScores } from '@/lib/growth/ai-visibility/store'
import type { AccountAeoFacet, AccountScope } from '@/types/account-complete-360'

/**
 * TASK-1276 — Facet AEO del Account 360 (data-plane, nodo S12 EPIC-020).
 *
 * Reusa el agregado gobernado del cockpit operador (`listOperatorCrossOrgAeoScores`, TASK-1287):
 * NO forkea el cálculo de score ni consulta runs directo. La org sin módulo AEO resuelve
 * `hasAeoModule: false` (facet honesto, sin datos sintéticos). La autorización del facet vive en
 * las capas canónicas (facet-authorization + workspace projection con la capability operador) —
 * este fetch es data-plane puro, como el resto de los facets.
 */
export const fetchAeoFacet = async (scope: AccountScope): Promise<AccountAeoFacet> => {
  const rows = await listOperatorCrossOrgAeoScores().catch(observeAndRethrow('growth', 'account360.aeo.scores'))

  const row = rows.find(r => r.organizationId === scope.organizationId)

  if (!row) {
    return { hasAeoModule: false, aeoTier: null, latestScore: null, latestRunAt: null }
  }

  return {
    hasAeoModule: true,
    aeoTier: row.aeoTier,
    latestScore: row.latestScore,
    latestRunAt: row.latestRunAt
  }
}
