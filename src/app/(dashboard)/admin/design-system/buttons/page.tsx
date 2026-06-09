import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import ButtonsLabView from '@views/greenhouse/admin/design-system/ButtonsLabView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Buttons Lab — Design System | Greenhouse'
}

// Internal buttons reference. Mirrors `/admin/design-system` guard: this is an
// AXIS/Greenhouse design-system surface and must never be exposed to clients.
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

  return <ButtonsLabView />
}
