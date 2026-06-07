import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import FloatingSurfaceLabView from '@views/greenhouse/admin/design-system/FloatingSurfaceLabView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Floating Surfaces Lab — Design System | Greenhouse'
}

// Internal Floating Surface primitive reference. Mirrors `/admin/design-system`
// guard: AXIS/Greenhouse design-system surfaces must never be exposed to clients.
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

  return <FloatingSurfaceLabView />
}
