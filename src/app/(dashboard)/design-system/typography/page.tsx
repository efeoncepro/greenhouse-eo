import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import CanonicalTypographyView from '@views/greenhouse/admin/design-system/typography/CanonicalTypographyView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tipografía — referencia canónica | Greenhouse'
}

// Canonical typography reference (TASK-1044). INTERNAL ONLY — clients must never
// see this. Mirrors the `/design-system` guard (internal viewCode +
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
    viewCode: 'plataforma.design_system',
    fallback: tenant.tenantType === 'efeonce_internal'
  })

  if (!hasAccess) {
    redirect('/401')
  }

  return <CanonicalTypographyView />
}
