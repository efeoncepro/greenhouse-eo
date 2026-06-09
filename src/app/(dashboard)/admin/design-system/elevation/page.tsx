import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import ElevationLabView from '@views/greenhouse/admin/design-system/ElevationLabView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Elevation & Shadows — Design System | Greenhouse'
}

// Internal elevation/shadow token reference (TASK-1049). INTERNAL ONLY — clients
// must never see this. Mirrors the `/admin/design-system` guard and keeps the
// elevation lab as a child surface of the design-system entrypoint.
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

  return <ElevationLabView />
}
