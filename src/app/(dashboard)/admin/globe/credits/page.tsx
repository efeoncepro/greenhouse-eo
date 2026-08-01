import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { GH_GLOBE_CREDITS as C } from '@/lib/copy/globe-credits'
import { can } from '@/lib/entitlements/runtime'
import { readGlobeCreditCapacityStatus } from '@/lib/globe/credit-capacity-status'
import { listGlobeCreditFundingOperations } from '@/lib/globe/credit-funding-operations'
import { readGlobeCreditOperationsProjection } from '@/lib/globe/credit-operations-projection'
import { resolveGlobeOAuthWorkspaceBindings } from '@/lib/sister-platforms/oauth-workspace-bindings'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import GlobeCreditsOperationsWorkbenchView from '@/views/greenhouse/admin/globe/credits/GlobeCreditsOperationsWorkbenchView'

export const metadata: Metadata = { title: C.metadataTitle }
export const dynamic = 'force-dynamic'

const VIEW_CODE = 'administracion.globe_credits'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const subject = buildTenantEntitlementSubject(tenant)

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: VIEW_CODE,
    fallback: tenant.routeGroups.includes('admin')
  }) && can(subject, 'platform.globe_credit_funding.read', 'read', 'all')

  if (!hasAccess) redirect('/401')

  const canEnsure =
    can(subject, 'platform.globe_credit_funding.authority.issue', 'execute', 'all') &&
    can(subject, 'platform.globe_credit_funding.ensure', 'execute', 'all')

  const bindings = await resolveGlobeOAuthWorkspaceBindings(tenant)
  const workspace = bindings.find(binding => binding.isPrimary) ?? bindings[0]

  if (!workspace) {
    return <GlobeCreditsOperationsWorkbenchView model={{
      workspace: { id: 'unbound', name: C.workspaceMissing },
      status: null,
      operations: [],
      projection: {
        pools: [], grants: [], budgets: [], forecast: null, alerts: [], ledger: [],
        unavailable: ['pools', 'grants', 'budgets', 'forecast', 'alerts', 'ledger']
      },
      loadError: true,
      canEnsure: false,
      canReconcile: false
    }} />
  }

  const [statusResult, operationsResult, projectionResult] = await Promise.allSettled([
    readGlobeCreditCapacityStatus({ globeWorkspaceId: workspace.workspaceId, requestedCredits: C.requestedUnit }),
    listGlobeCreditFundingOperations({ globeWorkspaceId: workspace.workspaceId, limit: 25 }),
    readGlobeCreditOperationsProjection({ globeWorkspaceId: workspace.workspaceId, limit: 50 })
  ])

  return <GlobeCreditsOperationsWorkbenchView model={{
    workspace: { id: workspace.workspaceId, name: workspace.displayName },
    status: statusResult.status === 'fulfilled' ? statusResult.value : null,
    operations: operationsResult.status === 'fulfilled' ? operationsResult.value.items : [],
    projection: projectionResult.status === 'fulfilled' ? projectionResult.value : {
      pools: [], grants: [], budgets: [], forecast: null, alerts: [], ledger: [],
      unavailable: ['pools', 'grants', 'budgets', 'forecast', 'alerts', 'ledger']
    },
    loadError: statusResult.status === 'rejected' || operationsResult.status === 'rejected' || projectionResult.status === 'rejected',
    canEnsure,
    canReconcile: can(subject, 'platform.globe_credit_funding.reconcile', 'execute', 'all')
  }} />
}
