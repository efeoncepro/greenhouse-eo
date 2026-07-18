import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import { isCtaEngineEnabled } from '@/lib/growth/ctas/flags'
import { listCtasAdmin, listCtaSurfacesAdmin } from '@/lib/growth/ctas/readers'
import { captureWithDomain } from '@/lib/observability/capture'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import GrowthCtasGovernanceView from '@/views/greenhouse/growth/ctas/GrowthCtasGovernanceView'

/**
 * TASK-1340 — Gobernanza del motor de CTAs bajo el menú Growth (delta operador
 * 2026-07-18). Guard: viewCode `gestion.growth_ctas` (seed 20260718074718550) +
 * redirect defensivo para tenants cliente. Data server-side vía readers canónicos
 * (Full API Parity: esta vista es un consumer más del primitive `growth.cta`);
 * las acciones de lifecycle van por la API admin de TASK-1339, que re-valida
 * capability fina + flag.
 */
export const metadata: Metadata = { title: 'CTAs — Gobernanza | Growth | Greenhouse' }
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

  try {
    const [ctas, surfaces] = await Promise.all([listCtasAdmin(), listCtaSurfacesAdmin()])

    return <GrowthCtasGovernanceView ctas={ctas} surfaces={surfaces} engineEnabled={isCtaEngineEnabled()} />
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ctas_governance_page' } })

    return <GrowthCtasGovernanceView ctas={[]} surfaces={[]} engineEnabled={isCtaEngineEnabled()} loadError />
  }
}

export default Page
