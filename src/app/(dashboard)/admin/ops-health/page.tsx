import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import { getGcpBillingOverview } from '@/lib/cloud/gcp-billing'
import { getGitHubBillingOverview } from '@/lib/cloud/github-billing'
import { getVercelBillingOverview } from '@/lib/cloud/vercel-billing'
import { getNotionSyncOperationalOverview } from '@/lib/integrations/notion-sync-operational-overview'
import { getOperationsOverview } from '@/lib/operations/get-operations-overview'
import { readReactiveProjectionBreakdown } from '@/lib/operations/get-reactive-projection-breakdown'
import AdminOpsHealthView from '@/views/greenhouse/admin/AdminOpsHealthView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const metadata: Metadata = { title: 'Ops Health | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.ops_health',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  const [data, reactiveBreakdown, gcpBilling, vercelBilling, githubBilling, notionOperationalOverview] = await Promise.all([
    getOperationsOverview(),
    readReactiveProjectionBreakdown().catch(() => null),
    getGcpBillingOverview().catch(() => null),
    getVercelBillingOverview().catch(() => null),
    getGitHubBillingOverview().catch(() => null),
    getNotionSyncOperationalOverview().catch(() => null)
  ])

  return (
    <AdminOpsHealthView
      data={data}
      reactiveBreakdown={reactiveBreakdown}
      gcpBilling={gcpBilling}
      vercelBilling={vercelBilling}
      githubBilling={githubBilling}
      notionOperationalOverview={notionOperationalOverview}
    />
  )
}
