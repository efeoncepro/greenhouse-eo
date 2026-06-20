import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import GamificationLabView from '@views/greenhouse/admin/design-system/GamificationLabView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gamification Lab — Design System | Greenhouse'
}

// Internal gamification primitive reference. Mirrors `/design-system` guard:
// this is a Greenhouse design-system surface and must never be exposed to clients.
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

  return <GamificationLabView />
}
