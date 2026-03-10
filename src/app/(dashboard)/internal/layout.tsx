import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function InternalLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (!tenant.routeGroups.includes('internal')) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return children
}
