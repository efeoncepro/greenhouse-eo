import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import { isCtaEngineEnabled, isCtaSuppressionEnforcementEnabled } from '@/lib/growth/ctas/flags'
import { getKillSwitchState, listKillSwitchAudit } from '@/lib/growth/ctas/kill-switch'
import { listCtasAdmin, listCtaSurfacesAdmin } from '@/lib/growth/ctas/readers'
import { captureWithDomain } from '@/lib/observability/capture'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import GrowthCtasGovernanceView from '@/views/greenhouse/growth/ctas/GrowthCtasGovernanceView'

/**
 * TASK-1430 — Cockpit operator de CTAs bajo el menú Growth (evolución de la
 * gobernanza TASK-1340). Guard: viewCode `gestion.growth_ctas` + capability
 * `growth.cta.read`; las capabilities finas (`author`/`publish`/`pause`) se
 * resuelven acá y gatean affordances — la API admin re-valida siempre.
 * Data server-side vía readers canónicos (Full API Parity); kill switch +
 * audit de TASK-1428; degradación por región si una lectura falla.
 */
export const metadata: Metadata = { title: 'CTAs — Cockpit | Growth | Greenhouse' }
export const dynamic = 'force-dynamic'

const VIEW_CODE = 'gestion.growth_ctas'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')
  if (tenant.tenantType === 'client') redirect('/401')

  const authorized =
    hasAuthorizedViewCode({
      tenant,
      viewCode: VIEW_CODE,
      fallback: tenant.routeGroups.includes('internal') || tenant.routeGroups.includes('admin')
    }) && can(tenant, 'growth.cta.read', 'read', 'tenant')

  if (!authorized) redirect('/401')

  const capabilities = {
    canAuthor: can(tenant, 'growth.cta.author', 'execute', 'tenant'),
    canPublish: can(tenant, 'growth.cta.publish', 'execute', 'tenant'),
    canPause: can(tenant, 'growth.cta.pause', 'execute', 'tenant')
  }

  const engineEnabled = isCtaEngineEnabled()
  const suppressionEnforced = isCtaSuppressionEnforcementEnabled()

  // Kill switch degrada por región (jamás bloquea inventario/lifecycle).
  let killState = { globalKilled: false, killedSurfaceIds: [] as string[] }
  let killAudit: Awaited<ReturnType<typeof listKillSwitchAudit>> = []

  try {
    ;[killState, killAudit] = await Promise.all([getKillSwitchState(), listKillSwitchAudit(10)])
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ctas_cockpit_kill_switch_read' } })
  }

  const killAuditVm = killAudit.map(entry => ({
    killEventId: entry.killEventId,
    scope: entry.scope,
    surfaceId: entry.surfaceId,
    action: entry.action,
    reason: entry.reason,
    actorRef: entry.actorRef,
    createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : String(entry.createdAt)
  }))

  try {
    const [ctas, surfaces] = await Promise.all([listCtasAdmin(), listCtaSurfacesAdmin()])

    return (
      <GrowthCtasGovernanceView
        ctas={ctas}
        surfaces={surfaces}
        engineEnabled={engineEnabled}
        suppressionEnforced={suppressionEnforced}
        killState={killState}
        killAudit={killAuditVm}
        capabilities={capabilities}
      />
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ctas_governance_page' } })

    return (
      <GrowthCtasGovernanceView
        ctas={[]}
        surfaces={[]}
        engineEnabled={engineEnabled}
        suppressionEnforced={suppressionEnforced}
        killState={killState}
        killAudit={killAuditVm}
        capabilities={capabilities}
        loadError
      />
    )
  }
}

export default Page
