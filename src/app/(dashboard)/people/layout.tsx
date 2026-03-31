import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { canAccessPeopleModule, hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

const PeopleLayout = async ({ children }: { children: ReactNode }) => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.personas',
    fallback: canAccessPeopleModule(tenant)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <>{children}</>
}

export default PeopleLayout
