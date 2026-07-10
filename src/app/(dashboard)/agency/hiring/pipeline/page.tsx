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
  searchParams?: Promise<{ openingId?: string; captureFailure?: string; captureApplication?: string }>
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
    getHiringDeskSnapshot({ openingLimit: 80, applicationLimit: 120 }),
  ])

  if (process.env.NODE_ENV !== 'production' && resolved?.captureApplication === 'first' && snapshot.applications[0]) {
    redirect(`/agency/hiring/applications/${snapshot.applications[0].application.applicationId}`)
  }

  return (
    <PipelineDeskView
      copy={getMicrocopy(normalizeLocale(locale) ?? undefined).hiringDesk}
      initialSnapshot={snapshot}
      initialOpeningId={resolved?.openingId}
      simulateStageFailure={process.env.NODE_ENV !== 'production' && resolved?.captureFailure === 'stage'}
    />
  )
}
