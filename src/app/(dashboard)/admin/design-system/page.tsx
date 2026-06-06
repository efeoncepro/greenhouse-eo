import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import DesignSystemView from '@views/greenhouse/admin/design-system/DesignSystemView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Design System — AXIS | Greenhouse'
}

// Canonical internal design-system reference (AXIS palette). INTERNAL ONLY —
// clients must never see this. Gated by the `administracion.design_system`
// viewCode (granted to internal roles only) with an internal route-group
// fallback; a defensive tenantType check redirects any client tenant.
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

  return <DesignSystemView />
}
