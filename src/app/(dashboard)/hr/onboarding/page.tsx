import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import HrOnboardingView from '@views/greenhouse/hr-onboarding/HrOnboardingView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Onboarding | Greenhouse' }
export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const Page = async ({ searchParams }: PageProps) => {
  const tenant = await getTenantContext()
  const params = await searchParams
  const lane = Array.isArray(params?.lane) ? params?.lane[0] : params?.lane

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.onboarding',
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes('efeonce_admin')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  return <HrOnboardingView mode={lane === 'hiring-activation' ? 'activation' : 'overview'} />
}

export default Page
