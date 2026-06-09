import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import BrandColorComparisonMockupView from '@views/greenhouse/admin/design-system/BrandColorComparisonMockupView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Brand Color — D vs Restraint | Greenhouse'
}

// Internal mockup: color iteration comparison (direction D vs Restraint v1). Not a
// runtime token contract. Mirrors the Design System guard.
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

  return <BrandColorComparisonMockupView />
}
