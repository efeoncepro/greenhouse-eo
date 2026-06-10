import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import MyPerformanceView from '@/views/greenhouse/my/MyPerformanceView'
import { MY_PERFORMANCE_MOCK } from '@/views/greenhouse/my/my-performance-mock'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Mi Desempeño · Runtime preview | Greenhouse' }
export const dynamic = 'force-dynamic'

/**
 * TASK-1027 — runtime preview. Renders the REAL `MyPerformanceView` runtime
 * component with a rich fixed payload (copy-and-patch paridad), so operators
 * without personal ICO metrics (e.g. admins) can review the full enterprise
 * dashboard exactly as a collaborator with data would see it.
 */
const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'mi_ficha.mi_desempeno',
    fallback: tenant.routeGroups.includes('my')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  return <MyPerformanceView mockData={MY_PERFORMANCE_MOCK} />
}

export default Page
