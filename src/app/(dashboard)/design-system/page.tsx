import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import DesignSystemCatalogView from '@views/greenhouse/admin/design-system/DesignSystemCatalogView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Design System Catalog — AXIS | Greenhouse'
}

// Canonical internal design-system catalog. INTERNAL ONLY — clients must never
// see this. Gated by the `plataforma.design_system` viewCode (granted to
// internal roles only) with an internal route-group fallback; a defensive
// tenantType check redirects any client tenant.
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
    viewCode: 'plataforma.design_system',
    fallback: tenant.tenantType === 'efeonce_internal'
  })

  if (!hasAccess) {
    redirect('/401')
  }

  return <DesignSystemCatalogView />
}
