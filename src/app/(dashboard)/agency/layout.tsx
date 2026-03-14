import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function AgencyLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = tenant.routeGroups.includes('internal') || tenant.routeGroups.includes('admin')

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return children
}
