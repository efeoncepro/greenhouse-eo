import { redirect } from 'next/navigation'

import AdminCenterView from '@/views/greenhouse/admin/AdminCenterView'
import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { getAdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import { getGcpBillingOverview } from '@/lib/cloud/gcp-billing'
import { getGitHubBillingOverview } from '@/lib/cloud/github-billing'
import { getVercelBillingOverview } from '@/lib/cloud/vercel-billing'
import { getInternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'
import { getNotionSyncOperationalOverview } from '@/lib/integrations/notion-sync-operational-overview'
import { getOperationsOverview } from '@/lib/operations/get-operations-overview'
import { getLatestAiObservationsByScope } from '@/lib/reliability/ai/reader'
import { getReliabilityOverview } from '@/lib/reliability/get-reliability-overview'
import { AI_OBSERVER_UNHEALTHY_SIGNAL_ID } from '@/lib/reliability/queries/ai-observer-unhealthy'
import { getReliabilityRegistry } from '@/lib/reliability/registry-store'
import {
  getLatestSweepRun,
  getLatestSyntheticSnapshotsByRoute
} from '@/lib/reliability/synthetic/reader'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.admin_center',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  const [
    access,
    tenants,
    controlTower,
    operations,
    billing,
    vercelBilling,
    githubBilling,
    notionOperational,
    syntheticSnapshots,
    syntheticSweep,
    reliabilityModules,
    aiObservations
  ] = await Promise.all([
    getAdminAccessOverview(),
    getAdminTenantsOverview(),
    getInternalDashboardOverview(),
    getOperationsOverview(),
    getGcpBillingOverview().catch(() => null),
    getVercelBillingOverview().catch(() => null),
    getGitHubBillingOverview().catch(() => null),
    getNotionSyncOperationalOverview().catch(() => null),
    getLatestSyntheticSnapshotsByRoute().catch(() => []),
    getLatestSweepRun().catch(() => null),

    // TASK-635: módulos resueltos por el store DB-aware (defaults DB +
    // overlay overrides para `tenant.spaceId` cuando existe). Fallback al
    // STATIC_RELIABILITY_REGISTRY si DB falla.
    getReliabilityRegistry(tenant.spaceId ?? null).catch(() => null),

    // TASK-638: AI Observer observations (overview + per-module). Si el
    // kill-switch está OFF o el runner aún no corrió, retorna null y la UI
    // degrada al banner "AI Observer no activo todavía".
    getLatestAiObservationsByScope().catch(() => null)
  ])

  const reliability = await getReliabilityOverview(operations, {
    billing,
    vercelBilling,
    githubBilling,
    notionOperational,
    syntheticSnapshots,
    modules: reliabilityModules,
    aiObservations
  })

  // TASK-937 — Liveness del AI Observer desde el signal `reliability.ai_observer.unhealthy`
  // (heartbeat). Decide el estado del banner del card sin acoplarlo a la frescura del overview.
  const aiObserverSignal = reliability.modules
    .flatMap(module => module.signals)
    .find(signal => signal.signalId === AI_OBSERVER_UNHEALTHY_SIGNAL_ID)

  const aiObserverLiveness = aiObserverSignal
    ? { severity: aiObserverSignal.severity, summary: aiObserverSignal.summary }
    : null

  return (
    <AdminCenterView
      access={access}
      tenants={tenants}
      controlTower={controlTower}
      operations={operations}
      reliability={reliability}
      syntheticSnapshots={syntheticSnapshots}
      syntheticSweep={syntheticSweep}
      aiObservation={aiObservations?.overview ?? null}
      aiModuleObservations={
        aiObservations
          ? Object.entries(aiObservations.byModule).map(([moduleKey, obs]) => ({
              moduleKey,
              severity: obs.severity,
              summary: obs.summary,
              recommendedAction: obs.recommendedAction
            }))
          : []
      }
      aiObserverLiveness={aiObserverLiveness}
    />
  )
}
