import { notFound } from 'next/navigation'

import type { Metadata } from 'next'


import ClientOnboardingView from '@/views/greenhouse/agency/clients/ClientOnboardingView'
import { isClientLifecycleOnboardingEnabled } from '@/lib/client-lifecycle/flags'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Alta de cliente | Greenhouse' }
export const dynamic = 'force-dynamic'

// Single front door to onboard a client (TASK-992 Slice 2). Gated by the lifecycle
// flag + the client.lifecycle.case.open capability. Route is hidden (404) when the
// flag is off or the subject lacks the capability.
const Page = async () => {
  await requireServerSession()

  if (!isClientLifecycleOnboardingEnabled()) {
    notFound()
  }

  const tenant = await getTenantContext()

  if (!tenant) {
    notFound()
  }

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'client.lifecycle.case.open', 'create', 'tenant')) {
    notFound()
  }

  return <ClientOnboardingView />
}

export default Page
