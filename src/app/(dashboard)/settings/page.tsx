import { redirect } from 'next/navigation'

import GreenhouseSettings from '@views/greenhouse/GreenhouseSettings'

import { hasGoogleAuthProvider, hasMicrosoftAuthProvider } from '@/lib/auth-secrets'
import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()
  const hasMicrosoftAuth = hasMicrosoftAuthProvider()
  const hasGoogleAuth = hasGoogleAuthProvider()

  if (!tenant) {
    redirect('/login')
  }

  // TASK-827 Slice 4 — Page guard canonical resolver-based.
  await requireViewCodeAccess('cliente.configuracion')

  return <GreenhouseSettings hasMicrosoftAuth={hasMicrosoftAuth} hasGoogleAuth={hasGoogleAuth} />
}
