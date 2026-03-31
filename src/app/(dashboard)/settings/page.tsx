import { redirect } from 'next/navigation'

import GreenhouseSettings from '@views/greenhouse/GreenhouseSettings'

import { hasGoogleAuthProvider, hasMicrosoftAuthProvider } from '@/lib/auth-secrets'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export default async function Page() {
  const tenant = await getTenantContext()
  const hasMicrosoftAuth = hasMicrosoftAuthProvider()
  const hasGoogleAuth = hasGoogleAuthProvider()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'cliente.configuracion',
    fallback: tenant.routeGroups.includes('client')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/auth/landing')
  }

  return <GreenhouseSettings hasMicrosoftAuth={hasMicrosoftAuth} hasGoogleAuth={hasGoogleAuth} />
}
