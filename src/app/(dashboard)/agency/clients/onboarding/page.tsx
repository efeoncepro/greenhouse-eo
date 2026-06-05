import { notFound } from 'next/navigation'

import type { Metadata } from 'next'


import OnboardingCasesInboxView from '@/views/greenhouse/agency/clients/OnboardingCasesInboxView'
import { isClientLifecycleOnboardingEnabled } from '@/lib/client-lifecycle/flags'
import { getOnboardingCasesInbox, type OnboardingInboxData } from '@/lib/client-lifecycle/inbox-reader'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Onboarding de clientes | Greenhouse' }
export const dynamic = 'force-dynamic'

// TASK-1013 — Onboarding cases cockpit. Makes the in-flight lifecycle cases
// discoverable (the deal-trigger, TASK-1010, opens `draft` cases that had no
// surface until now). Mirrors the timeline page pattern: gated by the lifecycle
// flag + the client.lifecycle.case.read capability, honest degradation on a read
// failure (renders the degraded state, never a crash). The wizard at
// /agency/clients/new stays the canonical front door — this cockpit complements it.
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

  if (!can(subject, 'client.lifecycle.case.read', 'read', 'tenant')) {
    notFound()
  }

  let data: OnboardingInboxData = {
    cases: [],
    summary: { openCases: 0, inProgress: 0, blocked: 0, overdue: 0 }
  }
  let degraded = false

  try {
    data = await getOnboardingCasesInbox()
  } catch (error) {
    captureWithDomain(error, 'commercial', { tags: { source: 'client_lifecycle:inbox_page' } })
    degraded = true
  }

  return <OnboardingCasesInboxView data={data} degraded={degraded} />
}

export default Page
