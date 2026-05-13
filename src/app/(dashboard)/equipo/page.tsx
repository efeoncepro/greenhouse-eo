import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import GreenhouseClientTeam from '@/views/greenhouse/GreenhouseClientTeam'
import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = {
  title: 'Mi Equipo | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // TASK-827 Slice 4 — Page guard canonical resolver-based (replace legacy
  // hasAuthorizedViewCode). D1 bypass internal admins. Clientes con cliente.equipo
  // asignado pasan; otros redirect a /home?denied=equipo.
  await requireViewCodeAccess('cliente.equipo')

  return <GreenhouseClientTeam />
}

export default Page
