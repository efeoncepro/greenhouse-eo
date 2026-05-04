import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import HrOnboardingView from '@views/greenhouse/hr-onboarding/HrOnboardingView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Plantillas de Onboarding | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.onboarding',
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes('efeonce_admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <HrOnboardingView />
}

export default Page
