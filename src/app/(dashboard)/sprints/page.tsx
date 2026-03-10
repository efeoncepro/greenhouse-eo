import { redirect } from 'next/navigation'

import GreenhouseSprints from '@views/greenhouse/GreenhouseSprints'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (!tenant.routeGroups.includes('client')) {
    redirect(tenant.portalHomePath || '/auth/landing')
  }

  return <GreenhouseSprints />
}
