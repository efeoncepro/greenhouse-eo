import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import TypographyReferenceMockupView from '@views/greenhouse/admin/design-system/typography/mockup/TypographyReferenceMockupView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tipografía — referencia | Greenhouse'
}

// Internal typography reference (TASK-1036). INTERNAL ONLY — clients must never
// see this. Mirrors the `/admin/design-system` guard (internal viewCode +
// route-group fallback + defensive client redirect).
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

  return <TypographyReferenceMockupView />
}
