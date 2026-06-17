import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import CardDensityLabView from '@views/greenhouse/admin/design-system/card-density/CardDensityLabView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Adaptive Card density — Design System | Greenhouse'
}

// Internal Adaptive Card density reference (TASK-1115). INTERNAL ONLY — clients must never see this.
// Mirrors the `/design-system` guard and keeps the lab under the DS entrypoint.
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

  return <CardDensityLabView />
}
