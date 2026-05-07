import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { can } from '@/lib/entitlements/runtime'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export default async function AgencySampleSprintsLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasViewAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'gestion.sample_sprints',
    fallback:
      tenant.routeGroups.includes('commercial') ||
      tenant.routeGroups.includes('internal') ||
      tenant.routeGroups.includes('admin')
  })

  const hasReadCapability = can(
    buildTenantEntitlementSubject(tenant),
    'commercial.engagement.read',
    'read',
    'tenant'
  )

  if (!hasViewAccess || !hasReadCapability) {
    redirect(tenant.portalHomePath)
  }

  return children
}
