import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import AxisColorLabView from '@views/greenhouse/admin/design-system/AxisColorLabView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Color AXIS — Design System | Greenhouse'
}

// Canonical internal AXIS color reference. Mirrors `/admin/design-system`
// guard: this is an internal-only lab under the Design System catalog.
export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.tenantType === 'client') {
    redirect('/401')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.design_system',
    fallback: tenant.routeGroups.includes('internal')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  return <AxisColorLabView />
}
