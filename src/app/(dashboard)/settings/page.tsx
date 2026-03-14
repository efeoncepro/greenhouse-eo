import { redirect } from 'next/navigation'

import GreenhouseSettings from '@views/greenhouse/GreenhouseSettings'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function Page() {
  const tenant = await getTenantContext()
  const hasMicrosoftAuth = Boolean(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET)
  const hasGoogleAuth = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

  if (!tenant) {
    redirect('/login')
  }

  if (!tenant.routeGroups.includes('client')) {
    redirect(tenant.portalHomePath || '/auth/landing')
  }

  return <GreenhouseSettings hasMicrosoftAuth={hasMicrosoftAuth} hasGoogleAuth={hasGoogleAuth} />
}
