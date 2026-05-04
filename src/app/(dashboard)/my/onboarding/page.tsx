import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import MyOnboardingView from '@/views/greenhouse/hr-onboarding/MyOnboardingView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Mi Onboarding | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'mi_ficha.onboarding',
    fallback: tenant.routeGroups.includes('my')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <MyOnboardingView />
}

export default Page
