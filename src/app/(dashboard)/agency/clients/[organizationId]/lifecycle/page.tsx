import { notFound } from 'next/navigation'

import type { Metadata } from 'next'


import LifecycleTimeline, {
  type LifecycleChecklistItemVm
} from '@/views/greenhouse/agency/clients/LifecycleTimeline'
import { isClientLifecycleOnboardingEnabled } from '@/lib/client-lifecycle/flags'
import { getActiveCaseForOrganization, getChecklistItems } from '@/lib/client-lifecycle/store'
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
  let checklist: LifecycleChecklistItemVm[] = []
  let notionAnchors: { notionDatabaseId: string; title: string }[] = []
  let teamsAnchor: { teamId: string; teamName: string } | null = null

  try {
    const [timeline, name, activeCase] = await Promise.all([
      getLifecycleTimelineForOrganization(organizationId),
      getOrganizationDisplayName(organizationId),
      getActiveCaseForOrganization(organizationId, 'onboarding')
    ])

    data = timeline
    organizationName = name ?? 'Cliente'

    if (activeCase) {
      const items = await getChecklistItems(activeCase.caseId)

      checklist = items.map(item => ({
        itemCode: item.itemCode,
        itemLabel: item.itemLabel,
        status: item.status,
        ownerRole: item.ownerRole,
        required: item.required,
        blocksCompletion: item.blocksCompletion
      }))

      // TASK-997 — anchors capturados en el wizard viven en el case metadata.
      const meta = activeCase.metadataJson
      const rawNotion = Array.isArray(meta.notionAnchors) ? meta.notionAnchors : []

      notionAnchors = rawNotion
        .map(a => (a && typeof a === 'object' ? (a as Record<string, unknown>) : {}))
        .filter(a => typeof a.notionDatabaseId === 'string')
        .map(a => ({ notionDatabaseId: String(a.notionDatabaseId), title: String(a.title ?? a.notionDatabaseId) }))

      const rawTeams = meta.teamsAnchor && typeof meta.teamsAnchor === 'object' ? (meta.teamsAnchor as Record<string, unknown>) : null

      teamsAnchor =
        rawTeams && typeof rawTeams.teamId === 'string'
          ? { teamId: String(rawTeams.teamId), teamName: String(rawTeams.teamName ?? rawTeams.teamId) }
          : null
    }
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
      checklist={checklist}
      notionAnchors={notionAnchors}
      teamsAnchor={teamsAnchor}
    />
  )
}

export default Page
