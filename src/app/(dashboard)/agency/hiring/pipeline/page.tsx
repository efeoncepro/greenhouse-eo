import { redirect } from 'next/navigation'

import { getLocale } from 'next-intl/server'

import type { Metadata } from 'next'

import PipelineDeskView from '@/views/greenhouse/hiring/PipelineDeskView'
import { can } from '@/lib/entitlements/runtime'
import { getHiringDeskSnapshot } from '@/lib/hiring'
import { getMicrocopy } from '@/lib/copy'
import { normalizeLocale } from '@/i18n/locales'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Pipeline | Hiring Desk | Greenhouse' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams?: Promise<{
    openingId?: string
    focusApplication?: string
    captureFailure?: string
    captureApplication?: string
  }>
}

export default async function HiringPipelinePage({ searchParams }: Props) {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const hasAccess = hasAuthorizedViewCode({ tenant, viewCode: 'gestion.hiring_pipeline', fallback: false })

  if (
    !hasAccess ||
    !can(tenant, 'hiring.opening.read', 'read', 'tenant') ||
    !can(tenant, 'hiring.application.read', 'read', 'tenant')
  ) redirect('/401')

  const resolved = searchParams ? await searchParams : undefined

  const [locale, snapshot] = await Promise.all([
    getLocale(),
    getHiringDeskSnapshot({
      openingId: resolved?.openingId,
      focusApplicationId: resolved?.focusApplication,
      openingLimit: 80,
      applicationLimit: 120,
    }),
  ])

  const focusedApplication = resolved?.focusApplication
    ? snapshot.applications.find((entry) => entry.application.applicationId === resolved.focusApplication)
    : undefined

  const requestedOpening = resolved?.openingId
    ? snapshot.openings.find((entry) => entry.opening.openingId === resolved.openingId)
    : undefined

  const initialOpeningId = focusedApplication?.application.openingId
    ?? requestedOpening?.opening.openingId
    ?? snapshot.openings[0]?.opening.openingId

  const localCaptureEnabled = !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production'

  const queueCaptureApplication = (resolved?.captureApplication === 'queue'
    ? snapshot.applications.find((candidate, _index, candidates) => (
        candidates.some((peer) => (
          peer.application.applicationId !== candidate.application.applicationId
          && peer.application.openingId === candidate.application.openingId
          && peer.application.stage === candidate.application.stage
          && !peer.application.archivedAt
        ))
      ))
    : undefined) ?? snapshot.applications[0]

  if (localCaptureEnabled && resolved?.captureApplication && queueCaptureApplication) {
    redirect(`/agency/hiring/applications/${queueCaptureApplication.application.applicationId}`)
  }

  return (
    <PipelineDeskView
      copy={getMicrocopy(normalizeLocale(locale) ?? undefined).hiringDesk}
      initialSnapshot={snapshot}
      initialOpeningId={initialOpeningId}
      initialFocusApplicationId={focusedApplication?.application.applicationId}
      initialFocusUnavailable={Boolean(resolved?.focusApplication && !focusedApplication)}
      simulateStageFailure={localCaptureEnabled && resolved?.captureFailure === 'stage'}
    />
  )
}
