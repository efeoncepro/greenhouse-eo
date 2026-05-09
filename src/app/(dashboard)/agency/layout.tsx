import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { hasAnyAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function AgencyLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAnyAuthorizedViewCode({
    tenant,
    viewCodes: [
      'gestion.agencia',
      'gestion.spaces',
      'gestion.economia',
      'gestion.equipo',
      'gestion.delivery',
      'gestion.campanas',
      'gestion.staff_augmentation',
      'gestion.servicios',
      'gestion.sample_sprints',
      'gestion.operaciones',
      'gestion.organizaciones'
    ],
    fallback: tenant.routeGroups.includes('internal') || tenant.routeGroups.includes('admin') || tenant.routeGroups.includes('commercial')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return children
}
