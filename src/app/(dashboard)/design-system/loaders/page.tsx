import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import LoadingLabView from '@views/greenhouse/admin/design-system/LoadingLabView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Loading Lab — Design System | Greenhouse'
}

// Internal loading-state reference (TASK-1037). INTERNAL ONLY — clients must
// never see this. Mirrors the `/design-system` guard and keeps the
// loaders lab as a child surface of the design-system entrypoint.
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

  return <LoadingLabView />
}
