import { redirect } from 'next/navigation'

import GreenhouseProjects from '@views/greenhouse/GreenhouseProjects'

import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (!tenant.routeGroups.includes('client')) {
    redirect(tenant.portalHomePath)
  }

  // TASK-827 Slice 4 — Page guard canonical resolver-based (replace legacy
  // routeGroup-only check). Internal users (D1 bypass) y clientes con
  // cliente.proyectos en su módulo set pasan; otros redirect a /home?denied=proyectos.
  await requireViewCodeAccess('cliente.proyectos')

  return <GreenhouseProjects />
}
