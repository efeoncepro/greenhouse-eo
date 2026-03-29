import { redirect } from 'next/navigation'

import GreenhouseSettings from '@views/greenhouse/GreenhouseSettings'

import { hasGoogleAuthProvider, hasMicrosoftAuthProvider } from '@/lib/auth-secrets'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function Page() {
  const tenant = await getTenantContext()
  const hasMicrosoftAuth = hasMicrosoftAuthProvider()
  const hasGoogleAuth = hasGoogleAuthProvider()

  if (!tenant) {
    redirect('/login')
  }

  if (!tenant.routeGroups.includes('client')) {
    redirect(tenant.portalHomePath || '/auth/landing')
  }

  return <GreenhouseSettings hasMicrosoftAuth={hasMicrosoftAuth} hasGoogleAuth={hasGoogleAuth} />
}
