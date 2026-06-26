import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import { getGrowthFormsCockpitAdmin } from '@/lib/growth/forms/readers'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import GrowthFormsAdminCockpitView from '@/views/greenhouse/admin/growth/forms/GrowthFormsAdminCockpitView'

export const metadata: Metadata = { title: 'Growth Forms | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const VIEW_CODE = 'administracion.growth_forms'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess =
    hasAuthorizedViewCode({
      tenant,
      viewCode: VIEW_CODE,
      fallback: tenant.routeGroups.includes('admin'),
    }) && can(tenant, 'growth.forms.read', 'read', 'tenant')

  if (!hasAccess) {
    redirect('/401')
  }

  const data = await getGrowthFormsCockpitAdmin()

  // TASK-1256 Slice 4 — el affordance de reveal de PII se oculta sin esta capability
  // (más restringida que el read masked; la autoridad real vive en el command server).
  const canRevealPii = can(tenant, 'growth.forms.lead_pii.reveal', 'read', 'tenant')

  return <GrowthFormsAdminCockpitView data={data} canRevealPii={canRevealPii} />
}
