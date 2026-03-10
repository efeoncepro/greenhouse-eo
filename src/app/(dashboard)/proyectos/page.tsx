import { redirect } from 'next/navigation'

import GreenhouseProjects from '@views/greenhouse/GreenhouseProjects'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (!tenant.routeGroups.includes('client')) {
    redirect(tenant.portalHomePath || '/auth/landing')
  }

  return <GreenhouseProjects />
}
