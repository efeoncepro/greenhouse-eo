import { notFound } from 'next/navigation'

import type { Metadata } from 'next'


import LifecycleTimeline from '@/views/greenhouse/agency/clients/LifecycleTimeline'
import { isClientLifecycleOnboardingEnabled } from '@/lib/client-lifecycle/flags'
import {
  getLifecycleTimelineForOrganization,
  type LifecycleTimelineData
} from '@/lib/client-lifecycle/timeline-reader'
import { getOrganizationDisplayName } from '@/lib/client-onboarding/org-search'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Ciclo de vida del cliente | Greenhouse' }
export const dynamic = 'force-dynamic'

// Account 360 lifecycle timeline (TASK-992 Slice 3). Gated by the lifecycle flag +
// the client.lifecycle.case.read capability. Honest degradation: a read failure
// renders the degraded state, never a crash; an org without a case renders empty.
const Page = async ({ params }: { params: Promise<{ organizationId: string }> }) => {
  await requireServerSession()

  if (!isClientLifecycleOnboardingEnabled()) {
    notFound()
  }

  const tenant = await getTenantContext()

  if (!tenant) {
    notFound()
  }

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'client.lifecycle.case.read', 'read', 'tenant')) {
    notFound()
  }

  const { organizationId } = await params

  let data: LifecycleTimelineData | null = null
  let organizationName = 'Cliente'
  let degraded = false

  try {
    const [timeline, name] = await Promise.all([
      getLifecycleTimelineForOrganization(organizationId),
      getOrganizationDisplayName(organizationId)
    ])

    data = timeline
    organizationName = name ?? 'Cliente'
  } catch (error) {
    captureWithDomain(error, 'commercial', { tags: { source: 'client_lifecycle:timeline_page' } })
    degraded = true
  }

  return (
    <LifecycleTimeline
      organizationName={organizationName}
      data={data}
      degraded={degraded}
      startOnboardingHref='/agency/clients/new'
    />
  )
}

export default Page
