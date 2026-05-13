import { redirect } from 'next/navigation'

import GreenhouseUpdates from '@views/greenhouse/GreenhouseUpdates'

import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // TASK-827 Slice 4 — Page guard canonical resolver-based.
  await requireViewCodeAccess('cliente.actualizaciones')

  return <GreenhouseUpdates />
}
