import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { resolvePeopleAccessContext } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

const PeopleLayout = async ({ children }: { children: ReactNode }) => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const accessContext = await resolvePeopleAccessContext(tenant)

  if (!accessContext) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <>{children}</>
}

export default PeopleLayout
